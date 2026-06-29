import type { FlagReason, Status } from "./status.js";

/** Commodity metadata. Mirrors the Soroban `Commodity` struct. */
export interface Commodity {
  /** e.g. "GABAH" | "JAGUNG" | "KOPI" */
  code: string;
  /** grade per coop/Bulog SOP, e.g. "A" | "B" | "C" */
  grade: string;
  /** moisture in basis points, e.g. 1400 = 14.00% */
  moistureBps: number;
  /** which HPP decree (Inpres no.) was used */
  hppVersion: number;
}

/** On-chain agreement. Mirrors the Soroban `Agreement` struct.
 *  Money fields are bigint smallest-unit; volumes are bigint grams. */
export interface Agreement {
  id: bigint;
  farmer: string; // Stellar G-address
  coop: string; // Stellar G-address
  commodity: Commodity;
  inputDebt: bigint;
  expectedVolG: bigint;
  deliveredVolG: bigint;
  settledVolG: bigint;
  hppPerKg: bigint;
  toleranceBps: number;
  ktpHash: string; // hex of BytesN<32>; off-chain PII reference only
  status: Status;
  flag: FlagReason;
  remainingDebt: bigint;
  paidToFarmer: bigint;
}

/** On-chain harvest receipt. Mirrors `HarvestReceipt`. Immutable per delivery. */
export interface HarvestReceipt {
  agreementId: bigint;
  seq: number;
  farmer: string;
  volumeG: bigint;
  grade: string;
  timestamp: number; // unix seconds
}

/** On-chain reputation counters. Mirrors `Reputation`. Append-only.
 *  force_majeure events are tracked but NOT penalized. */
export interface Reputation {
  farmer: string;
  totalSettledG: bigint;
  deliveries: number;
  onTimeSettlements: number;
  flags: number;
  forceMajeureEvents: number;
}
