import { expect, test } from "@playwright/test";
import { login } from "./support/login";

/**
 * Government oversight AI. The Groq call (POST /api/oversight-ai) is external +
 * nondeterministic, so it is route-mocked with a canned grounded reply. The test
 * proves the UI wiring: the officer's question is sent and the assistant answer
 * renders in the transcript.
 */
const GROUNDED_REPLY =
  "Berdasarkan data read-model: 12 perjanjian aktif, 4 bersubsidi (HET e-RDKK), total talangan Rp110 juta. Tidak ada anomali.";

test("oversight AI answers a grounded query", async ({ page }) => {
  await page.route("**/api/oversight-ai", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reply: GROUNDED_REPLY }),
    });
  });

  await login(page, "pemerintah");
  await page.goto("/oversight/pemerintah/ai");

  const question = "Berapa jumlah perjanjian bersubsidi?";
  const box = page.getByRole("textbox").last();
  await expect(box).toBeVisible();
  await box.fill(question);
  await box.press("Enter");

  // The user's message and the (mocked) grounded assistant reply both render.
  await expect(page.getByText(question).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/12 perjanjian aktif, 4 bersubsidi/)).toBeVisible({
    timeout: 20_000,
  });
});
