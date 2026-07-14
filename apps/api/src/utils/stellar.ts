/**
 * The backend's own Stellar signing identity for server-executed writes
 * (currently: settle() — see services/settlement-orchestrator.ts).
 *
 * For the single-KMP MVP this secret IS the coop's own keypair (`annona-coop`
 * in `stellar keys`, see scripts/fund-testnet.sh), not a separate contract
 * admin — the contract's settle() requires `caller == agreement.coop ||
 * admin`, and every demo agreement's `coop` is that same address. It only
 * authorizes settlements for agreements created by that coop; a second coop
 * would need its own service key.
 */
import { Keypair } from "@stellar/stellar-sdk";
import { getSettlementServiceSecret } from "../config/env.js";

let cached: Keypair | undefined;

/** Lazy singleton, same pattern as db/client.ts's getDb(). */
export function getServiceKeypair(): Keypair {
  if (!cached) {
    cached = Keypair.fromSecret(getSettlementServiceSecret());
  }
  return cached;
}
