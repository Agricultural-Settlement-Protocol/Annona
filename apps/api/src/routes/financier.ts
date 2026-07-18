import { desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";
import { jsonSafe } from "../lib/read-model.js";
import { type AuthedEnv, requireAnyRole } from "../middleware/auth.js";
import { resolveReturnedId } from "../services/chain-read.js";

/**
 * Financier (Pemodal) read surfaces — Offtake Financing Approval Desk + Portfolio.
 *
 * All read-only (chain is source of truth; the indexer writes the rows). Money
 * is smallest-unit bigint, serialized as string via jsonSafe. Coverage ratio is
 * DERIVED (requested / projected_settlement); note it is inverted vs the
 * conventional sense — LOWER = safer (per SMART-CONTRACT §B).
 */

const REQUEST_COLUMNS = {
  id: schema.fundingRequest.id,
  onchainId: schema.fundingRequest.onchainId,
  coopId: schema.fundingRequest.coopId,
  coopName: schema.coop.name,
  financierId: schema.fundingRequest.financierId,
  financierName: schema.financier.name,
  backingHash: schema.fundingRequest.backingHash,
  projectedSettlement: schema.fundingRequest.projectedSettlement,
  amountRequested: schema.fundingRequest.amountRequested,
  amountApproved: schema.fundingRequest.amountApproved,
  amountDisbursed: schema.fundingRequest.amountDisbursed,
  amountReconciled: schema.fundingRequest.amountReconciled,
  coverageRatioBps: schema.fundingRequest.coverageRatioBps,
  riskBadge: schema.fundingRequest.riskBadge,
  status: schema.fundingRequest.status,
  proofUrl: schema.fundingRequest.proofUrl,
  createdAt: schema.fundingRequest.createdAt,
} as const;

function baseQuery() {
  return getDb()
    .select(REQUEST_COLUMNS)
    .from(schema.fundingRequest)
    .innerJoin(schema.financier, eq(schema.fundingRequest.financierId, schema.financier.id))
    .innerJoin(schema.coop, eq(schema.fundingRequest.coopId, schema.coop.id));
}

/** Backing-agreement lines for a set of funding requests, keyed by request id.
 *  Rides on every list response so (a) the KMP riwayat can deep-link each
 *  backing agreement and (b) the dana picker can exclude agreements already
 *  backing an open request. */
async function linesByRequest(requestIds: string[]) {
  const map = new Map<string, unknown[]>();
  if (requestIds.length === 0) return map;
  const rows = await getDb()
    .select({
      id: schema.fundingRequestLine.id,
      fundingRequestId: schema.fundingRequestLine.fundingRequestId,
      agreementId: schema.fundingRequestLine.agreementId,
      agreementOnchainId: schema.agreement.onchainId,
      farmerName: schema.farmer.name,
      commodityCode: schema.agreement.commodityCode,
      status: schema.agreement.status,
      backingValue: schema.fundingRequestLine.backingValue,
    })
    .from(schema.fundingRequestLine)
    .innerJoin(schema.agreement, eq(schema.fundingRequestLine.agreementId, schema.agreement.id))
    .leftJoin(schema.farmer, eq(schema.agreement.farmerId, schema.farmer.id))
    .where(inArray(schema.fundingRequestLine.fundingRequestId, requestIds));
  for (const r of rows) {
    const list = map.get(r.fundingRequestId) ?? [];
    list.push(r);
    map.set(r.fundingRequestId, list);
  }
  return map;
}

async function withLines<T extends { id: string }>(rows: T[]) {
  const lines = await linesByRequest(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, lines: lines.get(r.id) ?? [] }));
}

export const financierRoute = new Hono<AuthedEnv>()
  /** Dashboard aggregates for the financier home. */
  .get("/overview", async (c) => {
    const rows = await baseQuery();
    const num = (v: unknown) => BigInt((v as string | null) ?? "0");
    let requested = 0n;
    let disbursed = 0n;
    let reconciled = 0n;
    let outstanding = 0n; // disbursed - reconciled, over active advances
    let pendingCount = 0;
    for (const r of rows) {
      requested += num(r.amountRequested);
      disbursed += num(r.amountDisbursed);
      reconciled += num(r.amountReconciled);
      if (r.status === "Requested") pendingCount += 1;
      if (r.status === "Disbursed") outstanding += num(r.amountDisbursed) - num(r.amountReconciled);
    }
    const financierRows = await getDb().select().from(schema.financier).limit(1);
    return c.json(
      jsonSafe({
        financier: financierRows[0] ?? null,
        totals: {
          requestCount: rows.length,
          pendingCount,
          totalRequested: requested,
          totalDisbursed: disbursed,
          totalReconciled: reconciled,
          outstanding,
        },
      }),
    );
  })

  /** Approval desk: requests awaiting a decision (status = Requested). */
  .get("/queue", async (c) => {
    const rows = await baseQuery()
      .where(eq(schema.fundingRequest.status, "Requested"))
      .orderBy(desc(schema.fundingRequest.createdAt));
    return c.json({ items: jsonSafe(await withLines(rows)) });
  })

  /** Portfolio: everything that left the queue (approved / disbursed / reconciled / rejected). */
  .get("/portfolio", async (c) => {
    const rows = await baseQuery()
      .where(
        inArray(schema.fundingRequest.status, ["Approved", "Disbursed", "Reconciled", "Rejected"]),
      )
      .orderBy(desc(schema.fundingRequest.createdAt));
    return c.json({ items: jsonSafe(await withLines(rows)) });
  })

  /** Full history (queue + portfolio), newest first. */
  .get("/", async (c) => {
    const rows = await baseQuery().orderBy(desc(schema.fundingRequest.createdAt));
    return c.json({ items: jsonSafe(await withLines(rows)) });
  })

  /**
   * KMP: persist the off-chain backing lines for a freshly-submitted
   * request_funding tx. The chain only anchors backing_hash; the readable list
   * of WHICH agreements back the advance lives here (funding_request_line), so
   * the picker can exclude them and the financier can inspect the packet.
   */
  .post("/annotate", requireAnyRole, async (c) => {
    if (c.get("role") !== "kmp") {
      return c.json({ error: "Hanya petugas KMP yang dapat melengkapi permintaan dana." }, 403);
    }
    const body = (await c.req.json().catch(() => null)) as {
      txHash?: unknown;
      agreementIds?: unknown;
    } | null;
    const txHash = typeof body?.txHash === "string" ? body.txHash : null;
    const agreementIds = Array.isArray(body?.agreementIds)
      ? (body.agreementIds.filter((x) => typeof x === "string") as string[])
      : [];
    if (!txHash || agreementIds.length === 0) {
      return c.json({ error: "txHash dan agreementIds wajib diisi." }, 400);
    }

    const onchainId = await resolveReturnedId(txHash);
    if (onchainId == null) {
      return c.json({ error: "Transaksi belum terkonfirmasi atau bukan request_funding." }, 409);
    }

    const db = getDb();
    let requestRow: { id: string } | undefined;
    for (let i = 0; i < 30; i++) {
      const rows = await db
        .select({ id: schema.fundingRequest.id })
        .from(schema.fundingRequest)
        .where(eq(schema.fundingRequest.onchainId, onchainId))
        .limit(1);
      requestRow = rows[0];
      if (requestRow) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!requestRow) {
      return c.json(
        { error: `Permintaan dana on-chain #${onchainId} belum terindeks. Coba lagi.` },
        409,
      );
    }
    const fundingRequestId = requestRow.id;

    // backingValue per line = remaining expected volume x hpp (same formula the
    // web used to size the request).
    const agreements = await db
      .select({
        id: schema.agreement.id,
        expectedVolG: schema.agreement.expectedVolG,
        hppPerKg: schema.agreement.hppPerKg,
      })
      .from(schema.agreement)
      .where(inArray(schema.agreement.id, agreementIds));

    if (agreements.length > 0) {
      await db
        .delete(schema.fundingRequestLine)
        .where(eq(schema.fundingRequestLine.fundingRequestId, fundingRequestId));
      await db.insert(schema.fundingRequestLine).values(
        agreements.map((a) => ({
          fundingRequestId,
          agreementId: a.id,
          backingValue: (a.expectedVolG * a.hppPerKg) / 1000n,
        })),
      );
    }

    return c.json({ ok: true, onchainId: String(onchainId), fundingRequestId });
  })

  /** Request detail + backing agreement lines (the proof packet). */
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const rows = await baseQuery().where(eq(schema.fundingRequest.id, id)).limit(1);
    const request = rows[0];
    if (!request) return c.json({ error: "not found" }, 404);
    const lines = await getDb()
      .select({
        id: schema.fundingRequestLine.id,
        agreementId: schema.fundingRequestLine.agreementId,
        agreementOnchainId: schema.agreement.onchainId,
        farmerName: schema.farmer.name,
        commodityCode: schema.agreement.commodityCode,
        status: schema.agreement.status,
        backingValue: schema.fundingRequestLine.backingValue,
      })
      .from(schema.fundingRequestLine)
      .innerJoin(schema.agreement, eq(schema.fundingRequestLine.agreementId, schema.agreement.id))
      .leftJoin(schema.farmer, eq(schema.agreement.farmerId, schema.farmer.id))
      .where(eq(schema.fundingRequestLine.fundingRequestId, id));
    return c.json(jsonSafe({ request, lines }));
  });
