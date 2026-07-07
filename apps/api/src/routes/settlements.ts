import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";
import { jsonSafe } from "../lib/read-model.js";

/**
 * Settlement (payment) history — Screen: Pembayaran. Each settlement joined with
 * its agreement + farmer + the ACTUAL grade/moisture (mirrored onto the
 * agreement from the latest delivery by the indexer). Mirrors the mock
 * paymentHistoryRows selector. Newest first.
 */
export const settlementsRoute = new Hono().get("/", async (c) => {
  const rows = await getDb()
    .select({
      id: schema.settlement.id,
      agreementId: schema.settlement.agreementId,
      onchainId: schema.agreement.onchainId,
      farmerId: schema.agreement.farmerId,
      farmerName: schema.farmer.name,
      commodityCode: schema.agreement.commodityCode,
      grade: schema.agreement.grade,
      moistureBps: schema.agreement.moistureBps,
      gross: schema.settlement.gross,
      handlingCut: schema.settlement.handlingCut,
      debtNetted: schema.settlement.debtNetted,
      principalToAgrinas: schema.settlement.principalToAgrinas,
      coopMargin: schema.settlement.coopMargin,
      netPaid: schema.settlement.netPaid,
      settledVolG: schema.settlement.settledVolG,
      rupiahRef: schema.settlement.rupiahRef,
      txHash: schema.settlement.settlementTxHash,
      settledAt: schema.settlement.settledAt,
    })
    .from(schema.settlement)
    .innerJoin(schema.agreement, eq(schema.settlement.agreementId, schema.agreement.id))
    .leftJoin(schema.farmer, eq(schema.agreement.farmerId, schema.farmer.id))
    .orderBy(desc(schema.settlement.settledAt));
  return c.json({ items: jsonSafe(rows) });
});
