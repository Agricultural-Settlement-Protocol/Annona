/**
 * Stellar / Soroban client config for the KMP write path.
 *
 * The browser cannot read scripts/artifacts.testnet.json at runtime, so the
 * deploy handoff is: copy `registryId` from that file into web's `.env.local`
 * as NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID. Until that is set,
 * `isChainConfigured()` is false and the write hooks run in DEMO MODE
 * (simulated signing, fabricated hash) so the dashboard is fully walkable
 * pre-deploy. Once the id is present, the same hooks build/sign/submit real
 * transactions through Freighter.
 */
import { Networks, rpc } from "@stellar/stellar-sdk";

const NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet") as "testnet" | "mainnet";

const NETWORK_PASSPHRASE = NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  (NETWORK === "mainnet"
    ? "https://mainnet.sorobanrpc.com"
    : "https://soroban-testnet.stellar.org");

/** Deployed offtake-registry contract id. Empty until the deploy handoff. */
const CONTRACT_ID = process.env.NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID ?? "";

/** Explorer base for the tx-hash links the UI already renders. */
const EXPLORER_TX =
  NETWORK === "mainnet"
    ? "https://stellar.expert/explorer/public/tx"
    : "https://stellar.expert/explorer/testnet/tx";

export const stellarConfig = {
  network: NETWORK,
  networkPassphrase: NETWORK_PASSPHRASE,
  rpcUrl: RPC_URL,
  contractId: CONTRACT_ID,
  explorerTx: EXPLORER_TX,
} as const;

/**
 * True once NEXT_PUBLIC_CONTRACT_ID is wired. When false, the write hooks stay
 * in demo mode (see file header). This is the single source of truth for
 * "is there a real chain to talk to?" so a misconfigured env cannot silently
 * fake-succeed and look live.
 */
export function isChainConfigured(): boolean {
  return stellarConfig.contractId.length > 0;
}

/** Lazy singleton RPC server (only constructed when a real chain is configured). */
let _server: rpc.Server | undefined;
export function getRpcServer(): rpc.Server {
  if (!_server) {
    _server = new rpc.Server(stellarConfig.rpcUrl, {
      allowHttp: stellarConfig.rpcUrl.startsWith("http://"),
    });
  }
  return _server;
}
