import type { InferSelectModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";

// ─── Local types ─────────────────────────────────────────────────────────────

const CATEGORY_VALUES = ["pupuk", "benih", "pestisida", "alsintan"] as const;
type CategoryValue = (typeof CATEGORY_VALUES)[number];

const STOCK_VALUES = ["Tersedia", "Menipis", "Habis"] as const;
type StockValue = (typeof STOCK_VALUES)[number];

const PRICE_TIER_VALUES = ["subsidi", "non_subsidi"] as const;
type PriceTierValue = (typeof PRICE_TIER_VALUES)[number];

type CatalogSelect = InferSelectModel<typeof schema.saprotanCatalog>;

/** Editable fields only (supplier_id, id, effective_from are server-managed). */
type CatalogPatch = Partial<
  Pick<
    CatalogSelect,
    | "code"
    | "name"
    | "region"
    | "category"
    | "basePriceSupplier"
    | "subsidiFlag"
    | "priceTier"
    | "hetPrice"
    | "erdkkGated"
    | "unitLabel"
    | "source"
    | "stockStatus"
  >
>;

/** JSON-safe: bigint -> decimal string, null stays null. */
const json = (data: unknown) =>
  JSON.parse(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

/** Convert whole-rupiah string from the form to smallest-unit bigint.
 *  10_000_000 = DIDR_DECIMALS (7). Matches `rupiah()` in @annona/core. */
function toSmallest(wholeRaw: unknown): bigint | null {
  const int = Number.parseInt(String(wholeRaw ?? "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(int) || int <= 0) return null;
  return BigInt(int) * 10_000_000n;
}

/**
 * Supplier Saprotan Catalog CRUD (Screen M).
 * Off-chain reference data owned by the Supplier; direct Postgres writes are
 * correct (not indexer-owned read-models). Mounted at /catalog.
 *
 * Auth: MVP uses the single configured Supplier row (first row of `supplier`
 * table). Multi-tenant auth is a post-MVP concern.
 */
export const catalogRoute = new Hono()
  // ─── GET / — list all catalog items ────────────────────────────────────────
  .get("/", async (c) => {
    const items = await getDb()
      .select()
      .from(schema.saprotanCatalog)
      .orderBy(schema.saprotanCatalog.code);
    return c.json({ items: json(items) });
  })

  // ─── POST / — create a new catalog item ────────────────────────────────────
  .post("/", async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;

    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const region = typeof body?.region === "string" ? body.region.trim() : "";

    if (!code) return c.json({ error: "Kode wajib diisi." }, 400);
    if (!name) return c.json({ error: "Nama wajib diisi." }, 400);
    if (!region) return c.json({ error: "Wilayah wajib diisi." }, 400);

    const basePriceSupplier = toSmallest(body?.basePriceWhole);
    if (basePriceSupplier === null) {
      return c.json({ error: "Harga pokok tidak valid." }, 400);
    }

    const category: CategoryValue = CATEGORY_VALUES.includes(body?.category as CategoryValue)
      ? (body?.category as CategoryValue)
      : "pupuk";
    const stockStatus: StockValue = STOCK_VALUES.includes(body?.stockStatus as StockValue)
      ? (body?.stockStatus as StockValue)
      : "Tersedia";
    const priceTier: PriceTierValue = PRICE_TIER_VALUES.includes(
      body?.priceTier as PriceTierValue,
    )
      ? (body?.priceTier as PriceTierValue)
      : "non_subsidi";

    const subsidiFlag = body?.subsidiFlag === true;
    const erdkkGated = body?.erdkkGated === true;
    const unitLabel =
      typeof body?.unitLabel === "string" && body.unitLabel.trim()
        ? body.unitLabel.trim()
        : "unit";
    const source =
      typeof body?.source === "string" && body.source.trim() ? body.source.trim() : null;

    // Resolve the Supplier owner — MVP: use the first configured Supplier.
    const db = getDb();
    const supplierRows = await db
      .select({ id: schema.supplier.id })
      .from(schema.supplier)
      .limit(1);
    const sup = supplierRows[0];
    if (!sup) return c.json({ error: "Belum ada Supplier terkonfigurasi." }, 500);

    try {
      const rows = await db
        .insert(schema.saprotanCatalog)
        .values({
          supplierId: sup.id,
          code,
          name,
          category,
          region,
          basePriceSupplier,
          subsidiFlag,
          priceTier,
          erdkkGated,
          unitLabel,
          source,
          stockStatus,
        })
        .returning();
      return c.json(json(rows[0]), 201);
    } catch (e) {
      const dup = e instanceof Error && /unique|duplicate/i.test(e.message);
      return c.json(
        {
          error: dup
            ? "Kode dan wilayah ini sudah ada di katalog."
            : "Gagal menyimpan item.",
        },
        400,
      );
    }
  })

  // ─── PATCH /:id — update editable fields ───────────────────────────────────
  .patch("/:id", async (c) => {
    const id = c.req.param("id");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ error: "Body tidak valid." }, 400);

    const patch: CatalogPatch = {};

    if (typeof body.code === "string" && body.code.trim()) patch.code = body.code.trim();
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.region === "string" && body.region.trim())
      patch.region = body.region.trim();
    if (typeof body.unitLabel === "string")
      patch.unitLabel = body.unitLabel.trim() || "unit";
    if (typeof body.source === "string")
      patch.source = body.source.trim() || null;
    if (CATEGORY_VALUES.includes(body.category as CategoryValue))
      patch.category = body.category as CategoryValue;
    if (STOCK_VALUES.includes(body.stockStatus as StockValue))
      patch.stockStatus = body.stockStatus as StockValue;
    if (PRICE_TIER_VALUES.includes(body.priceTier as PriceTierValue))
      patch.priceTier = body.priceTier as PriceTierValue;
    if (typeof body.subsidiFlag === "boolean") patch.subsidiFlag = body.subsidiFlag;
    if (typeof body.erdkkGated === "boolean") patch.erdkkGated = body.erdkkGated;

    if (body.basePriceWhole !== undefined && body.basePriceWhole !== null) {
      const price = toSmallest(body.basePriceWhole);
      if (price !== null) patch.basePriceSupplier = price;
    }

    if (Object.keys(patch).length === 0) {
      return c.json({ error: "Tidak ada field yang diubah." }, 400);
    }

    try {
      const rows = await getDb()
        .update(schema.saprotanCatalog)
        .set(patch)
        .where(eq(schema.saprotanCatalog.id, id))
        .returning();
      if (!rows.length) return c.json({ error: "Item tidak ditemukan." }, 404);
      return c.json(json(rows[0]));
    } catch (e) {
      const dup = e instanceof Error && /unique|duplicate/i.test(e.message);
      return c.json(
        {
          error: dup
            ? "Kode dan wilayah ini sudah ada di katalog."
            : "Gagal memperbarui item.",
        },
        400,
      );
    }
  })

  // ─── DELETE /:id — remove a catalog item ───────────────────────────────────
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const rows = await getDb()
      .delete(schema.saprotanCatalog)
      .where(eq(schema.saprotanCatalog.id, id))
      .returning({ id: schema.saprotanCatalog.id });
    if (!rows.length) return c.json({ error: "Item tidak ditemukan." }, 404);
    return c.json({ ok: true });
  });
