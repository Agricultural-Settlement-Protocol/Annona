import type { Commodity } from "./agreement.js";
import type { FlagReason } from "./status.js";

/** Contract event names. Mirrors the event topics in SMART-CONTRACT.md section 7.
 *  The indexer keys every event by (txHash, eventIndex) for idempotency. */
export type AnnonaEventType =
  | "AgreementCreated"
  | "DeliveryRecorded"
  | "HarvestReceiptMinted"
  | "Settled"
  | "Flagged"
  | "ForceMajeure"
  | "ReputationUpdated";

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
  commodity: Commodity;
  inputDebt: bigint;
  expectedVolG: bigint;
  hppPerKg: bigint;
  toleranceBps: number;
}

export interface DeliveryRecordedData {
  id: bigint;
  seq: number;
  volumeG: bigint;
  grade: string;
  deliveredTotalG: bigint;
}

export interface SettledData {
  id: bigint;
  farmer: string;
  gross: bigint;
  debtNetted: bigint;
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

export interface ReputationUpdatedData {
  farmer: string;
  deliveries: number;
  onTime: number;
  totalSettledG: bigint;
  flags: number;
}
