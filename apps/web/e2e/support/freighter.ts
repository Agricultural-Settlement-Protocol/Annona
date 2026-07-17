import type { BrowserContext } from "@playwright/test";

/**
 * Freighter wallet mock for the REAL-mode smoke run (Phase 9: "Freighter mocked
 * for CI, real for smoke").
 *
 * @stellar/freighter-api v4 does NOT call methods on a `window.freighterApi`
 * object. It talks to the extension's content script over `window.postMessage`:
 *
 *   request:  { source: "FREIGHTER_EXTERNAL_MSG_REQUEST", messageId, type, ...params }
 *   response: { source: "FREIGHTER_EXTERNAL_MSG_RESPONSE", messagedId, ...payload }
 *
 * (`messagedId` is a typo in the library itself — the response matcher reads
 * `data.messagedId === messageId`, so the mock must reproduce it verbatim.)
 *
 * Only REQUEST_CONNECTION_STATUS / REQUEST_PUBLIC_KEY have a 2s fallback
 * timeout in the library; every other request (REQUEST_ACCESS,
 * SUBMIT_TRANSACTION, ...) waits forever if nothing answers. An unanswered
 * mock therefore hangs the UI in "signing" with no error — which is exactly
 * why the old object-shaped mock could never work against v4.
 *
 * `isConnected()` short-circuits on a truthy `window.freighter`, so we set
 * that too and never rely on the postMessage fallback for detection.
 *
 * Signing: if `secret` is provided, the XDR is signed NODE-SIDE with the real
 * Keypair via `context.exposeFunction` — the resulting transaction is valid to
 * submit to testnet (true end-to-end). Without `secret`, the XDR is echoed
 * back unsigned (enough for flows that only need the wallet to "answer").
 */
export interface FreighterMockOptions {
  /** Public key the mock reports as the connected account (G...). */
  address: string;
  /**
   * Secret seed (S...) matching `address`. When set, SUBMIT_TRANSACTION
   * responses carry a genuinely signed XDR (signed in Node, not the browser),
   * so submits to the real network succeed.
   */
  secret?: string;
  /** Network passphrase the wallet claims to be on. */
  networkPassphrase?: string;
  network?: string;
}

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const SIGN_FN = "__freighterMockSign";

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
    canSign: !!opts.secret,
  };

  if (opts.secret) {
    const { Keypair, TransactionBuilder } = await import("@stellar/stellar-sdk");
    const keypair = Keypair.fromSecret(opts.secret);
    await context.exposeFunction(
      SIGN_FN,
      (xdr: string, networkPassphrase: string): string => {
        const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
        tx.sign(keypair);
        return tx.toXDR();
      },
    );
  }

  await context.addInitScript((cfg) => {
    // isConnected() fast-path: truthy window.freighter == "extension present".
    (window as unknown as { freighter: boolean }).freighter = true;

    type FreighterRequest = {
      source?: string;
      messageId?: number;
      type?: string;
      transactionXdr?: string;
      entryXdr?: string;
      networkPassphrase?: string;
    };

    window.addEventListener("message", (ev: MessageEvent<FreighterRequest>) => {
      const d = ev.data;
      if (!d || d.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST") return;

      const reply = (payload: Record<string, unknown>) => {
        window.postMessage(
          {
            source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
            // sic: the library matches on `messagedId`, not `messageId`.
            messagedId: d.messageId,
            ...payload,
          },
          window.location.origin,
        );
      };

      switch (d.type) {
        case "REQUEST_CONNECTION_STATUS":
          reply({ isConnected: true });
          break;
        case "REQUEST_ALLOWED_STATUS":
        case "SET_ALLOWED_STATUS":
          reply({ isAllowed: true });
          break;
        case "REQUEST_ACCESS":
        case "REQUEST_PUBLIC_KEY":
          reply({ publicKey: cfg.address });
          break;
        case "REQUEST_NETWORK":
          reply({ network: cfg.network, networkPassphrase: cfg.networkPassphrase });
          break;
        case "REQUEST_NETWORK_DETAILS":
          reply({
            network: cfg.network,
            networkPassphrase: cfg.networkPassphrase,
            networkUrl: "https://soroban-testnet.stellar.org",
          });
          break;
        case "SUBMIT_TRANSACTION": {
          const signer = (
            window as unknown as {
              __freighterMockSign?: (xdr: string, passphrase: string) => Promise<string>;
            }
          ).__freighterMockSign;
          const passphrase = d.networkPassphrase ?? cfg.networkPassphrase;
          if (cfg.canSign && signer && d.transactionXdr) {
            signer(d.transactionXdr, passphrase)
              .then((signed) =>
                reply({ signedTransaction: signed, signerAddress: cfg.address }),
              )
              .catch((err: unknown) =>
                reply({
                  signedTransaction: "",
                  signerAddress: "",
                  error: {
                    code: -1,
                    message: err instanceof Error ? err.message : String(err),
                  },
                }),
              );
          } else {
            reply({ signedTransaction: d.transactionXdr ?? "", signerAddress: cfg.address });
          }
          break;
        }
        case "SUBMIT_AUTH_ENTRY":
          reply({ signedAuthEntry: d.entryXdr ?? "", signerAddress: cfg.address });
          break;
        default:
          // Answer unknown requests with an error rather than hanging the UI.
          reply({ error: { code: -1, message: `freighter mock: unhandled ${d.type}` } });
      }
    });
  }, config);
}
