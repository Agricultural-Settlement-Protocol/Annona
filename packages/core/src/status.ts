/** Agreement lifecycle. Mirrors the Soroban `Status` enum (v3.0, PMK 15/2026).
 *  Created -> SupplyDispatched (Supplier gate) -> Active (KMP gate) -> delivery -> settle. */
export type Status =
  | "Created"
  | "SupplyDispatched"
  | "Active"
  | "PartiallyDelivered"
  | "Delivered"
  | "Settled"
  | "Flagged"
  | "ForceMajeure";

/** Residu (supplier principal held in KMP cash) reconciliation lifecycle.
 *  Mirrors the Soroban `ResiduStatus` enum. Never on-chain money movement,
 *  only the anchored record of an off-chain bank remittance. */
export type ResiduStatus = "Pending" | "Remitted" | "Cleared" | "Disputed";

/** Under-delivery sub-reason. Mirrors the Soroban `FlagReason` enum.
 *  Contract indicates; humans decide. `Suspected` is never an auto-accusation. */
export type FlagReason = "None" | "Warning" | "PartialDelivery" | "Suspected";

/** Subsidy tier (e-RDKK / HET gate). Mirrors the Soroban `SubsidyTier` enum.
 *  RECORDED, never computed: the chain anchors which price tier the snapshotted
 *  base price came from; it never verifies e-RDKK eligibility. */
export type SubsidyTier = "Subsidized" | "Commercial";

/** Offtake-financing lifecycle. Mirrors the Soroban `FundingStatus` enum.
 *  Independent of the agreement state machine (SMART-CONTRACT.md §B). */
export type FundingStatus = "Requested" | "Approved" | "Rejected" | "Disbursed" | "Reconciled";

/* ── Shared status sets ──────────────────────────────────────────────────────
 * ONE definition for every aggregate and picker. The API overview, the KMP
 * pages (beranda/petani/setor/pembayaran/permintaan-dana) and the oversight
 * dashboards must all read the SAME sets, or "Perjanjian Aktif" and "Utang
 * Berjalan" silently disagree between pages. */

/** Open (non-terminal) agreements: counted as "Perjanjian Aktif". Includes the
 *  in-transit gate (SupplyDispatched) and review-worthy Flagged (still open:
 *  it can heal upward and settle). Terminal = Settled / ForceMajeure. */
export const OPEN_AGREEMENT_STATUSES: readonly Status[] = [
  "SupplyDispatched",
  "Active",
  "PartiallyDelivered",
  "Delivered",
  "Flagged",
];

/** Statuses where input_debt is an ACTIVE liability (both gates fired, not
 *  closed). Drives "Utang Saprotan Berjalan". */
export const DEBT_ACTIVE_STATUSES: readonly Status[] = [
  "Active",
  "PartiallyDelivered",
  "Delivered",
  "Flagged",
];

/** Agreements that can receive a new harvest deposit (record_delivery). The
 *  contract rejects only Created/SupplyDispatched (gates not done) and
 *  Settled/ForceMajeure (closed) — Delivered and Flagged still accept more. */
export const DEPOSIT_ELIGIBLE_STATUSES: readonly Status[] = [
  "Active",
  "PartiallyDelivered",
  "Delivered",
  "Flagged",
];

/** Statuses that can appear in the payment (settle) picker; the actual
 *  eligibility is delivered > settled. Flagged shows but the UI disables it
 *  (needs officer review first). */
export const PAYABLE_STATUSES: readonly Status[] = [
  "Active",
  "PartiallyDelivered",
  "Delivered",
  "Flagged",
];

/** Statuses with projected future value that can back an offtake-financing
 *  request. */
export const FUNDING_BACKABLE_STATUSES: readonly Status[] = [
  "Created",
  "SupplyDispatched",
  "Active",
  "PartiallyDelivered",
  "Delivered",
];

/** Funding statuses that still "consume" their backing agreements (a backing
 *  agreement may not back another open request until the advance closes). */
export const FUNDING_OPEN_STATUSES: readonly FundingStatus[] = [
  "Requested",
  "Approved",
  "Disbursed",
];

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

/** Classify a delivery into (status, flag) exactly as the contract's `classify`
 *  (SMART-CONTRACT.md §6). The indexer replays this on every DeliveryRecorded to
 *  derive the read-model status/flag — the on-chain `Flagged` event only fires
 *  for the review-worthy bands, so status must be recomputed, not inferred from
 *  the event stream. Ratio math uses bps to match the contract's integer path.
 *  NOTE: this is the *delivery-band* status only; terminal Settled and the two
 *  pre-delivery gates (SupplyDispatched/Active) come from their own events. */
export function classifyDelivery(
  deliveredVolG: bigint,
  expectedVolG: bigint,
): { status: Extract<Status, "Delivered" | "PartiallyDelivered" | "Flagged">; flag: FlagReason } {
  if (expectedVolG <= 0n) return { status: "Flagged", flag: "Suspected" };
  const ratioBps = Number((deliveredVolG * 10_000n) / expectedVolG);
  if (ratioBps >= FLAG_THRESHOLDS.clean * 10_000) return { status: "Delivered", flag: "None" };
  if (ratioBps >= FLAG_THRESHOLDS.warning * 10_000) return { status: "Delivered", flag: "Warning" };
  if (ratioBps >= FLAG_THRESHOLDS.partial * 10_000)
    return { status: "PartiallyDelivered", flag: "PartialDelivery" };
  return { status: "Flagged", flag: "Suspected" };
}
