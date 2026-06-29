/** Agreement lifecycle. Mirrors the Soroban `Status` enum. */
export type Status =
  | "Created"
  | "PartiallyDelivered"
  | "Delivered"
  | "Settled"
  | "Flagged"
  | "ForceMajeure";

/** Under-delivery sub-reason. Mirrors the Soroban `FlagReason` enum.
 *  Contract indicates; humans decide. `Suspected` is never an auto-accusation. */
export type FlagReason = "None" | "Warning" | "PartialDelivery" | "Suspected";

/** Tolerance band thresholds (as a fraction of expected volume).
 *  Keep in sync with the contract's graded-flag logic. */
export const FLAG_THRESHOLDS = {
  /** >= this fraction delivered: no flag */
  clean: 0.98,
  /** >= this fraction: Warning */
  warning: 0.8,
  /** >= this fraction: PartialDelivery; below: Suspected */
  partial: 0.4,
} as const;

/** Classify a delivery ratio into a flag. Pure, shared by UI preview + indexer. */
export function classifyFlag(deliveredOverExpected: number): FlagReason {
  if (deliveredOverExpected >= FLAG_THRESHOLDS.clean) return "None";
  if (deliveredOverExpected >= FLAG_THRESHOLDS.warning) return "Warning";
  if (deliveredOverExpected >= FLAG_THRESHOLDS.partial) return "PartialDelivery";
  return "Suspected";
}
