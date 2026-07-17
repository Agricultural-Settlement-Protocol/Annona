import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Keypair, Networks, rpc } from "@stellar/stellar-sdk";
import { expect, test } from "@playwright/test";
import { installFreighterMock } from "./support/freighter";

/**
 * REAL-MODE smoke: the full KMP write path against the LIVE testnet contract.
 *
 * The browser runs the production pipeline (build -> simulate -> "Freighter"
 * sign -> submit -> poll) — only the wallet is mocked, and it signs with the
 * coop's REAL key (SETTLEMENT_SERVICE_SECRET in apps/api/.env, which IS the
 * coop keypair for this deployment). Each run creates one new on-chain
 * agreement; the tx hash the UI surfaces is then independently verified via
 * RPC getTransaction. Run with:
 *
 *   pnpm exec playwright test --config playwright.real.config.ts
 */

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

/**
 * Login through the real /auth form (same as the demo suite). NOTE: injecting a
 * REST-fetched session into localStorage instead deadlocks supabase-js's
 * getUser() (its cross-tab lock/init path never resolves against a foreign
 * session object), leaving AuthGuard on "Memeriksa sesi" forever — so the UI
 * form it is.
 */
async function uiLogin(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  const card = page.locator("button", { hasText: "kmp@annona.id" });
  const submit = page.locator('button[type="submit"]');
  await expect(async () => {
    await card.first().click();
    await expect(submit).toBeEnabled({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await submit.click();
  await page.waitForURL("**/kmp**", { timeout: 45_000 });
}

function coopSecret(): string {
  if (process.env.SETTLEMENT_SERVICE_SECRET) return process.env.SETTLEMENT_SERVICE_SECRET;
  const here = dirname(fileURLToPath(import.meta.url));
  const env = readFileSync(join(here, "../../api/.env"), "utf8");
  const m = env.match(/^SETTLEMENT_SERVICE_SECRET=(S[A-Z0-9]+)\s*$/m);
  if (!m?.[1]) {
    throw new Error(
      "real-mode: SETTLEMENT_SERVICE_SECRET not found (env or apps/api/.env) — cannot sign",
    );
  }
  return m[1];
}

test.describe("real-mode write path (testnet)", () => {
  test("create_agreement from the UI lands on-chain with a verifiable tx", async ({
    page,
    context,
  }) => {
    const secret = coopSecret();
    const kp = Keypair.fromSecret(secret);
    await installFreighterMock(context, { address: kp.publicKey(), secret });

    // Real-mode debugging: surface browser-side failures in the runner output.
    page.on("pageerror", (err) => console.log("[pageerror]", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[console.error]", msg.text().slice(0, 300));
    });
    page.on("framenavigated", (f) => {
      if (f === page.mainFrame()) console.log("[nav]", f.url());
    });
    page.on("request", (r) => {
      if (r.url().includes("supabase")) console.log("[req]", r.method(), r.url().slice(0, 90));
    });
    page.on("response", (r) => {
      if (r.url().includes("supabase")) console.log("[res]", r.status(), r.url().slice(0, 90));
    });
    page.on("requestfailed", (r) =>
      console.log("[reqfail]", r.url().slice(0, 110), r.failure()?.errorText),
    );

    await uiLogin(page);
    await page.goto("/kmp/perjanjian/baru");
    // Real mode: the amber demo pill must NOT be shown.
    await expect(page.getByText(/Mode Demo/i)).toHaveCount(0);

    // Step 1: pick the first farmer from the searchable select.
    await page.locator('button[aria-haspopup="listbox"]').first().click();
    await page.locator("ul[aria-label] li button").first().click();

    // Step 2: add one catalog item (checking its checkbox puts qty 1 in the cart).
    await page.locator('input[type="checkbox"][id^="cat-"]').first().check();

    // Step 3: submit. The button enables once farmer + cart are set.
    const submit = page.getByRole("button", { name: "Buat Perjanjian", exact: true });
    await expect(submit).toBeEnabled();
    await submit.click();

    // Success panel with a REAL explorer link (fabricated demo hashes never
    // exist on-chain; the RPC check below is the difference).
    const link = page.locator('a[href*="stellar.expert/explorer/testnet/tx/"]').first();
    await expect(link).toBeVisible({ timeout: 60_000 });
    const href = await link.getAttribute("href");
    const hash = href?.split("/tx/")[1]?.split("?")[0] ?? "";
    expect(hash).toMatch(/^[0-9a-f]{64}$/);

    // Independent verification: the transaction exists and SUCCEEDED on testnet.
    const server = new rpc.Server(RPC_URL);
    const got = await server.getTransaction(hash);
    expect(got.status).toBe(rpc.Api.GetTransactionStatus.SUCCESS);
    // Sanity: we are on the network the app claims.
    const net = await server.getNetwork();
    expect(net.passphrase).toBe(Networks.TESTNET);
  });
});
