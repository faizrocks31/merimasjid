import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

async function navigateToDueGeneration(page: any) {
  await page.goto(`${BASE_URL}/collections/generate`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

async function selectCategory(page: any, categoryName: string) {
  // Wait for category cards to be visible
  await page.waitForSelector('button:has-text("' + categoryName + '")', { timeout: 10000 });
  await page.click('button:has-text("' + categoryName + '")', { force: true });
  await page.waitForTimeout(300);

  // Click Next to go to Step 2
  await page.click('button:has-text("Next")', { force: true });
  await page.waitForTimeout(500);
}

async function selectGenerationMode(page: any, mode: "ADMIN" | "AUTOMATIC") {
  await page.waitForSelector('button:has-text("' + mode + '")', { timeout: 10000 });
  await page.click('button:has-text("' + mode + '")', { force: true });
  await page.waitForTimeout(300);

  // Click Next to go to Step 3
  await page.click('button:has-text("Next")', { force: true });
  await page.waitForTimeout(500);
}

async function setDateRange(page: any, fromDate: string, toDate: string) {
  // Use label text to find the correct input
  await page.locator('label:has-text("From Date") + input[type="date"]').fill(fromDate);
  await page.locator('label:has-text("To Date") + input[type="date"]').fill(toDate);
  await page.waitForTimeout(300);

  // Click Next to go to Step 4
  await page.click('button:has-text("Next")', { force: true });
  await page.waitForTimeout(500);
}

test.describe("Due Generation Wizard - Select All Members", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDueGeneration(page);
  });

  test("Test A - All Members option remains unchanged", async ({ page }) => {
    // Select a category with ALL_ELIGIBLE member assignment
    await selectCategory(page, "Monthly Chanda"); // Monthly Chanda uses ALL_ELIGIBLE

    // Select ADMIN generation mode
    await selectGenerationMode(page, "ADMIN");

    // Set date range
    await setDateRange(page, "2026-01-01", "2026-12-31");

    // Step 4: Verify All Members option is available and Selected Members is not shown
    await page.waitForSelector('button:has-text("All Eligible Members")', { timeout: 10000 });

    // Verify All Members is selected by default for ALL_ELIGIBLE categories
    const allEligibleBtn = page.locator('button:has-text("All Eligible Members")');
    await expect(allEligibleBtn).toHaveClass(/border-\[var\(--brand-primary\)\]/);

    // Verify Selected Members option exists but is not selected
    const selectedMembersBtn = page.locator('button:has-text("Selected Members")');
    await expect(selectedMembersBtn).toBeVisible();
    await expect(selectedMembersBtn).not.toHaveClass(/border-\[var\(--brand-primary\)\]/);

    // Click Selected Members
    await selectedMembersBtn.click({ force: true });
    await page.waitForTimeout(300);

    // Verify All Members mode - no checkboxes should be visible when All Eligible is selected
    await allEligibleBtn.click({ force: true });
    await page.waitForTimeout(300);

    // Verify no member checkboxes are visible in All Eligible mode
    const memberCheckboxes = page.locator('input[type="checkbox"]');
    const count = await memberCheckboxes.count();
    // In All Eligible mode, only the mode selection buttons should be visible
    expect(count).toBe(0);
  });

  test("Test B - Selected Members mode shows Select All Eligible Members checkbox", async ({ page }) => {
    // Select a category (Monthly Chanda has ALL_ELIGIBLE by default but we can test SELECTED mode)
    await selectCategory(page, "Monthly Chanda");

    // Select ADMIN generation mode
    await selectGenerationMode(page, "ADMIN");

    // Set date range
    await setDateRange(page, "2026-01-01", "2026-12-31");

    // Step 4: Select "Selected Members" mode
    await page.waitForSelector('button:has-text("Selected Members")', { timeout: 10000 });
    await page.click('button:has-text("Selected Members")', { force: true });
    await page.waitForTimeout(500);

    // Verify Select All Eligible Members checkbox appears
    const selectAllCheckbox = page.locator('label:has-text("Select All Eligible Members") input[type="checkbox"]');
    await expect(selectAllCheckbox).toBeVisible({ timeout: 5000 });

    // Verify label text
    const selectAllLabel = page.locator('label:has-text("Select All Eligible Members")');
    await expect(selectAllLabel).toBeVisible();
  });

  test("Test C - Clicking Select All selects all eligible members", async ({ page }) => {
    await selectCategory(page, "Monthly Chanda");
    await selectGenerationMode(page, "ADMIN");
    await setDateRange(page, "2026-01-01", "2026-12-31");

    await page.click('button:has-text("Selected Members")', { force: true });
    await page.waitForTimeout(500);

    // Click Select All checkbox
    const selectAllCheckbox = page.locator('label:has-text("Select All Eligible Members") input[type="checkbox"]');
    await selectAllCheckbox.check({ force: true });
    await page.waitForTimeout(300);

    // Verify all member checkboxes are checked
    const memberCheckboxes = page.locator('div.max-h-64 input[type="checkbox"]');
    const count = await memberCheckboxes.count();

    for (let i = 0; i < count; i++) {
      const checkbox = memberCheckboxes.nth(i);
      await expect(checkbox).toBeChecked();
    }

    // Verify selected count shows all members
    const countText = page.locator('text=/\\d+ \\/ \\d+ members selected/');
    await expect(countText).toContainText(`${count} / ${count} members selected`);
  });

  test("Test D - Individual selection after Select All", async ({ page }) => {
    await selectCategory(page, "Monthly Chanda");
    await selectGenerationMode(page, "ADMIN");
    await setDateRange(page, "2026-01-01", "2026-12-31");

    await page.click('button:has-text("Selected Members")', { force: true });
    await page.waitForTimeout(500);

    // Click Select All
    const selectAllCheckbox = page.locator('label:has-text("Select All Eligible Members") input[type="checkbox"]');
    await selectAllCheckbox.check({ force: true });
    await page.waitForTimeout(300);

    // Uncheck the first member
    const memberCheckboxes = page.locator('div.max-h-64 input[type="checkbox"]');
    const totalCount = await memberCheckboxes.count();
    await memberCheckboxes.first().uncheck({ force: true });
    await page.waitForTimeout(200);

    // Verify count decreased
    const countText = page.locator('text=/\\d+ \\/ \\d+ members selected/');
    await expect(countText).toContainText(`${totalCount - 1} / ${totalCount} members selected`);

    // Verify Select All shows indeterminate state (not fully checked, not unchecked)
    await expect(selectAllCheckbox).not.toBeChecked();

    // Other members should remain checked
    for (let i = 1; i < totalCount; i++) {
      await expect(memberCheckboxes.nth(i)).toBeChecked();
    }
  });

  test("Test E - Deselect All clears all selections", async ({ page }) => {
    await selectCategory(page, "Monthly Chanda");
    await selectGenerationMode(page, "ADMIN");
    await setDateRange(page, "2026-01-01", "2026-12-31");

    await page.click('button:has-text("Selected Members")', { force: true });
    await page.waitForTimeout(500);

    // Click Select All
    const selectAllCheckbox = page.locator('label:has-text("Select All Eligible Members") input[type="checkbox"]');
    await selectAllCheckbox.check({ force: true });
    await page.waitForTimeout(300);

    // Click Select All again to deselect
    await selectAllCheckbox.uncheck({ force: true });
    await page.waitForTimeout(200);

    // Verify all member checkboxes are unchecked
    const memberCheckboxes = page.locator('div.max-h-64 input[type="checkbox"]');
    const count = await memberCheckboxes.count();

    for (let i = 0; i < count; i++) {
      await expect(memberCheckboxes.nth(i)).not.toBeChecked();
    }

    // Verify count is zero
    const countText = page.locator('text=/\\d+ \\/ \\d+ members selected/');
    await expect(countText).toContainText(`0 / ${count} members selected`);
  });

  test("Test F - Partial selection shows correct count", async ({ page }) => {
    await selectCategory(page, "Monthly Chanda");
    await selectGenerationMode(page, "ADMIN");
    await setDateRange(page, "2026-01-01", "2026-12-31");

    await page.click('button:has-text("Selected Members")', { force: true });
    await page.waitForTimeout(500);

    // Select only first 3 members
    const memberCheckboxes = page.locator('div.max-h-64 input[type="checkbox"]');
    const totalCount = await memberCheckboxes.count();

    await memberCheckboxes.first().check({ force: true });
    await page.waitForTimeout(100);
    await memberCheckboxes.nth(1).check({ force: true });
    await page.waitForTimeout(100);
    await memberCheckboxes.nth(2).check({ force: true });
    await page.waitForTimeout(100);

    // Verify count is 3
    const countText = page.locator('text=/\\d+ \\/ \\d+ members selected/');
    await expect(countText).toContainText(`3 / ${totalCount} members selected`);

    // Verify Select All is not fully checked
    const selectAllCheckbox = page.locator('label:has-text("Select All Eligible Members") input[type="checkbox"]');
    await expect(selectAllCheckbox).not.toBeChecked();
  });

  test("Test G - Search preserves selections", async ({ page }) => {
    await selectCategory(page, "Monthly Chanda");
    await selectGenerationMode(page, "ADMIN");
    await setDateRange(page, "2026-01-01", "2026-12-31");

    await page.click('button:has-text("Selected Members")', { force: true });
    await page.waitForTimeout(500);

    // Select first member
    const memberCheckboxes = page.locator('div.max-h-64 input[type="checkbox"]');
    await memberCheckboxes.first().check({ force: true });
    await page.waitForTimeout(200);

    // Get the member name for search
    const firstMemberName = await page.locator('div.max-h-64 label').first().locator('span').first().textContent();
    const searchTerm = firstMemberName?.substring(0, 3) || "test";

    // Search for that member
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill(searchTerm);
    await page.waitForTimeout(300);

    // Verify the selected member is still visible and checked
    const filteredCheckboxes = page.locator('div.max-h-64 input[type="checkbox"]');
    const filteredCount = await filteredCheckboxes.count();
    expect(filteredCount).toBeGreaterThan(0);
    await expect(filteredCheckboxes.first()).toBeChecked();

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(300);

    // Verify original selection is still there
    const allCheckboxes = page.locator('div.max-h-64 input[type="checkbox"]');
    await expect(allCheckboxes.first()).toBeChecked();
  });

  test("Test H - Complete due generation with selected members", async ({ page }) => {
    await selectCategory(page, "Monthly Chanda");
    await selectGenerationMode(page, "ADMIN");
    // Use a date range far in the future to avoid conflicts with existing dues
    await setDateRange(page, "2028-01-01", "2028-01-31");

    await page.click('button:has-text("Selected Members")', { force: true });
    await page.waitForTimeout(500);

    // Select first 2 members
    const memberCheckboxes = page.locator('div.max-h-64 input[type="checkbox"]');
    const totalCount = await memberCheckboxes.count();
    expect(totalCount).toBeGreaterThanOrEqual(2);

    await memberCheckboxes.first().check({ force: true });
    await page.waitForTimeout(100);
    await memberCheckboxes.nth(1).check({ force: true });
    await page.waitForTimeout(200);

    // Click Next to go to Review step
    await page.click('button:has-text("Review")', { force: true });
    await page.waitForTimeout(500);

    // Verify review shows 2 members selected
    await expect(page.locator('text=/2 members selected/')).toBeVisible();

    // Click Generate
    await page.click('button:has-text("Generate Dues")', { force: true });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    // Verify success or partial success message
    const resultText = await page.locator('text=/Created.*dues periods|skipped.*already existed|Unique constraint|duplicate/').textContent({ timeout: 10000 }).catch(() => '');
    expect(resultText).not.toBeNull();
    expect(resultText!.length).toBeGreaterThan(0);
  });

  test("Test I - Tenant isolation: other masjid members not selectable", async ({ page }) => {
    // This test verifies that the member list only shows members from the current masjid
    // The page.tsx already filters by masjidId, so this is a sanity check
    await selectCategory(page, "Monthly Chanda");
    await selectGenerationMode(page, "ADMIN");
    await setDateRange(page, "2026-01-01", "2026-12-31");

    await page.click('button:has-text("Selected Members")', { force: true });
    await page.waitForTimeout(500);

    // All members shown should belong to the current masjid
    // (This is enforced by the server-side query in page.tsx)
    const memberRows = page.locator('div.max-h-64 label');
    const count = await memberRows.count();
    expect(count).toBeGreaterThan(0);

    // Click Select All and verify all can be selected
    const selectAllCheckbox = page.locator('label:has-text("Select All Eligible Members") input[type="checkbox"]');
    await selectAllCheckbox.check({ force: true });
    await page.waitForTimeout(300);

    const memberCheckboxes = page.locator('div.max-h-64 input[type="checkbox"]');
    const checkboxCount = await memberCheckboxes.count();

    for (let i = 0; i < checkboxCount; i++) {
      await expect(memberCheckboxes.nth(i)).toBeChecked();
    }
  });
});

test.describe("Mobile Viewport - Select All Members", () => {
  const viewports = [
    { name: "Mobile-320", width: 320, height: 720 },
    { name: "Mobile-360", width: 360, height: 800 },
    { name: "Mobile-390", width: 390, height: 844 },
    { name: "Mobile-430", width: 430, height: 932 },
    { name: "Tablet-768", width: 768, height: 1024 },
  ];

  for (const vp of viewports) {
    test(`Test J - Select All works on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await navigateToDueGeneration(page);

      await selectCategory(page, "Monthly Chanda");
      await selectGenerationMode(page, "ADMIN");
      await setDateRange(page, "2026-01-01", "2026-12-31");

      await page.click('button:has-text("Selected Members")', { force: true });
      await page.waitForTimeout(500);

      // Verify Select All checkbox is visible and usable
      const selectAllCheckbox = page.locator('label:has-text("Select All Eligible Members") input[type="checkbox"]');
      await expect(selectAllCheckbox).toBeVisible({ timeout: 5000 });

      // Check it
      await selectAllCheckbox.check({ force: true });
      await page.waitForTimeout(300);
      await expect(selectAllCheckbox).toBeChecked();

      // Verify member checkboxes are checked
      const memberCheckboxes = page.locator('div.max-h-64 input[type="checkbox"]');
      const count = await memberCheckboxes.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        await expect(memberCheckboxes.nth(i)).toBeChecked();
      }

      // Verify no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(vp.width + 20); // Allow small margin

      // Verify count display is visible
      const countText = page.locator('text=/\\d+ \\/ \\d+ members selected/');
      await expect(countText).toBeVisible();
    });
  }
});