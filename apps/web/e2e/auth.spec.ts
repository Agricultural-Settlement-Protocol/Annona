import { expect, test } from "@playwright/test";
import { ACCOUNTS, type Role } from "./support/accounts";
import { login } from "./support/login";

/**
 * Auth + role routing. Real Supabase sign-in for each of the four seeded roles;
 * each must land on its ROLE_HOME. This is also the smoke test that the seeded
 * app_user role links are intact (the supplier-login bug this project hit).
 */
const roles: Role[] = ["kmp", "supplier", "pemerintah", "financier"];

for (const role of roles) {
  test(`login as ${role} routes to its dashboard`, async ({ page }) => {
    await login(page, role);
    await expect(page).toHaveURL(new RegExp(ACCOUNTS[role].home));
  });
}

test("wrong password is rejected", async ({ page }) => {
  await page.goto("/auth");
  await page.locator('input[name="email"]').fill(ACCOUNTS.kmp.email);
  await page.locator('input[type="password"]').fill("wrong-password");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText(/salah|invalid|gagal/i).first()).toBeVisible();
  await expect(page).toHaveURL(/\/auth/);
});
