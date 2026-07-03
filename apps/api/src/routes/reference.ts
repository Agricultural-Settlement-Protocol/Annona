import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";

/** JSON-safe serializer: bigint -> string (money/volumes stay exact). */
const json = (data: unknown) =>
  JSON.parse(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

/**
 * Reference data reads (off-chain authoritative):
 * - commodities + current HPP anchor (price_ref)
 * - Agrinas master saprotan catalog (base_price_agrinas = principal)
 * - yield table backing the transparent estimator
 */
export const referenceRoute = new Hono()
  .get("/commodities", async (c) => {
    const items = await getDb().select().from(schema.commodity);
    return c.json({ items: json(items) });
  })
  .get("/hpp", async (c) => {
    const items = await getDb()
      .select()
      .from(schema.priceRef)
      .orderBy(desc(schema.priceRef.asOf));
    return c.json({ items: json(items) });
  })
  .get("/catalog", async (c) => {
    const region = c.req.query("region");
    const db = getDb();
    const items = region
      ? await db
          .select()
          .from(schema.saprotanCatalog)
          .where(eq(schema.saprotanCatalog.region, region))
      : await db.select().from(schema.saprotanCatalog);
    return c.json({ items: json(items) });
  })
  .get("/yield", async (c) => {
    const items = await getDb().select().from(schema.yieldTable);
    return c.json({ items: json(items) });
  });
