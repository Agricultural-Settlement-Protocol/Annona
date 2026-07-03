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

/** Farmer registry reads (Screen B). Registration writes come with the
 *  seed/registration flow; reads are enough to unblock the dashboards. */
export const farmersRoute = new Hono()
  .get("/", async (c) => {
    const q = c.req.query("q");
    const db = getDb();
    const items = q
      ? await db.select(PUBLIC_COLS).from(schema.farmer).where(ilike(schema.farmer.name, `%${q}%`))
      : await db.select(PUBLIC_COLS).from(schema.farmer);
    return c.json({ items: json(items) });
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const rows = await getDb()
      .select(PUBLIC_COLS)
      .from(schema.farmer)
      .where(eq(schema.farmer.id, id));
    if (rows.length === 0) return c.json({ error: "not_found", id }, 404);
    return c.json(json(rows[0]));
  });
