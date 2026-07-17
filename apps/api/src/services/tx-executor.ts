/**
 * Generic server-signed Soroban invocation executor — the seamless
 * (no-Freighter) write path. Same proven pipeline as the settle orchestrator:
 * build -> prepare (simulate + attach auth footprint) -> sign -> submit ->
 * poll. The signer keypair is chosen by the CALLER (routes/tx.ts maps the
 * authenticated app_user role to its service secret); this module never
 * decides who may sign what.
 *
 * Args arrive as base64-encoded ScVal XDR built by the SAME
 * `apps/web/lib/invocations.ts` builders the Freighter path uses, so the
 * encoding is identical in both modes. A malformed/mismatched arg fails at
 * simulation with a contract-level error before anything is submitted.
 */
import { Contract, Keypair, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
import { getStellarNetworkConfig } from "../config/env.js";

export class TxExecutionError extends Error {}

export interface TxExecutionResult {
  hash: string;
  ledger: number;
}

let cachedServer: rpc.Server | undefined;

function getServer(): rpc.Server {
  if (!cachedServer) {
    const { rpcUrl } = getStellarNetworkConfig();
    cachedServer = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
  }
  return cachedServer;
}

/** Decode one base64 ScVal, with a readable error instead of an XDR throw. */
export function decodeScVal(b64: string, index: number): xdr.ScVal {
  try {
    return xdr.ScVal.fromXDR(b64, "base64");
  } catch {
    throw new TxExecutionError(`Argumen transaksi #${index + 1} bukan ScVal XDR yang valid`);
  }
}

/**
 * Invoke `method(...args)` on the offtake registry, signed by `secret`, and
 * wait for the on-chain result.
 */
export async function executeContractCall(
  method: string,
  args: xdr.ScVal[],
  secret: string,
): Promise<TxExecutionResult> {
  const { networkPassphrase, registryContractId } = getStellarNetworkConfig();
  const signer = Keypair.fromSecret(secret);
  const server = getServer();
  const contract = new Contract(registryContractId);

  const account = await server.getAccount(signer.publicKey());
  const built = new TransactionBuilder(account, {
    fee: "2000000", // generous: Soroban resource fees dwarf BASE_FEE
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  let prepared: Awaited<ReturnType<typeof server.prepareTransaction>>;
  try {
    prepared = await server.prepareTransaction(built);
  } catch (err) {
    // Simulation failure surfaces contract errors (Unauthorized, InvalidStatus,
    // NothingToSettle, ...) before anything is submitted.
    throw new TxExecutionError(
      `Simulasi ${method}() gagal: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  prepared.sign(signer);

  const sent = await server.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    throw new TxExecutionError(`Transaksi ditolak jaringan: ${JSON.stringify(sent.errorResult)}`);
  }

  for (let i = 0; i < 40; i++) {
    const got = await server.getTransaction(sent.hash);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash: sent.hash, ledger: got.ledger };
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new TxExecutionError(`Transaksi gagal di on-chain: ${JSON.stringify(got.resultXdr)}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new TxExecutionError(`Timeout menunggu konfirmasi transaksi ${sent.hash}`);
}
