# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: monthly-chanda-payment-flow.spec.ts >> Phase 8: Monthly Chanda Payment Flow >> Complete Monthly Chanda workflow: dues generation, payment collection, verification
- Location: e2e\monthly-chanda-payment-flow.spec.ts:179:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=AUTOMATIC')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=AUTOMATIC') with timeout 15000ms
  - waiting for locator('text=AUTOMATIC')

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
    - link "Due Status Overview":
      - /url: /collections/due-status
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
  - text: हुसैनी मस्जिद आलोट 25 Nov 2026 Language
  - button "English" [pressed]
  - button "हिन्दी"
  - button "اردو"
  - button "MA Masjid Admin"
- main:
  - heading "Generate due periods" [level=1]
  - paragraph: 5-step wizard to generate dues periods for collection categories
  - text: Category Generation Mode Date Range Select members 5 Review
  - heading "Review" [level=2]
  - paragraph: Review your settings before generating dues
  - text: Category Monthly Chanda Generation Mode ADMIN Date Range 2026-12-01 to 2027-11-01 Member Assignment All Eligible Members
  - button "Back"
  - button "Generate Dues"
- alert
```

# Test source

```ts
  156 |   console.log("\n=== Cleaning up test data ===");
  157 |   if (testData.memberA && testData.memberB) {
  158 |     await prisma.duesPeriod.deleteMany({ where: { memberId: { in: [testData.memberA.id, testData.memberB.id] } } }).catch(() => {});
  159 |     await prisma.paymentAllocation.deleteMany({ where: { masjidId: testData.masjid.id, payment: { donorMemberId: { in: [testData.memberA.id, testData.memberB.id] } } } }).catch(() => {});
  160 |     await prisma.payment.deleteMany({ where: { masjidId: testData.masjid.id, donorMemberId: { in: [testData.memberA.id, testData.memberB.id] } } }).catch(() => {});
  161 |     await prisma.member.deleteMany({ where: { id: { in: [testData.memberA.id, testData.memberB.id] } } }).catch(() => {});
  162 |   }
  163 |   console.log("✓ Cleanup complete");
  164 | }
  165 | 
  166 | test.describe.configure({ retries: 0 });
  167 | 
  168 | test.describe("Phase 8: Monthly Chanda Payment Flow", () => {
  169 |   test.beforeAll(async () => {
  170 |     await setupTestData();
  171 |   });
  172 | 
  173 |   test.afterAll(async () => {
  174 |     await cleanupTestData();
  175 |     await prisma.$disconnect();
  176 |   });
  177 | 
  178 |   // ─── Main Test: Complete Monthly Chanda Workflow ───
  179 |   test("Complete Monthly Chanda workflow: dues generation, payment collection, verification", async ({ page }) => {
  180 |     await page.setViewportSize({ width: 1440, height: 900 });
  181 | 
  182 |     // ═══ STEP 1: Navigate to Due Generation Wizard ═══
  183 |     console.log("\n📋 STEP 1: Navigate to Due Generation Wizard");
  184 |     await page.goto("/collections/generate");
  185 |     await page.waitForLoadState("networkidle");
  186 |     await expect(page.locator("text=Generate due periods")).toBeVisible({ timeout: 15000 });
  187 |     console.log("✅ Due Generation Wizard page loaded");
  188 | 
  189 |     // ═══ STEP 2: Step 1 - Select Monthly Chanda category ═══
  190 |     console.log("\n📋 STEP 2: Select Monthly Chanda category (Step 1 of wizard)");
  191 |     await page.click('button:has-text("Monthly Chanda")');
  192 |     await page.waitForTimeout(500);
  193 | 
  194 |     // Click Next to go to Step 2
  195 |     await page.click('button:has-text("Next")');
  196 |     await page.waitForTimeout(500);
  197 |     console.log("✅ Monthly Chanda selected, moved to Step 2");
  198 | 
  199 |     // ═══ STEP 3: Step 2 - Verify Generation Mode ═══
  200 |     console.log("\n📋 STEP 3: Verify generation mode (Step 2 of wizard)");
  201 |     await expect(page.getByRole('heading', { name: 'Generation Mode' })).toBeVisible();
  202 | 
  203 |     // Monthly Chanda should have AUTOMATIC as current mode
  204 |     await expect(page.getByRole('button', { name: 'Automatic' })).toBeVisible();
  205 |     console.log("✅ Generation mode confirmed");
  206 | 
  207 |     // Click Next to go to Step 3
  208 |     await page.click('button:has-text("Next")');
  209 |     await page.waitForTimeout(500);
  210 |     console.log("✅ Moved to Step 3");
  211 | 
  212 |     // ═══ STEP 4: Step 3 - Set date range to next 12 months ═══
  213 |     console.log("\n📋 STEP 4: Set date range to next 12 months (Step 3 of wizard)");
  214 |     await expect(page.getByRole('heading', { name: 'Date Range' })).toBeVisible();
  215 | 
  216 |     // Set from date to next month and to date to 12 months from now
  217 |     // The wizard uses type="date" inputs - use local date format to avoid timezone issues
  218 |     const today = new Date();
  219 |     const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  220 |     const twelveMonthsLater = new Date(today.getFullYear(), today.getMonth() + 12, 1);
  221 | 
  222 |     // Format as YYYY-MM-DD in local time (not UTC) for HTML date inputs
  223 |     const fromDateStr = nextMonth.toLocaleDateString('en-CA'); // YYYY-MM-DD
  224 |     const toDateStr = twelveMonthsLater.toLocaleDateString('en-CA'); // YYYY-MM-DD
  225 | 
  226 |     await page.fill('input[type="date"] >> nth=0', fromDateStr);
  227 |     await page.fill('input[type="date"] >> nth=1', toDateStr);
  228 |     await page.waitForTimeout(300);
  229 |     console.log(`✅ Date range set to ${fromDateStr} to ${toDateStr}`);
  230 | 
  231 |     // Click Next to go to Step 4
  232 |     await page.click('button:has-text("Next")');
  233 |     await page.waitForTimeout(500);
  234 |     console.log("✅ Moved to Step 4");
  235 | 
  236 |     // ═══ STEP 5: Step 4 - Verify ALL_ELIGIBLE ═══
  237 |     console.log("\n📋 STEP 5: Verify member selection mode (Step 4 of wizard)");
  238 |     await expect(page.getByRole('heading', { name: 'Select Members' })).toBeVisible();
  239 | 
  240 |     // Monthly Chanda uses ALL_ELIGIBLE - click the "All Eligible Members" option
  241 |     await page.click('button:has-text("All Eligible Members")');
  242 |     await page.waitForTimeout(500);
  243 |     console.log("✅ ALL_ELIGIBLE mode selected");
  244 | 
  245 |     // Click Review to go to Step 5 (it's "Review" on this step, not "Next")
  246 |     await page.click('button:has-text("Review")');
  247 |     await page.waitForTimeout(500);
  248 |     console.log("✅ Moved to Step 5");
  249 | 
  250 |     // ═══ STEP 6: Step 5 - Review and Generate ═══
  251 |     console.log("\n📋 STEP 6: Review and generate dues (Step 5 of wizard)");
  252 |     await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
  253 | 
  254 |     // Verify summary - check category name and mode
  255 |     await expect(page.locator("text=Monthly Chanda")).toBeVisible();
> 256 |     await expect(page.locator("text=AUTOMATIC")).toBeVisible();
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  257 |     // Note: dates will show the dynamic from/to dates, not hardcoded 2026-01-01
  258 |     console.log("✅ Review summary verified");
  259 | 
  260 |     // Click Generate
  261 |     await page.click('button:has-text("Generate Dues")');
  262 |     console.log("✅ Generate clicked, waiting for completion...");
  263 | 
  264 |     // Wait for generation to complete - wait for the success result section
  265 |     // The success state shows a checkmark and "Success" heading
  266 |     // First check for any error message
  267 |     let errorMsg = null;
  268 |     try {
  269 |       errorMsg = await page.locator('p[role="alert"]').textContent({ timeout: 10000 });
  270 |       if (errorMsg) {
  271 |         console.log("❌ Generation error:", errorMsg);
  272 |       }
  273 |     } catch {
  274 |       // No error message
  275 |     }
  276 | 
  277 |     // Also check for any toast or error notification
  278 |     try {
  279 |       const toastError = await page.locator('[role="status"], [role="alert"], .toast').first().textContent({ timeout: 5000 });
  280 |       if (toastError) {
  281 |         console.log("Toast/Status:", toastError);
  282 |       }
  283 |     } catch {}
  284 | 
  285 |     await expect(page.locator('h3:has-text("Success")')).toBeVisible({ timeout: 120000 });
  286 |     console.log("✅ Dues generation completed");
  287 | 
  288 |     // Verify created count - should be 24 (12 months × 2 members)
  289 |     const duesGeneratedText = await page.locator('p:has-text("dues periods generated")').textContent();
  290 |     console.log("Generation result:", duesGeneratedText);
  291 | 
  292 |     // Click Done
  293 |     await page.click('button:has-text("Done")');
  294 |     await page.waitForLoadState("networkidle");
  295 |     console.log("✅ Dues generation wizard complete");
  296 | 
  297 |     // ═══ STEP 7: Verify DuesPeriod records in database ═══
  298 |     console.log("\n📋 STEP 7: Verify DuesPeriod records created in database");
  299 |     const duesPeriods = await prisma.duesPeriod.findMany({
  300 |       where: {
  301 |         collectionDefinitionId: testData.monthlyChandaDef.id,
  302 |         memberId: { in: [testData.memberA.id, testData.memberB.id] },
  303 |       },
  304 |       orderBy: [{ memberId: "asc" }, { periodStart: "asc" }],
  305 |     });
  306 | 
  307 |     console.log(`Total dues periods created: ${duesPeriods.length}`);
  308 |     expect(duesPeriods.length).toBe(24); // 2 members × 12 months
  309 | 
  310 |     // Verify 12 for each member
  311 |     const memberADues = duesPeriods.filter(d => d.memberId === testData.memberA.id);
  312 |     const memberBDues = duesPeriods.filter(d => d.memberId === testData.memberB.id);
  313 | 
  314 |     expect(memberADues.length).toBe(12);
  315 |     expect(memberBDues.length).toBe(12);
  316 | 
  317 |     // Verify all are PENDING
  318 |     for (const d of duesPeriods) {
  319 |       expect(d.status).toBe("PENDING");
  320 |     }
  321 |     console.log("✅ Database verification: 24 dues periods (12 per member), all PENDING");
  322 | 
  323 |     // Generate expected month names from the dues periods
  324 |     // Use formatDate from the dates utility (DD-MM-YYYY) to match UI display
  325 |     const monthsSet = new Set<string>();
  326 |     for (const d of memberADues) {
  327 |       // Format as DD-MM-YYYY to match formatDate() output
  328 |       const parts = d.periodStart.toLocaleString("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).split("-");
  329 |       monthsSet.add(`${parts[2]}-${parts[1]}-${parts[0]}`);
  330 |     }
  331 |     EXPECTED_MONTHS = Array.from(monthsSet).sort((a, b) => new Date(a.split("-").reverse().join("-")).getTime() - new Date(b.split("-").reverse().join("-")).getTime());
  332 |     console.log("Expected months:", EXPECTED_MONTHS);
  333 | 
  334 |     // Remaining months after payment (skip first 2)
  335 |     REMAINING_MONTHS = EXPECTED_MONTHS.slice(2);
  336 | 
  337 |     // ═══ STEP 8: Payment Received UI - Member A sees 12 pending months ═══
  338 |     console.log("\n📋 STEP 8: Verify Payment Received UI shows 12 pending months for Member A");
  339 | 
  340 |     // Use mobile viewport for the collection form
  341 |     await page.setViewportSize({ width: 375, height: 667 });
  342 |     await page.goto("/collections/new");
  343 |     await page.waitForLoadState("networkidle");
  344 |     await page.waitForTimeout(1000);
  345 | 
  346 |     // Select Member A
  347 |     await page.click('text=Choose member');
  348 |     await page.waitForTimeout(300);
  349 | 
  350 |     const memberSearchInput = page.locator('#member-search');
  351 |     await memberSearchInput.fill(TEST_MEMBER_A_NAME);
  352 |     await page.waitForTimeout(500);
  353 | 
  354 |     // Click the member in dropdown
  355 |     await page.click(`button:has-text("${TEST_MEMBER_A_NAME}")`);
  356 |     await page.waitForTimeout(500);
```