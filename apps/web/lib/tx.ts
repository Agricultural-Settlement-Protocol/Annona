/**
 * Soroban invoke pipeline for the KMP write path:
 * build -> simulate -> assemble -> Freighter sign -> submit -> poll.
 *
 * An `Invocation` is a method name + positional ScVal args (built by
 * lib/invocations.ts). The coop's Freighter address is both the source account
 * and the `coop`/`caller` argument the contract binds auth to.
 */
import {
  BASE_FEE,
  Contract,
  TransactionBuilder,
  rpc,
  type xdr,
} from "@stellar/stellar-sdk";
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
