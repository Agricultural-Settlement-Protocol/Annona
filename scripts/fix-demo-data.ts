/**
 * One-shot demo-data repair (idempotent). Fixes the OFF-CHAIN gaps that made
 * the demo incoherent — never touches the chain:
 *
 *  1. agreement_input backfill for UI-created agreements that predate the
 *     annotate endpoint (they showed empty "item" cells in Permintaan).
 *     Lines are snapshot-priced so they sum EXACTLY to base_price_supplier.
 *  2. expected_harvest_date backfill (null rows broke "Panen Minggu Ini" and
 *     showed blank volume cells).
 *  3. supply_requested_at backfill: any agreement already past Created has
 *     logically passed the request step; Created drafts stay NULL (= Draft).
 *  4. funding_request_line backfill so (a) the financier can see WHICH
 *     agreements back each advance and (b) the dana picker excludes them.
 *
 * Run: DATABASE_URL=... pnpm --filter @annona/scripts exec tsx fix-demo-data.ts
 */
import "dotenv/config";
import { eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "../apps/api/src/db/client.js";

const db = getDb();

// ── 1. Input baskets ─────────────────────────────────────────────────────────

const catalog = await db
  .select({
    id: schema.saprotanCatalog.id,
    name: schema.saprotanCatalog.name,
    basePriceSupplier: schema.saprotanCatalog.basePriceSupplier,
  })
  .from(schema.saprotanCatalog)
  .orderBy(sql`${schema.saprotanCatalog.basePriceSupplier} desc`);
if (catalog.length === 0) throw new Error("saprotan_catalog kosong");

const missingInputs = await db
  .select({
    id: schema.agreement.id,
    onchainId: schema.agreement.onchainId,
    base: schema.agreement.basePriceSupplier,
  })
  .from(schema.agreement)
  .where(
    sql`not exists (select 1 from agreement_input i where i.agreement_id = ${schema.agreement.id})`,
  );

for (const a of missingInputs) {
  // Greedy decomposition against catalog prices; the last line is a snapshot
  // price absorbing the remainder (historical prices may differ from today's).
  let remaining = a.base;
  const lines: {
    agreementId: string;
    catalogId: string;
    qty: string;
    basePriceSupplier: bigint;
    lineTotalPrincipal: bigint;
  }[] = [];
  for (const item of catalog) {
    if (lines.length >= 2 || remaining <= 0n) break;
    const qty = remaining / item.basePriceSupplier;
    if (qty >= 1n) {
      const useQty = qty > 3n ? 3n : qty;
      lines.push({
        agreementId: a.id,
        catalogId: item.id,
        qty: String(useQty),
        basePriceSupplier: item.basePriceSupplier,
        lineTotalPrincipal: item.basePriceSupplier * useQty,
      });
      remaining -= item.basePriceSupplier * useQty;
    }
  }
  if (remaining > 0n) {
    const filler = catalog[catalog.length - 1];
    if (!filler) throw new Error("unreachable: catalog non-empty");
    lines.push({
      agreementId: a.id,
      catalogId: filler.id,
      qty: "1",
      basePriceSupplier: remaining, // snapshot price at creation time
      lineTotalPrincipal: remaining,
    });
  }
  if (lines.length > 0) {
    await db.insert(schema.agreementInput).values(lines);
    const total = lines.reduce((s, l) => s + l.lineTotalPrincipal, 0n);
    console.log(
      `[inputs] agreement #${a.onchainId}: ${lines.length} lines, total ${total} (base ${a.base}) ${total === a.base ? "EXACT" : "MISMATCH!"}`,
    );
  }
}

// ── 2. Harvest dates ─────────────────────────────────────────────────────────

const iso = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

const noDate = await db
  .select({ id: schema.agreement.id, onchainId: schema.agreement.onchainId, status: schema.agreement.status })
  .from(schema.agreement)
  .where(isNull(schema.agreement.expectedHarvestDate));
let offset = 0;
for (const a of noDate) {
  const closed = a.status === "Settled" || a.status === "ForceMajeure";
  // Closed agreements harvested in the recent past; open drafts ~3 months out,
  // staggered so the demo calendar is not one flat date.
  const date = closed ? iso(-14 - offset * 3) : iso(88 + offset * 4);
  await db
    .update(schema.agreement)
    .set({ expectedHarvestDate: date })
    .where(eq(schema.agreement.id, a.id));
  console.log(`[harvest] agreement #${a.onchainId} (${a.status}) -> ${date}`);
  offset += 1;
}

// ── 3. supply_requested_at ───────────────────────────────────────────────────

const backfilled = await db
  .update(schema.agreement)
  .set({ supplyRequestedAt: sql`${schema.agreement.createdAt}` })
  .where(
    sql`${schema.agreement.status} <> 'Created' and ${schema.agreement.supplyRequestedAt} is null`,
  )
  .returning({ onchainId: schema.agreement.onchainId });
console.log(
  `[supply-request] backfilled ${backfilled.length} past-Created agreements:`,
  backfilled.map((r) => `#${r.onchainId}`).join(" "),
);

// ── 4. funding_request_line ──────────────────────────────────────────────────

// funding onchain id -> backing agreement onchain ids. Chosen so every OPEN
// advance (Requested/Approved/Disbursed) consumes plausible agreements and the
// picker exclusion has something real to bite on; #3/#5 stay FREE for the live
// demo of a new dana request.
const FUNDING_BACKING: Record<string, number[]> = {
  "0": [7],
  "1": [1, 6],
  "2": [8],
  "3": [0, 4],
  "4": [2],
  "5": [10],
  "6": [11],
  "7": [12, 14],
};

const fundingRows = await db
  .select({ id: schema.fundingRequest.id, onchainId: schema.fundingRequest.onchainId })
  .from(schema.fundingRequest);
const agreementsAll = await db
  .select({
    id: schema.agreement.id,
    onchainId: schema.agreement.onchainId,
    expectedVolG: schema.agreement.expectedVolG,
    hppPerKg: schema.agreement.hppPerKg,
  })
  .from(schema.agreement);
const agreementByOnchain = new Map(agreementsAll.map((a) => [String(a.onchainId), a]));

for (const f of fundingRows) {
  const existing = await db
    .select({ id: schema.fundingRequestLine.id })
    .from(schema.fundingRequestLine)
    .where(eq(schema.fundingRequestLine.fundingRequestId, f.id))
    .limit(1);
  if (existing.length > 0) continue; // idempotent

  const backing = FUNDING_BACKING[String(f.onchainId)] ?? [];
  const lines = backing
    .map((oid) => agreementByOnchain.get(String(oid)))
    .filter((a): a is NonNullable<typeof a> => a != null)
    .map((a) => ({
      fundingRequestId: f.id,
      agreementId: a.id,
      backingValue: (a.expectedVolG * a.hppPerKg) / 1000n,
    }));
  if (lines.length > 0) {
    await db.insert(schema.fundingRequestLine).values(lines);
    console.log(`[funding] request #${f.onchainId}: ${lines.length} backing lines (${backing.join(",")})`);
  }
}

console.log("\nDemo data repair selesai.");
process.exit(0);
