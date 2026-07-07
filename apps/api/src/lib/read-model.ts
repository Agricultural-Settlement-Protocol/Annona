/**
 * Read-model assembly shared by every KMP route. The `agreement` row stores only
 * chain-mirror status/flag + locked price vars; all running money (paidToFarmer,
 * remainingDebt, residuPrincipal, delivered/settledVolG) is DERIVED here by SUM
 * over `settlement`/`delivery` rows (SMART-CONTRACT.md §5). Output shape mirrors
 * `apps/web/lib/mock-data.ts` MockAgreement so the FE swaps its import for a
 * fetch with no component changes. bigints stay bigint here; routes serialize to
 * string at the wire boundary.
 */
import { eq, inArray, sql } from "drizzle-orm";
import type { getDb, schema as schemaT } from "../db/client.js";
import { schema } from "../db/client.js";

type Db = ReturnType<typeof getDb>;

export interface Sums {
  netPaid: bigint;
  handlingCut: bigint;
  coopMargin: bigint;
  principalToAgrinas: bigint;
  debtNetted: bigint;
  settledVolG: bigint;
}
const ZERO: Sums = {
  netPaid: 0n,
  handlingCut: 0n,
  coopMargin: 0n,
  principalToAgrinas: 0n,
  debtNetted: 0n,
  settledVolG: 0n,
};

async function settlementSums(db: Db, ids: string[]): Promise<Map<string, Sums>> {
  const map = new Map<string, Sums>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({
      agreementId: schema.settlement.agreementId,
      netPaid: sql<string>`coalesce(sum(${schema.settlement.netPaid}),0)`,
      handlingCut: sql<string>`coalesce(sum(${schema.settlement.handlingCut}),0)`,
      coopMargin: sql<string>`coalesce(sum(${schema.settlement.coopMargin}),0)`,
      principalToAgrinas: sql<string>`coalesce(sum(${schema.settlement.principalToAgrinas}),0)`,
      debtNetted: sql<string>`coalesce(sum(${schema.settlement.debtNetted}),0)`,
      settledVolG: sql<string>`coalesce(sum(${schema.settlement.settledVolG}),0)`,
    })
    .from(schema.settlement)
    .where(inArray(schema.settlement.agreementId, ids))
    .groupBy(schema.settlement.agreementId);
  for (const r of rows) {
    map.set(r.agreementId, {
      netPaid: BigInt(r.netPaid),
      handlingCut: BigInt(r.handlingCut),
      coopMargin: BigInt(r.coopMargin),
      principalToAgrinas: BigInt(r.principalToAgrinas),
      debtNetted: BigInt(r.debtNetted),
      settledVolG: BigInt(r.settledVolG),
    });
  }
  return map;
}

async function deliverySums(db: Db, ids: string[]): Promise<Map<string, bigint>> {
  const map = new Map<string, bigint>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({
      agreementId: schema.delivery.agreementId,
      volumeG: sql<string>`coalesce(sum(${schema.delivery.volumeG}),0)`,
    })
    .from(schema.delivery)
    .where(inArray(schema.delivery.agreementId, ids))
    .groupBy(schema.delivery.agreementId);
  for (const r of rows) map.set(r.agreementId, BigInt(r.volumeG));
  return map;
}

/** createTxHash per on-chain id, from the AgreementCreated event log. */
async function createTxByOnchain(db: Db): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const rows = await db
    .select({ txHash: schema.eventLog.txHash, data: schema.eventLog.data })
    .from(schema.eventLog)
    .where(eq(schema.eventLog.type, "AgreementCreated"));
  for (const r of rows) {
    const id = (r.data as { id?: string | number }).id;
    if (id != null) map.set(String(id), r.txHash);
  }
  return map;
}

/** Base agreement rows joined with the farmer display name (name is off-chain-OK). */
function selectAgreements(db: Db) {
  return db
    .select({
      id: schema.agreement.id,
      onchainId: schema.agreement.onchainId,
      coopId: schema.agreement.coopId,
      farmerId: schema.agreement.farmerId,
      agrinasId: schema.agreement.agrinasId,
      commodityCode: schema.agreement.commodityCode,
      grade: schema.agreement.grade,
      moistureBps: schema.agreement.moistureBps,
      basePriceAgrinas: schema.agreement.basePriceAgrinas,
      saprotanMarkupBps: schema.agreement.saprotanMarkupBps,
      inputDebt: schema.agreement.inputDebt,
      hppHandlingFeeBps: schema.agreement.hppHandlingFeeBps,
      expectedVolG: schema.agreement.expectedVolG,
      hppPerKg: schema.agreement.hppPerKg,
      hppVersion: schema.agreement.hppVersion,
      toleranceBps: schema.agreement.toleranceBps,
      status: schema.agreement.status,
      flag: schema.agreement.flag,
      residuStatus: schema.agreement.residuStatus,
      expectedHarvestDate: schema.agreement.expectedHarvestDate,
      createdAt: schema.agreement.createdAt,
      farmerName: schema.farmer.name,
    })
    .from(schema.agreement)
    .leftJoin(schema.farmer, eq(schema.agreement.farmerId, schema.farmer.id));
}

type BaseRow = Awaited<ReturnType<typeof selectAgreements>>[number];

/** MockAgreement-shaped view with derived running money. bigints preserved. */
export interface EnrichedAgreement {
  id: string;
  onchainId: bigint | null;
  farmerId: string;
  farmerName: string | null;
  commodityCode: string;
  grade: string;
  moistureBps: number;
  basePriceAgrinas: bigint;
  saprotanMarkupBps: number;
  inputDebt: bigint;
  hppHandlingFeeBps: number;
  hppPerKg: bigint;
  hppVersion: number;
  expectedVolG: bigint;
  expectedVolKg: number;
  deliveredVolG: bigint;
  settledVolG: bigint;
  toleranceBps: number;
  status: BaseRow["status"];
  flag: BaseRow["flag"];
  remainingDebt: bigint;
  paidToFarmer: bigint;
  coopHandlingAccrued: bigint;
  coopMarginAccrued: bigint;
  residuPrincipal: bigint;
  residuStatus: BaseRow["residuStatus"];
  createdAt: Date;
  createTxHash: string | null;
  expectedHarvestDate: string | null;
}

function enrich(
  a: BaseRow,
  s: Sums,
  deliveredG: bigint,
  createTx: string | undefined,
): EnrichedAgreement {
  return {
    id: a.id,
    onchainId: a.onchainId,
    farmerId: a.farmerId,
    farmerName: a.farmerName,
    commodityCode: a.commodityCode,
    grade: a.grade,
    moistureBps: a.moistureBps,
    basePriceAgrinas: a.basePriceAgrinas,
    saprotanMarkupBps: a.saprotanMarkupBps,
    inputDebt: a.inputDebt,
    hppHandlingFeeBps: a.hppHandlingFeeBps,
    hppPerKg: a.hppPerKg,
    hppVersion: a.hppVersion,
    expectedVolG: a.expectedVolG,
    expectedVolKg: Number(a.expectedVolG) / 1000,
    deliveredVolG: deliveredG,
    settledVolG: s.settledVolG,
    toleranceBps: a.toleranceBps,
    status: a.status,
    flag: a.flag,
    remainingDebt: a.inputDebt - s.debtNetted,
    paidToFarmer: s.netPaid,
    coopHandlingAccrued: s.handlingCut,
    coopMarginAccrued: s.coopMargin,
    residuPrincipal: s.principalToAgrinas,
    residuStatus: a.residuStatus,
    createdAt: a.createdAt,
    createTxHash: createTx ?? null,
    expectedHarvestDate: a.expectedHarvestDate,
  };
}

/** All agreements, enriched with derived running money. */
export async function listAgreements(db: Db): Promise<EnrichedAgreement[]> {
  const rows = await selectAgreements(db);
  const ids = rows.map((r) => r.id);
  const [sums, deliv, createTx] = await Promise.all([
    settlementSums(db, ids),
    deliverySums(db, ids),
    createTxByOnchain(db),
  ]);
  return rows.map((r) =>
    enrich(
      r,
      sums.get(r.id) ?? ZERO,
      deliv.get(r.id) ?? 0n,
      r.onchainId != null ? createTx.get(String(r.onchainId)) : undefined,
    ),
  );
}

/** One agreement enriched + its nested inputs/deliveries/settlements/residu. */
export async function getAgreementDetail(db: Db, id: string) {
  const rows = await selectAgreements(db).where(eq(schema.agreement.id, id));
  const a = rows[0];
  if (!a) return null;
  const [sums, deliv, createTx, inputs, deliveries, settlements, residu] = await Promise.all([
    settlementSums(db, [a.id]),
    deliverySums(db, [a.id]),
    createTxByOnchain(db),
    db.select().from(schema.agreementInput).where(eq(schema.agreementInput.agreementId, a.id)),
    db
      .select()
      .from(schema.delivery)
      .where(eq(schema.delivery.agreementId, a.id))
      .orderBy(schema.delivery.seq),
    db
      .select()
      .from(schema.settlement)
      .where(eq(schema.settlement.agreementId, a.id))
      .orderBy(schema.settlement.settledAt),
    db
      .select()
      .from(schema.residuRemittance)
      .where(eq(schema.residuRemittance.agreementOnchainId, a.onchainId ?? -1n)),
  ]);
  const agreement = enrich(
    a,
    sums.get(a.id) ?? ZERO,
    deliv.get(a.id) ?? 0n,
    a.onchainId != null ? createTx.get(String(a.onchainId)) : undefined,
  );
  return { ...agreement, inputs, deliveries, settlements, residu };
}

/** bigint -> string JSON serializer so money/volumes stay exact over the wire. */
export const jsonSafe = (data: unknown) =>
  JSON.parse(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

// re-export the schema type namespace alias so routes can annotate if needed
export type { schemaT };
