import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";
import { jsonSafe } from "../lib/read-model.js";

/**
 * Residu reconciliation ledger — Screen: Residu Supplier. The supplier principal
 * that passed through KMP cash and is owed back, with its remittance status
 * (Pending -> Remitted -> Cleared, or Disputed). Residu principal is Supplier's
 * money, never KMP's (Golden Rule 6b). Joined with agreement + farmer for
 * display. Mirrors the mock residu ledger.
 */
export const residuRoute = new Hono().get("/", async (c) => {
  const rows = await getDb()
    .select({
      id: schema.residuRemittance.id,
      agreementOnchainId: schema.residuRemittance.agreementOnchainId,
      agreementId: schema.agreement.id,
      farmerName: schema.farmer.name,
      commodityCode: schema.agreement.commodityCode,
      principalAmount: schema.residuRemittance.principalAmount,
      status: schema.residuRemittance.status,
      bankRef: schema.residuRemittance.bankRef,
      disputeReason: schema.residuRemittance.disputeReason,
      txHash: schema.residuRemittance.remittanceTxHash,
      remittedAt: schema.residuRemittance.remittedAt,
      clearedAt: schema.residuRemittance.clearedAt,
    })
    .from(schema.residuRemittance)
    .leftJoin(
      schema.agreement,
      eq(schema.residuRemittance.agreementOnchainId, schema.agreement.onchainId),
    )
    .leftJoin(schema.farmer, eq(schema.agreement.farmerId, schema.farmer.id))
    .orderBy(desc(schema.residuRemittance.remittedAt));
  return c.json({ items: jsonSafe(rows) });
});
