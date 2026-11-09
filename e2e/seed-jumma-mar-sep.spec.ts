import { test, expect } from "@playwright/test";

test.describe("Seed Jumma Mar-Sep 2026 via Playwright", () => {
  test("seed March to September 2026 Fridays", async ({ page }) => {
    await page.goto("/collections/jumma");
    await expect(page.getByRole("heading", { name: "Jumma Collection" })).toBeVisible();

    // March to September 2026 Fridays with amounts
    const testData = [
      // March 2026
      { date: "2026-03-06", amount: "120.00" },
      { date: "2026-03-13", amount: "180.00" },
      { date: "2026-03-20", amount: "150.00" },
      { date: "2026-03-27", amount: "220.00" },
      // April 2026
      { date: "2026-04-03", amount: "190.00" },
      { date: "2026-04-10", amount: "250.00" },
      { date: "2026-04-17", amount: "170.00" },
      { date: "2026-04-24", amount: "210.00" },
      // May 2026
      { date: "2026-05-01", amount: "160.00" },
      { date: "2026-05-08", amount: "200.00" },
      { date: "2026-05-15", amount: "230.00" },
      { date: "2026-05-22", amount: "140.00" },
      { date: "2026-05-29", amount: "240.00" },
      // June 2026
      { date: "2026-06-05", amount: "180.00" },
      { date: "2026-06-12", amount: "220.00" },
      { date: "2026-06-19", amount: "190.00" },
      { date: "2026-06-26", amount: "210.00" },
      // July 2026
      { date: "2026-07-03", amount: "170.00" },
      { date: "2026-07-10", amount: "230.00" },
      { date: "2026-07-17", amount: "150.00" },
      { date: "2026-07-24", amount: "200.00" },
      { date: "2026-07-31", amount: "240.00" },
      // August 2026
      { date: "2026-08-07", amount: "160.00" },
      { date: "2026-08-14", amount: "220.00" },
      { date: "2026-08-21", amount: "180.00" },
      { date: "2026-08-28", amount: "250.00" },
      // September 2026
      { date: "2026-09-04", amount: "190.00" },
      { date: "2026-09-11", amount: "210.00" },
      { date: "2026-09-18", amount: "170.00" },
      { date: "2026-09-25", amount: "230.00" },
    ];

    for (const { date, amount } of testData) {
      // Check if already exists (by date display)
      const dateDisplay = new Date(date + "T00:00:00.000Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const existing = page.locator(`text=${dateDisplay}`);

      if (await existing.count() > 0) {
        console.log(`⚠ ${date} (${dateDisplay}) already exists, skipping`);
        continue;
      }

      console.log(`Seeding ${date} (${dateDisplay}) - ₹${amount}`);

      await page.click("text=Record New Jumma");
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      await modal.locator('input[id="recordDate"]').fill(date);
      await modal.locator('input[id="recordAmount"]').fill(amount);
      await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });

      await modal.locator('button:has-text("Save")').click();

      // Wait for reload
      await expect(page.locator(`text=₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first()).toBeVisible({ timeout: 30000 });
      await expect(page.locator(`text=${dateDisplay}`).first()).toBeVisible({ timeout: 15000 });

      await page.waitForLoadState('networkidle');
    }

    console.log("✅ Seeding complete!");
  });
});