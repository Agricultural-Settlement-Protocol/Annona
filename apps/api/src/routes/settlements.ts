import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";
import { jsonSafe } from "../lib/read-model.js";
import { requireKmpAuth } from "../middleware/auth.js";
import { SettlementError, executeSettlement } from "../services/settlement-orchestrator.js";

/**
 * Settlement (payment) history — Screen: Pembayaran. Each settlement joined with
 * its agreement + farmer + the ACTUAL grade/moisture (mirrored onto the
 * agreement from the latest delivery by the indexer). Mirrors the mock
 * paymentHistoryRows selector. Newest first.
 */
export const settlementsRoute = new Hono()
  .get("/", async (c) => {
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
        principalToSupplier: schema.settlement.principalToSupplier,
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
  })
  /**
   * POST /settlements/execute — server-signed settle() (TASK.md: seamless
   * signing MVP, no Freighter). Backend builds/signs/submits with the
   * service key and returns the on-chain outcome synchronously. Gated to
   * role "kmp" (requireKmpAuth) since settle() requires
   * caller == agreement.coop, and the service key IS the coop's key for
   * this deployment (see utils/stellar.ts).
   *
   * Out of scope for this pass (see TASK.md): idempotency keys, a
   * settlement_attempts table, indexer coupling. The indexer picks up the
   * resulting Settled event on its own normal schedule.
   */
  .post("/execute", requireKmpAuth, async (c) => {
    const body = await c.req.json().catch(() => null);
    const rawOnchainId = body?.onchainId;
    if (typeof rawOnchainId !== "string" || rawOnchainId.trim() === "") {
      return c.json({ error: "onchainId (string) is required" }, 400);
    }

    let onchainId: bigint;
    try {
      onchainId = BigInt(rawOnchainId);
    } catch {
      return c.json({ error: "onchainId must be an integer string" }, 400);
    }
    if (onchainId < 0n) {
      return c.json({ error: "onchainId must be non-negative" }, 400);
    }

    try {
      const result = await executeSettlement(onchainId);
      return c.json({
        ok: true,
        hash: result.hash,
        ledger: result.ledger,
        onchainId: onchainId.toString(),
      });
    } catch (err) {
      if (err instanceof SettlementError) {
        return c.json({ ok: false, error: err.message }, 502);
      }
      return c.json(
        { ok: false, error: err instanceof Error ? err.message : "Settlement failed" },
        500,
      );
    }
  });
