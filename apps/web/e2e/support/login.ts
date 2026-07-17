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
  const email = page.locator('input[name="email"]');
  await expect(email).toBeVisible();

  // Click the demo-account card: its onClick sets email + password in ONE React
  // state update, which avoids the two-field fill race that leaves the submit
  // button disabled. Fall back to typing if the card isn't found. Retried as a
  // unit: a click that lands before React hydration is a silent no-op, so
  // "clicked but submit still disabled" must re-click, not just re-wait.
  const card = page.locator("button", { hasText: acc.email });
  const submit = page.locator('button[type="submit"]');
  await expect(async () => {
    if (await card.count()) {
      await card.first().click();
    } else {
      await email.fill(acc.email);
      await page.locator('input[type="password"]').fill(acc.password);
    }
    await expect(submit).toBeEnabled({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await submit.click();
  await page.waitForURL(`**${acc.home}**`, { timeout: 30_000 });
}

/** Assert the write hooks are in demo mode (the guard the whole suite relies on:
 *  a real contract id would try to talk to Freighter + testnet). The KMP shell
 *  renders a "Mode Demo" WalletBadge when the registry id is unset. */
export async function expectDemoMode(page: Page): Promise<void> {
  await expect(page.getByText(/Mode Demo/i).first()).toBeVisible({ timeout: 20_000 });
}
