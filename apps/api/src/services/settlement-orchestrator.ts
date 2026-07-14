/**
 * Server-side Soroban settle() orchestrator. Backend signs + submits with
 * the service Keypair (utils/stellar.ts) — no Freighter, no client-supplied
 * signer. Mirrors the build -> prepare (simulate + attach auth footprint) ->
 * sign -> submit -> poll pipeline already proven in scripts/seed-chain.ts's
 * `invoke()` and apps/web/lib/tx.ts.
 *
 * MVP scope per TASK.md: synchronous request/response only. No idempotency
 * key, no settlement_attempts table, no indexer coupling — the caller gets
 * the outcome directly in the HTTP response and the indexer (unchanged)
 * picks up the resulting Settled event on its own schedule.
 *
 * settle() signature (contracts/offtake-registry/src/lib.rs):
 *   pub fn settle(env: Env, caller: Address, id: u64) -> Result<(), ContractError>
 */
import {
  Address,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  rpc,
} from "@stellar/stellar-sdk";
import { getStellarNetworkConfig } from "../config/env.js";
import { getServiceKeypair } from "../utils/stellar.js";

export class SettlementError extends Error {}

export interface SettlementResult {
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

/**
 * Invoke `settle(caller, id)` on the deployed offtake-registry, signed by
 * the service key, and wait for the on-chain result. `caller` is always the
 * service Keypair's own address — never accept it from the request body.
 */
export async function executeSettlement(onchainId: bigint): Promise<SettlementResult> {
  const { networkPassphrase, registryContractId } = getStellarNetworkConfig();
  const signer = getServiceKeypair();
  const server = getServer();
  const contract = new Contract(registryContractId);

  const account = await server.getAccount(signer.publicKey());
  const built = new TransactionBuilder(account, {
    fee: "2000000", // generous: Soroban resource fees dwarf BASE_FEE
    networkPassphrase,
  })
    .addOperation(
      contract.call(
        "settle",
        Address.fromString(signer.publicKey()).toScVal(),
        nativeToScVal(onchainId, { type: "u64" }),
      ),
    )
    .setTimeout(60)
    .build();

  let prepared: Awaited<ReturnType<typeof server.prepareTransaction>>;
  try {
    prepared = await server.prepareTransaction(built);
  } catch (err) {
    // Simulation failure surfaces contract errors (AlreadyClosed, NothingToSettle,
    // Unauthorized, ...) before anything is submitted.
    throw new SettlementError(
      `Simulasi settle() gagal: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  prepared.sign(signer);

  const sent = await server.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    throw new SettlementError(`Transaksi ditolak jaringan: ${JSON.stringify(sent.errorResult)}`);
  }

  for (let i = 0; i < 40; i++) {
    const got = await server.getTransaction(sent.hash);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash: sent.hash, ledger: got.ledger };
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new SettlementError(`Transaksi gagal di on-chain: ${JSON.stringify(got.resultXdr)}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new SettlementError(`Timeout menunggu konfirmasi transaksi ${sent.hash}`);
}
