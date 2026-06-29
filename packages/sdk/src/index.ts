/**
 * @annona/sdk — typed READ client over the offtake-registry contract.
 *
 * This is the composability surface: lending apps, insurers, government
 * dashboards read farmer agreements / receipts / reputation WITHOUT rebuilding
 * the registry. Read-first by design. Write paths stay in apps/api / the coop UI.
 *
 * MVP status: interface + stubs. Real on-chain reads wired post-hackathon
 * (see docs/technical/INTEGRATIONS.md section 10). Do not over-build (PRD 7.11).
 */
import type { Agreement, HarvestReceipt, Reputation } from "@annona/core";

export interface AnnonaClientConfig {
  /** Soroban RPC url, e.g. https://soroban-testnet.stellar.org */
  rpcUrl: string;
  /** deployed offtake-registry contract id */
  contractId: string;
  network: "testnet" | "mainnet";
}

export interface AnnonaReadClient {
  getAgreement(id: bigint): Promise<Agreement>;
  getReceipts(id: bigint): Promise<HarvestReceipt[]>;
  getReputation(farmer: string): Promise<Reputation>;
}

/** Factory. Returns a read client. Implementation pending contract deploy. */
export function createAnnonaClient(config: AnnonaClientConfig): AnnonaReadClient {
  void config;
  const notImplemented = (): never => {
    throw new Error("[@annona/sdk] not implemented: wire to Soroban RPC after contract deploy");
  };
  return {
    getAgreement: notImplemented,
    getReceipts: notImplemented,
    getReputation: notImplemented,
  };
}

export type { Agreement, HarvestReceipt, Reputation } from "@annona/core";
