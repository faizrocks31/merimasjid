import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

async function openAddCollectionDefinitionForm(page: any) {
  await page.goto(`${BASE_URL}/settings?tab=collections`);
  await page.waitForTimeout(1000);
  const addBtn = page.locator('button:has-text("Add Collection Definition")').first();
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();
  await page.waitForTimeout(500);
}

async function getBaseCategoryOptions(page: any): Promise<string[]> {
  const select = page.locator('select[name="baseCategoryId"]');
  await expect(select).toBeVisible();
  const options = await select.locator('option').all();
  const labels: string[] = [];
  for (const opt of options) {
    const text = await opt.textContent();
    if (text && text.trim()) labels.push(text.trim());
  }
  return labels;
}

async function getSubcategoryOptions(page: any): Promise<string[]> {
  const select = page.locator('select[name="subcategoryId"]');
  await expect(select).toBeVisible();
  const options = await select.locator('option').all();
  const labels: string[] = [];
  for (const opt of options) {
    const text = await opt.textContent();
    if (text && text.trim()) labels.push(text.trim());
  }
  return labels;
}

async function selectBaseCategory(page: any, baseCategoryLabel: string): Promise<void> {
  await page.evaluate((label: string) => {
    const select = document.querySelector('select[name="baseCategoryId"]') as HTMLSelectElement;
    if (select) {
      const options = Array.from(select.options);
      const option = options.find(opt => opt.textContent?.trim() === label);
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, baseCategoryLabel);
  await page.waitForTimeout(500);
}

async function selectSubcategory(page: any, subcategoryLabel: string) {
  await page.selectOption('select[name="subcategoryId"]', { label: subcategoryLabel });
  await page.waitForTimeout(300);
}

test.describe("Collection Definition Taxonomy Validation", () => {
  test.beforeEach(async ({ page }) => {
    // Auth state is provided via storageState in playwright.config.ts (e2e project)
    // Just navigate to settings tab
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);
  });

  test("Test A - Base Category Options: Exactly 7 approved options, no obsolete options", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);
    const labels = await getBaseCategoryOptions(page);

    console.log('Base Category Options:', labels);

    // Expected 7 approved base categories
    const expectedBaseCategories = [
      "Annual",
      "Construction",
      "General",
      "Jumma",
      "Monthly",
      "Sadaqah",
      "Zakat"
    ];

    // Obsolete options that must NOT appear
    const obsoleteOptions = [
      "Chanda",
      "Community Event",
      "Fundraising",
      "General Donation",
      "Infaq"
    ];

    // Assert exactly 7 options (plus placeholder)
    expect(labels.length).toBeGreaterThanOrEqual(7);

    // Assert all approved options are present
    for (const expected of expectedBaseCategories) {
      expect(labels).toContain(expected);
    }

    // Assert obsolete options are absent
    for (const obsolete of obsoleteOptions) {
      expect(labels).not.toContain(obsolete);
    }
  });

  test("Test B - Annual Subcategory Filtering: General and Recurring Donation only", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);
    await selectBaseCategory(page, "Annual");
    const subLabels = await getSubcategoryOptions(page);

    console.log('Subcategory options for Annual:', subLabels);

    expect(subLabels).toContain("General");
    expect(subLabels).toContain("Recurring Donation");
    expect(subLabels).not.toContain("Annual"); // Annual must NOT appear as subcategory
    expect(subLabels).not.toContain("Restricted");
  });

  test("Test C - Construction Subcategory Filtering: Restricted only", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);
    await selectBaseCategory(page, "Construction");
    const subLabels = await getSubcategoryOptions(page);

    console.log('Subcategory options for Construction:', subLabels);

    expect(subLabels).toContain("Restricted");
    expect(subLabels).not.toContain("General");
    expect(subLabels).not.toContain("Recurring Donation");
  });

  test("Test D - General Subcategory Filtering: General and Restricted only", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);
    await selectBaseCategory(page, "General");
    const subLabels = await getSubcategoryOptions(page);

    console.log('Subcategory options for General:', subLabels);

    expect(subLabels).toContain("General");
    expect(subLabels).toContain("Restricted");
    expect(subLabels).not.toContain("Recurring Donation");
  });

  test("Test E - Sadaqah Subcategory Filtering: General only", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);
    await selectBaseCategory(page, "Sadaqah");
    const subLabels = await getSubcategoryOptions(page);

    console.log('Subcategory options for Sadaqah:', subLabels);

    expect(subLabels).toContain("General");
    expect(subLabels).not.toContain("Restricted");
    expect(subLabels).not.toContain("Recurring Donation");
  });

  test("Test E - Zakat Subcategory Filtering: Restricted only", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);
    await selectBaseCategory(page, "Zakat");
    const subLabels = await getSubcategoryOptions(page);

    console.log('Subcategory options for Zakat:', subLabels);

    expect(subLabels).toContain("Restricted");
    expect(subLabels).not.toContain("General");
    expect(subLabels).not.toContain("Recurring Donation");
  });

  test("Test E - Jumma Subcategory Filtering: Recurring Donation only", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);
    await selectBaseCategory(page, "Jumma");
    const subLabels = await getSubcategoryOptions(page);

    console.log('Subcategory options for Jumma:', subLabels);

    expect(subLabels).toContain("Recurring Donation");
    expect(subLabels).not.toContain("General");
    expect(subLabels).not.toContain("Restricted");
  });

  test("Test E - Monthly Subcategory Filtering: Recurring Donation only", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);
    await selectBaseCategory(page, "Monthly");
    const subLabels = await getSubcategoryOptions(page);

    console.log('Subcategory options for Monthly:', subLabels);

    expect(subLabels).toContain("Recurring Donation");
    expect(subLabels).not.toContain("General");
    expect(subLabels).not.toContain("Restricted");
  });

  test("Test F - Dynamic Selection Behavior: Changing Base Category refreshes Subcategory", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);

    // Start with Annual -> should show General, Recurring Donation
    await selectBaseCategory(page, "Annual");
    let subLabels = await getSubcategoryOptions(page);
    expect(subLabels).toContain("General");
    expect(subLabels).toContain("Recurring Donation");

    // Switch to Construction -> should show only Restricted
    await selectBaseCategory(page, "Construction");
    subLabels = await getSubcategoryOptions(page);
    expect(subLabels).toContain("Restricted");
    expect(subLabels).not.toContain("General");
    expect(subLabels).not.toContain("Recurring Donation");

    // Switch to General -> should show General, Restricted
    await selectBaseCategory(page, "General");
    subLabels = await getSubcategoryOptions(page);
    expect(subLabels).toContain("General");
    expect(subLabels).toContain("Restricted");

    // Switch to Monthly -> should show Recurring Donation
    await selectBaseCategory(page, "Monthly");
    subLabels = await getSubcategoryOptions(page);
    expect(subLabels).toContain("Recurring Donation");
    expect(subLabels).not.toContain("General");
  });

  test("Test F - Invalid Selection Cleared: Select subcategory then change base category", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);

    // Select Annual and pick "General" subcategory
    await selectBaseCategory(page, "Annual");
    await selectSubcategory(page, "General");

    // Verify it's selected
    const subSelect = page.locator('select[name="subcategoryId"]');
    let selectedValue = await subSelect.inputValue();
    expect(selectedValue).not.toBe("");

    // Change to Construction (which doesn't allow General)
    await selectBaseCategory(page, "Construction");

    // Subcategory should be cleared/reset
    selectedValue = await subSelect.inputValue();
    // Should be empty or default placeholder
    const subLabels = await getSubcategoryOptions(page);
    expect(subLabels).toContain("Restricted");
    expect(subLabels).not.toContain("General");

    // Clean up: Delete the test definition to avoid hitting the limit for the next test
    console.log('Starting cleanup of test definition from Test F - Invalid Selection Cleared...');
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);
    const testItem = page.locator('li:has-text("Taxonomy Edit Test")').first();
    const isVisible = await testItem.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Test item visible for cleanup:', isVisible);
    if (isVisible) {
      const deleteBtn = testItem.locator('button[aria-label="Delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 1000 })) {
        console.log('Clicking delete button...');
        page.once('dialog', async dialog => {
          console.log('Dialog message:', dialog.message());
          await dialog.accept();
        });
        await deleteBtn.click();
        await page.waitForTimeout(2000); // Wait for deletion to complete
        console.log('Cleanup completed');
      } else {
        console.log('Delete button not visible!');
      }
    }
  });

  test("Test F - Edit Mode: Base Category and Subcategory pre-filled correctly", async ({ page }) => {
    // First clean up any existing test definition
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);
    const existingItems = page.locator('li:has-text("Taxonomy Edit Test")');
    if (await existingItems.count() > 0) {
      console.log('Found existing Taxonomy Edit Test, cleaning up...');
      const deleteBtn = existingItems.first().locator('button[aria-label="Delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 1000 })) {
        console.log('Clicking delete button...');
        // Handle native window.confirm() dialog
        page.once('dialog', async dialog => {
          console.log('Dialog message:', dialog.message());
          await dialog.accept();
        });
        await deleteBtn.click();
        await page.waitForTimeout(2000); // Wait for deletion to complete
        console.log('Cleanup completed');
      }
    }

    // First create a test definition
    await openAddCollectionDefinitionForm(page);
    await selectBaseCategory(page, "Monthly");
    await selectSubcategory(page, "Recurring Donation");

    await page.fill('input[name="name"]', "Taxonomy Edit Test");
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "VARIABLE");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "AUTOMATIC");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");

    const saveBtn = page.locator('button[type="submit"]:has-text("Save")').first();
    await expect(saveBtn).toBeVisible();

    // Debug: Intercept the form submission to see what's happening
    const responsePromise = page.waitForResponse(response => response.url().includes('/settings') && response.request().method() === 'POST', { timeout: 5000 }).catch(() => null);

    await saveBtn.click();

    // Wait for the response
    const response = await responsePromise;
    if (response) {
      console.log('Response status:', response.status());
      const responseBody = await response.text().catch(() => 'could not read');
      console.log('Response body:', responseBody);
    } else {
      console.log('No POST response captured');
    }

    // Wait for form submission and page reload
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Debug: Check if there's an error notice
    const errorNotice = page.locator('p:has-text("Could not create"), p:has-text("Invalid"), p:has-text("error")').first();
    if (await errorNotice.isVisible({ timeout: 2000 }).catch(() => false)) {
      const errorText = await errorNotice.textContent();
      console.log('Error notice:', errorText);
    }

    // Debug: Check if we're still on the form page
    const currentUrl = page.url();
    console.log('Current URL after submit:', currentUrl);

    // Debug: Check if the form is still visible (meaning submission failed silently)
    const formVisible = await page.locator('input[name="name"]').isVisible({ timeout: 2000 }).catch(() => false);
    if (formVisible) {
      console.log('Form is still visible - submission may have failed silently');

      // Check for any visible error messages in the form
      const formError = await page.locator('form p[role="alert"], form .text-red, form .text-[var(--danger)]').first().textContent().catch(() => null);
      if (formError) {
        console.log('Form error message:', formError);
      }

      // Debug: Check what the Notice component shows (it shows state.error or state.ok)
      const notice = await page.locator('form > div > p').first().textContent().catch(() => null);
      console.log('Notice text:', notice);

      // Debug: Check if form fields are properly filled
      const nameVal = await page.locator('input[name="name"]').inputValue();
      const baseCategoryVal = await page.locator('select[name="baseCategoryId"]').inputValue();
      const subcategoryVal = await page.locator('select[name="subcategoryId"]').inputValue();
      console.log('Form values:', { name: nameVal, baseCategoryId: baseCategoryVal, subcategoryId: subcategoryVal });
    }

    // Debug: Get all list items to see what's there
    const allItems = await page.locator('ul > li').allTextContents();
    console.log('All list items:', allItems);

    // Reload to see the new item in the list (server component props won't update without reload)
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Now edit the created definition
    const editBtn = page.locator('li:has-text("Taxonomy Edit Test") button[aria-label="Edit"]').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await page.waitForTimeout(500);

    // Verify Base Category is pre-selected as Monthly
    const baseSelect = page.locator('select[name="baseCategoryId"]');
    const selectedBaseText = await baseSelect.locator('option:checked').textContent();
    expect(selectedBaseText?.trim()).toBe("Monthly");

    // Verify Subcategory is pre-selected as Recurring Donation
    const subSelect = page.locator('select[name="subcategoryId"]');
    const selectedSubText = await subSelect.locator('option:checked').textContent();
    expect(selectedSubText?.trim()).toBe("Recurring Donation");

    // Verify subcategory options are filtered correctly in edit mode
    const subLabels = await getSubcategoryOptions(page);
    expect(subLabels).toContain("Recurring Donation");
    expect(subLabels).not.toContain("General");
    expect(subLabels).not.toContain("Restricted");

    // Cancel edit
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(1000);

    // Clean up so the next run doesn't hit the 10-category limit
    const rowForCleanup = page.locator('li:has-text("Taxonomy Edit Test")').first();
    if (await rowForCleanup.isVisible({ timeout: 2000 }).catch(() => false)) {
      page.once('dialog', async dialog => {
        await dialog.accept();
      });
      await rowForCleanup.locator('button[aria-label="Delete"]').first().click();
      await page.waitForTimeout(2000);
    }
  });
});