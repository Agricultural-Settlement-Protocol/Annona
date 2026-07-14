/**
 * Pure reducer-math tests — zero Postgres. Run: `pnpm --filter @annona/api test`.
 *
 * These pin the numeric bridge: the same @annona/core helpers the CONTRACT test
 * (`settle_single_matches_worked_example`) and the FE use must reproduce the §5
 * worked example, and `settledRowFromEvent` must turn the event's CUMULATIVE
 * settled volume into the correct per-settle delta. If contract test, core
 * helper, and this test all agree on 13,855,000 / 845,000 / 200,000 / 2,000,000,
 * the seed→indexer→API money path cannot silently drift.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { SettledData } from "@annona/core";
import { computeSplitSettlement } from "@annona/core";
import { deriveCoverage, payableStatusFor, settledRowFromEvent } from "./handlers.js";

test("§5 worked example: 2600kg gabah splits farmer/handling/margin/principal", () => {
  // create_active params + a single 2600kg delivery (contract test mirror).
  const split = computeSplitSettlement({
    deliveredVolG: 2_600_000n, // 2600 kg
    settledVolG: 0n,
    hppPerKg: 6_500n,
    remainingDebt: 2_200_000n, // = inputDebt on first settle
    hppHandlingFeeBps: 500, // 5%
    basePriceSupplier: 2_000_000n, // principal
    inputDebt: 2_200_000n, // base * (1 + 10% markup)
  });

  assert.equal(split.grossSmallest, 16_900_000n, "gross");
  assert.equal(split.handlingCut, 845_000n, "handling (KMP)");
  assert.equal(split.debtPaid, 2_200_000n, "debt netted");
  assert.equal(split.principalToSupplier, 2_000_000n, "residu principal (Supplier)");
  assert.equal(split.coopMargin, 200_000n, "coop margin (KMP)");
  assert.equal(split.netToFarmer, 13_855_000n, "net to farmer");
});

test("settledRowFromEvent recovers per-settle volume delta from cumulative event", () => {
  const base: SettledData = {
    id: 1n,
    farmer: "GFARMER",
    gross: 16_900_000n,
    handlingCut: 845_000n,
    debtNetted: 2_200_000n,
    principalToSupplier: 2_000_000n,
    coopMargin: 200_000n,
    netPaid: 13_855_000n,
    settledVolG: 2_600_000n, // CUMULATIVE on-chain running total
  };

  // First settle: no prior settled volume → delta == cumulative.
  const first = settledRowFromEvent(base, 0n);
  assert.equal(first.settledVolG, 2_600_000n);
  assert.equal(first.netPaid, 13_855_000n);

  // Staged second settle: cumulative 4,000,000 with 2,600,000 already settled
  // → this call settled 1,400,000 g.
  const second = settledRowFromEvent({ ...base, settledVolG: 4_000_000n }, 2_600_000n);
  assert.equal(second.settledVolG, 1_400_000n);
});

test("staged split totals reconstruct the single-settle result (no rounding loss)", () => {
  // Two partial deliveries settled separately must sum to the same numbers as a
  // single 2600kg settle — the property the contract's settle_staged test locks.
  const p = {
    hppPerKg: 6_500n,
    hppHandlingFeeBps: 500,
    basePriceSupplier: 2_000_000n,
    inputDebt: 2_200_000n,
  };
  const s1 = computeSplitSettlement({
    ...p,
    deliveredVolG: 1_600_000n,
    settledVolG: 0n,
    remainingDebt: 2_200_000n,
  });
  const s2 = computeSplitSettlement({
    ...p,
    deliveredVolG: 2_600_000n,
    settledVolG: 1_600_000n,
    remainingDebt: 2_200_000n - s1.debtPaid,
  });

  assert.equal(s1.grossSmallest + s2.grossSmallest, 16_900_000n);
  assert.equal(s1.handlingCut + s2.handlingCut, 845_000n);
  assert.equal(s1.debtPaid + s2.debtPaid, 2_200_000n);
  assert.equal(s1.principalToSupplier + s2.principalToSupplier, 2_000_000n);
  assert.equal(s1.netToFarmer + s2.netToFarmer, 13_855_000n);
});

/* ── v4.0 offtake financing + input-payable derivations (pure) ── */

test("deriveCoverage: inverted ratio (lower = safer) + risk bands", () => {
  // 30M requested against 52M projected settlement → 57.69% → Sedang.
  const a = deriveCoverage(30_000_000n, 52_000_000n);
  assert.equal(a.coverageRatioBps, 5769);
  assert.equal(a.riskBadge, "Sedang");

  // 20M / 41M = 48.78% → Rendah (well-covered advance).
  const b = deriveCoverage(20_000_000n, 41_000_000n);
  assert.equal(b.coverageRatioBps, 4878);
  assert.equal(b.riskBadge, "Rendah");

  // Over-asking (90%+) → Tinggi; zero projection → Tinggi + null ratio.
  assert.equal(deriveCoverage(48_000_000n, 52_000_000n).riskBadge, "Tinggi");
  assert.deepEqual(deriveCoverage(10n, 0n), { coverageRatioBps: null, riskBadge: "Tinggi" });
});

test("payableStatusFor: Outstanding → Partial → Cleared on the accrued principal", () => {
  assert.equal(payableStatusFor(2_000_000n, 0n), "Outstanding");
  assert.equal(payableStatusFor(2_000_000n, 1_200_000n), "Partial");
  assert.equal(payableStatusFor(2_000_000n, 2_000_000n), "Cleared");
  // Over-remittance never regresses below Cleared.
  assert.equal(payableStatusFor(2_000_000n, 2_500_000n), "Cleared");
});
