# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase2c-jumma.spec.ts >> Phase 2C: Jumma Aggregate Collection >> should prevent duplicate Jumma collection for same Friday
- Location: e2e\phase2c-jumma.spec.ts:103:7

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
                    - textbox "Date" [ref=e820]: 2029-04-19
                  - generic [ref=e821]:
                    - generic [ref=e822]: Select a Jumma definition
                    - combobox "Select a Jumma definition" [ref=e823]:
                      - option "Select a Jumma definition"
                      - option "Jumma Collection" [selected]
                  - paragraph [ref=e824]: Date must be a Friday
                  - generic [ref=e827]:
                    - generic [ref=e828]: Amount
                    - generic [ref=e829]:
                      - generic [ref=e830]: ₹
                      - textbox "Amount" [active] [ref=e831]:
                        - /placeholder: "0.00"
                        - text: "3000.92"
                  - generic [ref=e832]:
                    - generic [ref=e833]: Notes (optional)
                    - textbox "Notes (optional)" [ref=e834]
                  - generic [ref=e835]:
                    - button "Cancel" [ref=e836]
                    - button "Save" [disabled] [ref=e837]
  - button "Open Next.js Dev Tools" [ref=e847] [cursor=pointer]
  - alert [ref=e851]
```

# Test source

```ts
  20  |   nextFriday.setDate(today.getDate() + daysUntilFriday + weeksFromNow * 7);
  21  |   return nextFriday.toISOString().split("T")[0];
  22  | }
  23  | 
  24  | // Helper: generate a unique future Friday for this test run using timestamp
  25  | // Uses reasonable range (2027-2030) to avoid absurd dates like 2352
  26  | function getUniqueFutureFriday(): string {
  27  |   const timestamp = Date.now();
  28  |   // Base: ~52 weeks * 2 years = 104 weeks from now (early 2028)
  29  |   // Unique component: 0-51 weeks (one year range)
  30  |   const baseOffset = 104;
  31  |   const uniqueWeeks = Math.floor((timestamp % 5200) / 100); // 0-51 extra weeks
  32  |   return getFutureFriday(baseOffset + uniqueWeeks);
  33  | }
  34  | 
  35  | // Helper: create a regex pattern to match the displayed date
  36  | // Since the component uses local timezone formatting, we match on month/year only
  37  | function getDateRegex(dateStr: string): RegExp {
  38  |   const date = new Date(dateStr + "T00:00:00.000Z");
  39  |   const month = date.toLocaleString("en-US", { month: "short" });
  40  |   const year = date.getFullYear();
  41  |   // Match any day in the given month/year (handles timezone differences)
  42  |   return new RegExp(`${month}\\s+${year}`);
  43  | }
  44  | 
  45  | // Helper: create a more specific regex to match the exact displayed date
  46  | // Uses day-of-month range to narrow down
  47  | function getSpecificDateRegex(dateStr: string): RegExp {
  48  |   const date = new Date(dateStr + "T00:00:00.000Z");
  49  |   const month = date.toLocaleString("en-US", { month: "short" });
  50  |   const year = date.getFullYear();
  51  |   const day = date.getDate();
  52  |   // Match the specific day in the month/year (e.g., "13 Jun 2036")
  53  |   return new RegExp(`\\b${day}\\s+${month}\\s+${year}\\b`);
  54  | }
  55  | 
  56  | test.describe("Phase 2C: Jumma Aggregate Collection", () => {
  57  |   test.beforeEach(async ({ page }) => {
  58  |     await page.goto("/collections/jumma");
  59  |     await expect(page.getByRole("heading", { name: "Jumma Collection" })).toBeVisible();
  60  |   });
  61  | 
  62  |   test("should record a Jumma collection for a Friday", async ({ page }) => {
  63  |     // Use a unique date for this test run to avoid conflicts with previous runs
  64  |     const fridayDate = getUniqueFutureFriday();
  65  |     // Use a unique amount to avoid conflicts with existing test data
  66  |     const uniqueAmount = "5000.91";
  67  | 
  68  |     await page.click("text=Record New Jumma");
  69  | 
  70  |     const modal = page.locator('[role="dialog"]');
  71  |     await expect(modal).toBeVisible();
  72  | 
  73  |     await modal.locator('input[id="recordDate"]').fill(fridayDate);
  74  |     await modal.locator('input[id="recordAmount"]').fill(uniqueAmount);
  75  |     await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  76  | 
  77  |     // Click Save - on success the app does window.location.reload()
  78  |     await modal.locator('button:has-text("Save")').click();
  79  | 
  80  |     // Wait for the new record to appear in the list - verify by unique amount
  81  |     await expect(page.locator(`text=${parseFloat(uniqueAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first()).toBeVisible({ timeout: 30000 });
  82  |   });
  83  | 
  84  |   test("should reject Jumma collection for non-Friday date", async ({ page }) => {
  85  |     const fridayDate = getFutureFriday(4);
  86  |     const saturday = new Date(fridayDate + "T00:00:00.000Z");
  87  |     saturday.setDate(saturday.getDate() + 1);
  88  |     const saturdayStr = saturday.toISOString().split("T")[0];
  89  | 
  90  |     await page.click("text=Record New Jumma");
  91  | 
  92  |     const modal = page.locator('[role="dialog"]');
  93  |     await expect(modal).toBeVisible();
  94  | 
  95  |     await modal.locator('input[id="recordDate"]').fill(saturdayStr);
  96  |     await modal.locator('input[id="recordAmount"]').fill("5000.00");
  97  |     await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  98  | 
  99  |     // Client-side validation should show "must be a Friday"
  100 |     await expect(modal.locator("text=must be a Friday")).toBeVisible();
  101 |   });
  102 | 
  103 |   test("should prevent duplicate Jumma collection for same Friday", async ({ page }) => {
  104 |     // Use a unique date for this test run to avoid conflicts with previous runs
  105 |     const fridayDate = getUniqueFutureFriday();
  106 |     // Use unique amounts to avoid conflicts with existing test data
  107 |     const firstAmount = "3000.92";
  108 |     const secondAmount = "4000.92";
  109 | 
  110 |     // Record first
  111 |     await page.click("text=Record New Jumma");
  112 |     let modal = page.locator('[role="dialog"]');
  113 |     await expect(modal).toBeVisible();
  114 | 
  115 |     await modal.locator('input[id="recordDate"]').fill(fridayDate);
  116 |     await modal.locator('input[id="recordAmount"]').fill(firstAmount);
  117 |     await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  118 | 
  119 |     // Click Save - on success the app does window.location.reload()
> 120 |     await modal.locator('button:has-text("Save")').click();
      |                                                    ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  121 |     // Wait for reload by waiting for the new record to appear
  122 |     await expect(page.locator(`text=${parseFloat(firstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).first()).toBeVisible({ timeout: 30000 });
  123 | 
  124 |     // Wait for page to be fully ready after reload
  125 |     await page.waitForLoadState('networkidle');
  126 | 
  127 |     // Try duplicate
  128 |     await page.click("text=Record New Jumma");
  129 |     modal = page.locator('[role="dialog"]');
  130 |     await expect(modal).toBeVisible();
  131 | 
  132 |     await modal.locator('input[id="recordDate"]').fill(fridayDate);
  133 |     await modal.locator('input[id="recordAmount"]').fill(secondAmount);
  134 |     await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  135 |     await modal.locator('button:has-text("Save")').click();
  136 | 
  137 |     // Server returns duplicate error, modal stays open
  138 |     await expect(modal.locator("text=already recorded")).toBeVisible({ timeout: 15000 });
  139 |   });
  140 | 
  141 |   test("should correct a Jumma collection and show audit history", async ({ page }) => {
  142 |     // Use a unique date for this test run to avoid conflicts with previous runs
  143 |     const fridayDate = getUniqueFutureFriday();
  144 |     // Use unique amounts to avoid conflicts with existing test data
  145 |     const initialAmount = "2000.93";
  146 |     const correctedAmount = "2500.93";
  147 | 
  148 |     // Record initial
  149 |     await page.click("text=Record New Jumma");
  150 |     let modal = page.locator('[role="dialog"]');
  151 |     await expect(modal).toBeVisible();
  152 | 
  153 |     await modal.locator('input[id="recordDate"]').fill(fridayDate);
  154 |     await modal.locator('input[id="recordAmount"]').fill(initialAmount);
  155 |     await modal.locator('select[id="recordCollectionDefinitionId"]').selectOption({ index: 1 });
  156 | 
  157 |     await modal.locator('button:has-text("Save")').click();
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
```