# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug-sheet.spec.ts >> Debug sheet selector
- Location: e2e\debug-sheet.spec.ts:5:5

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
    - generic [ref=e3]:
      - banner [ref=e4]:
        - generic [ref=e5]: हुसैनी मस्जिद आलोट
        - generic [ref=e12]:
          - generic [ref=e15]:
            - button "English" [pressed] [ref=e16]: EN
            - button "हिन्दी" [ref=e17]: हि
            - button "اردو" [ref=e18]: ار
          - button "MA" [ref=e20]
      - main [ref=e24]:
        - generic [ref=e25]:
          - generic [ref=e26]:
            - heading "Dashboard" [level=1] [ref=e27]
            - paragraph [ref=e28]: हुसैनी मस्जिद आलोट · This month
          - link [ref=e30] [cursor=pointer]:
            - /url: /collections/new
            - button "New payment" [ref=e31]
        - generic [ref=e38]:
          - generic [ref=e40]:
            - paragraph [ref=e41]: Today's collection
            - paragraph [ref=e42]: ₹0.00
            - paragraph [ref=e43]: 0 transactions
          - generic [ref=e45]:
            - paragraph [ref=e46]: This month
            - paragraph [ref=e47]: ₹0.00
            - paragraph [ref=e48]: "Gross collection: ₹0.00"
          - generic [ref=e50]:
            - paragraph [ref=e51]: This year
            - paragraph [ref=e52]: ₹25,600.00
            - paragraph [ref=e53]: "Reversals: ₹0.00"
          - generic [ref=e55]:
            - paragraph [ref=e56]: Outstanding dues
            - paragraph [ref=e57]: ₹0.00
            - paragraph [ref=e58]: 0 dues
          - generic [ref=e60]:
            - paragraph [ref=e61]: Expenses this month
            - paragraph [ref=e62]: ₹0.00
            - paragraph [ref=e63]: 0 expenses
          - generic [ref=e65]:
            - paragraph [ref=e66]: Net movement
            - paragraph [ref=e67]: ₹0.00
            - paragraph [ref=e68]: Net cash movement
        - generic [ref=e69]:
          - generic [ref=e70]:
            - heading "Collection trend (last 6 months)" [level=2] [ref=e72]
            - img "Collection trend for the last six months" [ref=e74]:
              - application [ref=e77]:
                - generic [ref=e92]:
                  - generic [ref=e93]:
                    - generic [ref=e94]: Jun
                    - generic [ref=e96]: Jul
                    - generic [ref=e98]: Aug
                    - generic [ref=e100]: Sept
                    - generic [ref=e102]: Oct
                    - generic [ref=e104]: Nov
                  - generic [ref=e106]:
                    - generic [ref=e107]: ₹0
                    - generic [ref=e109]: ₹7k
                    - generic [ref=e111]: ₹13k
                    - generic [ref=e113]: ₹20k
                    - generic [ref=e115]: ₹26k
          - generic [ref=e117]:
            - generic [ref=e118]:
              - heading "Outstanding dues" [level=2] [ref=e119]
              - link "View all" [ref=e120] [cursor=pointer]:
                - /url: /reports?report=dues
            - generic [ref=e121]:
              - generic [ref=e125]:
                - paragraph [ref=e126]: ₹0.00
                - paragraph [ref=e127]: 0 dues · 102 active members
              - generic [ref=e134]:
                - paragraph [ref=e135]: "102"
                - paragraph [ref=e136]: Members
              - generic [ref=e141]:
                - paragraph [ref=e142]: ₹0.00
                - paragraph [ref=e143]: Expenses this month
        - generic [ref=e144]:
          - generic [ref=e145]:
            - heading "Recent transactions" [level=2] [ref=e146]
            - link "View all" [ref=e147] [cursor=pointer]:
              - /url: /transactions
          - table [ref=e151]:
            - rowgroup [ref=e152]:
              - row [ref=e153]:
                - columnheader "Receipt no." [ref=e154]
                - columnheader "Received from" [ref=e155]
                - columnheader "Date" [ref=e156]
                - columnheader "Amount" [ref=e157]
                - columnheader "Status" [ref=e158]
            - rowgroup [ref=e159]:
              - row [ref=e160]:
                - cell [ref=e161]:
                  - link "HMA-2026-27-000053" [ref=e162] [cursor=pointer]:
                    - /url: /receipts/cmvv5t29d0001q8uf0jh1udmg
                - cell "Adam" [ref=e163]
                - cell "30-10-2026" [ref=e164]
                - cell "₹500.00" [ref=e165]
                - cell "Successful" [ref=e166]
              - row [ref=e168]:
                - cell [ref=e169]:
                  - link "HMA-2026-27-000052" [ref=e170] [cursor=pointer]:
                    - /url: /receipts/cmvut8xha000bhcufpfewkwsw
                - cell "Arif Hussain" [ref=e171]
                - cell "30-10-2026" [ref=e172]
                - cell "₹500.00" [ref=e173]
                - cell "Successful" [ref=e174]
              - row [ref=e176]:
                - cell [ref=e177]:
                  - link "HMA-2026-27-000051" [ref=e178] [cursor=pointer]:
                    - /url: /receipts/cmvuslgqw0006hcufza8z71w2
                - cell "Arif Hussain" [ref=e179]
                - cell "30-10-2026" [ref=e180]
                - cell "₹500.00" [ref=e181]
                - cell "Successful" [ref=e182]
              - row [ref=e184]:
                - cell [ref=e185]:
                  - link "HMA-2026-27-000050" [ref=e186] [cursor=pointer]:
                    - /url: /receipts/cmvus2jcz0001hcufol77znsy
                - cell "Arif Hussain" [ref=e187]
                - cell "30-10-2026" [ref=e188]
                - cell "₹500.00" [ref=e189]
                - cell "Successful" [ref=e190]
              - row [ref=e192]:
                - cell [ref=e193]:
                  - link "HMA-2026-27-000049" [ref=e194] [cursor=pointer]:
                    - /url: /receipts/cmvurm8zy000g38uff61huf8a
                - cell "Arif Hussain" [ref=e195]
                - cell "30-10-2026" [ref=e196]
                - cell "₹500.00" [ref=e197]
                - cell "Successful" [ref=e198]
              - row [ref=e200]:
                - cell [ref=e201]:
                  - link "HMA-2026-27-000048" [ref=e202] [cursor=pointer]:
                    - /url: /receipts/cmvur09ut000b38uf3179nk20
                - cell "Arif Hussain" [ref=e203]
                - cell "30-10-2026" [ref=e204]
                - cell "₹500.00" [ref=e205]
                - cell "Successful" [ref=e206]
              - row [ref=e208]:
                - cell [ref=e209]:
                  - link "HMA-2026-27-000047" [ref=e210] [cursor=pointer]:
                    - /url: /receipts/cmvuqe71z000638ufa2qsan3l
                - cell "Arif Hussain" [ref=e211]
                - cell "30-10-2026" [ref=e212]
                - cell "₹500.00" [ref=e213]
                - cell "Successful" [ref=e214]
              - row [ref=e216]:
                - cell [ref=e217]:
                  - link "HMA-2026-27-000046" [ref=e218] [cursor=pointer]:
                    - /url: /receipts/cmvuqa33w000138ufnpv1jcyu
                - cell "Arif Hussain" [ref=e219]
                - cell "30-10-2026" [ref=e220]
                - cell "₹500.00" [ref=e221]
                - cell "Successful" [ref=e222]
    - navigation "Primary" [ref=e224]:
      - link "Dashboard" [ref=e225] [cursor=pointer]:
        - /url: /dashboard
      - link "Members" [ref=e234] [cursor=pointer]:
        - /url: /members
      - link "Receive payment" [ref=e242] [cursor=pointer]:
        - /url: /collections/new
      - link "Transactions" [ref=e251] [cursor=pointer]:
        - /url: /transactions
      - link "Reports" [ref=e256] [cursor=pointer]:
        - /url: /reports
  - button "Open Next.js Dev Tools" [ref=e266] [cursor=pointer]
  - alert [ref=e270]
  - generic [aria-hidden] [ref=e271]: ₹0
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const BASE_URL = 'http://localhost:3000';
  4  | 
  5  | test('Debug sheet selector', async ({ page }) => {
  6  |   await page.setViewportSize({ width: 360, height: 800 });
  7  |   await page.goto(`${BASE_URL}/login`);
> 8  |   await page.fill('input[name="email"]', 'localadmin@gmail.com');
     |              ^ TimeoutError: page.fill: Timeout 15000ms exceeded.
  9  |   await page.fill('input[name="password"]', 'admin123');
  10 |   await page.click('button[type="submit"]');
  11 |   await page.waitForURL('**/dashboard');
  12 |   
  13 |   await page.goto(`${BASE_URL}/collections/new`);
  14 |   await page.waitForTimeout(1500);
  15 |   
  16 |   const addAllocBtn = page.locator('button:has-text("Add Allocation")').first();
  17 |   await expect(addAllocBtn).toBeVisible({ timeout: 5000 });
  18 |   
  19 |   await addAllocBtn.click();
  20 |   await page.waitForTimeout(1000);
  21 |   
  22 |   // List all dialogs
  23 |   const dialogs = await page.locator('[role="dialog"]').all();
  24 |   console.log(`Found ${dialogs.length} dialogs`);
  25 |   for (let i = 0; i < dialogs.length; i++) {
  26 |     const cls = await dialogs[i].getAttribute('class');
  27 |     console.log(`Dialog ${i}: class="${cls}"`);
  28 |   }
  29 |   
  30 |   // Look for BottomSheet - dialog 1 is the mobile sheet
  31 |   const bottomSheetOuter = page.locator('[role="dialog"].fixed.inset-0.z-50').nth(1);
  32 |   console.log(`BottomSheet outer visible: ${await bottomSheetOuter.isVisible()}`);
  33 |   
  34 |   const bottomSheetInner = page.locator('.absolute.bottom-0.left-0.right-0');
  35 |   console.log(`BottomSheet inner visible: ${await bottomSheetInner.isVisible()}`);
  36 |   
  37 |   // Take screenshot
  38 |   await page.screenshot({ path: 'test-results/debug-sheet.png', fullPage: true });
  39 | });
  40 | 
```