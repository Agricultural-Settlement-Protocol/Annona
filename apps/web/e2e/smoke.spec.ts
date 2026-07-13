import { expect, test } from "@playwright/test";
import { installFreighterMock } from "./support/freighter";
import { login } from "./support/login";

/**
 * REAL-mode smoke run. Skipped unless E2E_SMOKE=1, because it needs the web app
 * started with a real NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID (live testnet),
 * not the demo-mode webServer the default suite uses.
 *
 * Run it with:
 *   NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID=<id> E2E_SMOKE=1 \
 *     pnpm --filter @annona/web test:e2e:smoke
 *
 * Use the mock below for a wallet-less real-mode run, or install the real
 * Freighter extension for a true end-to-end signature.
 */
const SMOKE = process.env.E2E_SMOKE === "1";
const DEMO_SIGNER = "GAGRINAS7Y2Q7VZ3FJHXK5Q6ZQ6ZQ6ZQ6ZQ6ZQ6ZQ6ZQ6ZQ6ZQ6ZQ6Z"; // placeholder G-key

test.describe("real-mode smoke", () => {
  test.skip(!SMOKE, "real-mode smoke: set E2E_SMOKE=1 and a real contract id");

  test("wallet connects and the app is in LIVE (non-demo) mode", async ({ page, context }) => {
    await installFreighterMock(context, { address: DEMO_SIGNER });
    await login(page, "kmp");
    // In live mode the "Mode Demo" pill must be gone (a real registry id is set).
    await expect(page.getByText(/Mode Demo/i)).toHaveCount(0);
  });
});
