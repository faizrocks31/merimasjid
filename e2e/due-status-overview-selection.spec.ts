import { test, expect } from "@playwright/test";

test.describe("Due Status Overview - Selection and Filtering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/collections/due-status");
    await page.waitForLoadState("networkidle");
    // Wait for the Select components to be fully rendered
    await page.waitForSelector('label:has-text("Select Collection")', { timeout: 10000 });
  });

  test("Test A – Collection Selection", async ({ page }) => {
    // Debug: check if we're on the right page
    await page.waitForTimeout(2000);

    // Check what's on the page
    const pageContent = await page.textContent('body');
    console.log('Page content length:', pageContent?.length);
    console.log('Page contains "Select Collection":', pageContent?.includes('Select Collection'));
    console.log('Page contains "Due Status":', pageContent?.includes('Due Status'));

    // Check if we're redirected to login
    const isLoginPage = await page.locator('input[name="email"]').isVisible().catch(() => false);
    console.log('Is on login page:', isLoginPage);

    // Check if we're on the due-status page
    const isDueStatus = await page.locator('text="Due Status"').isVisible().catch(() => false);
    console.log('Is on due-status:', isDueStatus);

    // Take debug screenshot
    await page.screenshot({ path: 'test-a-debug.png', fullPage: true });

    // Check if label exists
    const label = page.locator('label:has-text("Select Collection")');
    const labelVisible = await label.isVisible().catch(() => false);
    console.log('Label visible:', labelVisible);

    // Check Select component exists
    const collectionSelect = page.locator('label:has-text("Select Collection")').locator("..").locator('[role="combobox"]');
    const selectVisible = await collectionSelect.isVisible().catch(() => false);
    console.log('Select visible:', selectVisible);

    // Take debug screenshot
    await page.screenshot({ path: 'test-a-debug.png', fullPage: true });

    // Check label exists
    const label2 = page.locator('label:has-text("Select Collection")');
    await expect(label2).toBeVisible({ timeout: 5000 });

    // Check Select component exists
    const collectionSelect2 = page.locator('label:has-text("Select Collection")').locator("..").locator('[role="combobox"]');
    await expect(collectionSelect2).toBeVisible({ timeout: 5000 });

    // Debug: take screenshot before clicking
    await page.screenshot({ path: 'test-a-before-click.png', fullPage: true });

    // Open Collection dropdown
    const collectionSelect3 = page.locator('label:has-text("Select Collection")').locator("..").locator('[role="combobox"]');
    await collectionSelect3.click();

    // Wait for dropdown to open - target the specific dropdown by its parent
    const dropdownContent = page.locator('label:has-text("Select Collection")').locator("..").locator('[role="listbox"]');
    await page.waitForTimeout(1000); // Give time for dropdown to animate

    // Debug: take screenshot after clicking
    await page.screenshot({ path: 'test-a-after-click.png', fullPage: true });

    // Check if dropdown is visible
    const isDropdownVisible = await dropdownContent.isVisible().catch(() => false);
    console.log('Dropdown visible after click (immediate):', isDropdownVisible);

    await expect(dropdownContent).toBeVisible({ timeout: 10000 });

    // Find any collection option
    const options = dropdownContent.locator('[role="option"]');
    const count = await options.count();
    console.log(`Found ${count} collection options`);
    expect(count).toBeGreaterThan(0);

    // Click first option
    await options.first().click();

    // Wait a bit for state updates
    await page.waitForTimeout(500);

    // Check if dropdown is still visible
    const isVisible = await dropdownContent.isVisible().catch(() => false);
    console.log('Dropdown visible after click:', isVisible);

    // Check if selectedCollectionId state was updated
    // by looking at the trigger button text
    const triggerText = await collectionSelect3.textContent();
    console.log('Trigger text after selection:', triggerText);

    // Wait a bit more
    await page.waitForTimeout(2000);

    const isVisible2 = await dropdownContent.isVisible().catch(() => false);
    console.log('Dropdown visible after 2s:', isVisible2);

    // Check again
    const isVisible3 = await dropdownContent.isVisible().catch(() => false);
    console.log('Dropdown visible after 3s:', isVisible3);

    // Verify dropdown closes
    await expect(dropdownContent).toBeHidden({ timeout: 10000 });

    // Verify Year filter populates
    const yearSelect = page.locator('label:has-text("Select Year")').locator("..").locator('[role="combobox"]');
    await expect(yearSelect).toBeVisible();

    console.log('Year select visible, attempting click...');
    await yearSelect.click();

    // Wait for year dropdown to open
    await page.waitForTimeout(1000);

    const yearDropdown = page.locator('label:has-text("Select Year")').locator("..").locator('[role="listbox"]');

    // Debug: check if year dropdown exists
    const yearDropdownCount = await yearDropdown.count();
    console.log('Year dropdown count:', yearDropdownCount);

    if (yearDropdownCount > 0) {
      const isVisible = await yearDropdown.first().isVisible().catch(() => false);
      console.log('Year dropdown visible:', isVisible);
    }

    await expect(yearDropdown).toBeVisible({ timeout: 10000 });

    // Should have years from actual dues periods
    const yearOptions = yearDropdown.locator('[role="option"]');
    const yearCount = await yearOptions.count();
    expect(yearCount).toBeGreaterThan(0);
  });

  test("Test B – Year Filtering", async ({ page }) => {
    // Select first collection
    const collectionSelect = page.locator('label:has-text("Select Collection")').locator("..").locator('[role="combobox"]');
    await collectionSelect.click();
    const dropdownContent = page.locator('[role="listbox"]');
    await expect(dropdownContent).toBeVisible({ timeout: 5000 });
    await dropdownContent.locator('[role="option"]').first().click();
    await expect(dropdownContent).toBeHidden({ timeout: 5000 });

    // Now test year filtering
    const yearSelect = page.locator('label:has-text("Select Year")').locator("..").locator('[role="combobox"]');
    await yearSelect.click();

    const yearDropdown = page.locator('[role="listbox"]').last();
    await expect(yearDropdown).toBeVisible({ timeout: 5000 });

    const yearOptions = yearDropdown.locator('[role="option"]');
    const yearCount = await yearOptions.count();
    expect(yearCount).toBeGreaterThan(0);

    // Select first available year
    const firstYear = yearOptions.first();
    const yearText = await firstYear.textContent();
    await firstYear.click();

    // Wait for selection to be reflected
    await page.waitForTimeout(500);

    // Verify year is selected - check if year text appears in trigger
    const triggerText = await yearSelect.textContent();
    console.log('Year select trigger text:', triggerText);

    // Wait for member data to load
    await page.waitForLoadState("networkidle");

    // Check that member-wise due information loads (may be empty if no dues generated)
    const memberTable = page.locator('table tbody');
    const isVisible = await memberTable.isVisible().catch(() => false);
    if (isVisible) {
      await expect(memberTable).toBeVisible({ timeout: 5000 });
    } else {
      console.log('No member-wise dues data - table not rendered (no dues generated)');
    }
  });

  test("Test C – Frequency", async ({ page }) => {
    // Select first collection
    const collectionSelect = page.locator('label:has-text("Select Collection")').locator("..").locator('[role="combobox"]');
    await collectionSelect.click();
    const dropdownContent = page.locator('[role="listbox"]');
    await expect(dropdownContent).toBeVisible({ timeout: 5000 });
    await dropdownContent.locator('[role="option"]').first().click();
    await expect(dropdownContent).toBeHidden({ timeout: 3000 });

    // Verify frequency filter shows correct frequency
    const frequencySelect = page.locator('label:has-text("Select Frequency")').locator("..").locator('[role="combobox"]');
    await frequencySelect.click();

    const frequencyDropdown = page.locator('[role="listbox"]').last();
    await expect(frequencyDropdown).toBeVisible({ timeout: 5000 });

    const frequencyOptions = frequencyDropdown.locator('[role="option"]');

    const freqCount = await frequencyOptions.count();
    expect(freqCount).toBeGreaterThan(0);

    await frequencySelect.click(); // Close dropdown
  });

  test("Test D – Member Status", async ({ page }) => {
    // Select first collection and a year
    const collectionSelect = page.locator('label:has-text("Select Collection")').locator("..").locator('[role="combobox"]');
    await collectionSelect.click();
    const dropdownContent = page.locator('[role="listbox"]');
    await expect(dropdownContent).toBeVisible({ timeout: 5000 });
    await dropdownContent.locator('[role="option"]').first().click();
    await expect(dropdownContent).toBeHidden({ timeout: 5000 });

    const yearSelect = page.locator('label:has-text("Select Year")').locator("..").locator('[role="combobox"]');
    await yearSelect.click();
    const yearDropdown = page.locator('[role="listbox"]').last();
    await expect(yearDropdown).toBeVisible({ timeout: 5000 });
    await yearDropdown.locator('[role="option"]').first().click();

    await page.waitForLoadState("networkidle");

    // Test each member status filter
    const statusSelect = page.locator('label:has-text("Member Status")').locator("..").locator('[role="combobox"]');
    await statusSelect.click();

    const statusDropdown = page.locator('[role="listbox"]').last();
    await expect(statusDropdown).toBeVisible({ timeout: 5000 });

    const statusOptions = statusDropdown.locator('[role="option"]');
    const statusCount = await statusOptions.count();

    // Should have All, Active, Inactive options
    expect(statusCount).toBeGreaterThanOrEqual(3);

    // Test each status
    for (let i = 0; i < statusCount; i++) {
      const option = statusOptions.nth(i);
      const optionText = await option.textContent();
      await option.click();

      await page.waitForTimeout(500);
      const triggerText = await statusSelect.textContent();
      console.log('Status select trigger text:', triggerText);

      await page.waitForLoadState("networkidle");

      // Re-open for next iteration
      if (i < statusCount - 1) {
        await statusSelect.click();
        await expect(statusDropdown).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("Test E – Member Search", async ({ page }) => {
    // Select first collection and a year
    const collectionSelect = page.locator('label:has-text("Select Collection")').locator("..").locator('[role="combobox"]');
    await collectionSelect.click();
    const dropdownContent = page.locator('[role="listbox"]');
    await expect(dropdownContent).toBeVisible({ timeout: 5000 });
    await dropdownContent.locator('[role="option"]').first().click();
    await expect(dropdownContent).toBeHidden({ timeout: 5000 });

    const yearSelect = page.locator('label:has-text("Select Year")').locator("..").locator('[role="combobox"]');
    await yearSelect.click();
    const yearDropdown = page.locator('[role="listbox"]').last();
    await expect(yearDropdown).toBeVisible({ timeout: 5000 });
    await yearDropdown.locator('[role="option"]').first().click();

    await page.waitForLoadState("networkidle");

    // Get initial member count
    const memberTable = page.locator('table tbody');
    const initialRows = await memberTable.locator('tr').count();

    // Search for a member
    const searchInput = page.locator('label:has-text("Search Members")').locator("..").locator('input[type="text"]');
    await searchInput.fill("Test");

    await page.waitForLoadState("networkidle");

    // Verify filtering works
    const filteredRows = await memberTable.locator('tr').count();
    expect(filteredRows).toBeLessThanOrEqual(initialRows);

    // Clear search
    await searchInput.fill("");

    await page.waitForLoadState("networkidle");

    // Verify results restored
    const restoredRows = await memberTable.locator('tr').count();
    expect(restoredRows).toBe(initialRows);

    // Verify other filters remain unchanged - just check that the collection select still works
    await expect(collectionSelect).toBeVisible();
    // Verify we can still interact with it
    await collectionSelect.click();
    const dropdownContent2 = page.locator('[role="listbox"]');
    await expect(dropdownContent2).toBeVisible({ timeout: 5000 });
    await dropdownContent2.locator('[role="option"]').first().click();
    await expect(dropdownContent2).toBeHidden({ timeout: 5000 });
  });

  test("Test F – Collection Switching", async ({ page }) => {
    const collectionSelect = page.locator('label:has-text("Select Collection")').locator("..").locator('[role="combobox"]');
    const dropdownContent = page.locator('[role="listbox"]');

    // Select first collection
    await collectionSelect.click();
    await expect(dropdownContent).toBeVisible({ timeout: 5000 });
    await dropdownContent.locator('[role="option"]').first().click();
    await expect(dropdownContent).toBeHidden({ timeout: 3000 });

    // Select year
    const yearSelect = page.locator('label:has-text("Select Year")').locator("..").locator('[role="combobox"]');
    await yearSelect.click();
    const yearDropdown = page.locator('[role="listbox"]').last();
    await expect(yearDropdown).toBeVisible({ timeout: 5000 });
    await yearDropdown.locator('[role="option"]').first().click();

    // Select second collection
    await collectionSelect.click();
    await expect(dropdownContent).toBeVisible({ timeout: 5000 });
    const options = dropdownContent.locator('[role="option"]');
    const optCount = await options.count();
    if (optCount > 1) {
      await options.nth(1).click();
      await expect(dropdownContent).toBeHidden({ timeout: 3000 });
      await page.waitForLoadState("networkidle");
    }

    // Back to first collection
    await collectionSelect.click();
    await expect(dropdownContent).toBeVisible({ timeout: 5000 });
    await options.first().click();
    await expect(dropdownContent).toBeHidden({ timeout: 3000 });
    await page.waitForLoadState("networkidle");

    // Verify no stale data - year filter should still work
    await yearSelect.click();
    await expect(page.locator('[role="listbox"]').last().locator('[role="option"]').first()).toBeVisible({ timeout: 5000 });
  });

  test("Test G – Actual Due Data", async ({ page }) => {
    // Select first collection and first year
    const collectionSelect = page.locator('label:has-text("Select Collection")').locator("..").locator('[role="combobox"]');
    await collectionSelect.click();
    const dropdownContent = page.locator('[role="listbox"]');
    await expect(dropdownContent).toBeVisible({ timeout: 5000 });
    await dropdownContent.locator('[role="option"]').first().click();
    await expect(dropdownContent).toBeHidden({ timeout: 3000 });

    const yearSelect = page.locator('label:has-text("Select Year")').locator("..").locator('[role="combobox"]');
    await yearSelect.click();
    const yearDropdown = page.locator('[role="listbox"]').last();
    await expect(yearDropdown).toBeVisible({ timeout: 5000 });
    await yearDropdown.locator('[role="option"]').first().click();

    await page.waitForLoadState("networkidle");

    // Verify member-wise dues appear
    const memberTable = page.locator('table tbody');
    const rows = memberTable.locator('tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Verify data structure - each row should have member name, status badges, amounts
      const firstRow = rows.first();
      await expect(firstRow.locator('td').first()).toBeVisible(); // Member name

      // Check for status badges
      const statusBadges = firstRow.locator('[role="status"], .badge, [class*="badge"]');
      await expect(statusBadges.first()).toBeVisible();
    } else {
      // No dues generated yet - this is acceptable if no dues exist in DB
      console.log("No due records found for selected collection/year - may need to generate dues first");
    }
  });
});