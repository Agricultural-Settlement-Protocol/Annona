import { createHash, randomBytes } from "node:crypto";
import { eq, ilike } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";

const SUBSIDY_VALUES = ["Terverifikasi", "Belum", "NonSubsidi"] as const;
type SubsidyValue = (typeof SUBSIDY_VALUES)[number];

/** Base32 (Stellar strkey alphabet) G-address placeholder for a farmer the
 *  officer registered without pasting a real wallet (demo). */
function placeholderWallet(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  return `G${Array.from(randomBytes(55))
    .map((b) => alphabet[b % 32])
    .join("")}`;
}

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
  subsidyStatus: schema.farmer.subsidyStatus,
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
  })
  // Off-chain farmer registration (Screen B). Raw KTP + name are PII → stored
  // ONLY here (Postgres); the server computes ktp_hash (what the chain would
  // anchor). No wallet/chain needed, so any officer can register and it PERSISTS
  // across refresh (unlike the old demo-local form).
  .post("/", async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const ktpRaw = typeof body?.ktpRaw === "string" ? body.ktpRaw.trim() : "";
    const kecamatan = typeof body?.kecamatan === "string" ? body.kecamatan.trim() : "";
    const plotAreaHa = Number(body?.plotAreaHa);
    if (!name || !ktpRaw || !kecamatan) {
      return c.json({ error: "Nama, KTP, dan kecamatan wajib diisi." }, 400);
    }
    if (!Number.isFinite(plotAreaHa) || plotAreaHa <= 0) {
      return c.json({ error: "Luas lahan tidak valid." }, 400);
    }

    const db = getDb();
    const coopRows = await db
      .select({ id: schema.coop.id, kabupaten: schema.coop.kabupaten })
      .from(schema.coop)
      .limit(1);
    const coop = coopRows[0];
    if (!coop) return c.json({ error: "Belum ada koperasi terkonfigurasi." }, 500);

    const ktpHash = createHash("sha256").update(ktpRaw).digest("hex");
    const walletAddress =
      typeof body?.walletAddress === "string" && body.walletAddress.trim()
        ? body.walletAddress.trim()
        : placeholderWallet();
    const subsidyStatus: SubsidyValue = SUBSIDY_VALUES.includes(body?.subsidyStatus as SubsidyValue)
      ? (body?.subsidyStatus as SubsidyValue)
      : "NonSubsidi";
    const commodityCode =
      typeof body?.defaultCommodityCode === "string" ? body.defaultCommodityCode : "GABAH";

    try {
      const inserted = await db
        .insert(schema.farmer)
        .values({
          coopId: coop.id,
          name,
          ktpRaw,
          ktpHash,
          walletAddress,
          plotAreaHa: String(plotAreaHa),
          defaultCommodityCode: commodityCode,
          kecamatan,
          kabupaten: coop.kabupaten,
          subsidyStatus,
        })
        .returning({ id: schema.farmer.id });
      const id = inserted[0]?.id;
      const rows = await db
        .select({ ...PUBLIC_COLS, ...REP_COLS })
        .from(schema.farmer)
        .leftJoin(schema.reputationCache, eq(schema.reputationCache.farmerId, schema.farmer.id))
        .where(eq(schema.farmer.id, id ?? ""));
      return c.json(json(shapeFarmer(rows[0] as Parameters<typeof shapeFarmer>[0])), 201);
    } catch (e) {
      const dup = e instanceof Error && /unique|duplicate/i.test(e.message);
      return c.json(
        { error: dup ? "Alamat wallet sudah terdaftar." : "Gagal menyimpan petani." },
        400,
      );
    }
  });
