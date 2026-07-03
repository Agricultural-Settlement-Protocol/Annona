/** Money + volume helpers. Money is bigint in smallest unit (rupiah-cents).
 *  Volume is bigint grams on-chain. */

/** dIDR decimals. dIDR is a SAC wrapping a CLASSIC Stellar asset, which is
 *  fixed at 7 decimals — a classic-asset SAC cannot be 2. (A 2-decimal token
 *  would require a hand-rolled SEP-41, which the spec avoids.) The contract is
 *  decimal-agnostic; this constant only drives formatting here. Reversible to 2
 *  if the token approach ever changes. See SMART-CONTRACT.md section 5/10. */
export const DIDR_DECIMALS = 7;

const SMALLEST_PER_RUPIAH = 10n ** BigInt(DIDR_DECIMALS);
const GRAMS_PER_KG = 1000n;

/** Whole rupiah -> smallest unit, scaled by the current `DIDR_DECIMALS`.
 *  Use this instead of hand-writing smallest-unit literals (e.g. `200_000_000n`)
 *  in demo/seed/UI code — hardcoded literals silently go stale if the token's
 *  decimals ever change (as they did: 2 -> 7, see SMART-CONTRACT.md section 5). */
export function rupiah(whole: number): bigint {
  return BigInt(whole) * SMALLEST_PER_RUPIAH;
}

const BPS_DENOM = 10_000n;

/** Settlement math (v2, two-way netting), kept for reference/back-compat.
 *  Superseded by `computeSplitSettlement` in v3.0 (three-way split). */
export function computeSettlement(params: {
  deliveredVolG: bigint;
  settledVolG: bigint;
  hppPerKg: bigint;
  remainingDebt: bigint;
}): { grossSmallest: bigint; debtNetted: bigint; netToFarmer: bigint } {
  const unsettledG = params.deliveredVolG - params.settledVolG;
  const unsettledKg = unsettledG / GRAMS_PER_KG;
  const grossSmallest = unsettledKg * params.hppPerKg;
  const debtNetted = grossSmallest >= params.remainingDebt ? params.remainingDebt : grossSmallest;
  const netToFarmer = grossSmallest - debtNetted;
  return { grossSmallest, debtNetted, netToFarmer };
}

/** input_debt = base_price_agrinas * (1 + saprotan_markup_bps). Derived, never
 *  free-entered by KMP. See SMART-CONTRACT.md §4/§5. */
export function deriveInputDebt(basePriceAgrinas: bigint, saprotanMarkupBps: number): bigint {
  return (basePriceAgrinas * (BPS_DENOM + BigInt(saprotanMarkupBps))) / BPS_DENOM;
}

/** Three-way split settlement math (v3.0, PMK 15/2026), shared by UI preview
 *  + indexer + contract sanity checks. Mirrors `settle()` in SMART-CONTRACT.md §5:
 *    gross         = unsettled_kg * hpp_per_kg
 *    handlingCut   = gross * hpp_handling_fee_bps / 10000              (KMP keeps)
 *    debtPaid      = min(remainingDebt, gross - handlingCut)           (netted FIRST)
 *    netToFarmer   = (gross - handlingCut) - debtPaid                  (to farmer)
 *  Of debtPaid, split principal vs margin pro-rata against inputDebt; any
 *  integer-division remainder goes to margin (KMP) so residuPrincipal never
 *  over-states Agrinas's claim. */
export function computeSplitSettlement(params: {
  deliveredVolG: bigint;
  settledVolG: bigint;
  hppPerKg: bigint;
  remainingDebt: bigint;
  hppHandlingFeeBps: number;
  basePriceAgrinas: bigint;
  inputDebt: bigint;
}): {
  grossSmallest: bigint;
  handlingCut: bigint;
  debtPaid: bigint;
  netToFarmer: bigint;
  principalToAgrinas: bigint;
  coopMargin: bigint;
} {
  const unsettledG = params.deliveredVolG - params.settledVolG;
  const unsettledKg = unsettledG / GRAMS_PER_KG;
  const grossSmallest = unsettledKg * params.hppPerKg;
  const handlingCut = (grossSmallest * BigInt(params.hppHandlingFeeBps)) / BPS_DENOM;
  const netBeforeDebt = grossSmallest - handlingCut;
  const debtPaid = netBeforeDebt >= params.remainingDebt ? params.remainingDebt : netBeforeDebt;
  const netToFarmer = netBeforeDebt - debtPaid;

  const principalToAgrinas =
    params.inputDebt === 0n ? 0n : (debtPaid * params.basePriceAgrinas) / params.inputDebt;
  const coopMargin = debtPaid - principalToAgrinas; // rounding dust falls here, never inflates principal

  return { grossSmallest, handlingCut, debtPaid, netToFarmer, principalToAgrinas, coopMargin };
}

/** Smallest-unit bigint to a formatted rupiah string. NO em dashes in output. */
export function formatRupiah(smallest: bigint): string {
  const whole = smallest / SMALLEST_PER_RUPIAH;
  const negative = whole < 0n;
  const digits = (negative ? -whole : whole).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}Rp${grouped}`;
}

export const gramsToKg = (g: bigint): number => Number(g) / 1000;
export const kgToGrams = (kg: number): bigint => BigInt(Math.round(kg * 1000));
