# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test_edit_member.spec.ts >> Edit member with email
- Location: e2e\test_edit_member.spec.ts:5:5

# Error details

```
TimeoutError: page.fill: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('input[name="email"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - navigation "Main" [ref=e4]:
        - link "Dashboard" [ref=e5] [cursor=pointer]:
          - /url: /dashboard
        - link "Members" [ref=e14] [cursor=pointer]:
          - /url: /members
        - link "Contribution plans" [ref=e22] [cursor=pointer]:
          - /url: /plans
        - link "Receive payment" [ref=e29] [cursor=pointer]:
          - /url: /collections/new
        - link "Due Status Overview" [ref=e38] [cursor=pointer]:
          - /url: /collections/due-status
        - link "Transactions" [ref=e45] [cursor=pointer]:
          - /url: /transactions
        - link "Expenses" [ref=e50] [cursor=pointer]:
          - /url: /expenses
        - link "Reports" [ref=e56] [cursor=pointer]:
          - /url: /reports
        - link "Settings" [ref=e61] [cursor=pointer]:
          - /url: /settings
        - link "Staff" [ref=e67] [cursor=pointer]:
          - /url: /staff
        - link "Audit log" [ref=e73] [cursor=pointer]:
          - /url: /audit
    - generic [ref=e79]:
      - banner [ref=e80]:
        - generic [ref=e81]:
          - generic [ref=e87]: हुसैनी मस्जिद आलोट
          - generic [ref=e88]: 25 Nov 2026
        - generic [ref=e89]:
          - generic [ref=e91]:
            - generic [ref=e92]: Language
            - generic [ref=e97]:
              - button "English" [pressed] [ref=e98]
              - button "हिन्दी" [ref=e99]
              - button "اردو" [ref=e100]
          - button "MA Masjid Admin" [ref=e102]:
            - generic [ref=e103]: MA
            - generic [ref=e104]: Masjid Admin
      - main [ref=e107]:
        - generic [ref=e108]:
          - generic [ref=e109]:
            - heading "Dashboard" [level=1] [ref=e110]
            - paragraph [ref=e111]: हुसैनी मस्जिद आलोट · This month
          - link [ref=e113] [cursor=pointer]:
            - /url: /collections/new
            - button "New payment" [ref=e114]
        - generic [ref=e121]:
          - generic [ref=e123]:
            - paragraph [ref=e124]: Today's collection
            - paragraph [ref=e125]: ₹0
            - paragraph [ref=e126]: 0 transactions
          - generic [ref=e128]:
            - paragraph [ref=e129]: This month
            - paragraph [ref=e130]: ₹65,400
            - paragraph [ref=e131]: "Gross collection: ₹65,400"
          - generic [ref=e133]:
            - paragraph [ref=e134]: This year
            - paragraph [ref=e135]: ₹65,400
            - paragraph [ref=e136]: "Reversals: ₹0"
          - generic [ref=e138]:
            - paragraph [ref=e139]: Outstanding dues
            - paragraph [ref=e140]: ₹87,200
            - paragraph [ref=e141]: 88 dues
          - generic [ref=e143]:
            - paragraph [ref=e144]: Expenses this month
            - paragraph [ref=e145]: ₹0
            - paragraph [ref=e146]: 0 expenses
          - generic [ref=e148]:
            - paragraph [ref=e149]: Net movement
            - paragraph [ref=e150]: ₹65,400
            - paragraph [ref=e151]: Net cash movement
        - generic [ref=e152]:
          - generic [ref=e153]:
            - heading "Collection trend (last 6 months)" [level=2] [ref=e155]
            - img "Collection trend for the last six months" [ref=e157]:
              - application [ref=e160]:
                - generic [ref=e175]:
                  - generic [ref=e176]:
                    - generic [ref=e177]: Jun
                    - generic [ref=e179]: Jul
                    - generic [ref=e181]: Aug
                    - generic [ref=e183]: Sept
                    - generic [ref=e185]: Oct
                    - generic [ref=e187]: Nov
                  - generic [ref=e189]:
                    - generic [ref=e190]: ₹0
                    - generic [ref=e192]: ₹20k
                    - generic [ref=e194]: ₹40k
                    - generic [ref=e196]: ₹60k
                    - generic [ref=e198]: ₹80k
          - generic [ref=e200]:
            - generic [ref=e201]:
              - heading "Outstanding dues" [level=2] [ref=e202]
              - link "View all" [ref=e203] [cursor=pointer]:
                - /url: /reports?report=dues
            - generic [ref=e204]:
              - generic [ref=e208]:
                - paragraph [ref=e209]: ₹87,200
                - paragraph [ref=e210]: 88 dues · 70 active members
              - generic [ref=e217]:
                - paragraph [ref=e218]: "70"
                - paragraph [ref=e219]: Members
              - generic [ref=e224]:
                - paragraph [ref=e225]: ₹0
                - paragraph [ref=e226]: Expenses this month
        - generic [ref=e227]:
          - generic [ref=e228]:
            - heading "Recent transactions" [level=2] [ref=e229]
            - link "View all" [ref=e230] [cursor=pointer]:
              - /url: /transactions
          - table [ref=e234]:
            - rowgroup [ref=e235]:
              - row [ref=e236]:
                - columnheader "Receipt no." [ref=e237]
                - columnheader "Received from" [ref=e238]
                - columnheader "Date" [ref=e239]
                - columnheader "Amount" [ref=e240]
                - columnheader "Status" [ref=e241]
            - rowgroup [ref=e242]:
              - row [ref=e243]:
                - cell [ref=e244]:
                  - link "HMA-2026-27-000174" [ref=e245] [cursor=pointer]:
                    - /url: /receipts/cmwuxne7g001g7wufw3g0wpiv
                - cell "Arif Hussain" [ref=e246]
                - cell "24-11-2026" [ref=e247]
                - cell "₹250" [ref=e248]
                - cell "Successful" [ref=e249]
              - row [ref=e251]:
                - cell [ref=e252]:
                  - link "HMA-2026-27-000173" [ref=e253] [cursor=pointer]:
                    - /url: /receipts/cmwtfyb5f0003usuf8bqiskfs
                - cell "Arif Hussain" [ref=e254]
                - cell "23-11-2026" [ref=e255]
                - cell "₹500" [ref=e256]
                - cell "Successful" [ref=e257]
              - row [ref=e259]:
                - cell [ref=e260]:
                  - link "HMA-2026-27-000172" [ref=e261] [cursor=pointer]:
                    - /url: /receipts/cmwmzg571000di8uf9eofo9gw
                - cell "Arif Hussain" [ref=e262]
                - cell "19-11-2026" [ref=e263]
                - cell "₹50" [ref=e264]
                - cell "Successful" [ref=e265]
              - row [ref=e267]:
                - cell [ref=e268]:
                  - link "HMA-2026-27-000171" [ref=e269] [cursor=pointer]:
                    - /url: /receipts/cmwkz6ez800iwxgufc47dr3ti
                - cell "Gullu Chacha Vikramgarh" [ref=e270]
                - cell "17-11-2026" [ref=e271]
                - cell "₹100" [ref=e272]
                - cell "Successful" [ref=e273]
              - row [ref=e275]:
                - cell [ref=e276]:
                  - link "HMA-2026-27-000170" [ref=e277] [cursor=pointer]:
                    - /url: /receipts/cmwkl4nrd000600ufix316ghg
                - cell "Chunna Bhai Alote" [ref=e278]
                - cell "17-11-2026" [ref=e279]
                - cell "₹150" [ref=e280]
                - cell "Successful" [ref=e281]
              - row [ref=e283]:
                - cell [ref=e284]:
                  - link "HMA-2026-27-000169" [ref=e285] [cursor=pointer]:
                    - /url: /receipts/cmwjl3ysd004z6oufwjkrqm0r
                - cell "Walkin Receipt Test" [ref=e286]
                - cell "16-11-2026" [ref=e287]
                - cell "₹300" [ref=e288]
                - cell "Successful" [ref=e289]
              - row [ref=e291]:
                - cell [ref=e292]:
                  - link "HMA-2026-27-000168" [ref=e293] [cursor=pointer]:
                    - /url: /receipts/cmwjl37qp004u6oufmcyryqh9
                - cell "Walkin General Test" [ref=e294]
                - cell "16-11-2026" [ref=e295]
                - cell "₹500" [ref=e296]
                - cell "Successful" [ref=e297]
              - row [ref=e299]:
                - cell [ref=e300]:
                  - link "HMA-2026-27-000167" [ref=e301] [cursor=pointer]:
                    - /url: /receipts/cmwjh378k003j6oufsj1ayojs
                - cell "Fatima Khan" [ref=e302]
                - cell "16-11-2026" [ref=e303]
                - cell "₹300" [ref=e304]
                - cell "Successful" [ref=e305]
  - button "Open Next.js Dev Tools" [ref=e312] [cursor=pointer]
  - alert [ref=e316]
  - generic [aria-hidden] [ref=e317]: ₹0
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const BASE_URL = 'http://localhost:3000';
  4  | 
  5  | test('Edit member with email', async ({ page }) => {
  6  |   // Login first
  7  |   await page.goto(`${BASE_URL}/login`);
> 8  |   await page.fill('input[name="email"]', 'localadmin@gmail.com');
     |              ^ TimeoutError: page.fill: Timeout 15000ms exceeded.
  9  |   await page.fill('input[name="password"]', 'admin123');
  10 |   await page.click('button[type="submit"]');
  11 |   await page.waitForURL('**/dashboard');
  12 | 
  13 |   // Go to member list
  14 |   await page.goto(`${BASE_URL}/members`);
  15 |   await page.waitForTimeout(500);
  16 | 
  17 |   // Click on the first member to go to profile
  18 |   await page.click('table tbody tr:first-child a');
  19 |   await page.waitForTimeout(500);
  20 | 
  21 |   // Click edit button on profile page
  22 |   await page.click('a:has-text("Edit")');
  23 |   await page.waitForTimeout(500);
  24 | 
  25 |   // Check if email field is visible and has value
  26 |   const emailInput = page.locator('input[name="email"]');
  27 |   await expect(emailInput).toBeVisible();
  28 | 
  29 |   // Fill email if empty
  30 |   const emailValue = await emailInput.inputValue();
  31 |   console.log('Current email value:', emailValue);
  32 | 
  33 |   if (!emailValue) {
  34 |     await emailInput.fill('edited@example.com');
  35 |   }
  36 | 
  37 |   // Update alternate mobile
  38 |   const altMobileInput = page.locator('input[name="alternatePhone"]');
  39 |   await altMobileInput.fill('7123456789');
  40 | 
  41 |   // Submit
  42 |   await page.click('button:has-text("Save")');
  43 |   await page.waitForTimeout(3000);
  44 | 
  45 |   // Verify success
  46 |   console.log('Current URL:', page.url());
  47 |   console.log('✅ Member edited successfully!');
  48 | });
  49 | 
```