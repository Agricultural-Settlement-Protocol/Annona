/**
 * Event → read-model reducer. THE anti-drift seam (CLAUDE.md Golden Rule 5).
 *
 * Both callers fold identical logic:
 *   - the indexer (poll.ts) decodes on-chain ScVal → EventEnvelope → applyEvent
 *   - the seed (scripts/seed.ts) synthesizes the SAME @annona/core EventEnvelope
 *     objects (deterministic fake tx hashes) → applyEvent
 * so the pre-deploy demo DB and the post-deploy indexed DB can never disagree.
 *
 * The `agreement` read-model deliberately stores only chain-mirror status/flag;
 * every running-money field (paidToFarmer, remainingDebt, residuPrincipal, ...)
 * is DERIVED by SUM over `settlement` rows in the API layer — so a single
 * duplicated settlement row would silently inflate every total. The idempotency
 * guard (eventLog on (txHash,eventIndex)) is therefore load-bearing and MUST be
 * atomic with the row writes: guard + insert happen in one transaction.
 *
 * Numeric core is imported from @annona/core (computeSplitSettlement,
 * classifyDelivery, deriveInputDebt) — the exact helpers the contract test and
 * the FE also use, which is what pins the §5 worked example end-to-end.
 */
import type {
  AgreementCreatedData,
  CoopReputationUpdatedData,
  DeliveryRecordedData,
  EventEnvelope,
  ForceMajeureData,
  RemittanceClearedData,
  RemittanceDisputedData,
  RemittanceResolvedData,
  ReputationUpdatedData,
  ResiduRemittedData,
  ResiduStatus,
  SettledData,
  Status,
  SupplyAcceptedData,
  SupplyDispatchedData,
} from "@annona/core";
import { classifyDelivery } from "@annona/core";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { schema } from "../db/client.js";

/** All contract event payloads, discriminated by envelope `type`. */
type AnyEnvelope =
  | (EventEnvelope<AgreementCreatedData> & { type: "AgreementCreated" })
  | (EventEnvelope<SupplyDispatchedData> & { type: "SupplyDispatched" })
  | (EventEnvelope<SupplyAcceptedData> & { type: "SupplyAccepted" })
  | (EventEnvelope<DeliveryRecordedData> & { type: "DeliveryRecorded" })
  | (EventEnvelope<SettledData> & { type: "Settled" })
  | (EventEnvelope<ForceMajeureData> & { type: "ForceMajeure" })
  | (EventEnvelope<ResiduRemittedData> & { type: "ResiduRemitted" })
  | (EventEnvelope<RemittanceClearedData> & { type: "RemittanceCleared" })
  | (EventEnvelope<RemittanceDisputedData> & { type: "RemittanceDisputed" })
  | (EventEnvelope<RemittanceResolvedData> & { type: "RemittanceResolved" })
  | (EventEnvelope<ReputationUpdatedData> & { type: "ReputationUpdated" })
  | (EventEnvelope<CoopReputationUpdatedData> & { type: "CoopReputationUpdated" });

/** A DB handle OR a transaction handle — handlers run inside applyEvent's tx. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/* ────────────────────────── pure numeric core (no DB) ────────────────────────── */

/** Per-settle settlement row derived from a Settled event + the agreement's
 *  prior cumulative settled volume. The event carries CUMULATIVE settled_vol_g
 *  (the contract's running total) but per-settle money deltas; we recover the
 *  per-settle volume as `cumulative - priorCumulative`. Pure + unit-tested
 *  against the §5 worked example with zero Postgres. */
export function settledRowFromEvent(
  data: SettledData,
  priorSettledVolG: bigint,
): {
  gross: bigint;
  handlingCut: bigint;
  debtNetted: bigint;
  principalToAgrinas: bigint;
  coopMargin: bigint;
  netPaid: bigint;
  settledVolG: bigint;
} {
  return {
    gross: data.gross,
    handlingCut: data.handlingCut,
    debtNetted: data.debtNetted,
    // WIRE→DB bridge (v4.0): the event field is `principalToSupplier`; the
    // read-model column is still `principal_to_agrinas` (DB rename is a deferred
    // phase — see the reducer header + CLAUDE.md status).
    principalToAgrinas: data.principalToSupplier,
    coopMargin: data.coopMargin,
    netPaid: data.netPaid,
    // event.settledVolG is cumulative; store the delta this call settled.
    settledVolG: data.settledVolG - priorSettledVolG,
  };
}

/* ────────────────────────── address → uuid resolution ────────────────────────── */

async function coopIdByAddr(tx: Tx, addr: string): Promise<string> {
  const rows = await tx
    .select({ id: schema.coop.id })
    .from(schema.coop)
    .where(eq(schema.coop.walletAddress, addr));
  const row = rows[0];
  if (!row) throw new Error(`indexer: no coop for wallet ${addr} (seed the base rows first)`);
  return row.id;
}

async function farmerIdByAddr(tx: Tx, addr: string): Promise<string> {
  const rows = await tx
    .select({ id: schema.farmer.id })
    .from(schema.farmer)
    .where(eq(schema.farmer.walletAddress, addr));
  const row = rows[0];
  if (!row) throw new Error(`indexer: no farmer for wallet ${addr}`);
  return row.id;
}

async function agrinasIdByAddr(tx: Tx, addr: string): Promise<string> {
  const rows = await tx
    .select({ id: schema.agrinas.id })
    .from(schema.agrinas)
    .where(eq(schema.agrinas.walletAddress, addr));
  const row = rows[0];
  if (!row) throw new Error(`indexer: no agrinas for wallet ${addr}`);
  return row.id;
}

/** Resolve an on-chain agreement id to its read-model row (uuid + party ids). */
async function agreementByOnchain(tx: Tx, onchainId: bigint) {
  const rows = await tx
    .select({
      id: schema.agreement.id,
      coopId: schema.agreement.coopId,
      agrinasId: schema.agreement.agrinasId,
      status: schema.agreement.status,
      expectedVolG: schema.agreement.expectedVolG,
    })
    .from(schema.agreement)
    .where(eq(schema.agreement.onchainId, onchainId));
  const row = rows[0];
  if (!row) throw new Error(`indexer: no agreement for onchain id ${onchainId}`);
  return row;
}

/* ────────────────────────── reducer ────────────────────────── */

/** Fold one event onto the read-models, idempotently and atomically. Safe to
 *  replay from genesis: a duplicate (txHash,eventIndex) is a no-op. */
export async function applyEvent(db: Db, env: AnyEnvelope): Promise<void> {
  await db.transaction(async (tx) => {
    // Idempotency guard — skip if this exact event was already folded.
    const seen = await tx
      .select({ id: schema.eventLog.id })
      .from(schema.eventLog)
      .where(
        and(eq(schema.eventLog.txHash, env.txHash), eq(schema.eventLog.eventIndex, env.eventIndex)),
      );
    if (seen.length > 0) return;

    await tx.insert(schema.eventLog).values({
      txHash: env.txHash,
      eventIndex: env.eventIndex,
      type: env.type,
      ledger: env.ledger,
      ledgerTimestamp: new Date(env.timestamp * 1000),
      data: jsonSafe(env.data),
    });

    await handle(tx, env);
  });
}

async function handle(tx: Tx, env: AnyEnvelope): Promise<void> {
  const at = new Date(env.timestamp * 1000);
  switch (env.type) {
    case "AgreementCreated": {
      const d = env.data;
      const [coopId, farmerId, agrinasId] = await Promise.all([
        coopIdByAddr(tx, d.coop),
        farmerIdByAddr(tx, d.farmer),
        // WIRE→DB bridge: the event's `supplier` party resolves to the
        // (still-named) `agrinas` read-model row; `subsidyTier` has no column yet
        // (deferred DB phase), so it is not persisted.
        agrinasIdByAddr(tx, d.supplier),
      ]);
      await tx
        .insert(schema.agreement)
        .values({
          onchainId: d.id,
          coopId,
          farmerId,
          agrinasId,
          commodityCode: d.commodity.code,
          // grade + moisture are ESTIMATES at creation (from the commodity
          // struct); DeliveryRecorded overwrites grade with the ACTUAL later.
          grade: d.commodity.grade,
          moistureBps: d.commodity.moistureBps,
          basePriceAgrinas: d.basePrice,
          saprotanMarkupBps: d.saprotanMarkupBps,
          inputDebt: d.inputDebt,
          hppHandlingFeeBps: d.hppHandlingFeeBps,
          expectedVolG: d.expectedVolG,
          hppPerKg: d.hppPerKg,
          hppVersion: d.commodity.hppVersion,
          toleranceBps: d.toleranceBps,
          status: "Created",
          flag: "None",
          residuStatus: "Pending",
          createdAt: at,
        })
        .onConflictDoNothing({ target: schema.agreement.onchainId });
      // Count toward coop reputation cache (agreements initiated).
      await bumpCoopAgreements(tx, coopId);
      return;
    }

    case "SupplyDispatched":
      await setStatus(tx, env.data.id, "SupplyDispatched");
      return;

    case "SupplyAccepted":
      await setStatus(tx, env.data.id, "Active");
      return;

    case "DeliveryRecorded": {
      const d = env.data;
      const agr = await agreementByOnchain(tx, d.id);
      // Status + flag are RECOMPUTED from the band (classifyDelivery), never
      // read off the Flagged event (which only fires for the review-worthy
      // bands) — this is what makes the heal-upward case correct.
      const { status, flag } = classifyDelivery(d.deliveredTotalG, agr.expectedVolG);
      await tx.insert(schema.delivery).values({
        agreementId: agr.id,
        seq: d.seq,
        volumeG: d.volumeG,
        grade: symbolText(d.grade),
        receiptOnchainRef: env.txHash,
        deliveredAt: at,
        flag,
      });
      // Grade/moisture become ACTUAL from the latest delivery; keep status in
      // sync unless the agreement already terminally closed.
      await tx
        .update(schema.agreement)
        .set({ status, flag, grade: symbolText(d.grade) })
        .where(
          and(
            eq(schema.agreement.onchainId, d.id),
            // never regress a terminal agreement
            sql`${schema.agreement.status} not in ('Settled','ForceMajeure')`,
          ),
        );
      return;
    }

    case "Settled": {
      const d = env.data;
      const agr = await agreementByOnchain(tx, d.id);
      const prior = await sumSettledVolG(tx, agr.id);
      const latestDeliveryId = await latestDelivery(tx, agr.id);
      const row = settledRowFromEvent(d, prior);
      await tx.insert(schema.settlement).values({
        agreementId: agr.id,
        deliveryId: latestDeliveryId,
        gross: row.gross,
        handlingCut: row.handlingCut,
        debtNetted: row.debtNetted,
        principalToAgrinas: row.principalToAgrinas,
        coopMargin: row.coopMargin,
        netPaid: row.netPaid,
        settledVolG: row.settledVolG,
        settledAt: at,
      });
      // Terminal only when the full expected harvest was in (status Delivered).
      if (agr.status === "Delivered") {
        await setStatus(tx, d.id, "Settled");
      }
      // Residu principal owed to Agrinas accrues; upsert the ledger row (Pending
      // until KMP marks it remitted). Keyed on the agreement's on-chain id.
      if (row.principalToAgrinas > 0n) {
        await accrueResidu(tx, {
          agreementOnchainId: d.id,
          coopId: agr.coopId,
          agrinasId: agr.agrinasId,
          principalDelta: row.principalToAgrinas,
        });
      }
      return;
    }

    case "ForceMajeure":
      await setStatus(tx, env.data.id, "ForceMajeure");
      return;

    case "ResiduRemitted":
      await setResiduStatus(tx, env.data.id, "Remitted", { remittedAt: at });
      return;

    case "RemittanceCleared":
      await setResiduStatus(tx, env.data.id, "Cleared", { clearedAt: at });
      return;

    case "RemittanceDisputed":
      await setResiduStatus(tx, env.data.id, "Disputed", {
        disputeReason: symbolText(env.data.reason),
      });
      return;

    case "RemittanceResolved":
      // Un-strand the residu row: back to Remitted, awaiting Agrinas re-verify.
      await setResiduStatus(tx, env.data.id, "Remitted", {});
      return;

    case "ReputationUpdated": {
      const d = env.data;
      const farmerId = await farmerIdByAddr(tx, d.farmer);
      const score = reputationScore(d.deliveries, d.onTime, d.flags);
      await tx
        .insert(schema.reputationCache)
        .values({
          farmerId,
          deliveries: d.deliveries,
          onTime: d.onTime,
          totalSettledG: d.totalSettledG,
          flags: d.flags,
          score,
          syncedAt: at,
        })
        .onConflictDoUpdate({
          target: schema.reputationCache.farmerId,
          set: {
            deliveries: d.deliveries,
            onTime: d.onTime,
            totalSettledG: d.totalSettledG,
            flags: d.flags,
            score,
            syncedAt: at,
          },
        });
      return;
    }

    case "CoopReputationUpdated": {
      const d = env.data;
      const coopId = await coopIdByAddr(tx, d.coop);
      await tx
        .insert(schema.coopReputationCache)
        .values({
          coopId,
          settlements: d.settlements,
          totalResiduCleared: d.totalResiduCleared,
          disputes: d.disputes,
          frozen: d.frozen,
          syncedAt: at,
        })
        .onConflictDoUpdate({
          target: schema.coopReputationCache.coopId,
          set: {
            settlements: d.settlements,
            totalResiduCleared: d.totalResiduCleared,
            disputes: d.disputes,
            frozen: d.frozen,
            syncedAt: at,
          },
        });
      return;
    }

    default: {
      // Exhaustiveness: unhandled events (HarvestReceiptMinted, Flagged, and the
      // v4.0 funding lifecycle FundingRequested/Approved/Rejected/Disbursed/
      // Reconciled) are logged in event_log above but have no read-model side
      // effect. Deliveries + classifyDelivery already capture the former; the
      // funding read-model tables are a deferred DB phase, so financing events
      // are recorded (event_log) but not yet projected.
      return;
    }
  }
}

/* ────────────────────────── small write helpers ────────────────────────── */

async function setStatus(tx: Tx, onchainId: bigint, status: Status): Promise<void> {
  await tx
    .update(schema.agreement)
    .set({ status })
    .where(eq(schema.agreement.onchainId, onchainId));
}

async function setResiduStatus(
  tx: Tx,
  onchainId: bigint,
  status: ResiduStatus,
  extra: { remittedAt?: Date; clearedAt?: Date; disputeReason?: string },
): Promise<void> {
  await tx
    .update(schema.agreement)
    .set({ residuStatus: status })
    .where(eq(schema.agreement.onchainId, onchainId));
  await tx
    .update(schema.residuRemittance)
    .set({ status, ...extra })
    .where(eq(schema.residuRemittance.agreementOnchainId, onchainId));
}

async function accrueResidu(
  tx: Tx,
  p: { agreementOnchainId: bigint; coopId: string; agrinasId: string; principalDelta: bigint },
): Promise<void> {
  const existing = await tx
    .select({ id: schema.residuRemittance.id, amount: schema.residuRemittance.principalAmount })
    .from(schema.residuRemittance)
    .where(eq(schema.residuRemittance.agreementOnchainId, p.agreementOnchainId));
  if (existing[0]) {
    await tx
      .update(schema.residuRemittance)
      .set({ principalAmount: existing[0].amount + p.principalDelta })
      .where(eq(schema.residuRemittance.id, existing[0].id));
  } else {
    await tx.insert(schema.residuRemittance).values({
      coopId: p.coopId,
      agrinasId: p.agrinasId,
      agreementOnchainId: p.agreementOnchainId,
      principalAmount: p.principalDelta,
      status: "Pending",
    });
  }
}

async function bumpCoopAgreements(tx: Tx, coopId: string): Promise<void> {
  await tx
    .insert(schema.coopReputationCache)
    .values({ coopId, agreements: 1 })
    .onConflictDoUpdate({
      target: schema.coopReputationCache.coopId,
      set: { agreements: sql`${schema.coopReputationCache.agreements} + 1` },
    });
}

async function sumSettledVolG(tx: Tx, agreementId: string): Promise<bigint> {
  const rows = await tx
    .select({ total: sql<string>`coalesce(sum(${schema.settlement.settledVolG}), 0)` })
    .from(schema.settlement)
    .where(eq(schema.settlement.agreementId, agreementId));
  return BigInt(rows[0]?.total ?? "0");
}

async function latestDelivery(tx: Tx, agreementId: string): Promise<string | null> {
  const rows = await tx
    .select({ id: schema.delivery.id, seq: schema.delivery.seq })
    .from(schema.delivery)
    .where(eq(schema.delivery.agreementId, agreementId));
  if (rows.length === 0) return null;
  return rows.reduce((a, b) => (b.seq > a.seq ? b : a)).id;
}

/* ────────────────────────── pure utils ────────────────────────── */

/** Farmer reputation score (0-100), same shape the badges read. */
function reputationScore(deliveries: number, onTime: number, flags: number): number {
  if (deliveries === 0) return 0;
  const punctuality = (onTime / deliveries) * 100;
  const penalty = flags * 10;
  return Math.max(0, Math.min(100, Math.round(punctuality - penalty)));
}

/** Soroban Symbols arrive as plain strings post-decode; identity for JSON. */
function symbolText(s: string): string {
  return s;
}

/** JSON-safe clone of an event payload: bigint → string for jsonb storage. */
function jsonSafe(data: unknown): unknown {
  return JSON.parse(JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}
