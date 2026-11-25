# Masjid Collection Management

A **local-first** web application for Masjid committees: members, recurring
contribution plans, dues, cash/UPI collections, numbered receipts (print, PDF,
WhatsApp), expenses, reconciliation reports, a member self-service portal and an
audit trail — in **Hindi, English and Urdu (RTL)**.

> **This application is designed to run on a local server only.** It is not
> configured for Vercel or any cloud host, it uses no managed database, and all
> data lives in a single SQLite file you control: `data/masjid.db`.

Built from `Masjid_Collection_Management_Blueprint_Updated.docx`.

---

## Contents

- [Quick start](#quick-start)
- [Sign-in accounts](#sign-in-accounts)
- [Daily use](#daily-use)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Backup and restore](#backup-and-restore)
- [Deploying on your own server](#deploying-on-your-own-server)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [Project documentation](#project-documentation)

---

## Requirements

- **Node.js 22 or newer** (Next.js 16)
- **npm** (or a compatible package manager)
- Windows, macOS or Linux. The SQLite driver ships prebuilt for all three.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create ./data, generate .env with a secure AUTH_SECRET, run the migration
#    and seed the first Masjid + admin account
npm run setup

# 3. Start the app
npm run dev
```

Open **http://localhost:3000**.

`npm run setup` is idempotent — running it again will not duplicate the Masjid,
the admin or the default categories.

For a production-style local run:

```bash
npm run build
npm start        # http://localhost:3000
```

---

## Sign-in accounts

`npm run setup` reads these from `.env`:

| Role | Email | Password |
|---|---|---|
| Masjid Admin | `SEED_ADMIN_EMAIL` (default `admin@masjid.local`) | `SEED_ADMIN_PASSWORD` (default `ChangeMe123!`) |

**Change the password before real use**, or set `SEED_ADMIN_PASSWORD` in `.env`
before the first `npm run seed`.

### Member portal

Staff create member logins from **Members → Add member** (or **Edit member**):
tick *Create member login* and set an email + password. That member signs in at
the same login page and lands on `/portal`, where they can see only their own
dues, payments and receipts.

To seed a demo member for trying the portal:

```env
SEED_MEMBER_EMAIL="member@masjid.local"
SEED_MEMBER_PASSWORD="MemberPass123!"
SEED_MEMBER_NAME="Demo Member"
```

then run `npm run seed` again. Leave `SEED_MEMBER_EMAIL` empty in a real database.

### Other roles

**Staff** page (Admin only) adds a Collector or Auditor account with its own
email and password. Auditors see everything read-only; Collectors can add
members and record payments but cannot reverse, approve expenses, export or
change settings.

---

## Daily use

### First-time configuration

1. **Settings** — Masjid name, address, phone, email, receipt prefix
   (e.g. `MSA` → `MSA-2026-27-000001`), financial-year start month (April by
   default) and the receipt footer note.
2. **Settings → Contribution categories** — the six defaults (Monthly Chanda,
   Annual Chanda, General Donation, Zakat, Sadaqah, Construction Fund) can be
   extended. Restricted-purpose categories are flagged in reports.
3. **Settings → Expense categories** — defaults: Utilities, Maintenance,
   Salaries, Events, Education, Other.
4. **Staff** — add collectors/auditors.

### The normal flow

```
Member → Contribution plan → Due periods → Payment → Receipt
```

1. **Members → Add member.** A permanent member number (`MAS-000001`) is
   assigned automatically.
2. **Member page → plan.** Choose category, frequency (monthly / semi-annual /
   annual / one-time), amount, start date, due day and grace days. Due periods
   are generated automatically for the next 12 months; **Contribution plans →
   Generate due periods** refreshes them later.
3. **Receive payment.** Select the member (or enter a walk-in donor), enter the
   amount, date, mode and reference, and allocate to one or more due periods.
   Partial payments, advance payments and one payment covering several periods
   are all supported. Saving issues a receipt.
4. **Receipt.** Print, download the PDF, share via WhatsApp, or reprint. The
   reprint opens a marked copy — same receipt number, stamped **DUPLICATE COPY**
   — and its PDF is downloaded as `…-duplicate.pdf`.
5. **Transactions** — search by receipt number, name, member number or
   reference; filter by mode, status and date; export CSV.
6. **Expenses** — record expenses. Collector entries wait for approval; approved
   expenses appear in reports.
7. **Reports** — collection, pending dues, category, payment-mode and
   collector-wise views plus income vs expenses, for any date range.

### Correcting a mistake

Completed payments are **never edited or deleted**. Open the receipt, choose
**Reverse payment**, and give a reason. The original stays visible and marked
reversed, period statuses are recalculated, reports show gross − reversals = net,
and the action is written to the audit log. Then enter the corrected payment as
a new transaction.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run setup` | Create `data/` and `.env`, apply migrations, generate the Prisma client, seed the Masjid/admin/categories |
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm start` | Production build and local server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit + database tests (runs on a copy of the DB) |
| `npm run db:migrate` | Create/apply a migration during development |
| `npm run db:deploy` | Apply existing migrations (production) |
| `npm run db:studio` | Prisma Studio — browse the SQLite file |
| `npm run seed` | Re-run the seed (idempotent) |
| `npm run backup` | Timestamped copy in `backups/`, keeps the newest 14 |

Port 3000 busy? `npm run dev -- -p 3001`.

---

## Configuration

`.env` (created from `.env.example` by `npm run setup`; never commit it):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | `file:./data/masjid.db`. Keep it inside `data/` so backups stay simple |
| `AUTH_SECRET` | yes | Session signing key, **≥ 32 characters**. `npm run setup` generates one |
| `SEED_ADMIN_EMAIL` | seed only | First admin's email |
| `SEED_ADMIN_PASSWORD` | seed only | First admin's password |
| `SEED_ADMIN_NAME` | seed only | First admin's display name |
| `SEED_MASJID_NAME` | seed only | Masjid name used to create/find the tenant |
| `SEED_MEMBER_EMAIL` | optional | Seeds a demo member portal login; leave empty in production |
| `SEED_MEMBER_PASSWORD` | optional | Password for the demo member |
| `SEED_MEMBER_NAME` | seed only | Display name for the demo member |

To rotate the session secret, replace `AUTH_SECRET` and restart; everyone is
signed out.

---

## Backup and restore

Everything is in **one file**: `data/masjid.db`.

### Backup

```bash
npm run backup
```

Writes `backups/masjid-YYYY-MM-DD-HH-mm-ss.db` and keeps the newest 14. The
server should ideally be stopped; a running server is fine between transactions,
but stopping guarantees a clean copy. Copying the file with any file manager
(`Ctrl+C` / `Ctrl+V`) is equally valid.

Also keep a copy of `.env` (it holds `AUTH_SECRET`; without it, every session is
invalidated — but data is not lost).

### Restore

1. Stop the server (`Ctrl+C`).
2. Copy the chosen backup **over** `data/masjid.db`.
3. Delete any stale `data/masjid.db-journal` / `-wal` / `-shm` files if present.
4. Start the server.

### Verify a restore (recommended after setting up backups)

1. Record a payment; note the receipt number.
2. `npm run backup`.
3. Stop the server, move `data/masjid.db` aside, restore the backup.
4. Start the server and confirm the receipt is present and totals match.

### Moving to another machine

Copy the project (excluding `node_modules` and `.next`), copy `data/masjid.db`
and `.env`, then run `npm install && npm run db:deploy && npm start`.

### Starting over

To discard all data and return to a freshly seeded Masjid:

```bash
# stop the server first
rm -rf data/masjid.db data/test-masjid.db
npm run setup
```

`data/` is git-ignored, so nothing in source control is affected.

---

## Deploying on your own server

This app is intended for a machine on your premises (a small PC, a mini server,
or a Raspberry Pi–class device) — not a public web host.

1. Install Node.js 22+.
2. Copy the project, run `npm install`, `npm run setup`.
3. Set `NODE_ENV=production` and give `AUTH_SECRET` a strong random value.
4. `npm run build && npm start`.
5. To reach it from other devices **on the same network**, put a reverse proxy
   with TLS (Caddy, nginx, IIS) in front of port 3000, or use a private VPN.

Do **not** expose the port directly to the public internet. Anyone who can reach
the login page can attempt passwords; the built-in throttle is a speed bump, not
a substitute for network control.

Schedule `npm run backup` (Windows Task Scheduler / cron) and copy `backups/` to
another disk or USB drive.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `AUTH_SECRET is missing or too short` | Set a ≥ 32-character value in `.env` and restart |
| `Unable to open the database file` | `data/` is missing. Run `npm run setup` (it creates the folder and `AUTH_SECRET`) |
| Port 3000 already in use | `npm run dev -- -p 3001` |
| Login says invalid after restoring files | `.env` was replaced and `AUTH_SECRET` changed — sign in again |
| Rupee sign shows as a box in the PDF | `assets/fonts/NotoSans.ttf` is missing; restore it from the repo (without it the PDF falls back to "Rs.") |
| Every PDF download answers 500 | `@pdf-lib/fontkit` is not installed; run `npm install` (the renderer registers it explicitly) |
| Tests fail with "Seed the database first" | Run `npm run setup` before `npm test` |
| Excel shows garbled Hindi/₹ in CSV | Open with **Data → From Text/CSV → UTF-8**; the file is UTF-8 with a BOM |
| "Too many attempts" | Wait 10 minutes or restart the server (the throttle is in memory) |

---

## Known limitations

These are deliberate for a local-first first release; see
`docs/implementation-plan.md` for the priority order.

- **Local only.** No cloud hosting, no multi-server, no automated off-site
  backup. Backups are your responsibility (`npm run backup`).
- **No automatic UPI verification.** UPI reference numbers are recorded and the
  receipt says "Manually recorded" unless staff explicitly mark it verified.
  There is no gateway.
- **No password reset flow.** An admin creates or re-adds an account; members'
  passwords are set at account creation. A reset action is on the roadmap.
- **No logo/attachment upload.** The schema has the fields; there is no upload
  pipeline.
- **Cash session / daily reconciliation screen is not built.** The
  `CashSession` table exists; the dashboard's net movement is *not* a bank
  balance.
- **Report PDF export is not implemented** — reports export as CSV; receipts
  export as PDF.
- **No Playwright end-to-end suite.** Correctness is covered by Vitest unit and
  database tests, a scripted route smoke test, and a documented manual flow.
- **Urdu RTL and phone layouts should be visually confirmed** on the real device
  by a native reader.
- **Subscription/tenant self-service is not built.** A Masjid can be marked
  `SUSPENDED` in the database, which makes payments read-only.

---

## Project documentation

| File | Contents |
|---|---|
| `docs/requirements.md` | Confirmed scope, roles, permission matrix, acceptance criteria |
| `docs/architecture.md` | System shape, request lifecycle, money/date handling, testing |
| `docs/data-model.md` | Every table, constraint and integrity rule |
| `docs/security.md` | Threat model, auth, tenant isolation, financial controls, known gaps |
| `docs/implementation-plan.md` | Phase-by-phase status, verification commands, decisions |
| `Masjid_Collection_Management_Blueprint_Updated.docx` | Original blueprint |

### Tests

```bash
npm test
```

The suite runs against `data/test-masjid.db`, a throwaway copy of your database,
so real data is never touched.

| File | Covers |
|---|---|
| `tests/money.test.ts` | Paise parsing/formatting, Indian numbering in words |
| `tests/dates-dues.test.ts` | IST month arithmetic, period generation for every frequency, financial years |
| `tests/numbering.test.ts` | Receipt sequences per Masjid + FY, no reuse, member/expense numbers |
| `tests/allocations.test.ts` | Period status (paid/partial/pending/waived), reversals excluded, advance allocation, tenant isolation |
| `tests/receipt-pdf.test.ts` | Receipt PDF contents: number, ₹, per-purpose lines, DUPLICATE COPY, CANCELLED + reason |

The PDF tests decode the embedded font's ToUnicode CMap and assert the *visible*
text, so a receipt that renders a placeholder box instead of ₹ fails the suite.

---

## A short walkthrough

1. Sign in as the admin.
2. **Members → Add member** — name and phone. Note the member number.
3. Open the member → **Add plan** — Monthly Chanda, ₹500, start this month.
4. **Receive payment** — pick the member, ₹500, Cash, allocate to this month's
   period, save.
5. Print / download the receipt. Note the receipt number.
6. **Reprint** it — an opened window prints the same number stamped "DUPLICATE
   COPY"; the original stays unmarked.
7. **Reports** — the amount appears in gross, net and category totals.
8. Open the receipt → **Reverse payment** with a reason. The original stays,
   marked reversed; net drops; the report shows gross and reversals.
9. **Audit log** — both the payment and the reversal are listed.
10. Sign in as a member (created with a portal login) — they see only their own
    dues, payments and receipts.
