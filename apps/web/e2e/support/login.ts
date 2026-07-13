import { type Page, expect } from "@playwright/test";
import { ACCOUNTS, type Role } from "./accounts";

/**
 * Log in through the real /auth form against live Supabase, then wait for the
 * role-routed dashboard. resolveRole() caches the role in localStorage and the
 * page router.replace()s to ROLE_HOME[role].
 */
export async function login(page: Page, role: Role): Promise<void> {
  const acc = ACCOUNTS[role];
  await page.goto("/auth");
  await page.locator('input[name="email"]').fill(acc.email);
  await page.locator('input[type="password"]').fill(acc.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`**${acc.home}**`, { timeout: 30_000 });
}

/** Assert the write hooks are in demo mode (the guard the whole suite relies on:
 *  a real contract id would try to talk to Freighter + testnet). The KMP shell
 *  renders a "Mode Demo" WalletBadge when the registry id is unset. */
export async function expectDemoMode(page: Page): Promise<void> {
  await expect(page.getByText(/Mode Demo/i).first()).toBeVisible({ timeout: 20_000 });
}
