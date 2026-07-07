import { eq, ilike } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";

const json = (data: unknown) =>
  JSON.parse(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

/** Strip PII the wire never needs. ktp_raw NEVER leaves this DB; expose only
 *  the hash (it is what's anchored on-chain anyway). */
const PUBLIC_COLS = {
  id: schema.farmer.id,
  coopId: schema.farmer.coopId,
  name: schema.farmer.name,
  ktpHash: schema.farmer.ktpHash,
  walletAddress: schema.farmer.walletAddress,
  plotAreaHa: schema.farmer.plotAreaHa,
  defaultCommodityCode: schema.farmer.defaultCommodityCode,
  kecamatan: schema.farmer.kecamatan,
  kabupaten: schema.farmer.kabupaten,
  createdAt: schema.farmer.createdAt,
};

/** Reputation columns from the cache. Left-joined, so a farmer with no history
 *  yet gets nulls -> zeroed in shapeFarmer. */
const REP_COLS = {
  repDeliveries: schema.reputationCache.deliveries,
  repOnTime: schema.reputationCache.onTime,
  repTotalSettledG: schema.reputationCache.totalSettledG,
  repFlags: schema.reputationCache.flags,
  repForceMajeure: schema.reputationCache.forceMajeureEvents,
  repScore: schema.reputationCache.score,
};

type RepTier = "baru" | "andal" | "tepercaya";
type FarmerJoinRow = { [K in keyof (typeof PUBLIC_COLS & typeof REP_COLS)]: unknown };

/** Score (0-100) + delivery history -> UI tier. A farmer needs a track record
 *  before earning "tepercaya"; brand-new farmers are always "baru". A simple
 *  transparent rule (not the mock's hand-tuned assignments: ~8/10 agree, the
 *  rest are high-score mid-history farmers the mock kept at "andal"). */
function deriveRepTier(deliveries: number, score: number): RepTier {
  if (deliveries < 3) return "baru";
  if (score >= 85) return "tepercaya";
  return "andal";
}

/** Fold the flat join row into a farmer with a nested reputation object + tier. */
function shapeFarmer(row: FarmerJoinRow) {
  const deliveries = Number(row.repDeliveries ?? 0);
  const onTime = Number(row.repOnTime ?? 0);
  const totalSettledG = (row.repTotalSettledG as bigint | null) ?? 0n;
  const flags = Number(row.repFlags ?? 0);
  const forceMajeureEvents = Number(row.repForceMajeure ?? 0);
  const score = Number(row.repScore ?? 0);
  const {
    repDeliveries: _d,
    repOnTime: _o,
    repTotalSettledG: _t,
    repFlags: _f,
    repForceMajeure: _fm,
    repScore: _s,
    ...farmer
  } = row;
  return {
    ...farmer,
    repTier: deriveRepTier(deliveries, score),
    reputation: {
      deliveries,
      onTime,
      totalSettledKg: Number(totalSettledG / 1000n),
      flags,
      forceMajeureEvents,
      score,
    },
  };
}

/** Farmer registry reads (Screen B). Registration writes come with the
 *  seed/registration flow; reads are enough to unblock the dashboards.
 *  Reputation is left-joined from `reputation_cache` (Screen B badges + the
 *  agreement-detail farmer card). */
export const farmersRoute = new Hono()
  .get("/", async (c) => {
    const q = c.req.query("q");
    const db = getDb();
    const base = db
      .select({ ...PUBLIC_COLS, ...REP_COLS })
      .from(schema.farmer)
      .leftJoin(schema.reputationCache, eq(schema.reputationCache.farmerId, schema.farmer.id));
    const rows = q ? await base.where(ilike(schema.farmer.name, `%${q}%`)) : await base;
    return c.json({ items: json(rows.map(shapeFarmer)) });
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const rows = await getDb()
      .select({ ...PUBLIC_COLS, ...REP_COLS })
      .from(schema.farmer)
      .leftJoin(schema.reputationCache, eq(schema.reputationCache.farmerId, schema.farmer.id))
      .where(eq(schema.farmer.id, id));
    const row = rows[0];
    if (!row) return c.json({ error: "not_found", id }, 404);
    return c.json(json(shapeFarmer(row)));
  });
