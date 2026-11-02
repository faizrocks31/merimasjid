# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: members-page.spec.ts >> Members page loads and shows pagination controls
- Location: e2e\members-page.spec.ts:5:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('select[name="size"]')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('select[name="size"]') with timeout 10000ms
  - waiting for locator('select[name="size"]')

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
  - heading "Members" [level=1]
  - paragraph: 102 members
  - link "New member":
    - /url: /members/new
    - button "New member"
  - textbox "Search member..."
  - combobox "Status":
    - 'option "Status: View all" [selected]'
    - option "Active"
    - option "Inactive"
  - table:
    - rowgroup:
      - row "Member no. Name Primary Mobile Date Dues Status":
        - columnheader "Member no."
        - columnheader "Name"
        - columnheader "Primary Mobile"
        - columnheader "Date"
        - columnheader "Dues"
        - columnheader "Status"
    - rowgroup:
      - row "MAS-000103 Fatima Khan s/o Ahmed Khan +919876543212 10-03-2024 — Active":
        - cell "MAS-000103"
        - cell "Fatima Khan s/o Ahmed Khan":
          - link "Fatima Khan":
            - /url: /members/cmvwha03x0002ocuf4ifnca5q
          - paragraph: s/o Ahmed Khan
        - cell "+919876543212"
        - cell "10-03-2024"
        - cell "—"
        - cell "Active"
      - row "MAS-000102 Mohammad Ali s/o Abdul Ali +919876543211 20-02-2024 — Active":
        - cell "MAS-000102"
        - cell "Mohammad Ali s/o Abdul Ali":
          - link "Mohammad Ali":
            - /url: /members/cmvwha03i0001ocufle6jt8jf
          - paragraph: s/o Abdul Ali
        - cell "+919876543211"
        - cell "20-02-2024"
        - cell "—"
        - cell "Active"
      - row "MAS-000101 Arif Hussain s/o Mohammad Hussain +919876543210 15-01-2024 — Active":
        - cell "MAS-000101"
        - cell "Arif Hussain s/o Mohammad Hussain":
          - link "Arif Hussain":
            - /url: /members/cmvwha02u0000ocufqwz6o77n
          - paragraph: s/o Mohammad Hussain
        - cell "+919876543210"
        - cell "15-01-2024"
        - cell "—"
        - cell "Active"
      - row "MAS-000100 Test Member For Dues s/o Father Name 9435464828 31-12-2025 — Active":
        - cell "MAS-000100"
        - cell "Test Member For Dues s/o Father Name":
          - link "Test Member For Dues":
            - /url: /members/cmvw565ao001mw0uffx2ydp97
          - paragraph: s/o Father Name
        - cell "9435464828"
        - cell "31-12-2025"
        - cell "—"
        - cell "Active"
      - row "MAS-000099 Test Member Browser s/o Father Name 9435421690 31-12-2025 — Active":
        - cell "MAS-000099"
        - cell "Test Member Browser s/o Father Name":
          - link "Test Member Browser":
            - /url: /members/cmvw557zz001kw0uf7djneo3r
          - paragraph: s/o Father Name
        - cell "9435421690"
        - cell "31-12-2025"
        - cell "—"
        - cell "Active"
      - row "MAS-000098 Test Member For Dues s/o Father Name 9435297349 31-12-2025 — Active":
        - cell "MAS-000098"
        - cell "Test Member For Dues s/o Father Name":
          - link "Test Member For Dues":
            - /url: /members/cmvw52k32001iw0uf3bmlbtts
          - paragraph: s/o Father Name
        - cell "9435297349"
        - cell "31-12-2025"
        - cell "—"
        - cell "Active"
      - row "MAS-000097 Test Member Browser s/o Father Name 9435253286 31-12-2025 — Active":
        - cell "MAS-000097"
        - cell "Test Member Browser s/o Father Name":
          - link "Test Member Browser":
            - /url: /members/cmvw51m85001gw0uf2popqv1t
          - paragraph: s/o Father Name
        - cell "9435253286"
        - cell "31-12-2025"
        - cell "—"
        - cell "Active"
      - row "MAS-000096 Test Member For Dues s/o Father Name 9434962477 31-12-2025 — Active":
        - cell "MAS-000096"
        - cell "Test Member For Dues s/o Father Name":
          - link "Test Member For Dues":
            - /url: /members/cmvw4vdno001ew0ufijqmcgrx
          - paragraph: s/o Father Name
        - cell "9434962477"
        - cell "31-12-2025"
        - cell "—"
        - cell "Active"
      - row "MAS-000095 Test Member Browser s/o Father Name 9434923420 31-12-2025 — Active":
        - cell "MAS-000095"
        - cell "Test Member Browser s/o Father Name":
          - link "Test Member Browser":
            - /url: /members/cmvw4ujj2001cw0uf9mmoo6yu
          - paragraph: s/o Father Name
        - cell "9434923420"
        - cell "31-12-2025"
        - cell "—"
        - cell "Active"
      - row "MAS-000094 Abrar Ahmad s/o Jabbar Ahmad 9434644671 31-12-2025 — Active":
        - cell "MAS-000094"
        - cell "Abrar Ahmad s/o Jabbar Ahmad":
          - link "Abrar Ahmad":
            - /url: /members/cmvw4okga001aw0ufw310dp4a
          - paragraph: s/o Jabbar Ahmad
        - cell "9434644671"
        - cell "31-12-2025"
        - cell "—"
        - cell "Active"
  - navigation "Pagination":
    - text: "1 / 11 Show:"
    - combobox "Show:":
      - option "10" [selected]
      - option "25"
      - option "50"
      - option "100"
      - option "500"
    - text: per page
    - button "View all"
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const BASE_URL = 'http://localhost:3000';
  4  | 
  5  | test('Members page loads and shows pagination controls', async ({ page }) => {
  6  |   // Login first (uses stored auth state from global config)
  7  |   await page.goto(`${BASE_URL}/members`);
  8  |   await page.waitForLoadState('networkidle');
  9  | 
  10 |   // Verify that the search box is visible (placeholder contains "Search member")
  11 |   const searchInput = page.locator('input[placeholder*="Search member"]');
  12 |   await expect(searchInput).toBeVisible({ timeout: 10000 });
  13 | 
  14 |   // Verify pagination selector exists
  15 |   const selector = page.locator('select[name="size"]');
> 16 |   await expect(selector).toBeVisible({ timeout: 10000 });
     |                          ^ Error: expect(locator).toBeVisible() failed
  17 | 
  18 |   // Verify default page size is 10
  19 |   await expect(selector).toHaveValue('10');
  20 | 
  21 |   // Change page size to 25 and verify URL updates
  22 |   await selector.selectOption('25');
  23 |   await expect(page).toHaveURL(/size=25/);
  24 | 
  25 |   // Ensure at least one member row is displayed
  26 |   const rows = page.locator('table tbody tr');
  27 |   await expect(rows.first()).toBeVisible();
  28 | });
```