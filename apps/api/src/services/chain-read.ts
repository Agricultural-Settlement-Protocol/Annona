/**
 * Read-back helpers for annotate endpoints: given a submitted tx hash, pull the
 * contract call's RETURN VALUE off the ledger (create_agreement and
 * request_funding both return the new on-chain u64 id). This is how the web
 * client can persist off-chain detail (input baskets, funding backing lines)
 * keyed to the right row without ever knowing the id client-side.
 */
import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { getStellarNetworkConfig } from "../config/env.js";

let cachedServer: rpc.Server | undefined;

function getServer(): rpc.Server {
  if (!cachedServer) {
    const { rpcUrl } = getStellarNetworkConfig();
    cachedServer = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
  }
  return cachedServer;
}

/**
 * Resolve the u64 the contract returned for `txHash`. Polls briefly (the web
 * calls this right after its own submit confirmed, so the tx is normally
 * already on-ledger). Returns null when the tx is missing/failed or the return
 * value is not a u64.
 */
export async function resolveReturnedId(txHash: string): Promise<bigint | null> {
  const server = getServer();
  let got = await server.getTransaction(txHash);
  for (let i = 0; got.status === "NOT_FOUND" && i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    got = await server.getTransaction(txHash);
  }
  if (got.status !== "SUCCESS" || !got.returnValue) return null;
  try {
    const native = scValToNative(got.returnValue) as unknown;
    if (typeof native === "bigint") return native;
    if (typeof native === "number" && Number.isInteger(native)) return BigInt(native);
    return null;
  } catch {
    return null;
  }
}
