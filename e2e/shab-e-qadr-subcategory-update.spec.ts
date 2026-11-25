import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("Shab-e-Qadr subcategory update test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.goto(`${BASE_URL}/settings?tab=collections`);
  });

  test("select subcategory and verify behavior", async ({ page }) => {
    // Click Edit button for Shab-e-Qadr
    const shabRow = page.locator('li:has-text("Shab-e-Qadr")').first();
    await expect(shabRow).toBeVisible({ timeout: 10000 });
    await shabRow.locator('button[aria-label="Edit"]').click();

    // Wait for form to be visible
    await expect(page.locator('select[name="baseCategoryId"]')).toBeVisible({ timeout: 5000 });

    const subSelect = page.locator('select[name="subcategoryId"]');
    await expect(subSelect).toBeVisible({ timeout: 5000 });

    // Verify base category is Annual
    const baseSelect = page.locator('select[name="baseCategoryId"]');
    await expect(baseSelect.locator('option:checked')).toHaveText(/Annual/i);

    // Wait for form to fully load and controlled select to sync with editingDefinition
    await page.waitForTimeout(500);

    // Initial subcategory value
    const initialSub = (await subSelect.locator('option:checked').textContent())?.trim();
    console.log('Initial subcategory:', initialSub);

    // Determine target index (flip to the other option)
    const options = await subSelect.locator('option').all();
    let generalIndex: number | null = null;
    let recurringIndex: number | null = null;
    for (let i = 0; i < options.length; i++) {
      const text = (await options[i].textContent())?.trim();
      if (text === 'General') generalIndex = i;
      if (text === 'Recurring Donation') recurringIndex = i;
    }
    expect(generalIndex).not.toBeNull();
    expect(recurringIndex).not.toBeNull();

    const targetIndex = initialSub === 'Recurring Donation' ? generalIndex! : recurringIndex!;
    const targetLabel = targetIndex === generalIndex ? 'General' : 'Recurring Donation';

    // Change the subcategory via the controlled select
    await subSelect.selectOption({ index: targetIndex! });
    await page.waitForTimeout(500);

    // Verify the selection persists across re-renders (regression: it used to revert)
    await expect(subSelect.locator('option:checked')).toHaveText(targetLabel, { timeout: 5000 });

    // Click Update to save
    const updateBtn = page.locator('button:has-text("Update")');
    await expect(updateBtn).toBeVisible();
    await updateBtn.click();

    // Wait for form submission to complete - the page should reload
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Check for any error notice (indicating the update was blocked by business rule)
    const errorNotice = page.locator('[role="alert"], p.rounded-lg');
    const hasError = await errorNotice.isVisible({ timeout: 2000 }).catch(() => false);
    let errorText = "";
    if (hasError) {
      errorText = (await errorNotice.textContent()) || "";
      console.log('Form error notice:', errorText);
    }

    // Check page URL to see if reload happened
    console.log('Page URL after update:', page.url());

    // Reload to get fresh data from DB
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // Re-open edit form and check persisted value
    const shabRow2 = page.locator('li:has-text("Shab-e-Qadr")').first();
    await expect(shabRow2).toBeVisible({ timeout: 10000 });
    await shabRow2.locator('button[aria-label="Edit"]').click();

    // Wait for edit form to appear
    await expect(page.locator('select[name="baseCategoryId"]')).toBeVisible({ timeout: 5000 });

    const subSelect2 = page.locator('select[name="subcategoryId"]');
    await expect(subSelect2).toBeVisible({ timeout: 5000 });
    const persistedSub = (await subSelect2.locator('option:checked').textContent())?.trim();

    // Verify behavior:
    // - If update was blocked (error notice about dependents), DB value should be unchanged
    // - If update succeeded (no error), DB value should be the new target value
    if (hasError && errorText.includes("dependent")) {
      console.log('Update blocked by business rule - verifying DB value unchanged');
      expect(persistedSub).toBe(initialSub);
    } else {
      console.log('Update succeeded - verifying DB value updated');
      expect(persistedSub).toBe(targetLabel);
    }
  });
});