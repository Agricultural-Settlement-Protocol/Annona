import type { Commodity } from "./agreement.js";
import type { FlagReason } from "./status.js";

/** Contract event names. Mirrors the event topics in SMART-CONTRACT.md section 7
 *  (v3.0, PMK 15/2026: double-confirmation + residu reconciliation events added).
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
  | "CoopReputationUpdated";

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
  basePriceSupplier: bigint;
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

/** Settled (v3.0, three-way split). */
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
