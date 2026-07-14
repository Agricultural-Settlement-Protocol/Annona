import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";

/** Serialise rows safely — no bigints in this table, but keep the same
 *  helper pattern as farmers.ts for consistency. */
const json = (data: unknown) =>
  JSON.parse(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

const VALID_CATEGORIES = ["saprotan", "hasil-panen"] as const;
type StockCategory = (typeof VALID_CATEGORIES)[number];

/** Off-chain warehouse stock ledger (Screen F — Gudang, Zone 2).
 *  A direct Postgres write — NOT an indexer read-model.
 *  GET: list rows for the first coop (newest first).
 *  POST: create a new row (itemName + category required; qty fields default '').
 *  PATCH /:id: update inQty / outQty / balance / note. */
export const warehouseRoute = new Hono()
  .get("/", async (c) => {
    const db = getDb();
    const coopRows = await db.select({ id: schema.coop.id }).from(schema.coop).limit(1);
    const coop = coopRows[0];
    if (!coop) return c.json({ items: [] });

    const rows = await db
      .select()
      .from(schema.warehouseStock)
      .where(eq(schema.warehouseStock.coopId, coop.id))
      .orderBy(desc(schema.warehouseStock.createdAt));
    return c.json({ items: json(rows) });
  })

  .post("/", async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const itemName = typeof body?.itemName === "string" ? body.itemName.trim() : "";
    const category = body?.category as string | undefined;

    if (!itemName) {
      return c.json({ error: "Nama barang wajib diisi." }, 400);
    }
    if (!category || !VALID_CATEGORIES.includes(category as StockCategory)) {
      return c.json({ error: "Kategori tidak valid. Gunakan saprotan atau hasil-panen." }, 400);
    }

    const inQty = typeof body?.inQty === "string" ? body.inQty.trim() : "";
    const outQty = typeof body?.outQty === "string" ? body.outQty.trim() : "";
    const balance = typeof body?.balance === "string" ? body.balance.trim() : "";
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    const db = getDb();
    const coopRows = await db.select({ id: schema.coop.id }).from(schema.coop).limit(1);
    const coop = coopRows[0];
    if (!coop) return c.json({ error: "Belum ada koperasi terkonfigurasi." }, 500);

    try {
      const inserted = await db
        .insert(schema.warehouseStock)
        .values({
          coopId: coop.id,
          itemName,
          category,
          inQty,
          outQty,
          balance,
          note,
        })
        .returning();
      return c.json(json(inserted[0]), 201);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[warehouse] POST error:", msg);
      return c.json({ error: "Gagal menyimpan data stok." }, 500);
    }
  })

  .patch("/:id", async (c) => {
    const id = c.req.param("id");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;

    const db = getDb();
    const existing = await db
      .select({ id: schema.warehouseStock.id })
      .from(schema.warehouseStock)
      .where(eq(schema.warehouseStock.id, id))
      .limit(1);
    if (!existing.length) return c.json({ error: "not_found", id }, 404);

    const patch: Partial<{
      inQty: string;
      outQty: string;
      balance: string;
      note: string;
      updatedAt: Date;
    }> = {};
    if (typeof body?.inQty === "string") patch.inQty = body.inQty.trim();
    if (typeof body?.outQty === "string") patch.outQty = body.outQty.trim();
    if (typeof body?.balance === "string") patch.balance = body.balance.trim();
    if (typeof body?.note === "string") patch.note = body.note.trim();
    patch.updatedAt = new Date();

    try {
      const updated = await db
        .update(schema.warehouseStock)
        .set(patch)
        .where(eq(schema.warehouseStock.id, id))
        .returning();
      return c.json(json(updated[0]));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[warehouse] PATCH error:", msg);
      return c.json({ error: "Gagal memperbarui data stok." }, 500);
    }
  });
