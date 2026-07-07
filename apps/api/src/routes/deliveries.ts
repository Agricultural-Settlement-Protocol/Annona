import { asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";

const json = (data: unknown) =>
  JSON.parse(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

/**
 * Delivery (harvest-receipt) list — backs the Setor-Panen history table.
 * Each row joins the farmer + agreement onchain id, and carries a
 * settlement-aware `paid` flag: a delivery counts as paid when the agreement's
 * cumulative settled volume (SUM over settlement rows) covers it, in seq order
 * (staged settlement pays earliest deliveries first).
 */
export const deliveriesRoute = new Hono().get("/", async (c) => {
  const db = getDb();

  const rows = await db
    .select({
      id: schema.delivery.id,
      agreementId: schema.delivery.agreementId,
      agreementOnchainId: schema.agreement.onchainId,
      farmerId: schema.farmer.id,
      farmerName: schema.farmer.name,
      commodityCode: schema.agreement.commodityCode,
      seq: schema.delivery.seq,
      volumeG: schema.delivery.volumeG,
      grade: schema.delivery.grade,
      moistureBps: schema.delivery.moistureBps,
      receiptOnchainRef: schema.delivery.receiptOnchainRef,
      deliveredAt: schema.delivery.deliveredAt,
      flag: schema.delivery.flag,
    })
    .from(schema.delivery)
    .innerJoin(schema.agreement, eq(schema.agreement.id, schema.delivery.agreementId))
    .innerJoin(schema.farmer, eq(schema.farmer.id, schema.agreement.farmerId))
    .orderBy(asc(schema.delivery.agreementId), asc(schema.delivery.seq));

  // Per-agreement settled volume (SUM over settlement rows).
  const settledRows = await db
    .select({
      agreementId: schema.settlement.agreementId,
      settledVolG: sql<string>`sum(${schema.settlement.settledVolG})`,
    })
    .from(schema.settlement)
    .groupBy(schema.settlement.agreementId);
  const settledByAgreement = new Map(settledRows.map((r) => [r.agreementId, BigInt(r.settledVolG)]));

  // Walk deliveries in (agreement, seq) order; a delivery is paid when the
  // running cumulative volume for its agreement is within the settled total.
  const cumulativeByAgreement = new Map<string, bigint>();
  const items = rows.map((d) => {
    const prior = cumulativeByAgreement.get(d.agreementId) ?? 0n;
    const cumulative = prior + d.volumeG;
    cumulativeByAgreement.set(d.agreementId, cumulative);
    const settled = settledByAgreement.get(d.agreementId) ?? 0n;
    return { ...d, paid: cumulative <= settled };
  });

  // Newest first for the history table.
  items.sort((a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime());
  return c.json({ items: json(items) });
});
