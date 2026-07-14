import type { Commodity } from "./agreement.js";
import type { FlagReason, SubsidyTier } from "./status.js";

/** Contract event names. Mirrors the event topics in SMART-CONTRACT.md section 7
 *  (v4.0, PMK 15/2026: the single "Agrinas" party is corrected to `supplier`, and
 *  the offtake-financing lifecycle events are added).
 *  The indexer keys every event by (txHash, eventIndex) for idempotency. */
export type AnnonaEventType =
  | "AgreementCreated"
  | "SupplyDispatched"
  | "SupplyAccepted"
  | "DeliveryRecorded"
  | "HarvestReceiptMinted"
  | "Settled"
  | "Flagged"
  | "ForceMajeure"
  | "ResiduRemitted"
  | "RemittanceCleared"
  | "RemittanceDisputed"
  | "RemittanceResolved"
  | "ReputationUpdated"
  | "CoopReputationUpdated"
  // v4.0 — offtake financing lifecycle (SMART-CONTRACT.md §B / §7).
  | "FundingRequested"
  | "FundingApproved"
  | "FundingRejected"
  | "FundingDisbursed"
  | "FundingReconciled";

export interface EventEnvelope<T> {
  type: AnnonaEventType;
  txHash: string;
  eventIndex: number;
  ledger: number;
  timestamp: number;
  data: T;
}

export interface AgreementCreatedData {
  id: bigint;
  farmer: string;
  coop: string;
  supplier: string;
  commodity: Commodity;
  /** v4.0: which price tier the snapshotted base_price came from (chain mirror). */
  subsidyTier: SubsidyTier;
  /** WIRE name. The contract emits `base_price` (no party suffix); the DB/read-model
   *  column is `base_price_supplier`. The reducer bridges the two — do not "align"
   *  this to the column name or the decoder (deepCamel of `base_price`) breaks. */
  basePrice: bigint;
  saprotanMarkupBps: number;
  inputDebt: bigint;
  hppHandlingFeeBps: number;
  expectedVolG: bigint;
  hppPerKg: bigint;
  toleranceBps: number;
}

export interface SupplyDispatchedData {
  id: bigint;
  supplier: string;
  coop: string;
}

export interface SupplyAcceptedData {
  id: bigint;
  coop: string;
  inputDebt: bigint; // now an active liability
}

export interface DeliveryRecordedData {
  id: bigint;
  seq: number;
  volumeG: bigint;
  grade: string;
  deliveredTotalG: bigint;
}

/** The immutable per-delivery harvest receipt. Decoded + logged to `event_log`,
 *  never projected to a read-model table (same as Flagged) — the receipt is
 *  reconstructed from `delivery` rows for display. */
export interface HarvestReceiptMintedData {
  id: bigint;
  farmer: string;
  seq: number;
  volumeG: bigint;
  grade: string;
  timestamp: bigint;
}

/** Settled (v4.0, three-way split). */
export interface SettledData {
  id: bigint;
  farmer: string;
  gross: bigint;
  handlingCut: bigint;
  debtNetted: bigint;
  principalToSupplier: bigint;
  coopMargin: bigint;
  netPaid: bigint;
  settledVolG: bigint;
}

export interface FlaggedData {
  id: bigint;
  reason: FlagReason;
}

export interface ForceMajeureData {
  id: bigint;
  reason: string;
}

export interface ResiduRemittedData {
  id: bigint;
  coop: string;
  amount: bigint;
  refHash: string;
}

export interface RemittanceClearedData {
  id: bigint;
  coop: string;
  principal: bigint;
  supplier: string;
}

export interface RemittanceDisputedData {
  id: bigint;
  coop: string;
  reason: string;
}

/** Admin cleared a dispute; the agreement's residu returns to Remitted.
 *  Agreement-scoped (unlike CoopReputationUpdated) so the indexer can move the
 *  specific residu read-model row off Disputed. */
export interface RemittanceResolvedData {
  id: bigint;
  coop: string;
  admin: string;
}

export interface ReputationUpdatedData {
  farmer: string;
  deliveries: number;
  onTime: number;
  totalSettledG: bigint;
  flags: number;
}

export interface CoopReputationUpdatedData {
  coop: string;
  settlements: number;
  totalResiduCleared: bigint;
  disputes: number;
  frozen: boolean;
}

/* ── Offtake financing (§B). Parallel to the agreement state machine. ── */

/** KMP submits a proof-backed advance request. `id`/`coop` are topics on-chain;
 *  carried in data here so the reducer can resolve both parties. */
export interface FundingRequestedData {
  id: bigint;
  coop: string;
  financier: string;
  /** sum(kg_expected_or_delivered * hpp) across the backing agreements */
  projectedSettlement: bigint;
  amountRequested: bigint;
  /** hex sha-256 of the off-chain Bukti Offtake packet (agreement ids + receipts) */
  backingHash: string;
}

export interface FundingApprovedData {
  id: bigint;
  financier: string;
  amountApproved: bigint; // <= amountRequested
}

export interface FundingRejectedData {
  id: bigint;
  financier: string;
  reason: string;
}

export interface FundingDisbursedData {
  id: bigint;
  financier: string;
  coop: string;
  amountDisbursed: bigint;
}

/** Input-principal collected at settlement repaid part/all of the advance.
 *  `amountReconciled` is CUMULATIVE (the on-chain running total); `remaining`
 *  is `amountDisbursed - amountReconciled`. */
export interface FundingReconciledData {
  id: bigint;
  coop: string;
  amountReconciled: bigint;
  remaining: bigint;
}
