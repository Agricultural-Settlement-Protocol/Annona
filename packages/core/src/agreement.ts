import type { FlagReason, ResiduStatus, Status } from "./status.js";

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

/** On-chain agreement. Mirrors the Soroban `Agreement` struct (v3.0, PMK 15/2026).
 *  Money fields are bigint smallest-unit; volumes are bigint grams; percentages in bps. */
export interface Agreement {
  id: bigint;
  farmer: string; // Stellar G-address
  coop: string; // Stellar G-address — KMP, the pre-funded cash agent
  agrinas: string; // Stellar G-address — operator, catalog + dispatch authority
  commodity: Commodity;

  // ── price components (the four locked variables) ──
  basePriceAgrinas: bigint; // Agrinas catalog cost = PRINCIPAL (read-only to KMP)
  saprotanMarkupBps: number; // KMP margin per contract, e.g. 1000 = 10%
  inputDebt: bigint; // DERIVED = basePriceAgrinas * (10000 + saprotanMarkupBps) / 10000
  hppHandlingFeeBps: number; // KMP handling cut on gross HPP at settle, e.g. 500 = 5%

  expectedVolG: bigint;
  deliveredVolG: bigint;
  settledVolG: bigint;
  hppPerKg: bigint;
  toleranceBps: number;
  ktpHash: string; // hex of BytesN<32>; off-chain PII reference only
  status: Status;
  flag: FlagReason;

  // ── running money (three-way split accounting) ──
  remainingDebt: bigint;
  paidToFarmer: bigint;
  coopHandlingAccrued: bigint; // KMP handling cut realized (KMP keeps)
  coopMarginAccrued: bigint; // KMP markup margin realized (KMP keeps)
  residuPrincipal: bigint; // Agrinas principal withheld in KMP cash (owed back)
  residuStatus: ResiduStatus;
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

/** On-chain reputation counters (farmer). Mirrors `Reputation`. Append-only.
 *  force_majeure events are tracked but NOT penalized. */
export interface Reputation {
  farmer: string;
  totalSettledG: bigint;
  deliveries: number;
  onTimeSettlements: number;
  flags: number;
  forceMajeureEvents: number;
}

/** On-chain reputation counters (KMP). Mirrors `CoopReputation`.
 *  The trust signal Agrinas + Government + banks read: does this coop
 *  reliably remit Agrinas's principal residu? `frozen` is an indicator
 *  for human review after a dispute, never an automatic accusation. */
export interface CoopReputation {
  coop: string;
  agreements: number;
  settlements: number;
  totalResiduPrincipal: bigint; // total principal that passed through KMP cash
  totalResiduCleared: bigint; // principal Agrinas confirmed remitted
  disputes: number;
  frozen: boolean;
}
