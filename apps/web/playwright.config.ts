import { defineConfig, devices } from "@playwright/test";

/**
 * Phase 9 — E2E harness for the Annona web app.
 *
 * Design (see docs/BUILD-PLAN.md Phase 9):
 *  - Web runs in DEMO MODE: `NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID` is forced
 *    empty so `useTx` self-simulates every write (no chain / Freighter / RPC).
 *    This makes the write journeys deterministic and secret-free.
 *  - READS are real: the API (Hono) + live Supabase serve the seeded read-model,
 *    so a broken read fails the run (the Phase 9 gate).
 *  - Auth is real Supabase email+password against the seeded demo accounts.
 *  - The Groq AI endpoint is route-mocked per test (external + nondeterministic).
 *  - A Freighter mock (e2e/support/freighter.ts) is available for the documented
 *    real-mode smoke run; the CI suite does not need it (demo mode).
 *
 * Two webServers boot: the API on 8787 and the web app on 3100. Both are reused
 * if already running locally, and started fresh in CI.
 */

const WEB_PORT = 3100;
const API_PORT = 8787;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  // real-mode.spec.ts mutates the live testnet contract — it runs only via
  // playwright.real.config.ts, never in the demo/CI suite.
  testIgnore: /real-mode\.spec\.ts/,
  outputDir: "./e2e/.results",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: isCI ? [["github"], ["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: [
    {
      // Real API against live Supabase (reads are genuine).
      command: "pnpm --filter @annona/api dev",
      url: `http://localhost:${API_PORT}/health`,
      timeout: 120_000,
      reuseExistingServer: !isCI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      // Web in DEMO MODE (empty contract id) so writes self-simulate. Everything
      // else (Supabase, API url) comes from apps/web/.env.local.
      command: `pnpm --filter @annona/web exec next dev --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: 120_000,
      reuseExistingServer: !isCI,
      env: { ...process.env, NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID: "" },
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
