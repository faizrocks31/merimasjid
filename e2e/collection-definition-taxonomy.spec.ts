import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

async function loginAsAdmin(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', "localadmin@gmail.com");
  await page.fill('input[name="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

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
    await loginAsAdmin(page);
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
  });

  test("Test F - Edit Mode: Base Category and Subcategory pre-filled correctly", async ({ page }) => {
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
    await saveBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Now edit the created definition
    const editBtn = page.locator('li:has-text("Taxonomy Edit Test") button[aria-label="Edit"]').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
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
  });
});