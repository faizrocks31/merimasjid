# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive-test.spec.ts >> Receipt Page - Desktop-1920 (1920x1080)
- Location: e2e\responsive-test.spec.ts:67:7

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
        - link "Transactions" [ref=e38] [cursor=pointer]:
          - /url: /transactions
        - link "Expenses" [ref=e43] [cursor=pointer]:
          - /url: /expenses
        - link "Reports" [ref=e49] [cursor=pointer]:
          - /url: /reports
        - link "Settings" [ref=e54] [cursor=pointer]:
          - /url: /settings
        - link "Staff" [ref=e60] [cursor=pointer]:
          - /url: /staff
        - link "Audit log" [ref=e66] [cursor=pointer]:
          - /url: /audit
    - generic [ref=e72]:
      - banner [ref=e73]:
        - generic [ref=e74]:
          - generic [ref=e80]: हुसैनी मस्जिद आलोट
          - generic [ref=e81]: 02 Nov 2026
        - generic [ref=e82]:
          - generic [ref=e84]:
            - generic [ref=e85]: Language
            - generic [ref=e90]:
              - button "English" [pressed] [ref=e91]
              - button "हिन्दी" [ref=e92]
              - button "اردو" [ref=e93]
          - button "MA Masjid Admin" [ref=e95]:
            - generic [ref=e96]: MA
            - generic [ref=e97]: Masjid Admin
      - main [ref=e100]:
        - generic [ref=e101]:
          - generic [ref=e102]:
            - heading "Dashboard" [level=1] [ref=e103]
            - paragraph [ref=e104]: हुसैनी मस्जिद आलोट · This month
          - link [ref=e106] [cursor=pointer]:
            - /url: /collections/new
            - button "New payment" [ref=e107]
        - generic [ref=e114]:
          - generic [ref=e116]:
            - paragraph [ref=e117]: Today's collection
            - paragraph [ref=e118]: ₹0.00
            - paragraph [ref=e119]: 0 transactions
          - generic [ref=e121]:
            - paragraph [ref=e122]: This month
            - paragraph [ref=e123]: ₹0.00
            - paragraph [ref=e124]: "Gross collection: ₹0.00"
          - generic [ref=e126]:
            - paragraph [ref=e127]: This year
            - paragraph [ref=e128]: ₹25,600.00
            - paragraph [ref=e129]: "Reversals: ₹0.00"
          - generic [ref=e131]:
            - paragraph [ref=e132]: Outstanding dues
            - paragraph [ref=e133]: ₹0.00
            - paragraph [ref=e134]: 0 dues
          - generic [ref=e136]:
            - paragraph [ref=e137]: Expenses this month
            - paragraph [ref=e138]: ₹0.00
            - paragraph [ref=e139]: 0 expenses
          - generic [ref=e141]:
            - paragraph [ref=e142]: Net movement
            - paragraph [ref=e143]: ₹0.00
            - paragraph [ref=e144]: Net cash movement
        - generic [ref=e145]:
          - generic [ref=e146]:
            - heading "Collection trend (last 6 months)" [level=2] [ref=e148]
            - img "Collection trend for the last six months" [ref=e150]:
              - application [ref=e153]:
                - generic [ref=e168]:
                  - generic [ref=e169]:
                    - generic [ref=e170]: Jun
                    - generic [ref=e172]: Jul
                    - generic [ref=e174]: Aug
                    - generic [ref=e176]: Sept
                    - generic [ref=e178]: Oct
                    - generic [ref=e180]: Nov
                  - generic [ref=e182]:
                    - generic [ref=e183]: ₹0
                    - generic [ref=e185]: ₹7k
                    - generic [ref=e187]: ₹13k
                    - generic [ref=e189]: ₹20k
                    - generic [ref=e191]: ₹26k
          - generic [ref=e193]:
            - generic [ref=e194]:
              - heading "Outstanding dues" [level=2] [ref=e195]
              - link "View all" [ref=e196] [cursor=pointer]:
                - /url: /reports?report=dues
            - generic [ref=e197]:
              - generic [ref=e201]:
                - paragraph [ref=e202]: ₹0.00
                - paragraph [ref=e203]: 0 dues · 102 active members
              - generic [ref=e210]:
                - paragraph [ref=e211]: "102"
                - paragraph [ref=e212]: Members
              - generic [ref=e217]:
                - paragraph [ref=e218]: ₹0.00
                - paragraph [ref=e219]: Expenses this month
        - generic [ref=e220]:
          - generic [ref=e221]:
            - heading "Recent transactions" [level=2] [ref=e222]
            - link "View all" [ref=e223] [cursor=pointer]:
              - /url: /transactions
          - table [ref=e227]:
            - rowgroup [ref=e228]:
              - row [ref=e229]:
                - columnheader "Receipt no." [ref=e230]
                - columnheader "Received from" [ref=e231]
                - columnheader "Date" [ref=e232]
                - columnheader "Amount" [ref=e233]
                - columnheader "Status" [ref=e234]
            - rowgroup [ref=e235]:
              - row [ref=e236]:
                - cell [ref=e237]:
                  - link "HMA-2026-27-000053" [ref=e238] [cursor=pointer]:
                    - /url: /receipts/cmvv5t29d0001q8uf0jh1udmg
                - cell "Adam" [ref=e239]
                - cell "30-10-2026" [ref=e240]
                - cell "₹500.00" [ref=e241]
                - cell "Successful" [ref=e242]
              - row [ref=e244]:
                - cell [ref=e245]:
                  - link "HMA-2026-27-000052" [ref=e246] [cursor=pointer]:
                    - /url: /receipts/cmvut8xha000bhcufpfewkwsw
                - cell "Arif Hussain" [ref=e247]
                - cell "30-10-2026" [ref=e248]
                - cell "₹500.00" [ref=e249]
                - cell "Successful" [ref=e250]
              - row [ref=e252]:
                - cell [ref=e253]:
                  - link "HMA-2026-27-000051" [ref=e254] [cursor=pointer]:
                    - /url: /receipts/cmvuslgqw0006hcufza8z71w2
                - cell "Arif Hussain" [ref=e255]
                - cell "30-10-2026" [ref=e256]
                - cell "₹500.00" [ref=e257]
                - cell "Successful" [ref=e258]
              - row [ref=e260]:
                - cell [ref=e261]:
                  - link "HMA-2026-27-000050" [ref=e262] [cursor=pointer]:
                    - /url: /receipts/cmvus2jcz0001hcufol77znsy
                - cell "Arif Hussain" [ref=e263]
                - cell "30-10-2026" [ref=e264]
                - cell "₹500.00" [ref=e265]
                - cell "Successful" [ref=e266]
              - row [ref=e268]:
                - cell [ref=e269]:
                  - link "HMA-2026-27-000049" [ref=e270] [cursor=pointer]:
                    - /url: /receipts/cmvurm8zy000g38uff61huf8a
                - cell "Arif Hussain" [ref=e271]
                - cell "30-10-2026" [ref=e272]
                - cell "₹500.00" [ref=e273]
                - cell "Successful" [ref=e274]
              - row [ref=e276]:
                - cell [ref=e277]:
                  - link "HMA-2026-27-000048" [ref=e278] [cursor=pointer]:
                    - /url: /receipts/cmvur09ut000b38uf3179nk20
                - cell "Arif Hussain" [ref=e279]
                - cell "30-10-2026" [ref=e280]
                - cell "₹500.00" [ref=e281]
                - cell "Successful" [ref=e282]
              - row [ref=e284]:
                - cell [ref=e285]:
                  - link "HMA-2026-27-000047" [ref=e286] [cursor=pointer]:
                    - /url: /receipts/cmvuqe71z000638ufa2qsan3l
                - cell "Arif Hussain" [ref=e287]
                - cell "30-10-2026" [ref=e288]
                - cell "₹500.00" [ref=e289]
                - cell "Successful" [ref=e290]
              - row [ref=e292]:
                - cell [ref=e293]:
                  - link "HMA-2026-27-000046" [ref=e294] [cursor=pointer]:
                    - /url: /receipts/cmvuqa33w000138ufnpv1jcyu
                - cell "Arif Hussain" [ref=e295]
                - cell "30-10-2026" [ref=e296]
                - cell "₹500.00" [ref=e297]
                - cell "Successful" [ref=e298]
  - button "Open Next.js Dev Tools" [ref=e305] [cursor=pointer]
  - alert [ref=e309]
  - generic [aria-hidden] [ref=e310]: ₹0
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const BASE_URL = 'http://localhost:3000';
  4  | 
  5  | const VIEWPORTS = [
  6  |   { name: 'Mobile-360', width: 360, height: 800 },
  7  |   { name: 'Mobile-390', width: 390, height: 844 },
  8  |   { name: 'Tablet-768', width: 768, height: 1024 },
  9  |   { name: 'Laptop-1366', width: 1366, height: 768 },
  10 |   { name: 'Desktop-1920', width: 1920, height: 1080 },
  11 | ];
  12 | 
  13 | async function login(page: any) {
  14 |   await page.goto(`${BASE_URL}/login`);
> 15 |   await page.fill('input[name="email"]', 'localadmin@gmail.com');
     |              ^ TimeoutError: page.fill: Timeout 15000ms exceeded.
  16 |   await page.fill('input[name="password"]', 'admin123');
  17 |   await page.click('button[type="submit"]');
  18 |   await page.waitForURL('**/dashboard');
  19 | }
  20 | 
  21 | for (const vp of VIEWPORTS) {
  22 |   test(`Collection Page - ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
  23 |     await page.setViewportSize({ width: vp.width, height: vp.height });
  24 |     await login(page);
  25 | 
  26 |     await page.goto(`${BASE_URL}/collections/new`);
  27 |     await page.waitForTimeout(1500);
  28 | 
  29 |     // Check horizontal overflow
  30 |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  31 |     const viewportWidth = vp.width;
  32 |     const hasHorizontalOverflow = bodyWidth > viewportWidth + 10;
  33 |     console.log(`${vp.name}: Body ${bodyWidth}px vs Viewport ${viewportWidth}px - Overflow: ${hasHorizontalOverflow}`);
  34 | 
  35 |     // Check receipt preview visibility
  36 |     if (vp.width < 1024) {
  37 |       const bottomBar = page.locator('.sticky.bottom-0').first();
  38 |       await expect(bottomBar).toBeVisible({ timeout: 5000 });
  39 |     } else {
  40 |       const preview = page.locator('.sticky.top-6 .print-sheet').first();
  41 |       await expect(preview).toBeVisible({ timeout: 5000 });
  42 |     }
  43 | 
  44 |     // Check Add Allocation button
  45 |     const addAllocBtn = page.locator('button:has-text("Add Allocation")').first();
  46 |     await expect(addAllocBtn).toBeVisible({ timeout: 5000 });
  47 | 
  48 |     // Test Add Allocation sheet opens - desktop uses popover, mobile/tablet uses BottomSheet
  49 |     await addAllocBtn.click();
  50 |     await page.waitForTimeout(500);
  51 |     if (vp.width < 1024) {
  52 |       // Mobile/Tablet: BottomSheet (2nd dialog to skip Next.js error overlay)
  53 |       const sheet = page.locator('[role="dialog"].fixed.inset-0.z-50').nth(1);
  54 |       await expect(sheet).toBeVisible({ timeout: 5000 });
  55 |     } else {
  56 |       // Desktop: Popover (fixed positioned near button, has w-72 class)
  57 |       const popover = page.locator('.fixed.z-50 .w-72.max-h-60').first();
  58 |       await expect(popover).toBeVisible({ timeout: 5000 });
  59 |     }
  60 | 
  61 |     // Screenshot
  62 |     await page.screenshot({ path: `test-results/collection-${vp.name}.png`, fullPage: true });
  63 |   });
  64 | }
  65 | 
  66 | for (const vp of VIEWPORTS) {
  67 |   test(`Receipt Page - ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
  68 |     await page.setViewportSize({ width: vp.width, height: vp.height });
  69 |     await login(page);
  70 | 
  71 |     // Use existing receipt
  72 |     const receiptUrl = `${BASE_URL}/receipts/cmvujtnn8000lg8ufyl4li5ua?issued=1`;
  73 |     await page.goto(receiptUrl);
  74 |     await page.waitForTimeout(1500);
  75 | 
  76 |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  77 |     const viewportWidth = vp.width;
  78 |     const hasHorizontalOverflow = bodyWidth > viewportWidth + 10;
  79 |     console.log(`${vp.name} Receipt: Body ${bodyWidth}px vs Viewport ${viewportWidth}px - Overflow: ${hasHorizontalOverflow}`);
  80 | 
  81 |     // Check receipt is visible
  82 |     const receiptSheet = page.locator('.print-sheet').first();
  83 |     await expect(receiptSheet).toBeVisible({ timeout: 10000 });
  84 | 
  85 |     // Screenshot
  86 |     await page.screenshot({ path: `test-results/receipt-${vp.name}.png`, fullPage: true });
  87 |   });
  88 | }
  89 | 
```