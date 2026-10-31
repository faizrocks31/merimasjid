# Architecture

## 1. Shape of the system

A single **Next.js 16 App Router** application. It is a modular monolith: the
browser talks to Server Components, Server Actions and two route handlers; all
authorization and data access happen on the server; there is no separate API
service.

```
Browser (React 19, client components only where interaction requires it)
   │
   ├── Server Components   ── read paths: pages render from Prisma queries
   ├── Server Actions      ── write paths: forms post to "use server" functions
   └── Route Handlers      ── binary/streamed responses: receipt PDF, CSV export
   │
   ▼
Next.js server (Node runtime, single process on the local machine)
   │
   ├── src/lib/auth.ts          session, getCurrentUser, requireStaff
   ├── src/lib/permissions.ts   role → permission matrix
   ├── src/modules/*            one folder per business capability
   └── src/lib/db.ts            Prisma client + better-sqlite3 driver adapter
   │
   ▼
data/masjid.db  (SQLite, WAL-friendly, backed up by copying one file)
```

### Why this shape

- **Server Components by default.** Financial pages are read-heavy and must not
  trust the client; rendering them on the server keeps queries and totals out of
  the bundle.
- **Server Actions for writes.** Each mutation is one typed function with
  `requireStaff()` + `assertCan()` at the top, Zod validation, and a Prisma
  transaction. No hand-written REST layer to keep in sync.
- **Route handlers only where a response is a file.** PDF (`application/pdf`) and
  CSV (`text/csv`) cannot be returned from a Server Action usefully.
- **Modular monolith.** `modules/<capability>` owns its actions and queries;
  pages are thin. Splitting into services would add operational cost with no
  benefit for one local server.

---

## 2. Directory map

```
src/
  app/
    (auth)/login/                  sign-in page + client form
    (dashboard)/                   staff shell (sidebar, mobile nav, header)
      dashboard/  members/  plans/  collections/new/  transactions/
      expenses/   reports/  settings/  staff/  audit/
    (portal)/                      member shell
      portal/  portal/dues/  portal/receipts/  portal/profile/
    receipts/[id]/                 receipt page — shared by staff and members
    api/
      receipts/[id]/pdf/route.ts   authenticated PDF download
      exports/transactions/route.ts authenticated CSV export
    layout.tsx                     <html lang dir>, fonts, locale cookie
    page.tsx                       landing / role-based redirect
  components/
    ui.tsx                         Button, Card, Input, Select, Badge, StatCard…
    layout/                        nav, user-menu, locale-switcher
    receipts/receipt-sheet.tsx     printable receipt (screen + print)
    charts/collection-trend.tsx    Recharts trend
    status-badges.tsx
  modules/
    auth/actions.ts                login, logout
    members/actions.ts             create, update
    plans/actions.ts               create, change amount, generate dues
    payments/actions.ts            create payment, reverse, record reprint
    expenses/actions.ts            create, approve/reject
    settings/actions.ts            masjid settings, categories, staff
    portal/queries.ts              requirePortalMember, portalSummary
    receipts/                      load.ts (ownership), view.ts, pdf.ts
    reports/queries.ts             all report aggregates
    audit/write.ts                 append-only audit helper
  lib/
    db.ts        auth.ts       permissions.ts   validation.ts
    money.ts     dates.ts      dues.ts          constants.ts
    receipts/numbering.ts      form-date.ts     cn.ts
  i18n/          en.ts hi.ts ur.ts index.ts config.ts
prisma/
  schema.prisma  migrations/  seed.ts
assets/fonts/NotoSans.ttf        embedded in the PDF so ₹ renders
tests/                            Vitest unit + DB integration tests
```

---

## 3. Request lifecycle

### Read (a page)

1. `(dashboard)/layout.tsx` calls `getCurrentUser()`; no session → `/login`, a
   member → `/portal`.
2. The page calls `requireStaff()` (or `requirePortalMember()`), which reloads
   the user, their membership and role from the database.
3. Prisma queries are written with `masjidId: user.masjidId` in the `where`
   clause — always from the session, never from the URL or a form field.
4. Server-rendered HTML is streamed to the browser.

### Write (a Server Action)

```
form → Server Action
  ├─ requireStaff()                 session + membership from DB
  ├─ assertCan(role, permission)    server-side authorization
  ├─ Zod schema.safeParse(formData) field-level errors returned to the form
  ├─ cross-tenant reference checks  member / category / period belong to masjidId
  ├─ prisma.$transaction(async tx => { … })   atomic business change
  │     ├─ receipt numbering (read-modify-write on ReceiptSequence)
  │     ├─ payment + allocations + period status recalculation
  │     ├─ receipt event
  │     └─ writeAudit(tx, …)
  ├─ revalidatePath(…)              refresh affected server-rendered pages
  └─ return a typed result          { ok } | { ok:false, error, fieldErrors }
```

---

## 4. Authentication and session

- `jose` HS256 JWT, payload `{ userId, masjidId, role, isPlatformAdmin }`,
  12-hour expiry, signed with `AUTH_SECRET` (≥ 32 chars, enforced at runtime).
- Stored in the `masjid_session` cookie: `httpOnly`, `sameSite=lax`,
  `secure` in production, `path=/`.
- `getCurrentUser()` is the single source of truth. It verifies the JWT, then
  **re-reads the user and membership from the database**. Consequences:
  - disabling a user or changing a role takes effect on the next request;
  - a forged/stale cookie cannot grant a role that is no longer in the database;
  - `masjidId` used by queries is the database membership's id.
- Member-portal accounts have no `MasjidUser` membership; they resolve via
  `Member.userId` and are given `role = MEMBER` and their own `memberId`.
- Throttle: in-memory map keyed by email, 8 failures / 10 minutes. Resets when
  the process restarts, which is acceptable for a single local server.

---

## 5. Tenant isolation

Three independent layers, each sufficient on its own:

1. **Session-derived tenant.** `user.masjidId` comes from `getCurrentUser()`;
   nothing in a URL, form or cookie can change it.
2. **Query scoping.** Every tenant-owned Prisma query includes
   `masjidId: user.masjidId`. Composite unique keys are always
   `[masjidId, …]` so the same human-readable number can exist in two Masjids.
3. **Object-level checks.** Before acting on an id from the request (payment,
   member, plan, period, category, membership), the action does
   `findFirst({ where: { id, masjidId } })` and returns "not found" when the row
   belongs to another tenant. Members additionally must own the payment.

`tests/allocations.test.ts` proves the second layer with a second Masjid; the
scripted smoke test exercises the first and third by requesting another
tenant's ids.

---

## 6. Data access

- Prisma 7 with `@prisma/adapter-better-sqlite3`. The datasource URL lives in
  `prisma.config.ts` (read from `DATABASE_URL`), not in `schema.prisma`.
- A single `PrismaClient` is cached on `globalThis` in development to survive
  hot reloads.
- SQLite serializes writes, so interactive transactions give the atomicity the
  receipt sequence needs. There is exactly one writer process (the Next server),
  which is why an in-process transaction is sufficient.
- Money is `Int` paise; enum-like columns are `TEXT` validated against
  `src/lib/constants.ts`.

---

## 7. Money and dates

**Money.** Every amount is an integer number of paise, end to end:
`parseRupeesToPaise("1,250.50") → 125050`. Formatting happens only at the edge
(`formatPaise`). There is no `Number` division in any stored or aggregated value;
`formatPaise` divides by 100 only to build the display string.

**Dates.** The application timezone is Asia/Kolkata. Instants are stored as
UTC `DateTime`. Business calendar boundaries are computed from IST calendar
parts:

- `parseISODate("2026-04-01")` → `2026-04-01T00:00:00+05:30`;
- `monthPeriod(y, m)` → IST-midnight first-of-month and last-of-month;
- `addMonths` works on IST calendar parts and clamps the day, so
  `31 Jan + 1 month = 28/29 Feb` and never drifts into the wrong month;
- `financialYearLabel` / `financialYearRange` honour the per-Masjid start month.

This matters: an earlier implementation used `setUTCMonth` on an IST-midnight
instant (which is 18:30 UTC the previous day) and silently produced the wrong
number of semi-annual periods. The current helpers are covered by
`tests/dates-dues.test.ts`.

---

## 8. Receipts

**Numbering.** `nextReceiptNumber(tx, masjidId, prefix, date, fyStartMonth)`:

1. compute the FY label from the payment date and the Masjid's start month;
2. read `ReceiptSequence` for `(masjidId, financialYear)`;
3. increment and write it back;
4. format `<prefix>-<FY>-<padded 6>`.

It runs **inside** the payment transaction, so a failure anywhere rolls the
sequence back and no number is burned. Numbers are never reused because the
sequence only moves forward.

**Rendering.** One view model (`buildReceiptView`) is built from persisted rows
only and consumed by both the HTML sheet and the PDF, so the two cannot drift.
A reprint opens `?duplicate=1&print=1`, which passes `duplicate: true` and adds
the "DUPLICATE COPY" marker without touching the number or creating a payment;
`AutoPrint` opens the print dialog on that view. Its PDF download keeps the same
marker and is named `…-duplicate.pdf`.

**PDF.** `pdf-lib` draws an A4 receipt using an embedded subset of NotoSans so
the ₹ glyph exists. Embedding a custom font requires a registered fontkit
instance (`doc.registerFontkit(fontkit)` from `@pdf-lib/fontkit`); without it
`embedFont` throws and every download fails. If the font *file* is missing the
renderer falls back to Helvetica and substitutes "Rs." rather than throwing.
`tests/receipt-pdf.test.ts` decodes the subset's ToUnicode CMap and asserts the
visible text, so a regression in either path fails the suite.

---

## 9. Reports

`src/modules/reports/queries.ts` owns every aggregate:

| Function | Basis |
|---|---|
| `collectionSummary` | gross = all payments in range; reversed = REVERSED in range; net = gross − reversed |
| `expenseSummary` | APPROVED expenses in range |
| `categoryTotals` | allocations of SUCCESS payments, grouped by category |
| `modeTotals` | SUCCESS payments grouped by mode |
| `collectorTotals` | SUCCESS payments grouped by `enteredBy` |
| `outstandingDues` | per period `max(expected − valid allocations, 0)`, summed |
| `pendingDueRows` | same, per period, for the due list |
| `monthlyTrend` | 6 monthly buckets of gross/net/expenses |

Gross intentionally includes reversed rows so the identity
`gross − reversals = net` holds against the transaction register. Category,
mode and collector totals exclude reversed payments (they describe money
actually held).

---

## 10. Internationalization

- `src/i18n/en.ts` is the source of truth; `hi.ts` and `ur.ts` are typed as
  `Dictionary`, so a missing or extra key fails the typecheck.
- `getDictionary()` reads the `masjid_locale` cookie server-side and returns
  `{ locale, t }`. `t` falls back to English.
- `app/layout.tsx` reads the same cookie to set `<html lang dir>`; Urdu sets
  `dir="rtl"`.
- The switcher is a Server Action that sets the cookie and revalidates.
- Layout uses logical properties (`ms-*`, `me-*`, `start-*`, `end-*`,
  `text-start`, `text-end`) so RTL mirrors automatically.
- Fonts are loaded with `next/font` (Geist, Noto Sans Devanagari, Noto Naskh
  Arabic) and exposed as CSS variables.

---

## 11. Runtime configuration

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file URL, e.g. `file:./data/masjid.db` |
| `AUTH_SECRET` | HS256 signing key, ≥ 32 characters |
| `SEED_ADMIN_*`, `SEED_MASJID_NAME` | used only by `npm run seed` |

`next.config.ts` sets `serverExternalPackages` for `better-sqlite3`,
`@prisma/adapter-better-sqlite3` and `pdf-lib` so the native binding and the
embedded font load outside the bundler.

---

## 12. Deployment model (local only)

- `npm run build` then `npm start` on the machine that holds the data, or
  `npm run dev` for day-to-day use.
- One process, one SQLite file. Backups are a file copy.
- HTTPS is not provided by the app; if the server is reachable from other
  devices on a LAN, put a reverse proxy with TLS in front of it and do not
  expose it to the public internet without a security review.
- No cloud services are used or required.

---

## 13. Testing strategy

- **Unit tests** (`tests/money.test.ts`, `tests/dates-dues.test.ts`): money
  parsing/formatting/words, IST month arithmetic, period generation for every
  frequency, financial-year labels.
- **Database integration tests** (`tests/numbering.test.ts`,
  `tests/allocations.test.ts`): receipt sequencing, per-FY separation, no reuse,
  member/expense numbering, period status derivation, reversal exclusion,
  WAIVED preservation, advance allocation, tenant scoping.
- **Setup** (`tests/setup.ts`) copies `data/masjid.db` to
  `data/test-masjid.db` and points `DATABASE_URL` at the copy, so tests never
  mutate real data. Tests run with `fileParallelism: false` because they share
  one SQLite file.
- **Scripted runtime check**: every staff route is fetched with a real signed
  session cookie; expected redirects and status codes are asserted.
- **Manual end-to-end**: documented in `README.md`.

---

## 14. Known architectural limits

- SQLite + one process: horizontal scaling is out of scope by design.
- The login throttle is in memory and resets on restart.
- Attachments/logos have schema fields but no upload pipeline (no object storage
  is configured, deliberately, for a local-only deployment).
- WhatsApp sharing uses the `wa.me` deep link; no provider integration is
  configured, so nothing is sent automatically.
