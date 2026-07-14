import { expect, test } from "@playwright/test";
import { expectDemoMode, login } from "./support/login";

/**
 * KMP settlement journey. The reads are REAL (live API + Supabase seeded
 * read-model), so a broken read fails the run. The settle WRITE runs in demo
 * mode (self-simulated sign+submit + fabricated hash) — deterministic, no chain.
 *
 * Also covers the Phase 6 e-RDKK surface (subsidy column on the farmer registry)
 * shipped in this repo.
 */
test.describe("KMP settlement journey", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "kmp");
    await expectDemoMode(page);
  });

  test("dashboard + agreements read live from the API", async ({ page }) => {
    // Landing KPIs derive from the live /overview aggregate — at least one rupiah
    // figure must render (money is never a raw integer; it is formatted Rp...).
    await expect(page.getByText(/Rp\s?[\d.]/).first()).toBeVisible();

    await page.goto("/kmp/perjanjian");
    // The agreement table renders seeded rows with a subsidy-tier badge column.
    await expect(page.getByRole("cell").first()).toBeVisible();
    await expect(page.getByText(/Bersubsidi|Komersial/).first()).toBeVisible();
  });

  test("farmer registry shows the e-RDKK subsidy column + badge", async ({ page }) => {
    await page.goto("/kmp/petani");
    await expect(page.getByText(/Subsidi \(e-RDKK\)/i).first()).toBeVisible();
    // A farmer row shows one of the three e-RDKK badges.
    await expect(
      page.getByText(/e-RDKK Terverifikasi|e-RDKK Belum|Non-Subsidi/).first(),
    ).toBeVisible();
  });

  test("settle a payable agreement (demo write) surfaces a tx hash", async ({ page }) => {
    await page.goto("/kmp/pembayaran");

    // Step 1: open the "Pilih Perjanjian" combobox and pick the first payable one.
    const combo = page.locator('button[aria-haspopup="listbox"]').first();
    await combo.click();
    const firstOption = page.locator("ul[aria-label] li button").first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();

    // Step 2: the three-way split preview renders (real §5 math on live data).
    await expect(page.getByText(/Petani|Handling|Supplier|Margin/).first()).toBeVisible();

    // Step 3: settle (demo). Success panel + explorer link (real tx-hash surface).
    await page.getByRole("button", { name: "Bayar Sekarang" }).click();
    await expect(page.getByText("Pembayaran berhasil!")).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator('a[href*="stellar.expert/explorer/testnet/tx/"]').first(),
    ).toBeVisible();
  });
});
