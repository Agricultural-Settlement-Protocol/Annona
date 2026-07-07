/**
 * Freighter wallet access for the KMP officer (the coop signer).
 *
 * Every KMP-signed contract fn (create_agreement, accept_supply,
 * record_delivery, settle, mark_force_majeure, mark_residu_remitted) binds to
 * the coop Address == the connected Freighter public key. Exports are thin
 * wrappers over @stellar/freighter-api v4 (each call returns { ..., error? };
 * we normalize errors to thrown Error so callers use plain try/catch).
 */
import {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import { stellarConfig } from "./stellar";

const NOT_INSTALLED =
  "Ekstensi Freighter tidak terpasang. Pasang Freighter untuk menandatangani transaksi.";

/** True if the Freighter extension is present in this browser. */
export async function isFreighterInstalled(): Promise<boolean> {
  const { isConnected: installed, error } = await isConnected();
  return !error && installed;
}

/**
 * Return the already-authorized address without prompting, or null if the app
 * has not been granted access yet. (getAddress resolves to "" until granted.)
 */
export async function getConnectedAddress(): Promise<string | null> {
  if (!(await isFreighterInstalled())) return null;
  const { address, error } = await getAddress();
  if (error || !address) return null;
  return address;
}

/**
 * Prompt the user to connect Freighter (idempotent if already granted) and
 * return the coop's public key. Also guards the wallet network against the
 * app's configured network so a signer on the wrong network fails loudly
 * BEFORE building a tx rather than after a rejected submit.
 */
export async function connectWallet(): Promise<string> {
  if (!(await isFreighterInstalled())) throw new Error(NOT_INSTALLED);

  const { address, error } = await requestAccess();
  if (error) throw new Error(error.message);
  if (!address) throw new Error("Freighter tidak mengembalikan alamat.");

  const { networkPassphrase, error: netError } = await getNetwork();
  if (netError) throw new Error(netError.message);
  if (networkPassphrase !== stellarConfig.networkPassphrase) {
    throw new Error(
      `Freighter berada di jaringan yang salah. Alihkan ke ${stellarConfig.network}.`,
    );
  }
  return address;
}

/**
 * Sign a transaction XDR with Freighter on the configured network. Returns the
 * signed XDR ready to submit.
 */
export async function signXdr(xdr: string): Promise<string> {
  const { signedTxXdr, error } = await signTransaction(xdr, {
    networkPassphrase: stellarConfig.networkPassphrase,
  });
  if (error) throw new Error(error.message);
  return signedTxXdr;
}
