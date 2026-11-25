# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase2c-jumma.spec.ts >> Phase 2C: Walk-in Restrictions >> should reject individual Jumma payment via createPaymentAction
- Location: e2e\phase2c-jumma.spec.ts:255:7

# Error details

```
TimeoutError: page.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Jumma Collection")')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - navigation "Main" [ref=e4]:
        - link "Dashboard" [ref=e5] [cursor=pointer]:
          - /url: /dashboard
        - link "Members" [ref=e13] [cursor=pointer]:
          - /url: /members
        - link "Contribution plans" [ref=e21] [cursor=pointer]:
          - /url: /plans
        - link "Receive payment" [ref=e28] [cursor=pointer]:
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
        - generic [ref=e109]:
          - heading "Receive payment" [level=1] [ref=e110]
          - paragraph [ref=e111]: Duplicate submissions are blocked automatically.
        - generic [ref=e112]:
          - generic [ref=e113]:
            - generic [ref=e114]:
              - paragraph [ref=e116]: Received from
              - generic [ref=e117]:
                - radiogroup [ref=e118]:
                  - radio "Choose member" [checked] [ref=e119]
                  - radio "Walk-in donor" [ref=e120]
                - generic [ref=e121]:
                  - generic [ref=e122]: Choose member
                  - textbox "Choose member" [ref=e128]:
                    - /placeholder: Search member...
            - generic [ref=e129]:
              - generic [ref=e130]:
                - paragraph [ref=e131]: Amount (₹)
                - generic [ref=e132]:
                  - generic [ref=e133]: Amount in Rupees
                  - generic [aria-hidden] [ref=e134]: ₹
                  - textbox "0" [ref=e135]
              - group "Quick amounts" [ref=e136]:
                - button "1,000" [ref=e137]
                - button "150" [ref=e138]
                - button "1,000" [ref=e139]
            - generic [ref=e141]:
              - generic [ref=e142]:
                - paragraph [ref=e143]: Purpose
                - generic [ref=e144]:
                  - button "Milad-un-Nabi" [ref=e145]
                  - button "Monthly Chanda" [ref=e146]
                  - button "Shab-e-Qadr" [ref=e147]
              - generic [ref=e148]:
                - paragraph [ref=e149]: Mode
                - radiogroup "Payment mode" [ref=e150]:
                  - radio "Cash" [checked] [ref=e151]
                  - radio "UPI" [ref=e156]
                  - radio "Bank" [ref=e161]
                  - radio "Other" [ref=e166]
              - generic [ref=e172]:
                - generic [ref=e173]: Date
                - textbox "Date" [ref=e174]: 2026-11-25
              - generic [ref=e176]:
                - generic [ref=e177]: Notes (optional)
                - textbox "Notes (optional)" [ref=e178]
          - generic [ref=e180]:
            - status "Receipt preview" [ref=e182]:
              - generic [ref=e183]:
                - heading "हुसैनी मस्जिद आलोट" [level=1] [ref=e190]
                - generic [ref=e191]: Pramilaganj Alote , Tehsil Alote | 7000261097
              - generic [ref=e192]: रसीद
              - generic [ref=e194]:
                - generic [ref=e195]:
                  - generic [ref=e196]:
                    - generic [ref=e197]: "1"
                    - generic [ref=e198]:
                      - generic [ref=e199]: रसीद संख्या
                      - generic [ref=e200]: Auto-generated
                  - generic [ref=e202]:
                    - generic [ref=e203]: "2"
                    - generic [ref=e204]:
                      - generic [ref=e205]: दिनांक
                      - generic [ref=e206]: 25-11-2026
                - generic [ref=e209]:
                  - generic [ref=e210]: "3"
                  - generic [ref=e211]:
                    - generic [ref=e212]: मोहतरम जनाब
                    - generic [ref=e213]: __________ — Anonymous donor
                - generic [ref=e216]:
                  - generic [ref=e217]: "4"
                  - generic [ref=e218]: रुपये शब्दों में
                - generic [ref=e221]:
                  - generic [ref=e222]:
                    - generic [ref=e223]: "5"
                    - generic [ref=e224]:
                      - generic [ref=e225]: आवंटन श्रेणी
                      - generic [ref=e226]: —
                  - generic [ref=e228]:
                    - generic [ref=e229]: "6"
                    - generic [ref=e230]:
                      - generic [ref=e231]: भुगतान का तरीका
                      - generic [ref=e232]:
                        - generic [ref=e233]:
                          - checkbox "कैश" [checked] [disabled] [ref=e234]
                          - generic [ref=e235]: कैश
                        - generic [ref=e236]:
                          - checkbox "यूपीआई" [disabled] [ref=e237]
                          - generic [ref=e238]: यूपीआई
                        - generic [ref=e239]:
                          - checkbox "बैंक ट्रांसफर" [disabled] [ref=e240]
                          - generic [ref=e241]: बैंक ट्रांसफर
                        - generic [ref=e242]:
                          - checkbox "अन्य" [disabled] [ref=e243]
                          - generic [ref=e244]: अन्य
              - generic [ref=e245]:
                - generic [ref=e246]:
                  - paragraph [ref=e247]: प्राप्त राशि
                  - paragraph [ref=e248]: रु. 0/-
                  - paragraph
                - generic [ref=e249]:
                  - paragraph [ref=e250]:
                    - text: "प्राप्तकर्ता:"
                    - strong [ref=e251]: Collector
                  - paragraph [ref=e253]: अधिकृत हस्ताक्षर
              - paragraph [ref=e255]: धन्यवाद! आपका योगदान सराहनीय है।
            - generic [ref=e257]:
              - generic [ref=e258]:
                - generic [ref=e259]: Total
                - generic [ref=e260]: ₹0
              - generic [ref=e261]:
                - generic [ref=e262]: Allocated
                - generic [ref=e263]: ₹0
              - generic [ref=e264]:
                - generic [ref=e265]: Unallocated
                - generic [ref=e266]: ₹0
              - button "Confirm and issue receipt" [disabled] [ref=e267]
              - paragraph [ref=e274]: Duplicate submissions are blocked automatically.
  - generic [ref=e281] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e282]
    - generic [ref=e286]:
      - button "Open issues overlay" [ref=e287]:
        - generic [ref=e288]:
          - generic [aria-hidden] [ref=e289]: "1"
          - generic [ref=e290]: "2"
        - generic [ref=e291]:
          - text: Issue
          - generic [aria-hidden] [ref=e292]: s
      - button "Collapse issues badge" [ref=e293]
  - alert [ref=e296]
```

# Test source

```ts
  158 |     // Wait for reload by waiting for the new record to appear
  159 |     await expect(page.locator(`text=${parseFloat(initialAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first()).toBeVisible({ timeout: 30000 });
  160 | 
  161 |     // Wait for page to be fully ready after reload
  162 |     await page.waitForLoadState('networkidle');
  163 | 
  164 |     // Click Correct on the newest record (first in the list = newest)
  165 |     // Find the record card by the amount
  166 |     const recordCard = page.locator(`text=${parseFloat(initialAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first().locator("xpath=ancestor::div[contains(@class,'rounded-lg')]");
  167 |     await recordCard.locator('button:has-text("Correct")').click();
  168 | 
  169 |     modal = page.locator('[role="dialog"]');
  170 |     await expect(modal).toBeVisible();
  171 | 
  172 |     await modal.locator('input[id="correctionAmount"]').fill(correctedAmount);
  173 |     await modal.locator('textarea[id="correctionReason"]').fill("Corrected count error");
  174 | 
  175 |     await modal.locator('button:has-text("Apply Correction")').click();
  176 | 
  177 |     // Wait for reload and verify updated amount + correction history
  178 |     await expect(page.locator(`text=${parseFloat(correctedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first()).toBeVisible({ timeout: 30000 });
  179 | 
  180 |     // Find the specific Corrections heading for our record (by looking in the card with our amount)
  181 |     const correctionsHeading = page.locator(`text=${parseFloat(correctedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first().locator("xpath=ancestor::div[contains(@class,'rounded-lg')]").locator("text=Corrections");
  182 |     await expect(correctionsHeading).toBeVisible({ timeout: 15000 });
  183 | 
  184 |     // Expand the corrections section to see the reason
  185 |     await correctionsHeading.locator("..").locator("button").click();
  186 |     await expect(page.locator("text=Corrected count error")).toBeVisible({ timeout: 10000 });
  187 |   });
  188 | 
  189 |   test("should filter Jumma collections by date range via URL params", async ({ page }) => {
  190 |     const fridayDate = getFutureFriday(0);
  191 |     const from = new Date(fridayDate + "T00:00:00.000Z");
  192 |     from.setDate(from.getDate() - 7);
  193 |     const to = new Date(fridayDate + "T00:00:00.000Z");
  194 |     to.setDate(to.getDate() + 14);
  195 | 
  196 |     const fromStr = from.toISOString().split("T")[0];
  197 |     const toStr = to.toISOString().split("T")[0];
  198 | 
  199 |     // Navigate with filter params (desktop uses URL params, not the mobile filter sheet)
  200 |     await page.goto(`/collections/jumma?fromDate=${fromStr}&toDate=${toStr}`);
  201 | 
  202 |     // Wait for the filtered results to load
  203 |     await expect(page.getByRole("heading", { name: "Jumma Collection" })).toBeVisible();
  204 | 
  205 |     // The date range header should show the applied from date in display format
  206 |     // Check for the "Date Range" text and verify the from date is shown
  207 |     await expect(page.locator("text=Date Range:").first()).toBeVisible({ timeout: 15000 });
  208 |   });
  209 | });
  210 | 
  211 | test.describe("Phase 2C: Walk-in Restrictions", () => {
  212 |   test.beforeEach(async ({ page }) => {
  213 |     await page.goto("/collections/new");
  214 |     await expect(page.getByRole("heading", { name: "Receive payment" })).toBeVisible();
  215 |   });
  216 | 
  217 |   test("should allow walk-in donors for categories with BOTH eligibility", async ({ page }) => {
  218 |     // Switch to walk-in mode
  219 |     await page.getByRole("radio", { name: "Walk-in donor" }).click();
  220 | 
  221 |     // Fill walk-in name
  222 |     await page.fill('input[id="walkIn"]', "Walkin General Test");
  223 | 
  224 |     // Select General Donation category (BOTH eligibility)
  225 |     await page.click('button:has-text("General Donation")');
  226 | 
  227 |     // Set amount
  228 |     await page.fill('input[placeholder="0"]', "500");
  229 | 
  230 |     // Wait for the submit button to become enabled
  231 |     const submitBtn = page.locator('button:has-text("Confirm and issue receipt")');
  232 |     await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  233 | 
  234 |     await submitBtn.click();
  235 | 
  236 |     // Should navigate to receipt
  237 |     await expect(page).toHaveURL(/\/receipts\//, { timeout: 30000 });
  238 |   });
  239 | 
  240 |   test("should reject walk-in donors for MEMBERS_ONLY categories", async ({ page }) => {
  241 |     // Switch to walk-in mode
  242 |     await page.getByRole("radio", { name: "Walk-in donor" }).click();
  243 | 
  244 |     // Fill walk-in name
  245 |     await page.fill('input[id="walkIn"]', "Walkin Annual Test");
  246 | 
  247 |     // Monthly Chanda and Annual Chanda should NOT be visible (MEMBERS_ONLY filtered out)
  248 |     const monthlyChanda = page.locator('button:has-text("Monthly Chanda")');
  249 |     await expect(monthlyChanda).not.toBeVisible();
  250 | 
  251 |     const annualChanda = page.locator('button:has-text("Annual Chanda")');
  252 |     await expect(annualChanda).not.toBeVisible();
  253 |   });
  254 | 
  255 |   test("should reject individual Jumma payment via createPaymentAction", async ({ page }) => {
  256 |     // In member mode, Jumma Collection is visible (BOTH eligibility)
  257 |     // But the form should require a member selection for Jumma
> 258 |     await page.click('button:has-text("Jumma Collection")');
      |                ^ TimeoutError: page.click: Timeout 15000ms exceeded.
  259 | 
  260 |     // Set amount
  261 |     await page.fill('input[placeholder="0"]', "500");
  262 | 
  263 |     // The button should be disabled because no member is selected for Jumma
  264 |     const submitBtn = page.locator('button:has-text("Confirm and issue receipt")');
  265 |     await expect(submitBtn).toBeDisabled({ timeout: 5000 });
  266 |   });
  267 | });
  268 | 
  269 | test.describe("Phase 2C: Settlement Policy UI", () => {
  270 |   test.beforeEach(async ({ page }) => {
  271 |     await page.goto("/collections/new");
  272 |     await expect(page.getByRole("heading", { name: "Receive payment" })).toBeVisible();
  273 |   });
  274 | 
  275 |   test("should show FIFO preview section for OLDEST_FIRST categories when member has dues", async ({ page }) => {
  276 |     // Use the seed member "Arif Hussain"
  277 |     await page.fill('input[placeholder="Search member..."]', "Arif");
  278 | 
  279 |     // Click the first matching member in the dropdown
  280 |     await page.click('button:has-text("Arif Hussain")');
  281 | 
  282 |     // Select Monthly Chanda (OLDEST_FIRST settlement policy)
  283 |     await page.click('button:has-text("Monthly Chanda")');
  284 | 
  285 |     // Set amount
  286 |     await page.fill('input[placeholder="0"]', "500");
  287 | 
  288 |     // The receipt preview should show the category name
  289 |     await expect(page.locator("text=Monthly Chanda").first()).toBeVisible({ timeout: 10000 });
  290 |   });
  291 | 
  292 |   test("should show event/period selection UI for ANY_PENDING_PERIOD categories", async ({ page }) => {
  293 |     // Use the seed member "Arif Hussain"
  294 |     await page.fill('input[placeholder="Search member..."]', "Arif");
  295 | 
  296 |     // Click the first matching member in the dropdown
  297 |     await page.click('button:has-text("Arif Hussain")');
  298 | 
  299 |     // Select General Donation (ANY_PENDING_PERIOD settlement policy)
  300 |     await page.click('button:has-text("General Donation")');
  301 | 
  302 |     // Set amount
  303 |     await page.fill('input[placeholder="0"]', "500");
  304 | 
  305 |     // The receipt preview should show the category name
  306 |     await expect(page.locator("text=General Donation").first()).toBeVisible({ timeout: 10000 });
  307 |   });
  308 | });
  309 | 
  310 | test.describe("Phase 2C: Receipt Identity", () => {
  311 |   test.beforeEach(async ({ page }) => {
  312 |     await page.goto("/collections/new");
  313 |     await expect(page.getByRole("heading", { name: "Receive payment" })).toBeVisible();
  314 |   });
  315 | 
  316 |   test("should show Member ID and Name for registered member in receipt preview", async ({ page }) => {
  317 |     // Search for and select the seed member
  318 |     await page.fill('input[placeholder="Search member..."]', "Arif");
  319 |     await page.click('button:has-text("Arif Hussain")');
  320 | 
  321 |     // Select General Donation (BOTH eligibility)
  322 |     await page.click('button:has-text("General Donation")');
  323 | 
  324 |     // Set amount
  325 |     await page.fill('input[placeholder="0"]', "500");
  326 | 
  327 |     // Wait for receipt preview to update
  328 |     await page.waitForTimeout(500);
  329 | 
  330 |     // The receipt preview should show the member's name and member ID
  331 |     // Check for the member name in the preview
  332 |     await expect(page.locator("text=MAS-000003").first()).toBeVisible({ timeout: 10000 });
  333 |     await expect(page.locator("text=Arif Hussain").first()).toBeVisible({ timeout: 10000 });
  334 |   });
  335 | 
  336 |   test("should show blank Member ID position and Donor Name for walk-in", async ({ page }) => {
  337 |     // Switch to walk-in mode
  338 |     await page.getByRole("radio", { name: "Walk-in donor" }).click();
  339 | 
  340 |     // Fill walk-in name
  341 |     await page.fill('input[id="walkIn"]', "Walkin Receipt Test");
  342 | 
  343 |     // Select General Donation (walk-in doesn't need period selection)
  344 |     await page.click('button:has-text("General Donation")');
  345 | 
  346 |     // Set amount
  347 |     await page.fill('input[placeholder="0"]', "300");
  348 | 
  349 |     // Submit
  350 |     const submitBtn = page.locator('button:has-text("Confirm and issue receipt")');
  351 |     await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  352 |     await submitBtn.click();
  353 | 
  354 |     // Navigate to receipt
  355 |     await expect(page).toHaveURL(/\/receipts\//, { timeout: 30000 });
  356 | 
  357 |     // Receipt should show the walk-in name with blank member ID
  358 |     await expect(page.locator("text=__________ — Walkin Receipt Test").first()).toBeVisible();
```