import { isNotNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";
import { jsonSafe } from "../lib/read-model.js";

/**
 * Subsidy / e-RDKK (HET) read surface. Annona RECORDS the external Kementan
 * eligibility outcome, it never computes it (Golden Rule 4 + SMART-CONTRACT §0.1).
 * `subsidy_tier` is the on-chain snapshot of which price tier an agreement's
 * base_price came from; farmer `subsidy_status` is the mutable e-RDKK badge.
 * Read-only. Money is smallest-unit bigint (string via jsonSafe).
 */

export const subsidyRoute = new Hono()
  /** Distribution across the subsidized vs commercial split — agreements (with
   *  projected value), farmer eligibility badges, and the HET-gated catalog. */
  .get("/distribution", async (c) => {
    const db = getDb();

    const byTier = await db
      .select({
        tier: schema.agreement.subsidyTier,
        count: sql<string>`count(*)`,
        // projected value = expected kg * hpp/kg, smallest unit (g→kg via /1000).
        projectedValue: sql<string>`coalesce(sum(${schema.agreement.expectedVolG} * ${schema.agreement.hppPerKg} / 1000), 0)`,
      })
      .from(schema.agreement)
      .groupBy(schema.agreement.subsidyTier);

    const byFarmerStatus = await db
      .select({
        status: schema.farmer.subsidyStatus,
        count: sql<string>`count(*)`,
      })
      .from(schema.farmer)
      .groupBy(schema.farmer.subsidyStatus);

    // HET-tagged catalog items (e-RDKK gated or carrying a HET price).
    const hetItems = await db
      .select({
        id: schema.saprotanCatalog.id,
        name: schema.saprotanCatalog.name,
        priceTier: schema.saprotanCatalog.priceTier,
        hetPrice: schema.saprotanCatalog.hetPrice,
        erdkkGated: schema.saprotanCatalog.erdkkGated,
      })
      .from(schema.saprotanCatalog)
      .where(or(isNotNull(schema.saprotanCatalog.hetPrice), schema.saprotanCatalog.erdkkGated));

    const num = (v: unknown) => BigInt((v as string | null) ?? "0");
    const tiers = byTier.map((t) => ({
      tier: t.tier,
      count: Number(t.count),
      projectedValue: num(t.projectedValue),
    }));

    return c.json(
      jsonSafe({
        byTier: tiers,
        subsidizedAgreementCount: tiers.find((t) => t.tier === "Subsidized")?.count ?? 0,
        commercialAgreementCount: tiers.find((t) => t.tier === "Commercial")?.count ?? 0,
        byFarmerStatus: byFarmerStatus.map((f) => ({ status: f.status, count: Number(f.count) })),
        hetCatalog: hetItems,
      }),
    );
  });
