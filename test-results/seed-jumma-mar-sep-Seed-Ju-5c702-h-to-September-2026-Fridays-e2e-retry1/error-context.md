# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seed-jumma-mar-sep.spec.ts >> Seed Jumma Mar-Sep 2026 via Playwright >> seed March to September 2026 Fridays
- Location: e2e\seed-jumma-mar-sep.spec.ts:4:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('[role="dialog"]').locator('button:has-text("Save")')
    - locator resolved to <button disabled type="submit" class="w-full h-[58px] rounded-[var(--radius-pill)] bg-[var(--brand-primary)] text-white font-manrope font-semibold text-base flex items-center justify-center gap-2 transition-all duration-150 hover:bg-[var(--brand-hero)] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex-1">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    29 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
        - link "Due Status Overview" [ref=e37] [cursor=pointer]:
          - /url: /collections/due-status
        - link "Transactions" [ref=e44] [cursor=pointer]:
          - /url: /transactions
        - link "Expenses" [ref=e49] [cursor=pointer]:
          - /url: /expenses
        - link "Reports" [ref=e55] [cursor=pointer]:
          - /url: /reports
        - link "Settings" [ref=e60] [cursor=pointer]:
          - /url: /settings
        - link "Staff" [ref=e66] [cursor=pointer]:
          - /url: /staff
        - link "Audit log" [ref=e72] [cursor=pointer]:
          - /url: /audit
    - generic [ref=e78]:
      - banner [ref=e79]:
        - generic [ref=e80]:
          - generic [ref=e86]: हुसैनी मस्जिद आलोट
          - generic [ref=e87]: 25 Nov 2026
        - generic [ref=e88]:
          - generic [ref=e90]:
            - generic [ref=e91]: Language
            - generic [ref=e96]:
              - button "English" [pressed] [ref=e97]
              - button "हिन्दी" [ref=e98]
              - button "اردو" [ref=e99]
          - button "MA Masjid Admin" [ref=e101]:
            - generic [ref=e102]: MA
            - generic [ref=e103]: Masjid Admin
      - main [ref=e106]:
        - generic [ref=e107]:
          - generic [ref=e108]:
            - heading "Jumma Collection" [level=1] [ref=e109]
            - paragraph [ref=e110]: Record and manage Friday Jumma collection totals
          - generic [ref=e112]:
            - generic [ref=e113]:
              - generic [ref=e114]:
                - heading "Total" [level=2] [ref=e115]
                - paragraph [ref=e116]: ₹8,020
              - generic [ref=e117]:
                - generic [ref=e118]:
                  - generic [ref=e119]:
                    - generic [ref=e120]: Filter by definition
                    - combobox "Filter by definition" [ref=e121]:
                      - option "All" [selected]
                      - option "Jumma Collection"
                  - generic [ref=e122]:
                    - generic [ref=e123]: From
                    - textbox "From" [ref=e124]
                    - generic [ref=e125]: To
                    - textbox "To" [ref=e126]
                  - generic [ref=e127]:
                    - generic [ref=e128]: Sort by
                    - combobox "Sort by" [ref=e129]:
                      - option "Latest First"
                      - option "Date Order" [selected]
                  - button "Clear" [ref=e130]
                - button "Record New Jumma" [ref=e131]
            - generic [ref=e138]:
              - paragraph [ref=e140]: "Date Range: All — All"
              - generic [ref=e142]:
                - generic [ref=e143]:
                  - generic [ref=e144]:
                    - generic [ref=e145]:
                      - generic [ref=e146]:
                        - generic [ref=e149]: 27 Nov 2026
                        - generic [ref=e150]: Jumma
                      - generic [ref=e151]: Jumma Collection
                    - generic [ref=e152]:
                      - generic [ref=e153]:
                        - paragraph [ref=e154]: ₹350
                        - paragraph [ref=e155]: "(Recorded by: Masjid Admin)"
                      - button "Correct" [ref=e156]
                  - generic [ref=e161]:
                    - heading "Corrections (1)" [level=4] [ref=e162]
                    - button [ref=e163]
                - generic [ref=e167]:
                  - generic [ref=e168]:
                    - generic [ref=e169]:
                      - generic [ref=e172]: 20 Nov 2026
                      - generic [ref=e173]: Jumma
                    - generic [ref=e174]: Jumma Collection
                  - generic [ref=e175]:
                    - generic [ref=e176]:
                      - paragraph [ref=e177]: ₹260
                      - paragraph [ref=e178]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e179]
                - generic [ref=e184]:
                  - generic [ref=e185]:
                    - generic [ref=e186]:
                      - generic [ref=e189]: 13 Nov 2026
                      - generic [ref=e190]: Jumma
                    - generic [ref=e191]: Jumma Collection
                  - generic [ref=e192]:
                    - generic [ref=e193]:
                      - paragraph [ref=e194]: ₹220
                      - paragraph [ref=e195]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e196]
                - generic [ref=e201]:
                  - generic [ref=e202]:
                    - generic [ref=e203]:
                      - generic [ref=e206]: 06 Nov 2026
                      - generic [ref=e207]: Jumma
                    - generic [ref=e208]: Jumma Collection
                  - generic [ref=e209]:
                    - generic [ref=e210]:
                      - paragraph [ref=e211]: ₹190
                      - paragraph [ref=e212]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e213]
                - generic [ref=e218]:
                  - generic [ref=e219]:
                    - generic [ref=e220]:
                      - generic [ref=e223]: 30 Oct 2026
                      - generic [ref=e224]: Jumma
                    - generic [ref=e225]: Jumma Collection
                  - generic [ref=e226]:
                    - generic [ref=e227]:
                      - paragraph [ref=e228]: ₹270
                      - paragraph [ref=e229]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e230]
                - generic [ref=e235]:
                  - generic [ref=e236]:
                    - generic [ref=e237]:
                      - generic [ref=e240]: 23 Oct 2026
                      - generic [ref=e241]: Jumma
                    - generic [ref=e242]: Jumma Collection
                  - generic [ref=e243]:
                    - generic [ref=e244]:
                      - paragraph [ref=e245]: ₹310
                      - paragraph [ref=e246]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e247]
                - generic [ref=e252]:
                  - generic [ref=e253]:
                    - generic [ref=e254]:
                      - generic [ref=e257]: 16 Oct 2026
                      - generic [ref=e258]: Jumma
                    - generic [ref=e259]: Jumma Collection
                  - generic [ref=e260]:
                    - generic [ref=e261]:
                      - paragraph [ref=e262]: ₹180
                      - paragraph [ref=e263]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e264]
                - generic [ref=e269]:
                  - generic [ref=e270]:
                    - generic [ref=e271]:
                      - generic [ref=e274]: 09 Oct 2026
                      - generic [ref=e275]: Jumma
                    - generic [ref=e276]: Jumma Collection
                  - generic [ref=e277]:
                    - generic [ref=e278]:
                      - paragraph [ref=e279]: ₹230
                      - paragraph [ref=e280]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e281]
                - generic [ref=e286]:
                  - generic [ref=e287]:
                    - generic [ref=e288]:
                      - generic [ref=e291]: 02 Oct 2026
                      - generic [ref=e292]: Jumma
                    - generic [ref=e293]: Jumma Collection
                  - generic [ref=e294]:
                    - generic [ref=e295]:
                      - paragraph [ref=e296]: ₹150
                      - paragraph [ref=e297]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e298]
                - generic [ref=e303]:
                  - generic [ref=e304]:
                    - generic [ref=e305]:
                      - generic [ref=e308]: 25 Sep 2026
                      - generic [ref=e309]: Jumma
                    - generic [ref=e310]: Jumma Collection
                  - generic [ref=e311]:
                    - generic [ref=e312]:
                      - paragraph [ref=e313]: ₹230
                      - paragraph [ref=e314]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e315]
                - generic [ref=e320]:
                  - generic [ref=e321]:
                    - generic [ref=e322]:
                      - generic [ref=e325]: 18 Sep 2026
                      - generic [ref=e326]: Jumma
                    - generic [ref=e327]: Jumma Collection
                  - generic [ref=e328]:
                    - generic [ref=e329]:
                      - paragraph [ref=e330]: ₹170
                      - paragraph [ref=e331]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e332]
                - generic [ref=e337]:
                  - generic [ref=e338]:
                    - generic [ref=e339]:
                      - generic [ref=e342]: 11 Sep 2026
                      - generic [ref=e343]: Jumma
                    - generic [ref=e344]: Jumma Collection
                  - generic [ref=e345]:
                    - generic [ref=e346]:
                      - paragraph [ref=e347]: ₹210
                      - paragraph [ref=e348]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e349]
                - generic [ref=e354]:
                  - generic [ref=e355]:
                    - generic [ref=e356]:
                      - generic [ref=e359]: 04 Sep 2026
                      - generic [ref=e360]: Jumma
                    - generic [ref=e361]: Jumma Collection
                  - generic [ref=e362]:
                    - generic [ref=e363]:
                      - paragraph [ref=e364]: ₹190
                      - paragraph [ref=e365]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e366]
                - generic [ref=e371]:
                  - generic [ref=e372]:
                    - generic [ref=e373]:
                      - generic [ref=e376]: 28 Aug 2026
                      - generic [ref=e377]: Jumma
                    - generic [ref=e378]: Jumma Collection
                  - generic [ref=e379]:
                    - generic [ref=e380]:
                      - paragraph [ref=e381]: ₹250
                      - paragraph [ref=e382]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e383]
                - generic [ref=e388]:
                  - generic [ref=e389]:
                    - generic [ref=e390]:
                      - generic [ref=e393]: 21 Aug 2026
                      - generic [ref=e394]: Jumma
                    - generic [ref=e395]: Jumma Collection
                  - generic [ref=e396]:
                    - generic [ref=e397]:
                      - paragraph [ref=e398]: ₹180
                      - paragraph [ref=e399]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e400]
                - generic [ref=e405]:
                  - generic [ref=e406]:
                    - generic [ref=e407]:
                      - generic [ref=e410]: 14 Aug 2026
                      - generic [ref=e411]: Jumma
                    - generic [ref=e412]: Jumma Collection
                  - generic [ref=e413]:
                    - generic [ref=e414]:
                      - paragraph [ref=e415]: ₹220
                      - paragraph [ref=e416]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e417]
                - generic [ref=e422]:
                  - generic [ref=e423]:
                    - generic [ref=e424]:
                      - generic [ref=e427]: 07 Aug 2026
                      - generic [ref=e428]: Jumma
                    - generic [ref=e429]: Jumma Collection
                  - generic [ref=e430]:
                    - generic [ref=e431]:
                      - paragraph [ref=e432]: ₹160
                      - paragraph [ref=e433]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e434]
                - generic [ref=e439]:
                  - generic [ref=e440]:
                    - generic [ref=e441]:
                      - generic [ref=e444]: 31 Jul 2026
                      - generic [ref=e445]: Jumma
                    - generic [ref=e446]: Jumma Collection
                  - generic [ref=e447]:
                    - generic [ref=e448]:
                      - paragraph [ref=e449]: ₹240
                      - paragraph [ref=e450]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e451]
                - generic [ref=e456]:
                  - generic [ref=e457]:
                    - generic [ref=e458]:
                      - generic [ref=e461]: 24 Jul 2026
                      - generic [ref=e462]: Jumma
                    - generic [ref=e463]: Jumma Collection
                  - generic [ref=e464]:
                    - generic [ref=e465]:
                      - paragraph [ref=e466]: ₹200
                      - paragraph [ref=e467]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e468]
                - generic [ref=e473]:
                  - generic [ref=e474]:
                    - generic [ref=e475]:
                      - generic [ref=e478]: 17 Jul 2026
                      - generic [ref=e479]: Jumma
                    - generic [ref=e480]: Jumma Collection
                  - generic [ref=e481]:
                    - generic [ref=e482]:
                      - paragraph [ref=e483]: ₹150
                      - paragraph [ref=e484]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e485]
                - generic [ref=e490]:
                  - generic [ref=e491]:
                    - generic [ref=e492]:
                      - generic [ref=e495]: 10 Jul 2026
                      - generic [ref=e496]: Jumma
                    - generic [ref=e497]: Jumma Collection
                  - generic [ref=e498]:
                    - generic [ref=e499]:
                      - paragraph [ref=e500]: ₹230
                      - paragraph [ref=e501]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e502]
                - generic [ref=e507]:
                  - generic [ref=e508]:
                    - generic [ref=e509]:
                      - generic [ref=e512]: 03 Jul 2026
                      - generic [ref=e513]: Jumma
                    - generic [ref=e514]: Jumma Collection
                  - generic [ref=e515]:
                    - generic [ref=e516]:
                      - paragraph [ref=e517]: ₹170
                      - paragraph [ref=e518]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e519]
                - generic [ref=e524]:
                  - generic [ref=e525]:
                    - generic [ref=e526]:
                      - generic [ref=e529]: 26 Jun 2026
                      - generic [ref=e530]: Jumma
                    - generic [ref=e531]: Jumma Collection
                  - generic [ref=e532]:
                    - generic [ref=e533]:
                      - paragraph [ref=e534]: ₹210
                      - paragraph [ref=e535]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e536]
                - generic [ref=e541]:
                  - generic [ref=e542]:
                    - generic [ref=e543]:
                      - generic [ref=e546]: 19 Jun 2026
                      - generic [ref=e547]: Jumma
                    - generic [ref=e548]: Jumma Collection
                  - generic [ref=e549]:
                    - generic [ref=e550]:
                      - paragraph [ref=e551]: ₹190
                      - paragraph [ref=e552]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e553]
                - generic [ref=e558]:
                  - generic [ref=e559]:
                    - generic [ref=e560]:
                      - generic [ref=e563]: 12 Jun 2026
                      - generic [ref=e564]: Jumma
                    - generic [ref=e565]: Jumma Collection
                  - generic [ref=e566]:
                    - generic [ref=e567]:
                      - paragraph [ref=e568]: ₹220
                      - paragraph [ref=e569]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e570]
                - generic [ref=e575]:
                  - generic [ref=e576]:
                    - generic [ref=e577]:
                      - generic [ref=e580]: 05 Jun 2026
                      - generic [ref=e581]: Jumma
                    - generic [ref=e582]: Jumma Collection
                  - generic [ref=e583]:
                    - generic [ref=e584]:
                      - paragraph [ref=e585]: ₹180
                      - paragraph [ref=e586]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e587]
                - generic [ref=e592]:
                  - generic [ref=e593]:
                    - generic [ref=e594]:
                      - generic [ref=e597]: 29 May 2026
                      - generic [ref=e598]: Jumma
                    - generic [ref=e599]: Jumma Collection
                  - generic [ref=e600]:
                    - generic [ref=e601]:
                      - paragraph [ref=e602]: ₹240
                      - paragraph [ref=e603]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e604]
                - generic [ref=e609]:
                  - generic [ref=e610]:
                    - generic [ref=e611]:
                      - generic [ref=e614]: 22 May 2026
                      - generic [ref=e615]: Jumma
                    - generic [ref=e616]: Jumma Collection
                  - generic [ref=e617]:
                    - generic [ref=e618]:
                      - paragraph [ref=e619]: ₹140
                      - paragraph [ref=e620]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e621]
                - generic [ref=e626]:
                  - generic [ref=e627]:
                    - generic [ref=e628]:
                      - generic [ref=e631]: 15 May 2026
                      - generic [ref=e632]: Jumma
                    - generic [ref=e633]: Jumma Collection
                  - generic [ref=e634]:
                    - generic [ref=e635]:
                      - paragraph [ref=e636]: ₹230
                      - paragraph [ref=e637]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e638]
                - generic [ref=e643]:
                  - generic [ref=e644]:
                    - generic [ref=e645]:
                      - generic [ref=e648]: 08 May 2026
                      - generic [ref=e649]: Jumma
                    - generic [ref=e650]: Jumma Collection
                  - generic [ref=e651]:
                    - generic [ref=e652]:
                      - paragraph [ref=e653]: ₹200
                      - paragraph [ref=e654]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e655]
                - generic [ref=e660]:
                  - generic [ref=e661]:
                    - generic [ref=e662]:
                      - generic [ref=e665]: 01 May 2026
                      - generic [ref=e666]: Jumma
                    - generic [ref=e667]: Jumma Collection
                  - generic [ref=e668]:
                    - generic [ref=e669]:
                      - paragraph [ref=e670]: ₹160
                      - paragraph [ref=e671]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e672]
                - generic [ref=e677]:
                  - generic [ref=e678]:
                    - generic [ref=e679]:
                      - generic [ref=e682]: 24 Apr 2026
                      - generic [ref=e683]: Jumma
                    - generic [ref=e684]: Jumma Collection
                  - generic [ref=e685]:
                    - generic [ref=e686]:
                      - paragraph [ref=e687]: ₹210
                      - paragraph [ref=e688]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e689]
                - generic [ref=e694]:
                  - generic [ref=e695]:
                    - generic [ref=e696]:
                      - generic [ref=e699]: 17 Apr 2026
                      - generic [ref=e700]: Jumma
                    - generic [ref=e701]: Jumma Collection
                  - generic [ref=e702]:
                    - generic [ref=e703]:
                      - paragraph [ref=e704]: ₹170
                      - paragraph [ref=e705]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e706]
                - generic [ref=e711]:
                  - generic [ref=e712]:
                    - generic [ref=e713]:
                      - generic [ref=e716]: 10 Apr 2026
                      - generic [ref=e717]: Jumma
                    - generic [ref=e718]: Jumma Collection
                  - generic [ref=e719]:
                    - generic [ref=e720]:
                      - paragraph [ref=e721]: ₹250
                      - paragraph [ref=e722]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e723]
                - generic [ref=e728]:
                  - generic [ref=e729]:
                    - generic [ref=e730]:
                      - generic [ref=e733]: 03 Apr 2026
                      - generic [ref=e734]: Jumma
                    - generic [ref=e735]: Jumma Collection
                  - generic [ref=e736]:
                    - generic [ref=e737]:
                      - paragraph [ref=e738]: ₹190
                      - paragraph [ref=e739]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e740]
                - generic [ref=e745]:
                  - generic [ref=e746]:
                    - generic [ref=e747]:
                      - generic [ref=e750]: 27 Mar 2026
                      - generic [ref=e751]: Jumma
                    - generic [ref=e752]: Jumma Collection
                  - generic [ref=e753]:
                    - generic [ref=e754]:
                      - paragraph [ref=e755]: ₹220
                      - paragraph [ref=e756]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e757]
                - generic [ref=e762]:
                  - generic [ref=e763]:
                    - generic [ref=e764]:
                      - generic [ref=e767]: 20 Mar 2026
                      - generic [ref=e768]: Jumma
                    - generic [ref=e769]: Jumma Collection
                  - generic [ref=e770]:
                    - generic [ref=e771]:
                      - paragraph [ref=e772]: ₹150
                      - paragraph [ref=e773]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e774]
                - generic [ref=e779]:
                  - generic [ref=e780]:
                    - generic [ref=e781]:
                      - generic [ref=e784]: 13 Mar 2026
                      - generic [ref=e785]: Jumma
                    - generic [ref=e786]: Jumma Collection
                  - generic [ref=e787]:
                    - generic [ref=e788]:
                      - paragraph [ref=e789]: ₹180
                      - paragraph [ref=e790]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e791]
                - generic [ref=e796]:
                  - generic [ref=e797]:
                    - generic [ref=e798]:
                      - generic [ref=e801]: 06 Mar 2026
                      - generic [ref=e802]: Jumma
                    - generic [ref=e803]: Jumma Collection
                  - generic [ref=e804]:
                    - generic [ref=e805]:
                      - paragraph [ref=e806]: ₹120
                      - paragraph [ref=e807]: "(Recorded by: Masjid Admin)"
                    - button "Correct" [ref=e808]
            - dialog [ref=e812]:
              - generic [ref=e814]:
                - heading "Record New Jumma" [level=3] [ref=e816]
                - generic [ref=e817]:
                  - generic [ref=e818]:
                    - generic [ref=e819]: Date
                    - textbox "Date" [ref=e820]: 2026-09-04
                  - generic [ref=e821]:
                    - generic [ref=e822]: Select a Jumma definition
                    - combobox "Select a Jumma definition" [ref=e823]:
                      - option "Select a Jumma definition"
                      - option "Jumma Collection" [selected]
                  - generic [ref=e824]:
                    - generic [ref=e825]: Amount
                    - generic [ref=e826]:
                      - generic [ref=e827]: ₹
                      - textbox "Amount" [active] [ref=e828]:
                        - /placeholder: "0.00"
                        - text: "190.00"
                  - generic [ref=e829]:
                    - generic [ref=e830]: Notes (optional)
                    - textbox "Notes (optional)" [ref=e831]
                  - generic [ref=e832]:
                    - button "Cancel" [ref=e833]
                    - button "Save" [disabled] [ref=e834]
  - button "Open Next.js Dev Tools" [ref=e844] [cursor=pointer]
  - alert [ref=e848]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Seed Jumma Mar-Sep 2026 via Playwright", () => {
  4  |   test("seed March to September 2026 Fridays", async ({ page }) => {
  5  |     await page.goto("/collections/jumma");
  6  |     await expect(page.getByRole("heading", { name: "Jumma Collection" })).toBeVisible();
  7  | 
  8  |     // March to September 2026 Fridays with amounts
  9  |     const testData = [
  10 |       // March 2026
  11 |       { date: "2026-03-06", amount: "120.00" },
  12 |       { date: "2026-03-13", amount: "180.00" },
  13 |       { date: "2026-03-20", amount: "150.00" },
  14 |       { date: "2026-03-27", amount: "220.00" },
  15 |       // April 2026
  16 |       { date: "2026-04-03", amount: "190.00" },
  17 |       { date: "2026-04-10", amount: "250.00" },
  18 |       { date: "2026-04-17", amount: "170.00" },
  19 |       { date: "2026-04-24", amount: "210.00" },
  20 |       // May 2026
  21 |       { date: "2026-05-01", amount: "160.00" },
  22 |       { date: "2026-05-08", amount: "200.00" },
  23 |       { date: "2026-05-15", amount: "230.00" },
  24 |       { date: "2026-05-22", amount: "140.00" },
  25 |       { date: "2026-05-29", amount: "240.00" },
  26 |       // June 2026
  27 |       { date: "2026-06-05", amount: "180.00" },
  28 |       { date: "2026-06-12", amount: "220.00" },
  29 |       { date: "2026-06-19", amount: "190.00" },
  30 |       { date: "2026-06-26", amount: "210.00" },
  31 |       // July 2026
  32 |       { date: "2026-07-03", amount: "170.00" },
  33 |       { date: "2026-07-10", amount: "230.00" },
  34 |       { date: "2026-07-17", amount: "150.00" },
  35 |       { date: "2026-07-24", amount: "200.00" },
  36 |       { date: "2026-07-31", amount: "240.00" },
  37 |       // August 2026
  38 |       { date: "2026-08-07", amount: "160.00" },
  39 |       { date: "2026-08-14", amount: "220.00" },
  40 |       { date: "2026-08-21", amount: "180.00" },
  41 |       { date: "2026-08-28", amount: "250.00" },
  42 |       // September 2026
  43 |       { date: "2026-09-04", amount: "190.00" },
  44 |       { date: "2026-09-11", amount: "210.00" },
  45 |       { date: "2026-09-18", amount: "170.00" },
  46 |       { date: "2026-09-25", amount: "230.00" },
  47 |     ];
  48 | 
  49 |     for (const { date, amount } of testData) {
  50 |       // Check if already exists (by date display)
  51 |       const dateDisplay = new Date(date + "T00:00:00.000Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  52 |       const existing = page.locator(`text=${dateDisplay}`);
  53 | 
  54 |       if (await existing.count() > 0) {
  55 |         console.log(`⚠ ${date} (${dateDisplay}) already exists, skipping`);
  56 |         continue;
  57 |       }
  58 | 
  59 |       console.log(`Seeding ${date} (${dateDisplay}) - ₹${amount}`);
  60 | 
  61 |       await page.click("text=Record New Jumma");
  62 |       const modal = page.locator('[role="dialog"]');
  63 |       await expect(modal).toBeVisible();
  64 | 
  65 |       await modal.locator('input[id="recordDate"]').fill(date);
  66 |       await modal.locator('input[id="recordAmount"]').fill(amount);
  67 |       await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  68 | 
> 69 |       await modal.locator('button:has-text("Save")').click();
     |                                                      ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  70 | 
  71 |       // Wait for reload
  72 |       await expect(page.locator(`text=₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first()).toBeVisible({ timeout: 30000 });
  73 |       await expect(page.locator(`text=${dateDisplay}`).first()).toBeVisible({ timeout: 15000 });
  74 | 
  75 |       await page.waitForLoadState('networkidle');
  76 |     }
  77 | 
  78 |     console.log("✅ Seeding complete!");
  79 |   });
  80 | });
```