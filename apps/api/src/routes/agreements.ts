import { and, eq, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";
import { getAgreementDetail, jsonSafe, listAgreements } from "../lib/read-model.js";
import { type AuthedEnv, requireAnyRole } from "../middleware/auth.js";
import { resolveReturnedId } from "../services/chain-read.js";

/**
 * Agreement reads over the indexed read-models. Running money is DERIVED by SUM
 * over settlement/delivery rows (see lib/read-model.ts). Output mirrors
 * `apps/web/lib/mock-data.ts` MockAgreement; bigints cross the wire as strings.
 *
 * Two authenticated OFF-CHAIN writes live here too:
 *  - POST /supply-request : KMP submits Created drafts to the Supplier. There is
 *    deliberately NO contract fn for this step (the next on-chain event is
 *    dispatch_supply, Supplier-signed), so it persists as
 *    agreement.supply_requested_at.
 *  - POST /annotate : after a create_agreement tx confirms, the web sends the
 *    off-chain detail the chain never carries (saprotan input basket + expected
 *    harvest date). The on-chain id is resolved from the tx's RETURN VALUE, then
 *    we wait for the indexer to project the row.
 */
export const agreementsRoute = new Hono<AuthedEnv>()
  .get("/", async (c) => {
    const items = await listAgreements(getDb());
    return c.json({ items: jsonSafe(items) });
  })

  // ── KMP: submit selected Created drafts to the Supplier (off-chain step) ──
  .post("/supply-request", requireAnyRole, async (c) => {
    if (c.get("role") !== "kmp") {
      return c.json({ error: "Hanya petugas KMP yang dapat mengirim permintaan saprotan." }, 403);
    }
    const body = (await c.req.json().catch(() => null)) as { ids?: unknown } | null;
    const ids = Array.isArray(body?.ids)
      ? (body.ids.filter((x) => typeof x === "string") as string[])
      : [];
    if (ids.length === 0) {
      return c.json({ error: "Pilih minimal satu draf permintaan." }, 400);
    }

    const db = getDb();
    const updated = await db
      .update(schema.agreement)
      .set({ supplyRequestedAt: new Date() })
      .where(
        and(
          inArray(schema.agreement.id, ids),
          eq(schema.agreement.status, "Created"),
          isNull(schema.agreement.supplyRequestedAt),
        ),
      )
      .returning({ id: schema.agreement.id });
    if (updated.length === 0) {
      return c.json({ error: "Tidak ada draf yang bisa dikirim (mungkin sudah terkirim)." }, 409);
    }
    return c.json({ ok: true, submitted: updated.map((r) => r.id) });
  })

  // ── KMP: persist off-chain detail for a freshly-created agreement ─────────
  .post("/annotate", requireAnyRole, async (c) => {
    if (c.get("role") !== "kmp") {
      return c.json({ error: "Hanya petugas KMP yang dapat melengkapi data perjanjian." }, 403);
    }
    const body = (await c.req.json().catch(() => null)) as {
      txHash?: unknown;
      expectedHarvestDate?: unknown;
      inputs?: unknown;
    } | null;
    const txHash = typeof body?.txHash === "string" ? body.txHash : null;
    if (!txHash) return c.json({ error: "txHash wajib diisi." }, 400);

    const expectedHarvestDate =
      typeof body?.expectedHarvestDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.expectedHarvestDate)
        ? body.expectedHarvestDate
        : null;
    const inputs = Array.isArray(body?.inputs)
      ? (body.inputs as { catalogId?: unknown; qty?: unknown }[])
          .map((i) => ({
            catalogId: typeof i.catalogId === "string" ? i.catalogId : null,
            qty: typeof i.qty === "number" && Number.isInteger(i.qty) && i.qty > 0 ? i.qty : null,
          }))
          .filter(
            (i): i is { catalogId: string; qty: number } => i.catalogId != null && i.qty != null,
          )
      : [];

    const onchainId = await resolveReturnedId(txHash);
    if (onchainId == null) {
      return c.json({ error: "Transaksi belum terkonfirmasi atau bukan create_agreement." }, 409);
    }

    // Wait for the indexer to project the new agreement row (poll interval ~5s).
    const db = getDb();
    let agreementRow: { id: string } | undefined;
    for (let i = 0; i < 30; i++) {
      const rows = await db
        .select({ id: schema.agreement.id })
        .from(schema.agreement)
        .where(eq(schema.agreement.onchainId, onchainId))
        .limit(1);
      agreementRow = rows[0];
      if (agreementRow) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!agreementRow) {
      return c.json(
        { error: `Perjanjian on-chain #${onchainId} belum terindeks. Coba lagi sebentar lagi.` },
        409,
      );
    }
    const agreementId = agreementRow.id;

    if (expectedHarvestDate) {
      await db
        .update(schema.agreement)
        .set({ expectedHarvestDate })
        .where(eq(schema.agreement.id, agreementId));
    }

    if (inputs.length > 0) {
      const catalogRows = await db
        .select({
          id: schema.saprotanCatalog.id,
          basePriceSupplier: schema.saprotanCatalog.basePriceSupplier,
        })
        .from(schema.saprotanCatalog)
        .where(
          inArray(
            schema.saprotanCatalog.id,
            inputs.map((i) => i.catalogId),
          ),
        );
      const priceById = new Map(catalogRows.map((r) => [r.id, r.basePriceSupplier]));
      const lines = inputs
        .filter((i) => priceById.has(i.catalogId))
        .map((i) => {
          const base = priceById.get(i.catalogId) ?? 0n;
          return {
            agreementId,
            catalogId: i.catalogId,
            qty: String(i.qty),
            basePriceSupplier: base,
            lineTotalPrincipal: base * BigInt(i.qty),
          };
        });
      if (lines.length > 0) {
        // Idempotent: re-annotating replaces the basket instead of duplicating.
        await db
          .delete(schema.agreementInput)
          .where(eq(schema.agreementInput.agreementId, agreementId));
        await db.insert(schema.agreementInput).values(lines);
      }
    }

    return c.json({ ok: true, onchainId: String(onchainId), agreementId });
  })

  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const detail = await getAgreementDetail(getDb(), id);
    if (!detail) return c.json({ error: "not_found", id }, 404);
    return c.json(jsonSafe(detail));
  });
