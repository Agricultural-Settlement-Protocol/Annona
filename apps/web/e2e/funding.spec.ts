import { expect, test } from "@playwright/test";
import { expectDemoMode, login } from "./support/login";

/**
 * Offtake-financing journey (Ajukan Dana -> approve -> disburse). KMP submits a
 * funding request against seeded agreements; the financier approves + disburses
 * from the live queue. Reads are real (queue + backing come from the API); the
 * write signatures are demo-mode simulated.
 */
test.describe("Funding journey", () => {
  test("KMP submits an offtake funding request", async ({ page }) => {
    await login(page, "kmp");
    await expectDemoMode(page);
    await page.goto("/kmp/permintaan-dana");

    // Pick the first backing agreement (each selectable row shows "perkiraan .. kg").
    const firstAgreement = page.getByRole("button").filter({ hasText: /perkiraan/ }).first();
    await expect(firstAgreement).toBeVisible();
    await firstAgreement.click();

    await page.getByRole("button", { name: "Ajukan Dana" }).click();
    await expect(page.getByText(/Permintaan terkirim \(demo/i)).toBeVisible({ timeout: 20_000 });
  });

  test("financier approves then disburses from the live queue", async ({ page }) => {
    await login(page, "financier");
    await expectDemoMode(page);
    await page.goto("/financier/antrean");

    // The queue is a real read: at least one pending request (seeded Requested).
    const approve = page.getByRole("button", { name: "Setujui" }).first();
    await expect(approve).toBeVisible();
    await approve.click();
    // Approve emits a demo tx -> success log row with an explorer link.
    await expect(
      page.locator('a[href*="stellar.expert/explorer/testnet/tx/"]').first(),
    ).toBeVisible({ timeout: 20_000 });

    // Disburse (real dIDR transfer on-chain; demo-simulated here) -> second hash.
    const disburse = page.getByRole("button", { name: "Cairkan" }).first();
    await expect(disburse).toBeVisible();
    await disburse.click();
    await expect(
      page.locator('a[href*="stellar.expert/explorer/testnet/tx/"]'),
    ).toHaveCount(2, { timeout: 20_000 });
  });
});
