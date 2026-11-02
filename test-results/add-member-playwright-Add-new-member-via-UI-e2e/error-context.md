# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: add-member-playwright.spec.ts >> Add new member via UI
- Location: e2e\add-member-playwright.spec.ts:5:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1:has-text(\'Playwright Test Member\')').first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('h1:has-text(\'Playwright Test Member\')').first() with timeout 20000ms
  - waiting for locator('h1:has-text(\'Playwright Test Member\')').first()

```

```yaml
- complementary:
  - navigation "Main":
    - link "Dashboard":
      - /url: /dashboard
    - link "Members":
      - /url: /members
    - link "Contribution plans":
      - /url: /plans
    - link "Receive payment":
      - /url: /collections/new
    - link "Transactions":
      - /url: /transactions
    - link "Expenses":
      - /url: /expenses
    - link "Reports":
      - /url: /reports
    - link "Settings":
      - /url: /settings
    - link "Staff":
      - /url: /staff
    - link "Audit log":
      - /url: /audit
- banner:
  - text: हुसैनी मस्जिद आलोट 02 Nov 2026 Language
  - button "English" [pressed]
  - button "हिन्दी"
  - button "اردو"
  - button "MA Masjid Admin"
- main:
  - heading "New member" [level=1]
  - paragraph: Member profile
  - alert: Member limit exceeded. Your plan allows a maximum of 100 members.
  - heading "Member profile" [level=2]
  - text: Full Name
  - textbox "Full Name"
  - paragraph: Only letters, spaces, dots, hyphens, apostrophes
  - text: Father Name
  - textbox "Father Name"
  - paragraph: Only letters, spaces, dots, hyphens, apostrophes
  - text: Primary Mobile
  - textbox "Primary Mobile"
  - paragraph: 10-digit Indian mobile (starts 6-9)
  - text: Alternate Mobile
  - textbox "Alternate Mobile"
  - paragraph: 10-digit Indian mobile (starts 6-9)
  - text: Email
  - textbox "Email"
  - text: Join Date
  - textbox "Join Date"
  - text: Address
  - textbox "Address"
  - text: Notes
  - textbox "Notes"
  - text: Status
  - combobox "Status":
    - option "Active" [selected]
    - option "Inactive"
  - link "Back":
    - /url: /members
    - button "Back"
  - button "Save"
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const BASE_URL = 'http://localhost:3000';
  4  | 
  5  | test('Add new member via UI', async ({ page }) => {
  6  |   // Go directly to new member page - auth state should already be loaded from global setup
  7  |   await page.goto(`${BASE_URL}/members/new`);
  8  |   await page.waitForTimeout(500);
  9  | 
  10 |   // Fill member form
  11 |   const uniquePhone = `9${String(Date.now()).slice(-9)}`;
  12 |   await page.fill('input[name="fullName"]', 'Playwright Test Member');
  13 |   await page.fill('input[name="fatherName"]', 'Test Father');
  14 |   await page.fill('input[name="phone"]', uniquePhone);
  15 |   await page.fill('input[name="alternatePhone"]', `8${String(Date.now()).slice(-9)}`);
  16 |   await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
  17 |   await page.fill('textarea[name="address"]', 'Test Address from Playwright');
  18 |   await page.fill('input[name="joinDate"]', '2026-01-01');
  19 | 
  20 |   // Submit
  21 |   await page.click('button:has-text("Save")');
  22 |   await page.waitForTimeout(5000);
  23 | 
  24 |   // Check if there's an error message
  25 |   const errorMsg = await page.locator('p[role="alert"]').textContent().catch(() => null);
  26 |   if (errorMsg) {
  27 |     console.log('Error:', errorMsg);
  28 |   }
  29 | 
  30 |   // Check current URL
  31 |   console.log('Current URL:', page.url());
  32 | 
  33 |   // Verify success - should redirect to member profile
> 34 |   await expect(page.locator("h1:has-text('Playwright Test Member')").first()).toBeVisible({ timeout: 20000 });
     |                                                                               ^ Error: expect(locator).toBeVisible() failed
  35 | 
  36 |   console.log('✅ Member created successfully!');
  37 |   console.log('Phone:', uniquePhone);
  38 |   console.log('URL:', page.url());
  39 | });
```