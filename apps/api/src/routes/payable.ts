import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";
import { jsonSafe } from "../lib/read-model.js";

/**
 * Input-payable ("Utang #1") read surface — the running trade payable KMP owes
 * the supplier for dispatched stock (tebus/principal price). OFF-CHAIN ledger
 * (SMART-CONTRACT §8c): accrues on SupplyDispatched, paid down by verified
 * on-chain residu remittances (RemittanceCleared). Read-only; the indexer/seed
 * reducer is the only writer. Money is smallest-unit bigint (string via jsonSafe).
 */

const PAYABLE_COLUMNS = {
  id: schema.supplierPayable.id,
  coopId: schema.supplierPayable.coopId,
  coopName: schema.coop.name,
  supplierId: schema.supplierPayable.supplierId,
  supplierName: schema.supplier.name,
  agreementOnchainId: schema.supplierPayable.agreementOnchainId,
  principalAccrued: schema.supplierPayable.principalAccrued,
  principalSettled: schema.supplierPayable.principalSettled,
  status: schema.supplierPayable.status,
  accruedAt: schema.supplierPayable.accruedAt,
  clearedAt: schema.supplierPayable.clearedAt,
} as const;

function baseQuery() {
  return getDb()
    .select(PAYABLE_COLUMNS)
    .from(schema.supplierPayable)
    .innerJoin(schema.coop, eq(schema.supplierPayable.coopId, schema.coop.id))
    .innerJoin(schema.supplier, eq(schema.supplierPayable.supplierId, schema.supplier.id));
}

export const payableRoute = new Hono()
  /** Aggregates for the supplier's "Utang ke Supplier" panel. */
  .get("/overview", async (c) => {
    const rows = await baseQuery();
    const num = (v: unknown) => BigInt((v as string | null) ?? "0");
    let accrued = 0n;
    let settled = 0n;
    const byStatus = { Outstanding: 0, Partial: 0, Cleared: 0 } as Record<string, number>;
    for (const r of rows) {
      accrued += num(r.principalAccrued);
      settled += num(r.principalSettled);
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    }
    return c.json(
      jsonSafe({
        totals: {
          count: rows.length,
          totalAccrued: accrued,
          totalSettled: settled,
          totalOutstanding: accrued - settled,
          byStatus,
        },
      }),
    );
  })

  /** Full payable ledger, newest accrual first. */
  .get("/", async (c) => {
    const rows = await baseQuery().orderBy(desc(schema.supplierPayable.accruedAt));
    return c.json({ items: jsonSafe(rows) });
  });
