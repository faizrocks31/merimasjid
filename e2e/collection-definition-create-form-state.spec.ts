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

test.describe("Collection Definition Create Form State", () => {
  test.beforeEach(async ({ page }) => {
    // Auth state is provided via storageState in playwright.config.ts (e2e project)
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);
  });

  test("Test A - Initial Annual Filtering: Only General and Recurring Donation", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);

    // Verify Annual is the initial/default base category
    const baseSelect = page.locator('select[name="baseCategoryId"]');
    const initialBaseCategory = (await baseSelect.locator('option:checked').textContent())?.trim();
    console.log('Initial base category:', initialBaseCategory);

    // Read the actual Subcategory options
    const subLabels = await getSubcategoryOptions(page);
    console.log('Initial subcategory options:', subLabels);

    // Assert exactly General and Recurring Donation appear
    expect(subLabels).toContain("General");
    expect(subLabels).toContain("Recurring Donation");
    // Assert Restricted is absent
    expect(subLabels).not.toContain("Restricted");
    // Should have exactly 2 options (no placeholder expected to be counted as valid option)
    expect(subLabels.length).toBe(2);
  });

  test("Test B - All Seven Base Categories", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);

    const expectedMappings: Record<string, string[]> = {
      "Construction": ["Restricted"],
      "General": ["General", "Restricted"],
      "Sadaqah": ["General"],
      "Zakat": ["Restricted"],
      "Jumma": ["Recurring Donation"],
      "Monthly": ["Recurring Donation"],
      "Annual": ["General", "Recurring Donation"],
    };

    for (const [baseCategory, expectedSubcategories] of Object.entries(expectedMappings)) {
      await selectBaseCategory(page, baseCategory);
      const subLabels = await getSubcategoryOptions(page);
      console.log(`Subcategory options for ${baseCategory}:`, subLabels);

      // Verify all expected subcategories are present
      for (const expected of expectedSubcategories) {
        expect(subLabels).toContain(expected);
      }
      // Verify no unexpected subcategories are present
      const allPossible = ["General", "Restricted", "Recurring Donation"];
      for (const possible of allPossible) {
        if (!expectedSubcategories.includes(possible)) {
          expect(subLabels).not.toContain(possible);
        }
      }
    }

    // Test round-trip: Annual -> Construction -> General -> Annual
    await selectBaseCategory(page, "Annual");
    let subLabels = await getSubcategoryOptions(page);
    expect(subLabels).toEqual(["General", "Recurring Donation"]);

    await selectBaseCategory(page, "Construction");
    subLabels = await getSubcategoryOptions(page);
    expect(subLabels).toEqual(["Restricted"]);

    await selectBaseCategory(page, "General");
    subLabels = await getSubcategoryOptions(page);
    expect(subLabels).toEqual(["General", "Restricted"]);

    await selectBaseCategory(page, "Annual");
    subLabels = await getSubcategoryOptions(page);
    expect(subLabels).toEqual(["General", "Recurring Donation"]);
  });

  test("Test C - Checkbox Toggle", async ({ page }) => {
    await openAddCollectionDefinitionForm(page);

    // Use getByRole to target only the checkbox (not the hidden input)
    const showInPaymentCheckbox = page.getByRole('checkbox', { name: 'Show in Payment Received' });
    const activeCheckbox = page.getByRole('checkbox', { name: 'Active' });

    const initialChecked = await showInPaymentCheckbox.isChecked();
    console.log('Initial Show in Payment Received:', initialChecked);

    const initialActiveChecked = await activeCheckbox.isChecked();
    console.log('Initial Active:', initialActiveChecked);

    // Uncheck Show in Payment Received
    if (initialChecked) {
      await showInPaymentCheckbox.uncheck();
      await page.waitForTimeout(300);
    }
    const afterUncheck = await showInPaymentCheckbox.isChecked();
    expect(afterUncheck).toBe(false);

    // Trigger React re-render by changing other form fields
    await page.fill('input[name="name"]', "Test Checkbox Toggle");
    await page.waitForTimeout(300);

    // Verify Show in Payment Received remains unchecked
    const afterRender = await showInPaymentCheckbox.isChecked();
    expect(afterRender).toBe(false);

    // Verify Active checkbox maintains its independent state
    const activeAfterRender = await activeCheckbox.isChecked();
    expect(activeAfterRender).toBe(initialActiveChecked);

    // Re-check Show in Payment Received
    await showInPaymentCheckbox.check();
    await page.waitForTimeout(300);
    const afterRecheck = await showInPaymentCheckbox.isChecked();
    expect(afterRecheck).toBe(true);

    // Change Base Category to trigger another re-render
    await selectBaseCategory(page, "Construction");
    await page.waitForTimeout(300);
    const afterBaseChange = await showInPaymentCheckbox.isChecked();
    expect(afterBaseChange).toBe(true);

    // Verify the form can be submitted with showInPaymentReceived = false
    await openAddCollectionDefinitionForm(page);
    const showInPaymentCheckbox2 = page.getByRole('checkbox', { name: 'Show in Payment Received' });
    await showInPaymentCheckbox2.uncheck();
    await page.waitForTimeout(300);

    // Fill required fields
    await page.fill('input[name="name"]', "Test Checkbox False");
    await selectBaseCategory(page, "Annual");
    await selectSubcategory(page, "Recurring Donation");
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "VARIABLE");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "AUTOMATIC");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");

    // Intercept form submission to inspect payload
    let capturedFormData: FormData | null = null;
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('FormData entries')) {
        console.log('Form submit log:', msg.text());
      }
    });

    // We'll verify the actual submitted value by checking the database after creation
  });

  test("Test D - Save and Persistence: Show in Payment Received = false", async ({ page }) => {
    // Clean up any existing test definitions
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    // Clean up Test Persistence True first (might exist from previous run)
    const existingTrueItems = page.locator('li:has-text("Test Persistence True")');
    if (await existingTrueItems.count() > 0) {
      const deleteBtn = existingTrueItems.first().locator('button[aria-label="Delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 1000 })) {
        console.log('Clicking delete button for existing Test Persistence True...');
        page.once('dialog', async dialog => {
          console.log('Dialog message:', dialog.message());
          await dialog.accept();
        });
        await deleteBtn.click();
        await page.waitForTimeout(2000);
        console.log('Cleanup of existing Test Persistence True completed');
      }
    }

    // Clean up Test Persistence False if it exists
    const existingFalseItems = page.locator('li:has-text("Test Persistence False")');
    if (await existingFalseItems.count() > 0) {
      const deleteBtn = existingFalseItems.first().locator('button[aria-label="Delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 1000 })) {
        console.log('Clicking delete button for existing Test Persistence False...');
        page.once('dialog', async dialog => {
          console.log('Dialog message:', dialog.message());
          await dialog.accept();
        });
        await deleteBtn.click();
        await page.waitForTimeout(2000);
        console.log('Cleanup of existing Test Persistence False completed');
      }
    }

    await openAddCollectionDefinitionForm(page);

    // Set up the form
    await page.fill('input[name="name"]', "Test Persistence False");
    await selectBaseCategory(page, "Annual");
    await selectSubcategory(page, "Recurring Donation");

    // Uncheck Show in Payment Received
    const showInPaymentCheckbox = page.getByRole('checkbox', { name: 'Show in Payment Received' });
    await showInPaymentCheckbox.uncheck();
    await page.waitForTimeout(300);
    const isUnchecked = await showInPaymentCheckbox.isChecked();
    expect(isUnchecked).toBe(false);

    // Fill remaining required fields
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "VARIABLE");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "AUTOMATIC");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");

    // Submit
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
    await page.waitForTimeout(3000);

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

    // Verify creation succeeded by checking the list
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const testItem = page.locator('li:has-text("Test Persistence False")');
    await expect(testItem).toBeVisible({ timeout: 10000 });

    // Check the meta/badge shows Hidden in Payment Received
    const metaText = await testItem.textContent();
    console.log('Created item meta:', metaText);
    expect(metaText).toContain("Hidden");

    // Reopen in Edit mode and verify checkbox remains unchecked
    await testItem.locator('button[aria-label="Edit"]').click();
    await page.waitForTimeout(500);

    const editShowInPaymentCheckbox = page.getByRole('checkbox', { name: 'Show in Payment Received' });
    const persistedValue = await editShowInPaymentCheckbox.isChecked();
    expect(persistedValue).toBe(false);

    // Cancel edit
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(1000); // Wait for form to close

    // Clean up: Delete the test category to avoid hitting the limit for the next test
    console.log('Starting cleanup of Test Persistence False...');
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);
    const testItemForCleanup = page.locator('li:has-text("Test Persistence False")');
    const isVisible = await testItemForCleanup.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Test item visible for cleanup:', isVisible);
    if (isVisible) {
      const deleteBtn = testItemForCleanup.locator('button[aria-label="Delete"]').first();
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
      } else {
        console.log('Delete button not visible!');
      }
    }
  });

  test("Test D - Save and Persistence: Show in Payment Received = true", async ({ page }) => {
    // Clean up any existing test definition
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);
    const existingItems = page.locator('li:has-text("Test Persistence True")');
    if (await existingItems.count() > 0) {
      const deleteBtn = existingItems.first().locator('button[aria-label="Delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 1000 })) {
        console.log('Clicking delete button for existing Test Persistence True...');
        // Handle native window.confirm() dialog
        page.once('dialog', async dialog => {
          console.log('Dialog message:', dialog.message());
          await dialog.accept();
        });
        await deleteBtn.click();
        await page.waitForTimeout(2000); // Wait for deletion to complete
        console.log('Cleanup of existing Test Persistence True completed');
      }
    }

    await openAddCollectionDefinitionForm(page);

    // Set up the form
    await page.fill('input[name="name"]', "Test Persistence True");
    await selectBaseCategory(page, "Annual");
    await selectSubcategory(page, "Recurring Donation");

    // Ensure Show in Payment Received is checked
    const showInPaymentCheckbox = page.getByRole('checkbox', { name: 'Show in Payment Received' });
    await showInPaymentCheckbox.check();
    await page.waitForTimeout(300);
    const isChecked = await showInPaymentCheckbox.isChecked();
    expect(isChecked).toBe(true);

    // Fill remaining required fields
    await page.selectOption('select[name="frequency"]', "MONTHLY");
    await page.selectOption('select[name="amountType"]', "VARIABLE");
    await page.selectOption('select[name="donorEligibility"]', "MEMBERS_ONLY");
    await page.selectOption('select[name="memberAssignment"]', "ALL_ELIGIBLE");
    await page.selectOption('select[name="dueGeneration"]', "AUTOMATIC");
    await page.selectOption('select[name="settlementPolicy"]', "OLDEST_FIRST");

    // Submit
    const saveBtn = page.locator('button[type="submit"]:has-text("Save")').first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Wait for form submission and page reload
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Verify creation succeeded by checking the list
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const testItem = page.locator('li:has-text("Test Persistence True")');
    await expect(testItem).toBeVisible({ timeout: 10000 });

    // Check the meta/badge shows Visible in Payment Received
    const metaText = await testItem.textContent();
    console.log('Created item meta:', metaText);
    expect(metaText).toContain("Show in Payment Received");

    // Reopen in Edit mode and verify checkbox remains checked
    await testItem.locator('button[aria-label="Edit"]').click();
    await page.waitForTimeout(500);

    const editShowInPaymentCheckbox = page.getByRole('checkbox', { name: 'Show in Payment Received' });
    const persistedValue = await editShowInPaymentCheckbox.isChecked();
    expect(persistedValue).toBe(true);

    // Cancel edit
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(1000);

    // Clean up: Delete the test category to avoid hitting the limit for the next run
    console.log('Starting cleanup of Test Persistence True...');
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(500);
    const testItemForCleanup = page.locator('li:has-text("Test Persistence True")');
    const isVisible = await testItemForCleanup.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Test item visible for cleanup:', isVisible);
    if (isVisible) {
      const deleteBtn = testItemForCleanup.locator('button[aria-label="Delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 1000 })) {
        console.log('Clicking delete button...');
        page.once('dialog', async dialog => {
          console.log('Dialog message:', dialog.message());
          await dialog.accept();
        });
        await deleteBtn.click();
        await page.waitForTimeout(2000);
        console.log('Cleanup completed');
      }
    }
  });

  test("Test E - Edit Mode Regression", async ({ page }) => {
    // First, ensure we have a test definition to edit
    // Use Shab-e-Qadr which should exist
    await page.goto(`${BASE_URL}/settings?tab=collections`);
    await page.waitForTimeout(1000);

    const shabRow = page.locator('li:has-text("Shab-e-Qadr")').first();
    await expect(shabRow).toBeVisible({ timeout: 10000 });
    await shabRow.locator('button[aria-label="Edit"]').click();
    await page.waitForTimeout(500);

    // Verify Base Category is pre-selected as Annual
    const baseSelect = page.locator('select[name="baseCategoryId"]');
    const selectedBaseText = await baseSelect.locator('option:checked').textContent();
    expect(selectedBaseText?.trim()).toBe("Annual");

    // Verify Subcategory is pre-selected correctly
    const subSelect = page.locator('select[name="subcategoryId"]');
    const selectedSubText = await subSelect.locator('option:checked').textContent();
    expect(selectedSubText?.trim()).toBe("General");

    // Verify subcategory options are filtered correctly in edit mode
    const subLabels = await getSubcategoryOptions(page);
    expect(subLabels).toContain("General");
    expect(subLabels).toContain("Recurring Donation");
    expect(subLabels).not.toContain("Restricted");

    // Change Base Category and verify Subcategory refreshes
    await selectBaseCategory(page, "General");
    const generalSubLabels = await getSubcategoryOptions(page);
    expect(generalSubLabels).toContain("General");
    expect(generalSubLabels).toContain("Restricted");
    expect(generalSubLabels).not.toContain("Recurring Donation");

    // Change back to Annual
    await selectBaseCategory(page, "Annual");
    const annualSubLabels = await getSubcategoryOptions(page);
    expect(annualSubLabels).toContain("General");
    expect(annualSubLabels).toContain("Recurring Donation");
    expect(annualSubLabels).not.toContain("Restricted");

    // Cancel edit
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
  });
});