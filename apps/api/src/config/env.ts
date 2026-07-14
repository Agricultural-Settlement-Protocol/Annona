/**
 * Env accessors for the server-signed settlement path (admin-key Soroban
 * writes + the Supabase auth gate in front of them).
 *
 * Deliberately LAZY, not validated at process startup: `db/client.ts` already
 * established this convention for the same reason — most routes never touch
 * these vars, so a dev box without SETTLEMENT_SERVICE_SECRET / Supabase creds
 * configured can still `pnpm dev` and serve every read-only route. Validation
 * happens on first real use (first settlement request), with a clear
 * "copy .env.example" error instead of a silent undefined reaching the SDK.
 */
import { Networks } from "@stellar/stellar-sdk";

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set. Copy apps/api/.env.example to .env and fill it in.`);
  }
  return v;
}

/**
 * Secret key for the backend's own signing identity (see utils/stellar.ts).
 *
 * PRODUCTION TODO: this must come from a secrets manager (AWS Secrets
 * Manager / GCP Secret Manager / Vault), never a plaintext .env value, once
 * this leaves MVP — flagging here, not implementing now.
 */
export function getSettlementServiceSecret(): string {
  return required("SETTLEMENT_SERVICE_SECRET");
}

/** Supabase project creds needed to verify a caller's bearer token
 *  (GoTrue `/auth/v1/user`). Anon key only — verification never needs the
 *  service-role key, and the role lookup itself goes through our own
 *  Postgres connection (see middleware/auth.ts). */
export function getSupabaseAuthConfig(): { url: string; anonKey: string } {
  return {
    url: required("SUPABASE_URL"),
    anonKey: required("SUPABASE_ANON_KEY"),
  };
}

export interface StellarNetworkConfig {
  network: "testnet" | "mainnet";
  networkPassphrase: string;
  rpcUrl: string;
  registryContractId: string;
}

export function getStellarNetworkConfig(): StellarNetworkConfig {
  const network = (process.env.STELLAR_NETWORK ?? "testnet") as "testnet" | "mainnet";
  return {
    network,
    networkPassphrase: network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
    rpcUrl: process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org",
    registryContractId: required("OFFTAKE_REGISTRY_CONTRACT_ID"),
  };
}
