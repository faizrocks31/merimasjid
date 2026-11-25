# Migration Correction Plan

**Date:** 2026-10-25
**Status:** PLANNING ONLY — No changes executed
**Scope:** Phase 2 Financial Integrity – Migration safety correction

---

## Executive Summary

The test database passes all 149 tests and records four migrations as applied. The baseline migration (`20261022000000_postgres_baseline`) contains a malformed `Payment.status` default (`DEFAULT 'SUCCESS` missing the closing quote). This would cause a fresh `prisma migrate deploy` to fail, but the test DB currently works, suggesting the default may already be correct at runtime. Two migrations that look similar actually create **different** sequence tables:

* `20261022170257_add_expense_sequence` creates **MemberSequence**.
* `20261023000000_add_expense_sequence` creates **ExpenseSequence**.

Thus the migrations are **not redundant**; they serve distinct purposes.

---

## A. Forward‑Only Correction for Existing Databases

### A.1 Conditional Need for a Migration

Before applying any schema change we must **verify the current default** in the target database (test, staging, or production) **read‑only**:

```sql
SELECT column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Payment'
  AND column_name = 'status';
```

* If the result is `'SUCCESS'::text` the default is already correct – **no migration is required**.
* If the result is `NULL` or a malformed value, a forward‑only migration is needed.

### A.2 Proposed Forward‑Only Migration (if needed)

```sql
-- 20261026000000_fix_payment_status_default/migration.sql
-- Safe metadata‑only fix for the Payment.status default.
-- Runs only after the verification query above indicates the default is incorrect.
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'SUCCESS';
```

* **Idempotent** – succeeds whether the default is already `'SUCCESS'` or not.
* **Metadata‑only** – does not modify any row data.
* **Rollback limitation** – Prisma can mark the migration as rolled‑back, but the actual SQL must be undone manually (`ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT`). This limitation is documented in Section E.

---

## B. Fresh‑Install Strategy: Supported Approaches

### B.1 The Core Problem

The repository contains four existing migrations in `prisma/migrations/`:
1. `20261022000000_postgres_baseline` (malformed)
2. `20261022170257_add_expense_sequence` (creates `MemberSequence`)
3. `20261023000000_add_expense_sequence` (creates `ExpenseSequence`)
4. `20261025000000_add_idempotency_keys`

**Prisma Migrate requires a single, linear migration history per project.** The `prisma.config.ts` sets `migrations.path = "prisma/migrations"` and there is **no supported `--migrations` flag** on `prisma migrate deploy` to switch directories.

If we generate a clean baseline and apply it to a fresh database, then run `prisma migrate deploy`, Prisma will:
1. See all four existing migrations in the folder
2. Attempt to apply them in order (after any we mark as applied via `migrate resolve`)
3. **Fail with duplicate-object errors** because the clean baseline already created all tables

### B.2 What Does NOT Work (Corrected)

| Proposed Approach | Why It Fails |
|-------------------|--------------|
| Apply clean baseline, `migrate resolve --applied 20261022000000_postgres_baseline`, then `migrate deploy` | Remaining 3 migrations in the folder will still be applied → duplicate table errors |
| Use `prisma migrate deploy --migrations=...` | **Flag does not exist** in Prisma 7 |
| Keep both histories in same folder with different names | Prisma applies all migrations in timestamp order; cannot selectively skip |

### B.3 Supported & Verified Approaches for Fresh Installs

Given the current project structure (single `prisma/migrations` directory, Prisma 7 config), the **only supported workflows** are:

#### Option 1: `prisma db push` for Fresh Installs (Initial Schema Only)

```bash
# For a brand-new database:
npx prisma db push
```

* Creates the schema directly from `prisma/schema.prisma` — no migration history involved
* Includes correct `Payment.status DEFAULT 'SUCCESS'`
* Creates both `MemberSequence` and `ExpenseSequence` tables
* **Does not touch `_prisma_migrations`** — fresh install starts with **empty migration history**

**Critical limitation:** After `db push`, a subsequent `prisma migrate deploy` **will attempt to apply all four existing migrations** because they exist in the migrations folder and are not recorded as applied in `_prisma_migrations`. This **will fail with duplicate-object errors** (tables already exist).

Therefore **`db push` is an initial schema-creation method only**. It does **not** provide a safe transition to `migrate deploy` for future schema changes under the current repository structure.

#### Option 2: Full Migration History Reset (Breaks Existing Databases)

```bash
# WARNING: This breaks all existing databases!
# 1. Delete all folders in prisma/migrations/
# 2. Generate clean baseline:
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script --output prisma/migrations/20261022000000_postgres_baseline_clean/migration.sql
# 3. On existing DBs: must manually reconcile or reset
```

**Not recommended** because it invalidates the migration history for test/staging/production databases.

#### Option 3: Separate Prisma Config for Greenfield (Advanced)

Create a separate `prisma.config.greenfield.ts` pointing to a different migrations directory (e.g., `prisma/migrations-greenfield/`). This requires:
* Maintaining two Prisma configs
* Building/deploying with the correct config
* Future migrations must be added to **both** directories

**Not currently implemented** in this repo. Would require team approval and infrastructure changes.

### B.4 Recommended Strategy for This Project

**Use Option 1 (`prisma db push`) for fresh installations ONLY as an initial schema creation.** This is:
* Supported by Prisma 7
* Requires no migration directory changes
* Does not conflict with existing migration history
* Produces a correct schema on empty databases

**Important:** After `db push`, the fresh database has **no migration history**. The team **must decide on a long-term migration strategy** before relying on migrations for future schema changes on that database. The options are:
* Accept that this database will not use migration history (future changes via `db push` or manual SQL)
* Implement Option 3 (separate Prisma config with its own migration directory)
* Accept a migration history reset (Option 2) — **not feasible** if other databases use the current history

**For existing installations:** Continue using `npm run db:deploy` (`prisma migrate deploy`). The forward‑only fix (if needed) will be added as migration #5.

---

## B.5 Selecting the Correct Workflow

The team must decide, per deployment, which path to follow:

* **Existing installation** – run `npm run db:deploy` (`prisma migrate deploy`). The forward‑only migration (if needed) will be applied as the next migration.
* **Fresh installation** – run `npx prisma db push` to create the schema, then `npx prisma generate`. **No safe migration-history transition exists yet.** The team must explicitly choose a long-term strategy (Option 3 or manual management) before subsequent schema changes.

If the team wants a migration history on fresh installs from day one, they must implement **Option 3** (separate Prisma config) — currently **unresolved** and requires explicit team decision and implementation.

---

## C. Validation Plan

### C.1 Fresh‑Installation Test (Disposable DB)

1. Create a temporary PostgreSQL database.
2. Run `npx prisma db push` against it.
3. Verify the schema matches `prisma/schema.prisma` (including correct `Payment.status` default).
4. **Test the transition risk:** Attempt `npx prisma migrate deploy` and confirm it fails with duplicate-object errors on the existing migrations. This validates the documented limitation.
5. Run the full test suite (`npm test`) against the `db push` schema.
6. Drop the temporary database.

### C.2 Existing‑Database Verification (Non‑Destructive)

1. Run the **read‑only** verification query for `Payment.status` (see A.1).
2. List migration records:
   ```sql
   SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name;
   ```
3. Run the full test suite (`npm test`).

### C.3 TypeScript & Build Checks

* `npx tsc --noEmit`
* `npm run lint`
* `npm run build`

All must pass before any migration is executed.

### C.4 ExpenseSequence‑Related Migrations – Comparison

| Migration | File | Object Created | Purpose |
|----------|------|----------------|---------|
| `20261022170257_add_expense_sequence` | `prisma/migrations/20261022170257_add_expense_sequence/migration.sql` | **MemberSequence** table (stores per‑masjid sequential numbers for members) | Provides per‑masjid member numbering.
| `20261023000000_add_expense_sequence` | `prisma/migrations/20261023000000_add_expense_sequence/migration.sql` | **ExpenseSequence** table (stores per‑masjid fiscal‑year expense numbers) | Provides per‑masjid expense numbering.

Both migrations are required and must be retained in history. A clean baseline (if ever generated) would include each table exactly once.

---

## D. Deliverables

### D.1 Updated Documentation
* This revised `MIGRATION_CORRECTION_PLAN.md` (no other files changed).
* Optional `docs/migration‑strategy.md` can be created later to codify the selection process.

### D.2 No File Changes Beyond This Document
* No migration SQL files were created, deleted, or modified.
* No application code was altered.

### D.3 Existing‑Database Compatibility Analysis

| Check | Result |
|-------|--------|
| Forward‑only migration runs on existing DBs (if needed) | ✅ Metadata‑only, idempotent.
| No data loss | ✅ `ALTER COLUMN SET DEFAULT` touches only metadata.
| Prisma tracking | ✅ New migration will be recorded as `20261026000000_fix_payment_status_default`.
| Rollback limitation | ⚠️ Prisma can mark the migration as rolled‑back, but the SQL must be undone manually (`DROP DEFAULT`).

### D.4 Fresh‑Install Compatibility Analysis

| Check | Result |
|-------|--------|
| `prisma db push` applies to an empty DB | ✅ Supported by Prisma 7; creates correct schema from Prisma model.
| Includes both sequence tables correctly | ✅ Defined in `schema.prisma`.
| Does not conflict with existing history | ✅ `db push` does not use `_prisma_migrations`.
| Subsequent `migrate deploy` | ⚠️ **Will fail** — existing migrations not marked applied; duplicate-object errors expected.
| Future migrations can be added | ❓ **No safe transition** under current structure; requires team decision (Option 3 or manual).

---

## D.5 Test & Approval Sequence

1. **Verification Gate** – Run the read‑only `column_default` query on target DBs. Approve forward‑only migration only if the default is incorrect.
2. **Fresh‑Install Test Gate** – Execute steps in C.1 on a disposable DB using `prisma db push`; schema must be correct; `migrate deploy` must be confirmed to fail as documented.
3. **Existing‑DB Test Gate** – Execute steps in C.2; all tests must pass.
4. **Strategy Decision Gate** – Team explicitly decides on long-term migration strategy for fresh installs (Option 3 or other).
5. **Final Approval** – Team signs off on the forward‑only migration (if needed) and the chosen fresh‑install workflow.

---

## E. Risks & Assumptions

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Production DB has a different migration history than test DB | Medium | Verify production `_prisma_migrations` read‑only before any migration.
| Team wants migration history on fresh installs from day one | Medium | Implement Option 3 (separate Prisma config) — currently unresolved; requires infrastructure changes.
| `prisma db push` drift from migration history | High | **Documented:** `db push` does not create migration history; `migrate deploy` will fail afterward.
| Forward‑only migration applied unnecessarily (default already correct) | Low | Conditional verification step prevents it.
| Confusion over two workflows | Medium | Document clearly: `db push` for new (initial schema only), `migrate deploy` for existing.

**Assumptions (currently unverified):**
1. No production data exists yet (Phase 2 pre‑launch).
2. Test DB schema matches production schema.
3. The only defect in the baseline is the `Payment.status` default.
4. The team can coordinate a migration window for the forward‑only fix if needed.
5. No safe migration-history transition from `db push` to `migrate deploy` exists without implementing Option 3.

---

## Approval Checklist

- [ ] Confirm the conditional verification query for `Payment.status`.
- [ ] Approve keeping all existing migration folders unchanged.
- [ ] Acknowledge that `prisma db push` is **initial schema creation only** and does **not** enable safe subsequent `migrate deploy` without additional work (Option 3).
- [ ] Review the MemberSequence vs. ExpenseSequence comparison.
- [ ] Review the rollback limitation note.
- [ ] Provide explicit “go” to create the forward‑only migration (if needed).
- [ ] Team decides on long-term migration strategy for fresh installations.

---

**Next Step:** Await explicit approval to proceed with the conditional forward‑only migration (if required) and team decision on the fresh‑install migration strategy.