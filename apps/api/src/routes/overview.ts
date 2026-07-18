import {
  DEBT_ACTIVE_STATUSES,
  OPEN_AGREEMENT_STATUSES,
  computeSplitSettlement,
  kgToGrams,
} from "@annona/core";
import { eq, inArray, ne } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";
import { type EnrichedAgreement, jsonSafe, listAgreements } from "../lib/read-model.js";

/**
 * KMP dashboard aggregates (Screen A). Mirrors the mock-data selectors
 * (coopOverview / harvestThisWeek / cashNeededThisWeek / inboundSupply /
 * supplyRequestRows) but derived from live read-models. One /overview call so
 * the landing page needs a single round trip.
 */

// Shared definitions from @annona/core so every page shows the SAME numbers.
const DEBT_ACTIVE = new Set<string>(DEBT_ACTIVE_STATUSES);
const ACTIVE = new Set<string>(OPEN_AGREEMENT_STATUSES);
// Terminal statuses only; Flagged is OPEN (can heal + settle), not closed.
const CLOSED = new Set(["Settled", "ForceMajeure"]);
const HARVEST_STATUSES = new Set(["Active", "PartiallyDelivered", "Delivered", "Flagged"]);
const SUPPLY_REQUEST = new Set(["Created", "SupplyDispatched", "Active", "PartiallyDelivered"]);

/** ISO yyyy-mm-dd `days` from now (window bounds for "this week"). */
function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Remaining expected volume in kg (expected minus already delivered). */
function remainingKg(a: EnrichedAgreement): number {
  return Math.max(0, a.expectedVolKg - Number(a.deliveredVolG) / 1000);
}

export const overviewRoute = new Hono().get("/", async (c) => {
  const db = getDb();
  const agreements = await listAgreements(db);

  // Residu owed = principal not yet cleared (from the residu ledger).
  const openResidu = await db
    .select({ principal: schema.residuRemittance.principalAmount })
    .from(schema.residuRemittance)
    .where(ne(schema.residuRemittance.status, "Cleared"));
  const residuOwed = openResidu.reduce((s, r) => s + r.principal, 0n);

  const outstandingDebt = agreements
    .filter((a) => DEBT_ACTIVE.has(a.status))
    .reduce((s, a) => s + a.remainingDebt, 0n);
  const activeAgreements = agreements.filter((a) => ACTIVE.has(a.status)).length;
  const settledCount = agreements.filter((a) => a.status === "Settled").length;
  const closedCount = agreements.filter((a) => CLOSED.has(a.status)).length;
  const settlementRatePct = closedCount === 0 ? 0 : Math.round((settledCount / closedCount) * 100);

  const coopOverview = { outstandingDebt, activeAgreements, settlementRatePct, residuOwed };

  // "This week": a +/- 7 day window around today (demo dates cluster near now).
  const from = isoOffset(-7);
  const to = isoOffset(7);
  const harvestRows = agreements.filter(
    (a) =>
      HARVEST_STATUSES.has(a.status) &&
      a.expectedHarvestDate != null &&
      a.expectedHarvestDate >= from &&
      a.expectedHarvestDate <= to,
  );
  const harvestTotalKg = harvestRows.reduce((s, a) => s + remainingKg(a), 0);
  const harvestTotalValue = harvestRows.reduce(
    (s, a) => s + BigInt(Math.round(remainingKg(a))) * a.hppPerKg,
    0n,
  );

  // Cash the KMP must have ready this week = expected net payouts to farmers.
  const cashNeededThisWeek = harvestRows.reduce((s, a) => {
    const split = computeSplitSettlement({
      deliveredVolG: kgToGrams(Math.round(remainingKg(a))),
      settledVolG: 0n,
      hppPerKg: a.hppPerKg,
      remainingDebt: a.remainingDebt,
      hppHandlingFeeBps: a.hppHandlingFeeBps,
      basePriceSupplier: a.basePriceSupplier,
      inputDebt: a.inputDebt,
    });
    return s + split.netToFarmer;
  }, 0n);

  const supplyAgreements = agreements.filter((a) => SUPPLY_REQUEST.has(a.status));
  // Batch-load the saprotan input baskets for exactly these agreements (the
  // permintaan desk aggregates them); one query, grouped by agreement id.
  const supplyIds = supplyAgreements.map((a) => a.id);
  const inputRows = supplyIds.length
    ? await db
        .select()
        .from(schema.agreementInput)
        .where(inArray(schema.agreementInput.agreementId, supplyIds))
    : [];
  const inputsByAgreement = new Map<string, (typeof inputRows)[number][]>();
  for (const row of inputRows) {
    const list = inputsByAgreement.get(row.agreementId) ?? [];
    list.push(row);
    inputsByAgreement.set(row.agreementId, list);
  }
  // Inbound cards carry the input basket too, so the gudang shows WHAT is
  // arriving, not just the money totals.
  const inboundSupply = supplyAgreements
    .filter((a) => a.status === "SupplyDispatched")
    .map((a) => ({ ...a, inputs: inputsByAgreement.get(a.id) ?? [] }));

  // Persistent request status: Created + not submitted = Draft; Created +
  // supplyRequestedAt set = Terkirim (submitted to Supplier, off-chain);
  // SupplyDispatched = Dikirim; past both gates = Diterima.
  const supplyRequestRows = supplyAgreements.map((a) => ({
    agreement: { ...a, inputs: inputsByAgreement.get(a.id) ?? [] },
    farmerId: a.farmerId,
    farmerName: a.farmerName,
    status:
      a.status === "Created"
        ? a.supplyRequestedAt == null
          ? "Draft"
          : "Terkirim"
        : a.status === "SupplyDispatched"
          ? "Dikirim"
          : "Diterima",
  }));

  return c.json(
    jsonSafe({
      coopOverview,
      harvestThisWeek: {
        rows: harvestRows,
        totalKg: harvestTotalKg,
        totalValue: harvestTotalValue,
      },
      cashNeededThisWeek,
      inboundSupply,
      supplyRequestRows,
    }),
  );
});

/** Coop parties + prefunded cash (Screen A header). */
export const coopRoute = new Hono()
  .get("/", async (c) => {
    const rows = await getDb().select().from(schema.coop);
    const supplierRows = await getDb().select().from(schema.supplier);
    return c.json(jsonSafe({ coop: rows[0] ?? null, supplier: supplierRows[0] ?? null }));
  })
  // Off-chain coop profile edit (Screen Pengaturan). Only the editable identity
  // fields — wallet/cash balance are chain/authoritative and not touched here.
  .patch("/", async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const db = getDb();
    const rows = await db.select({ id: schema.coop.id }).from(schema.coop).limit(1);
    const coop = rows[0];
    if (!coop) return c.json({ error: "Belum ada koperasi terkonfigurasi." }, 404);

    const patch: Record<string, string> = {};
    for (const field of ["name", "kecamatan", "kabupaten", "provinsi"] as const) {
      const v = body?.[field];
      if (typeof v === "string" && v.trim()) patch[field] = v.trim();
    }
    if (Object.keys(patch).length === 0) {
      return c.json({ error: "Tidak ada perubahan untuk disimpan." }, 400);
    }

    await db.update(schema.coop).set(patch).where(eq(schema.coop.id, coop.id));
    const updated = await db.select().from(schema.coop).where(eq(schema.coop.id, coop.id));
    const supplierRows = await db.select().from(schema.supplier);
    return c.json(jsonSafe({ coop: updated[0] ?? null, supplier: supplierRows[0] ?? null }));
  });
