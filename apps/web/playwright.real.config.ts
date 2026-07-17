import { defineConfig, devices } from "@playwright/test";

/**
 * REAL-MODE E2E config: the web app boots with the real registry contract id
 * (from apps/web/.env.local — deliberately NOT blanked like the CI config), so
 * `useTx` builds/signs/submits genuine testnet transactions through the
 * postMessage Freighter mock (e2e/support/freighter.ts) signing with a real
 * key. Chain-mutating by design — run manually, never in CI:
 *
 *   pnpm exec playwright test --config playwright.real.config.ts
 *
 * Uses its own ports so a demo-mode dev server on 3100/8787 keeps running.
 */
const WEB_PORT = 3101;
const API_PORT = 8787;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /real-mode\.spec\.ts/,
  outputDir: "./e2e/.results-real",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  timeout: 120_000,
  expect: { timeout: 20_000 },

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: [
    {
      command: "pnpm --filter @annona/api dev",
      url: `http://localhost:${API_PORT}/health`,
      timeout: 120_000,
      reuseExistingServer: true,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      // Real contract id comes from apps/web/.env.local — no override here.
      // Own dist dir: sharing .next with the demo server (3100) or a build
      // corrupts both (see next.config.ts distDir note).
      command: `pnpm --filter @annona/web exec next dev --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: 120_000,
      reuseExistingServer: true,
      env: { ...process.env, NEXT_DIST_DIR: ".next-real" },
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
