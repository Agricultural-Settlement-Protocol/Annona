/** Money + volume helpers. Money is bigint in smallest unit (rupiah-cents).
 *  Volume is bigint grams on-chain. */

/** dIDR decimals. 2 = rupiah-cents. Decided at token init. */
export const DIDR_DECIMALS = 2;

const SMALLEST_PER_RUPIAH = 10n ** BigInt(DIDR_DECIMALS);
const GRAMS_PER_KG = 1000n;

/** Settlement math, shared by UI preview + indexer + sanity checks.
 *  gross = (deliveredKg) * hppPerKg ; net = max(0, gross - remainingDebt).
 *  All inputs/outputs in smallest unit, except volume in grams. */
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
