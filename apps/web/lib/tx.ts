/**
 * Soroban invoke pipeline for the KMP write path:
 * build -> simulate -> assemble -> Freighter sign -> submit -> poll.
 *
 * An `Invocation` is a method name + positional ScVal args (built by
 * lib/invocations.ts). The coop's Freighter address is both the source account
 * and the `coop`/`caller` argument the contract binds auth to.
 */
import { BASE_FEE, Contract, TransactionBuilder, rpc, type xdr } from "@stellar/stellar-sdk";
import { getRpcServer, stellarConfig } from "./stellar";
import { signXdr } from "./wallet";

export interface Invocation {
  /** Contract fn name, e.g. "record_delivery". */
  method: string;
  /** Positional args in the contract's declared order (minus `env`). */
  args: xdr.ScVal[];
}

export interface TxResult {
  hash: string;
}

/**
 * Full invoke lifecycle. `source` is the connected coop pubkey. `onBeforeSubmit`
 * fires after Freighter signs and before the network submit, so the UI can move
 * from a "signing" to a "submitting" state. Throws with a human-readable message
 * on simulation error, sign rejection, or a failed on-chain result.
 */
export async function invoke(
  source: string,
  invocation: Invocation,
  onBeforeSubmit?: () => void,
): Promise<TxResult> {
  const server = getRpcServer();
  const account = await server.getAccount(source);
  const contract = new Contract(stellarConfig.contractId);

  const built = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: stellarConfig.networkPassphrase,
  })
    .addOperation(contract.call(invocation.method, ...invocation.args))
    .setTimeout(180)
    .build();

  // Simulate to obtain resource footprint + soroban auth, then assemble.
  const sim = await server.simulateTransaction(built);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulasi gagal: ${sim.error}`);
  }
  const prepared = rpc.assembleTransaction(built, sim).build();

  // Freighter signs the assembled XDR (includes the soroban auth entries).
  const signedXdr = await signXdr(prepared.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, stellarConfig.networkPassphrase);

  onBeforeSubmit?.();
  const sent = await server.sendTransaction(signedTx);
  if (sent.status === "ERROR") {
    throw new Error(`Transaksi ditolak jaringan: ${JSON.stringify(sent.errorResult)}`);
  }

  // Poll until the ledger closes (or a short cap so the UI never hangs forever).
  let got = await server.getTransaction(sent.hash);
  for (let i = 0; got.status === "NOT_FOUND" && i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    got = await server.getTransaction(sent.hash);
  }

  if (got.status !== "SUCCESS") {
    throw new Error(`Transaksi gagal di on-chain: ${got.status}`);
  }
  return { hash: sent.hash };
}

// ─── Server-signed (seamless) path ───────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export interface ServerSigner {
  role: string;
  configured: boolean;
  /** Public key the server will sign with for this role (null if unconfigured). */
  address: string | null;
}

/** Which address the API's service key signs with for MY role. */
export async function fetchServerSigner(accessToken: string): Promise<ServerSigner> {
  // NOTE: no `cache` option here — this file is type-checked by the scripts
  // package too, whose Node lib types lack RequestInit.cache. Client-side
  // fetches are not cached by default, so nothing is lost.
  const res = await fetch(`${API_BASE}/tx/signer`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json().catch(() => ({}))) as ServerSigner & { error?: string };
  if (!res.ok) {
    throw new Error(data?.error ?? `[api] GET /tx/signer -> ${res.status}`);
  }
  return data;
}

/**
 * Seamless invoke: the SAME Invocation the Freighter path would sign, but the
 * args go to the API as base64 ScVal XDR and the server signs + submits with
 * the caller-role's service key. Throws with the server's message on failure.
 */
export async function invokeServer(invocation: Invocation, accessToken: string): Promise<TxResult> {
  const argsXdr = invocation.args.map((a) => a.toXDR("base64"));
  const res = await fetch(`${API_BASE}/tx/execute`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ method: invocation.method, argsXdr }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    hash?: string;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.hash) {
    throw new Error(data?.error ?? `[api] POST /tx/execute -> ${res.status}`);
  }
  return { hash: data.hash };
}
