import type { BrowserContext } from "@playwright/test";

/**
 * Freighter wallet mock for the REAL-mode smoke run (Phase 9: "Freighter mocked
 * for CI, real for smoke").
 *
 * The default CI suite runs in DEMO MODE, where `useTx` never touches the wallet
 * (see components/kmp/use-tx.ts) — so no mock is needed there. This helper is for
 * running the write path with a real contract id set but WITHOUT a browser
 * extension: it injects a provider object shaped like the one the Freighter
 * extension puts on `window`, which `@stellar/freighter-api` reads.
 *
 * It stubs signing only; the transaction is still built + simulated + submitted
 * against the configured Soroban RPC, so pair it with a testnet contract id (real
 * end-to-end) or an RPC route-mock for a fully hermetic real-mode run.
 */
export interface FreighterMockOptions {
  /** Public key the mock reports as the connected account (G...). */
  address: string;
  /** Network passphrase the wallet claims to be on. */
  networkPassphrase?: string;
  network?: string;
  /** If set, signTransaction returns this signed XDR verbatim (else echoes input). */
  signedXdr?: string;
}

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

/** Install the mock provider on every page/document in the context. Call BEFORE
 *  navigating. */
export async function installFreighterMock(
  context: BrowserContext,
  opts: FreighterMockOptions,
): Promise<void> {
  const config = {
    address: opts.address,
    networkPassphrase: opts.networkPassphrase ?? TESTNET_PASSPHRASE,
    network: opts.network ?? "TESTNET",
    signedXdr: opts.signedXdr ?? null,
  };

  await context.addInitScript((cfg) => {
    // Shape mirrors @stellar/freighter-api v4's expected window provider.
    const provider = {
      isConnected: async () => ({ isConnected: true }),
      isAllowed: async () => ({ isAllowed: true }),
      setAllowed: async () => ({ isAllowed: true }),
      requestAccess: async () => ({ address: cfg.address }),
      getAddress: async () => ({ address: cfg.address }),
      getNetwork: async () => ({
        network: cfg.network,
        networkPassphrase: cfg.networkPassphrase,
      }),
      getNetworkDetails: async () => ({
        network: cfg.network,
        networkPassphrase: cfg.networkPassphrase,
        networkUrl: "https://soroban-testnet.stellar.org",
      }),
      signTransaction: async (xdr: string) => ({
        signedTxXdr: cfg.signedXdr ?? xdr,
        signerAddress: cfg.address,
      }),
      signAuthEntry: async (entryXdr: string) => ({
        signedAuthEntry: entryXdr,
        signerAddress: cfg.address,
      }),
    };
    // Both spellings the ecosystem has used, to be safe across versions.
    (window as unknown as { freighterApi: unknown }).freighterApi = provider;
    (window as unknown as { freighter: unknown }).freighter = provider;
  }, config);
}
