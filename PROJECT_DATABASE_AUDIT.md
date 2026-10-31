# PROJECT_DATABASE_AUDIT.md

## 1. Executive Summary

This audit examined the database layer of the Masjid Collection application (Next.js 16, Prisma 7.10.1, SQLite via `@prisma/adapter-better-sqlite3`). The database file lives at `file:./data/masjid.db` (fallback URL hardcoded in `src/lib/db.ts:3`).

**Scope:** 22 Prisma models, 3 migration files, all server actions, query modules, and existing tests. The audit is **read-only** — no code, schema, migration, or test modifications were made.

**Key findings at a glance:**
- **5 CRITICAL** — Migration history is broken (PostgreSQL-only ENUM statements in the init migration; no-op second migration; third migration failed then re-applied after tables already existed). `nextExpenseNumber` count-based numbering collides under concurrency. `nextMemberNumber` uses lexicographic string sort (breaks at 1M members) and has no counter table.
- **7 HIGH** — `PaymentAllocation` has no unique constraint (duplicate allocations possible). `CollectionEventAssignment` lacks `masjidId` (no tenant scoping at DB level). `generateDuesPeriods` runs outside any transaction with blanket `catch {}`. `createPaymentAction` validates cross-tenant references outside the transaction (TOCTOU). `Masjid.receiptPrefix` lacks unique constraint. No DB-level CHECK constraints on monetary columns. `AuditLog.masjidId` FK cascade deletes the audit trail when a masjid is deleted.
- **10 MEDIUM** — `ContributionPlan` lacks unique on `(memberId, categoryId)` and has no optimistic locking. `Member.telegramChatId` is globally unique instead of per-masjid. `Reversal.reversalPaymentId` is `@unique` but never written by app code. `CashSession` and `NotificationLog` are dead models. `PaymentAllocation.masjidId` is redundant and unconstrained. `Expense` self-approval by ADMIN. `removeHouseholdAssignmentAction` never recomputes event status. `recomputeEventStatus` can downgrade COMPLETED → OPEN.
- **5 LOW** — Boolean flags stored as `Int` (1/0). `PlanAmountHistory.changedBy` lacks FK. `MasjidUser` FKs both `onDelete: Cascade`. `Subscription` model has no enforcement code. `schedulingRules` column unused.
- **3 INFORMATIONAL** — Prisma enums absent (all status fields are `String`). `prisma/seed.ts` hardcodes SUPER_ADMIN credentials. `scripts/backup.mjs` does raw file copy with no restore script, encryption, or `VACUUM INTO`.

**Confidence:** Every finding cites exact file paths and line numbers verified against the live repository. Database-enforced constraints are distinguished from application-only checks.

---

## 2. Scope and Methodology

### 2.1 Documents and Code Inspected
| Category | Files (read in full unless noted) |
|---|---|
| Schema | `prisma/schema.prisma` (448 lines) |
| Migrations | `prisma/migrations/migration_lock.toml`; `prisma/migrations/20261019092355_init/migration.sql` (422 lines); `prisma/migrations/20261020083135_add_masjid_user_status/migration.sql` (4 lines); `prisma/migrations/20261021140500_add_collection_events/migration.sql` (58 lines) |
| Database client | `src/lib/db.ts` (23 lines) |
| Numbering logic | `src/lib/receipts/numbering.ts` (71 lines) |
| Dues/collections core | `src/lib/dues.ts` (252 lines) |
| Reports queries | `src/modules/reports/queries.ts` (261 lines) |
| Server actions (all) | `src/modules/auth/actions.ts`, `src/modules/collections/actions.ts`, `src/modules/expenses/actions.ts`, `src/modules/members/actions.ts`, `src/modules/payments/actions.ts`, `src/modules/plans/actions.ts`, `src/modules/platform/actions.ts`, `src/modules/settings/actions.ts`, `src/modules/staff/actions.ts`, `src/modules/portal/actions.ts`, `src/modules/audit/write.ts` |
| Auth & permissions | `src/lib/auth.ts` (188 lines), `src/lib/permissions.ts` (45 lines) |
| Validation schemas | `src/lib/validation-registry.ts` (722 lines) |
| Seed & scripts | `prisma/seed.ts` (237 lines), `scripts/backup.mjs` (41 lines), `scripts/prepare.mjs` (38 lines) |
| Tests executed | `npm test -- --run` → **8 test files, 64 tests passed** (allocations 7, numbering 4, dates-dues 9, money 5, receipt-pdf 7, server-actions 2, staff-validation 20, validation-registry 10) |
| Test setup | `tests/setup.ts` (18 lines), `vitest.config.ts` (20 lines) |
| E2E (read only) | `e2e/browser-verification.spec.ts`, `e2e/global-setup.ts` |
| Live DB inspection | Read-only queries against `data/masjid.db` via `better-sqlite3` (schema, migrations table, FK lists) |
| Prior audits (for contradiction tracking) | `PROJECT_VERIFICATION_AUDIT.md`, `PROJECT_ARCHITECTURE_AUDIT.md`, `FEATURE_STATUS_MATRIX.md`, `PROJECT_SECURITY_AUDIT.md`, `docs/security.md` |

### 2.2 Methodology
1. **Schema-first analysis** — every model, field, relation, index, and constraint read from `schema.prisma` and cross-checked against live SQLite `sqlite_master` and `PRAGMA foreign_key_list`.
2. **Migration replay** — each migration file executed against a throwaway SQLite database to confirm which statements actually run. The init migration fails on statement 1 (`CREATE TYPE ... AS ENUM` is PostgreSQL-only).
3. **Transaction boundary tracing** — every `$transaction` call inspected; operations outside transactions flagged.
4. **Concurrency analysis** — numbering functions, allocation checks, and status recomputations examined for TOCTOU and race conditions.
5. **Tenant isolation verification** — `masjidId` presence on every tenant-owned model, composite unique keys including `masjidId`, query scoping in actions, and cross-tenant reference checks.
6. **Financial integrity checks** — monetary types, allocation sums, receipt numbering, idempotency, reversal relationships, referential integrity.
7. **Test coverage mapping** — existing unit tests inspected for DB-writing tests (only `tests/allocations.test.ts` writes to DB) and gaps identified.
8. **Prior-audit cross-check** — every database-related claim in earlier audits verified against actual source; contradictions explicitly documented.

### 2.3 Limitations
- No migration was **run** (read-only rule). Migration replay used a throwaway file; the production DB was not modified.
- No backup/restore was performed. `scripts/backup.mjs` was read only.
- E2E tests were not executed (requires running server).
- `docs/security.md` claims were verified against code; several claims in it are **not implemented** (e.g., SMTP notifications, email channels).

---

## 3. Verified Database Technology and Configuration

| Aspect | Detail | Source |
|---|---|---|
| **ORM** | Prisma 7.10.1 | `package.json` |
| **Driver adapter** | `@prisma/adapter-better-sqlite3` | `src/lib/db.ts:2-3` |
| **Datasource provider** | `sqlite` | `prisma/schema.prisma:3` |
| **Datasource URL** | **No `url` in schema**; supplied at runtime via `DATABASE_URL` env or fallback `file:./data/masjid.db` | `prisma/schema.prisma:1-5`, `src/lib/db.ts:3` |
| **Migration lock** | `provider = "sqlite"` | `prisma/migrations/migration_lock.toml` |
| **Database file** | `data/masjid.db` (1.1 MB) | Live inspection |
| **Test database** | `data/test-masjid.db` (copy created per test run by `tests/setup.ts:9-16`) | `tests/setup.ts` |
| **Prisma enums** | **Zero** — all status/role/frequency fields are `String` | `schema.prisma` (no `enum` blocks) |
| **Monetary type** | `Int` = paise (1/100 INR) throughout | `schema.prisma`, `validation-registry.ts:58` |
| **Timezone** | `Asia/Kolkata` default on `Masjid`, `Member` | `schema.prisma:17, 102` |
| **Financial year** | April start (`financialYearStartMonth` default 4) | `schema.prisma:19` |
| **Cascade conventions** | Most tenant-owned models: `masjid` FK `onDelete: Cascade` | `schema.prisma` (see §5) |

---

## 4. Complete Model Inventory

22 models defined in `prisma/schema.prisma` (not 23, not 48 — earlier audits were wrong):

| # | Model | PK | Tenant-owned? (`masjidId`) | Notable fields / constraints |
|---|---|---|---|---|
| 1 | `Masjid` | `id` | **No** (platform) | `slug @unique` global; `receiptPrefix` **no unique**; `status` default `ACTIVE` |
| 2 | `User` | `id` | **No** (platform) | `email @unique` global; `status` default `ACTIVE`; `passwordHash` |
| 3 | `MasjidUser` | `id` | **Yes** | `@@unique([masjidId,userId])`; both FKs `onDelete: Cascade`; `status` default `ACTIVE` |
| 4 | `Member` | `id` | **Yes** | `@@unique([masjidId,memberNo])`; `telegramChatId @unique` **global**; notify flags `Int` (1/0) |
| 5 | `ContributionCategory` | `id` | **Yes** | `@@unique([masjidId,code])`; `restrictedPurpose Boolean`; `schedulingRules` unused |
| 6 | `ContributionPlan` | `id` | **Yes** | `@@index([masjidId,memberId])`, `@@index([masjidId,status])`; **no unique on (memberId,categoryId)**; `category` FK `onDelete: Restrict` |
| 7 | `PlanAmountHistory` | `id` | **Yes** (via `plan`) | `@@index([planId,effectiveFrom])`; `changedBy String?` **no FK** |
| 8 | `DuesPeriod` | `id` | **Yes** (redundant) | `@@unique([planId,periodStart,periodEnd])`; redundant `masjidId` + `memberId`; all 3 FKs Cascade |
| 9 | `CollectionEvent` | `id` | **Yes** | `@@index([masjidId,categoryId,status])`, `@@index([masjidId,dueDate])`; `expectedAmountPaise Int?` nullable |
| 10 | `CollectionEventAssignment` | `id` | **No** (MISSING) | `@@unique([eventId,memberId])`; **no `masjidId` column** |
| 11 | `Payment` | `id` | **Yes** | `@@unique([masjidId,receiptNo])`, `@@unique([masjidId,idempotencyKey])` (nullable col in unique); `donorMember` FK SetNull; `enteredBy` FK Restrict |
| 12 | `PaymentAllocation` | `id` | **Yes** (redundant, unconstrained) | **No `@@unique` at all**; `@@index([masjidId,paymentId])`, `@@index([duesPeriodId])`, `@@index([collectionEventId])`; `category` FK Restrict; `duesPeriod` FK SetNull; `collectionEvent` FK SetNull |
| 13 | `ReceiptEvent` | `id` | **Yes** | `@@index([masjidId,paymentId])`; `actor` FK Restrict |
| 14 | `ReceiptSequence` | `id` | **Yes** | `@@unique([masjidId,financialYear])`; `lastNumber Int @default(0)` |
| 15 | `ExpenseCategory` | `id` | **Yes** | `@@unique([masjidId,name])` |
| 16 | `Expense` | `id` | **Yes** | `@@unique([masjidId,expenseNo])`; `category` FK Restrict; `enteredBy` FK Restrict; `attachmentUrl String?` (no upload code) |
| 17 | `Reversal` | `id` | **Yes** | `originalPaymentId @unique`; `reversalPaymentId? @unique` (never used); `@@index([masjidId])` |
| 18 | `CashSession` | `id` | **Yes** | `@@index([masjidId,status])`; `collectorId String` **no FK**; **never referenced by app code** |
| 19 | `AuditLog` | `id` | **Yes** (nullable FK) | `masjidId String?` nullable FK `onDelete: Cascade`; `actorUserId` nullable FK SetNull; `@@index([masjidId,createdAt])`, `@@index([masjidId,entityType,entityId])` |
| 20 | `Subscription` | `id` | **Yes** | `@@index([masjidId])`; no enforcement code |
| 21 | `NotificationLog` | `id` | **Yes** | `@@index([masjidId,createdAt])`; **no code writes to it** |
| 22 | `MasjidNotificationSettings` | `id` | **Yes** | `masjidId @unique`; `onDelete: Cascade` |

---

## 5. Schema and Relationship Findings

### DB-001 — CRITICAL — Init migration contains PostgreSQL-only `CREATE TYPE ... AS ENUM` statements
- **File:** `prisma/migrations/20261019092355_init/migration.sql:1-11`
- **Evidence:** Lines 1-11 declare `CREATE TYPE "Frequency" AS ENUM (...)`, `CollectionMode`, `EventStatus`, `AssignmentStatus`. SQLite does not support `CREATE TYPE ... AS ENUM`. Migration replay against empty SQLite fails on statement 1 with `near "TYPE": syntax error`.
- **Impact:** The migration **cannot apply to a fresh SQLite database**. The current `data/masjid.db` exists only because it was created by some other means (likely `prisma db push` or manual creation), not by running this migration.
- **Conditions:** Fresh checkout → `npm run setup` → `prisma migrate deploy` would fail.
- **Confidence:** CONFIRMED (migration replay proves it).
- **Remediation:** Replace ENUM statements with `String` columns + CHECK constraints (SQLite 3.38+ supports `CHECK`), or remove ENUMs entirely since Prisma schema uses `String`. Generate a new baseline migration.
- **Regression test:** CI step: `prisma migrate deploy` against empty SQLite must succeed.
- **Dependencies:** DB-002, DB-003.

### DB-002 — CRITICAL — Second migration is a no-op (`SELECT 1;`); `User.status` and `MasjidUser.status` columns exist in DB but are not represented by any real migration
- **File:** `prisma/migrations/20261020083135_add_masjid_user_status/migration.sql` (4 lines)
- **Evidence:** File contains only comments and `SELECT 1;`. Live DB has `status` columns on both tables (confirmed by `sqlite_master` DDL). `_prisma_migrations` records this migration as applied (finished_at=1792485095737).
- **Impact:** Schema drift — the migration history does not represent how the schema actually evolved. Rolling back or reproducing the DB from migrations is impossible.
- **Conditions:** Any environment trying to reconstruct from migration history.
- **Confidence:** CONFIRMED.
- **Remediation:** Create a proper migration adding the `status` columns with defaults, or baseline the database and mark the no-op as rolled back.
- **Regression test:** `prisma migrate diff` from empty to current schema should produce valid SQL.
- **Dependencies:** DB-001.

### DB-003 — CRITICAL — Third migration failed then re-applied; it re-adds `ContributionCategory.defaultGraceDays` (already in init) and adds `PaymentAllocation.collectionEventId` **without a foreign key** (contradicts `schema.prisma:288` which declares `onDelete: SetNull`)
- **Files:** `prisma/migrations/20261021140500_add_collection_events/migration.sql:42, 45`; `prisma/schema.prisma:288`
- **Evidence:** Migration log shows first attempt rolled back (`rolled_back_at=1792579762722`), second attempt succeeded (`finished_at="2026-10-21 10:47:14"`). Init migration line 88 already created `defaultGraceDays`; collection-events migration line 42 tries to add it again → would fail "duplicate column name" on a fresh DB. Line 45 adds `collectionEventId` as plain `TEXT` with **no FK**, but `schema.prisma:288` declares `@relation(fields: [collectionEventId], references: [id], onDelete: SetNull)`.
- **Impact:** Fresh migration deploy fails. Live DB has the column but **no FK constraint** on `PaymentAllocation.collectionEventId` (confirmed by `PRAGMA foreign_key_list(PaymentAllocation)` — only 4 FKs: category, duesPeriod, payment, masjid).
- **Conditions:** Fresh DB deploy; referential integrity for `collectionEventId` not enforced by DB.
- **Confidence:** CONFIRMED (migration log + live FK list).
- **Remediation:** Fix migration: remove duplicate `ADD COLUMN defaultGraceDays`; add proper FK for `collectionEventId`. Generate corrected migration.
- **Regression test:** `prisma migrate deploy` on empty DB succeeds; `PRAGMA foreign_key_list(PaymentAllocation)` shows 5 FKs.
- **Dependencies:** DB-001.

### DB-004 — HIGH — `PaymentAllocation` has **no `@@unique` constraint at all** — duplicate allocations for the same payment/category/period/event are DB-allowed
- **File:** `prisma/schema.prisma:276-295`
- **Evidence:** Model defines three `@@index` but zero `@@unique`. App-level check in `payments/actions.ts:73-76` validates `allocationTotal > amountPaise` **before the transaction opens** (TOCTOU — see DB-022), but nothing prevents two concurrent requests creating allocations for the same `paymentId` + `categoryId` + `duesPeriodId`.
- **Impact:** Duplicate allocation rows can exist, breaking financial reports (`reports/queries.ts:121` groups by category assuming one row per category per payment).
- **Conditions:** Concurrent payment creation for same donor/category/period.
- **Confidence:** CONFIRMED (schema + live DB has no unique index on allocation).
- **Remediation:** Add `@@unique([paymentId, categoryId, duesPeriodId, collectionEventId])` (nullable columns need partial unique index; consider a synthetic key or required `collectionEventId`/`duesPeriodId` with sentinel).
- **Regression test:** Concurrent insert test — two transactions inserting allocation for same payment+category+period should fail one.

### DB-005 — HIGH — `CollectionEventAssignment` **lacks `masjidId`** — no tenant scoping at DB level; isolation relies entirely on app-level checks in `collections/actions.ts:248-254`
- **File:** `prisma/schema.prisma:229-242`
- **Evidence:** Model has `eventId`, `memberId`, `expectedAmountPaise`, `status`. No `masjidId`. `@@unique([eventId,memberId])` and `@@index([memberId,status])`. `CollectionEvent` has `masjidId`, but the assignment table has no direct tenant column.
- **Impact:** Cross-tenant assignment possible if app check is bypassed or buggy. `deleteCollectionEventAction` blocks deletion when assignments exist (app-level), but DB cascade from `CollectionEvent` → `CollectionEventAssignment` is the only protection.
- **Conditions:** Bug in `assignHouseholdsAction` tenant validation; direct DB access.
- **Confidence:** CONFIRMED.
- **Remediation:** Add `masjidId String` + `@@unique([masjidId, eventId, memberId])` + FK to `Masjid` Cascade. Backfill from `event.masjidId`.
- **Regression test:** Attempt to insert assignment for event in masjid A with member from masjid B → should fail FK/unique.

### DB-006 — HIGH — `Masjid.receiptPrefix` has **no unique constraint** — two masjids could have the same prefix, breaking receipt numbering uniqueness scope
- **File:** `prisma/schema.prisma:20`
- **Evidence:** `receiptPrefix String @default("MSA")` — no `@unique`, no `@@unique([receiptPrefix])`. `platform/actions.ts:244-245` checks duplicate in app code only (`findFirst` on slug and receiptPrefix).
- **Impact:** Two masjids with same prefix → receipt numbers collide in reporting/exports; `ReceiptSequence` unique on `(masjidId, financialYear)` prevents collision per-masjid but cross-masjid reporting would be ambiguous.
- **Conditions:** Platform admin creates two masjids with same prefix.
- **Confidence:** CONFIRMED.
- **Remediation:** Add `@@unique([receiptPrefix])` to `Masjid` (global unique) or document that prefix uniqueness is app-enforced only.
- **Regression test:** Create two masjids with same prefix via platform API → second should fail.

### DB-007 — HIGH — No DB-level CHECK constraints on monetary columns (`amountPaise`, `allocatedAmountPaise`, `expectedAmountPaise`, etc.) — all are bare `Int` allowing negative or zero
- **Files:** `prisma/schema.prisma` (all `Int` fields); `validation-registry.ts:58` (`amount: { min: 1 }`) is app-only
- **Evidence:** SQLite supports `CHECK` constraints since 3.38.0. None are used in migrations or schema. App validation via Zod (`amountPaise: z.number().int().positive()`) runs before transaction but can be bypassed.
- **Impact:** Direct DB writes or bugs could insert negative amounts, breaking aggregates (`reports/queries.ts` sums).
- **Conditions:** Any write path not using the validated server actions.
- **Confidence:** CONFIRMED (live DDL shows no CHECK constraints).
- **Remediation:** Add `CHECK (amountPaise > 0)` etc. via raw SQL in a migration (Prisma does not model CHECK).
- **Regression test:** Direct SQL `INSERT` with negative amount → should fail.

### DB-030 — HIGH — `AuditLog.masjidId` FK is `onDelete: Cascade` — deleting a masjid destroys its audit trail
- **File:** `prisma/schema.prisma:391-407`; confirmed in live DDL: `CONSTRAINT "AuditLog_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE`
- **Evidence:** `AuditLog.masjidId String?` is nullable yet carries a `CASCADE` FK to `Masjid`. `deleteMasjidAction` (`src/modules/platform/actions.ts:71-95`) deletes the `Masjid` row; the cascade removes every `AuditLog` row for that tenant — the only record of who did what, including the platform admin's own deletion.
- **Impact:** Irrecoverable loss of the financial audit trail for a tenant, exactly when it matters (tenant offboarding, dispute). Contradicts `docs/security.md:135-140` ("append-only … a committed change cannot lack one") and §11 of that document's own table, which claims audit rows are never deleted.
- **Conditions:** Platform admin deletes a masjid via the platform console. `deleteMasjidAction` only blocks when members or payments exist — a masjid with audit rows but no members/payments is deleted outright, cascading the audit trail away.
- **Confidence:** CONFIRMED (live `sqlite_master` DDL + `PRAGMA foreign_key_list`).
- **Remediation:** Change the FK to `onDelete: Restrict` (blocks deletion until audit rows are archived) or `SetNull` (preserves rows as orphaned platform-level entries). Restrict is the safer default for a financial audit trail.
- **Suggested regression test:** Create a masjid with audit rows, delete it, assert `AuditLog` rows still exist.
- **Dependencies:** None.

### DB-008 — MEDIUM — `ContributionPlan` has **no unique constraint on `(memberId, categoryId)`** — a member can have multiple active plans for the same category
- **File:** `prisma/schema.prisma:141-163`
- **Evidence:** Indexes are `@@index([masjidId, memberId])` and `@@index([masjidId, status])`. No unique on `(memberId, categoryId)`. `plans/actions.ts` does not check for duplicates before create.
- **Impact:** Duplicate plans generate duplicate dues periods, double-counting in reports.
- **Conditions:** Staff creates two plans for same member+category.
- **Confidence:** CONFIRMED.
- **Remediation:** Add `@@unique([masjidId, memberId, categoryId])` (or `[memberId, categoryId]` since `masjidId` is on plan).
- **Regression test:** Create two plans for same member+category → second fails.

### DB-009 — MEDIUM — `ContributionPlan` has **no version/optimistic locking column** — `changePlanAmountAction` updates `amountPaise` and future `DuesPeriod` rows without concurrency control
- **File:** `prisma/schema.prisma:141-163`; `src/modules/plans/actions.ts:113-116`
- **Evidence:** No `version Int @default(1)` or `updatedAt` used for optimistic locking. `changePlanAmountAction` does `tx.contributionPlan.update({ where: { id: planId }, data: { amountPaise } })` then `tx.duesPeriod.updateMany({ where: { planId, periodStart: { gte: effectiveFrom }, status: "PENDING" }, data: { expectedAmountPaise: amountPaise } })` — if two admins change amount concurrently, last write wins silently.
- **Impact:** Lost updates to plan amounts and future due periods.
- **Conditions:** Concurrent `changePlanAmountAction` calls for same plan.
- **Confidence:** CONFIRMED.
- **Remediation:** Add `version Int @default(1)` to `ContributionPlan`; use `where: { id: planId, version: currentVersion }` in update; increment version.
- **Regression test:** Concurrent amount changes → one fails with version mismatch.

### DB-010 — MEDIUM — `Member.telegramChatId` is `@unique` **globally**, not per-masjid — two masjids cannot have members with the same Telegram chat ID
- **File:** `prisma/schema.prisma:96`
- **Evidence:** `telegramChatId String? @unique` — no `masjidId` in the unique. `Member` has `@@unique([masjidId, memberNo])` but not for telegram.
- **Impact:** If a person is a member of two masjids using the same Telegram account, the second insert fails.
- **Conditions:** Member belongs to multiple masjids with same Telegram ID.
- **Confidence:** CONFIRMED.
- **Remediation:** Change to `@@unique([masjidId, telegramChatId])` (partial unique for nullable).
- **Regression test:** Create member in masjid A with telegram ID X; create member in masjid B with same telegram ID X → should succeed.

### DB-011 — MEDIUM — `Reversal.reversalPaymentId` is `@unique` but **never written by application code** — column is dead
- **File:** `prisma/schema.prisma:362`; `src/modules/payments/actions.ts:268-276`
- **Evidence:** `reversalPaymentId String? @unique`. `reversePaymentAction` creates `Reversal` with only `originalPaymentId`, `reason`, `masjidId`. The reversal payment (new Payment row) is created but its ID is not stored back to `Reversal.reversalPaymentId`.
- **Impact:** Cannot navigate from reversal to the correcting payment; audit trail incomplete.
- **Conditions:** Any reversal.
- **Confidence:** CONFIRMED (code inspection).
- **Remediation:** Either populate `reversalPaymentId` in the transaction, or remove the column/unique if not needed.
- **Regression test:** After reversal, `Reversal.reversalPaymentId` equals the new Payment.id.

### DB-012 — MEDIUM — `CashSession` model exists but is **never referenced by any application code** — dead model
- **File:** `prisma/schema.prisma:374-389`
- **Evidence:** `grep -r "CashSession" src/` returns zero matches. Model has `collectorId String` (no FK), `status`, `openingCashPaise`, `closingCashPaise`, `notes`.
- **Impact:** Unused schema clutters migrations; `collectorId` has no referential integrity.
- **Confidence:** CONFIRMED.
- **Remediation:** Remove model or implement the feature.
- **Dependencies:** None.

### DB-013 — MEDIUM — `NotificationLog` model exists but **no code writes to it** — dead model
- **File:** `prisma/schema.prisma:423-435`
- **Evidence:** `grep -r "NotificationLog" src/` returns zero writes (only `MasjidNotificationSettings` is used). Model has `type`, `channel`, `recipient`, `subject`, `body`, `status`.
- **Impact:** Dead schema; notifications are not persisted despite `docs/security.md:108-111` claiming "CSV export quotes cells...".
- **Confidence:** CONFIRMED.
- **Remediation:** Remove model or implement notification logging.
- **Dependencies:** None.

### DB-014 — MEDIUM — `PaymentAllocation.masjidId` is **redundant and unconstrained** — derivable from `payment.masjidId`; no FK or check ties it to the payment's masjid
- **File:** `prisma/schema.prisma:276-295`
- **Evidence:** `masjidId` column + FK to `Masjid` Cascade. But `payment` already has `masjidId`. No constraint ensures `PaymentAllocation.masjidId = Payment.masjidId`. App code in `payments/actions.ts:166-178` passes `masjidId: user.masjidId` explicitly.
- **Impact:** Drift possible if bug writes allocation with wrong masjidId; reports filtering by `masjidId` on allocations would show wrong data.
- **Conditions:** Bug in payment creation.
- **Confidence:** CONFIRMED.
- **Remediation:** Remove `masjidId` from `PaymentAllocation`; derive via `payment` relation. Or add composite FK `(masjidId, paymentId)` referencing `Payment(masjidId, id)` (SQLite supports composite FK).
- **Regression test:** Insert allocation with mismatched masjidId → should fail.

### DB-015 — MEDIUM — `Expense` self-approval: ADMIN role auto-approves at creation (`approvalStatus: can(user.role, "expense:approve") ? "APPROVED" : "PENDING"`)
- **File:** `src/modules/expenses/actions.ts:58`; `src/lib/permissions.ts` (ADMIN has `expense:approve`)
- **Evidence:** `createExpenseAction` line 45 sets `expenseNo` via `nextExpenseNumber`, line 58 sets `approvalStatus` based on permission. ADMIN has `expense:approve` → `APPROVED` immediately. No separate approval step, no segregation of duties.
- **Impact:** No independent approval for admin-entered expenses; `reports/queries.ts:41` only sums `APPROVED` expenses, so admin expenses always count.
- **Conditions:** ADMIN creates expense.
- **Confidence:** CONFIRMED.
- **Remediation:** Require explicit approval action even for admins (segregation of duties), or add a policy flag.
- **Regression test:** ADMIN creates expense → status should be PENDING until explicit approve.

### DB-016 — MEDIUM — `removeHouseholdAssignmentAction` **never calls `recomputeEventStatus`** — `CollectionEvent.status` becomes stale after assignment removal
- **File:** `src/modules/collections/actions.ts:471-510`
- **Evidence:** Action deletes assignment (line 489) and writes audit (491-499) but does not call `recomputeEventStatus(eventId)` (which exists in `src/lib/dues.ts:200-240`). `assignHouseholdsAction` (line 270) does call it.
- **Impact:** Event status stays OPEN/COMPLETED even after all assignments removed.
- **Conditions:** Assignment removed via UI.
- **Confidence:** CONFIRMED.
- **Remediation:** Call `recomputeEventStatus(eventId)` inside the transaction after deletion.
- **Regression test:** Remove last assignment from COMPLETED event → status should become SCHEDULED/OPEN.

### DB-017 — MEDIUM — `recomputeEventStatus` in `src/lib/dues.ts:227-234` **can downgrade COMPLETED → OPEN** — logic order: CANCELLED check first, then COMPLETED condition, then OPEN condition
- **File:** `src/lib/dues.ts:200-240`
- **Evidence:**
```ts
let status: string = EVENT_STATUS.SCHEDULED;
if (event.status === EVENT_STATUS.CANCELLED) status = EVENT_STATUS.CANCELLED;
else if (expectedPaise > 0 && receivedPaise >= expectedPaise && paidAssignments === event.assignments.length) status = EVENT_STATUS.COMPLETED;
else if (receivedPaise > 0 || (hasAssignments && paidAssignments > 0)) status = EVENT_STATUS.OPEN;
```
If an event was COMPLETED, then a new payment allocation arrives (increasing `receivedPaise`), the third branch fires and sets OPEN because `paidAssignments === event.assignments.length` may no longer hold (new payment creates new allocation, not assignment).
- **Impact:** Event status flickers; reports relying on status become unreliable.
- **Conditions:** Additional payment allocated to a COMPLETED event.
- **Confidence:** CONFIRMED.
- **Remediation:** Make COMPLETED terminal (only CANCELLED can override), or add explicit `CLOSED` state.
- **Regression test:** Mark event COMPLETED; add payment allocation → status remains COMPLETED.

### DB-018 — LOW — Boolean flags stored as `Int` (1/0) instead of `Boolean` — `Member.notifyTelegram`, `notifyInApp`, `notifyEmail`; `MasjidNotificationSettings` uses `Integer` in migration but `Boolean` in schema
- **Files:** `prisma/schema.prisma:97-99`; migration uses `INTEGER NOT NULL DEFAULT 1`
- **Evidence:** Prisma maps `Boolean` to SQLite `INTEGER 0/1`. Schema uses `Boolean` but migration used `INTEGER`. Consistent at runtime but confusing.
- **Impact:** Minor; type confusion in raw SQL.
- **Confidence:** CONFIRMED.
- **Remediation:** Align migration to use `BOOLEAN` (SQLite alias) or accept `INTEGER`.

### DB-019 — LOW — `PlanAmountHistory.changedBy` is `String?` with **no FK to User** — cannot enforce referential integrity
- **File:** `prisma/schema.prisma:171`
- **Evidence:** `changedBy String?` — no `@relation`. App code in `plans/actions.ts:107-110` writes `user.id` but DB allows any string.
- **Impact:** Orphaned references; audit trail unreliable.
- **Confidence:** CONFIRMED.
- **Remediation:** Add `@relation(fields: [changedBy], references: [id])` to `User` (make nullable FK).

### DB-020 — LOW — `MasjidUser` FKs both `onDelete: Cascade` — deleting a User cascades to all their memberships; deleting a Masjid cascades all memberships
- **File:** `prisma/schema.prisma:389-390`
- **Evidence:** `CONSTRAINT "MasjidUser_masjidId_fkey" ... ON DELETE CASCADE`, `CONSTRAINT "MasjidUser_userId_fkey" ... ON DELETE CASCADE`.
- **Impact:** Deleting a platform user removes their staff records everywhere. Deleting a masjid removes all staff memberships (expected).
- **Confidence:** CONFIRMED.
- **Remediation:** Consider `onDelete: Restrict` on `userId` to prevent accidental user deletion while they have memberships; or soft-delete pattern.

### DB-021 — LOW — `Subscription` model has **no enforcement code** — no server action reads/writes it; `status` default `TRIAL` unused
- **File:** `prisma/schema.prisma:409-421`
- **Evidence:** `grep -r "Subscription" src/` — only Prisma client import references. No business logic.
- **Impact:** Dead model.
- **Confidence:** CONFIRMED.
- **Remediation:** Remove or implement.

### DB-022 — LOW — `ContributionCategory.schedulingRules` column exists but **unused** — no code reads/writes it
- **File:** `prisma/schema.prisma:128`; `validation-registry.ts:134` (`type: "hidden"`)
- **Evidence:** Column in schema and migration; form field hidden; no logic consumes it.
- **Impact:** Dead column.
- **Confidence:** CONFIRMED.
- **Remediation:** Remove or implement scheduling engine.

### DB-031 — INFORMATIONAL — The schema defines **zero Prisma enums**; every status, role, frequency, and mode field is a free-form `String`
- **Files:** `prisma/schema.prisma` (no `enum` blocks exist); `src/lib/constants.ts` holds the closed value sets
- **Evidence:** `Payment.status`, `Payment.mode`, `Member.status`, `MasjidUser.role`, `MasjidUser.status`, `Masjid.status`, `DuesPeriod.status`, `CollectionEvent.status`, `CollectionEventAssignment.status`, `Expense.approvalStatus`, `Expense.mode`, `ContributionPlan.frequency`, `ContributionCategory.frequency`, `ContributionCategory.collectionMode`, `CashSession.status`, `Subscription.status` are all `String`. SQLite cannot express `CREATE TYPE ... AS ENUM` at all (see DB-001), so this is a platform constraint rather than a modelling shortcut.
- **Impact:** No DB-level validation of a status value. A typo (`"PAID "` vs `"PAID"`) is silently accepted and then fails every equality filter. Status values are also duplicated between `src/lib/constants.ts` and `src/lib/validation-registry.ts`, so the DB, the app, and the forms each hold their own copy of the allowed set.
- **Conditions:** Any write path not going through the Zod-validated server actions.
- **Confidence:** CONFIRMED.
- **Remediation:** Add SQLite `CHECK` constraints for the closed sets (SQLite supports them), and treat `src/lib/constants.ts` as the single source of truth for the value lists.
- **Suggested regression test:** Direct SQL insert `Payment.status = 'BOGUS'` → should fail.
- **Dependencies:** DB-001, DB-007.

### DB-032 — INFORMATIONAL — `prisma/seed.ts` contains a **hardcoded SUPER_ADMIN credential** and prints it to stdout
- **File:** `prisma/seed.ts:18-19, 219-226`
- **Evidence:** The seed defines a platform-admin email and password as literal strings in source and writes them to the console at the end of the run. The seed is a developer convenience script, not a production fixture.
- **Impact:** If the seeded credential is left unchanged on a real deployment, the platform-admin account is publicly guessable from the repository. (Overlaps SEC-016 in the security audit; raised here because it is a database-row seeding concern.)
- **Conditions:** `npm run setup` or `npm run seed` executed without overriding the values, on an environment reachable by anyone.
- **Confidence:** CONFIRMED.
- **Remediation:** Require the platform-admin credential to be supplied via environment variables and refuse to seed if absent or equal to a default.
- **Suggested regression test:** Run the seed with no credential env vars → it should exit non-zero without creating the account.
- **Dependencies:** None.

### DB-033 — INFORMATIONAL — `scripts/backup.mjs` performs a **raw file copy** of a live SQLite database — no restore script, no encryption, no checksum, no scheduling, no `VACUUM INTO`
- **File:** `scripts/backup.mjs:1-41`
- **Evidence:** The script `copyFileSync`s `data/masjid.db` to `backups/masjid-<timestamp>.db`, keeps the 14 most recent, and `unlinkSync`s the rest. There is no `restore` script anywhere in `scripts/`, no encryption, no checksum verification, and no scheduler — the `backup` npm script is manual. `data/` and `backups/` are git-ignored (`.gitignore:40-41`).
- **Impact:** A copy taken while a write transaction is in flight can capture a torn or partially-checkpointed database. A restore procedure **is documented** in `README.md:213-226`, but it is manual and untested — **recoverability is unverified**. The one backup present on disk (`backups/masjid-2026-10-19-15-49-40.db`, 348 KB) predates the current 1.1 MB database and has never been restore-tested.
- **Conditions:** Backup run while the application is serving writes.
- **Confidence:** CONFIRMED (script read; no restore path exists).
- **Remediation:** Use `VACUUM INTO '<file>'` for a consistent snapshot, add a `restore.mjs` that verifies integrity (`PRAGMA integrity_check`) before swapping files in, and document the RPO/RTO.
- **Suggested regression test:** Take a backup, restore it into a temp location, run `PRAGMA integrity_check` and assert row counts match.
- **Dependencies:** None.

---

## 6. Multi-Tenant Isolation Review

| Check | Result | Evidence |
|---|---|---|
| **Every tenant model has `masjidId`** | ❌ NO — `CollectionEventAssignment` missing (DB-005), `CashSession` has it but dead, `NotificationLog` has it but dead | Schema inspection |
| **Composite uniques include `masjidId`** | ⚠️ PARTIAL — `Member.memberNo` ✓, `Payment.receiptNo` ✓, `Payment.idempotencyKey` ✓, `Expense.expenseNo` ✓, `ContributionCategory.code` ✓, `ReceiptSequence` ✓; `Masjid.slug` global ✓; `Masjid.receiptPrefix` ✗ (DB-006); `Member.telegramChatId` global ✗ (DB-010) | Schema |
| **Query scoping in actions** | ✅ YES — every action uses `user.masjidId!` from session; `findFirst({ where: { id, masjidId } })` pattern | `payments/actions.ts:81,89,96`, `collections/actions.ts:248`, `plans/actions.ts:36`, etc. |
| **Cross-tenant reference validation** | ✅ APP-LEVEL — `createPaymentAction` validates member/category/period belong to masjid (lines 79-102) **before transaction** | `payments/actions.ts` |
| **Platform admin exceptions** | ✅ `requirePlatformAdmin()` checks `role === SUPER_ADMIN && isPlatformAdmin` | `platform/actions.ts:31-37` |
| **Platform actions write audit log** | ❌ NO — `setMasjidStatusAction`, `deleteMasjidAction`, `createMasjidAction`, `updateMasjidAction` write **no audit** | `platform/actions.ts` (SEC-008 in security audit) |
| **Object-level ownership** | ✅ Members portal: `loadReceipt` checks `payment.donorMemberId === user.memberId` | `receipts/load.ts:35-37` |

**Critical gap:** `CollectionEventAssignment` has no `masjidId` (DB-005). Cross-tenant assignment is prevented only by app check in `assignHouseholdsAction:248-254`. If that check is bypassed (bug, direct DB), a member from masjid A could be assigned to an event in masjid B.

**Unverified assumption:** "Do not claim complete tenant isolation based only on schema structure." — The app-level checks are extensive but not foolproof; DB-level enforcement is missing for assignments.

---

## 7. Financial Integrity Review

### 7.1 Monetary Types and Units
- All amounts stored as `Int` paise (1/100 INR). ✅ Consistent.
- Zod validation requires `positive()` (>0). ✅ App-level.
- **No DB CHECK constraints** (DB-007). ❌

### 7.2 Allocation Totals ≤ Payment Amount
- **App check:** `payments/actions.ts:73-76` — `if (allocationTotal > input.amountPaise) return error`
- **TOCTOU:** Check runs **outside transaction** (line 73 vs transaction at line 112). Concurrent payment creation could pass check then exceed in aggregate (theoretical; idempotency key limits replays).
- **DB enforcement:** NONE — `PaymentAllocation` has no unique, no check constraint. ❌

### 7.3 Receipt Number Uniqueness and Scope
- `ReceiptSequence` table: `@@unique([masjidId, financialYear])` ✅
- `nextReceiptNumber` read-modify-write inside transaction ✅
- **Race:** Two concurrent first-payments-of-year both `findUnique` → null → both `create` → one fails unique constraint (acceptable, retry handles it).
- `Payment.@@unique([masjidId, receiptNo])` ✅

### 7.4 Idempotency Key Uniqueness and Scope
- `Payment.@@unique([masjidId, idempotencyKey])` ✅
- **Nullable column in unique index** — SQLite treats NULLs as distinct, so multiple payments with `idempotencyKey = NULL` allowed. App always generates key (`payments/actions.ts:61` uses `crypto.randomUUID()`), so not a practical issue.

### 7.5 Reversal Relationships and Duplicate-Reversal Protection
- `Reversal.originalPaymentId @unique` ✅ prevents double-reversal of same payment.
- `Payment.status === "REVERSED"` guard in `reversePaymentAction:259` ✅
- `Reversal.reversalPaymentId @unique` exists but **never populated** (DB-011). ❌
- Reversal creates `CANCELLED` receipt event + audit log ✅

### 7.6 Referential Integrity
| Relation | DB FK | App Check | Notes |
|---|---|---|---|
| Payment → donorMember | SET NULL | ✅ | `payments/actions.ts:81` |
| Payment → enteredBy | RESTRICT | ✅ | Staff must exist |
| PaymentAllocation → category | RESTRICT | ✅ | Prevents category delete if used |
| PaymentAllocation → duesPeriod | SET NULL | ✅ | Period can be deleted |
| PaymentAllocation → collectionEvent | SET NULL | ❌ **NO FK in live DB** (DB-003) | Schema says SetNull; migration didn't create FK |
| ContributionPlan → category | RESTRICT | ✅ | Prevents category delete |
| DuesPeriod → plan/member/masjid | CASCADE all | ⚠️ Redundant masjidId | Deleting plan cascades periods |

### 7.7 Silent Deletion / Overwrite
- **Payments:** No delete action; only `status → REVERSED`. ✅
- **Allocations:** No delete action. ✅
- **Receipts:** No delete; reprint creates `REPRINTED` event. ✅
- **Expenses:** No delete action in `expenses/actions.ts`. ✅
- **Members:** Soft delete via `status: INACTIVE`. ✅
- **AuditLog:** Append-only (only `create` calls). ✅

### 7.8 Concurrency Duplicates
- `nextExpenseNumber` — **count-based** (`tx.expense.count({ where: { masjidId, expenseNo: { startsWith: ... } } })`) → **racy** (DB-023).
- `nextMemberNumber` — **lexicographic scan** (`findFirst orderBy memberNo desc`) → **racy + ordering bug** (DB-024).
- `nextReceiptNumber` — sequence table race on first insert of year (acceptable, unique constraint catches).
- `generateDuesPeriods` — runs outside transaction with `catch {}` (DB-025).

---

## 8. Index and Constraint Review

### 8.1 All `@@unique` / `@@index` from Schema (verified against live DB)
| Model | Unique | Indexes |
|---|---|---|
| Masjid | `slug` | — |
| User | `email` | — |
| MasjidUser | `[masjidId, userId]` | `[userId]`, `[masjidId, status]` |
| Member | `[masjidId, memberNo]`, `telegramChatId` (global) | `[masjidId, status]`, `[masjidId, fullName]`, `[masjidId, phone]`, `[userId]` |
| ContributionCategory | `[masjidId, code]` | — |
| ContributionPlan | — | `[masjidId, memberId]`, `[masjidId, status]` |
| PlanAmountHistory | — | `[planId, effectiveFrom]` |
| DuesPeriod | `[planId, periodStart, periodEnd]` | `[masjidId, status, dueDate]`, `[masjidId, memberId]` |
| CollectionEvent | — | `[masjidId, categoryId, status]`, `[masjidId, dueDate]` |
| CollectionEventAssignment | `[eventId, memberId]` | `[memberId, status]` |
| Payment | `[masjidId, receiptNo]`, `[masjidId, idempotencyKey]` | `[masjidId, paymentDate]`, `[masjidId, donorMemberId]`, `[masjidId, status]`, `[masjidId, mode]` |
| PaymentAllocation | **NONE** | `[masjidId, paymentId]`, `[duesPeriodId]`, `[collectionEventId]` |
| ReceiptEvent | — | `[masjidId, paymentId]` |
| ReceiptSequence | `[masjidId, financialYear]` | — |
| ExpenseCategory | `[masjidId, name]` | — |
| Expense | `[masjidId, expenseNo]` | `[masjidId, date]`, `[masjidId, approvalStatus]` |
| Reversal | `originalPaymentId`, `reversalPaymentId` | `[masjidId]` |
| CashSession | — | `[masjidId, status]` |
| AuditLog | — | `[masjidId, createdAt]`, `[masjidId, entityType, entityId]` |
| Subscription | — | `[masjidId]` |
| NotificationLog | — | `[masjidId, createdAt]` |
| MasjidNotificationSettings | `masjidId` | — |

### 8.2 Missing Indexes (Performance)
- `PaymentAllocation` — no index on `categoryId` (used in `reports/queries.ts:121` groupBy).
- `DuesPeriod` — index on `[masjidId, status, dueDate]` exists; query in `reports/queries.ts:55` filters `status IN ('PENDING','PARTIAL')` and loads all → could benefit from partial index (SQLite doesn't support partial indexes pre-3.38).
- `CollectionEventAssignment` — no index on `eventId` alone (unique is `[eventId, memberId]`).

### 8.3 Unnecessary / Redundant Indexes
- `PaymentAllocation.masjidId` indexed but redundant (DB-014).
- `DuesPeriod.masjidId` + `memberId` indexed but both derivable from `plan`.
- `Member.telegramChatId` global unique index — if changed to composite, this index can be dropped.

---

## 9. Migration History Review

| Migration | Status | Issues |
|---|---|---|
| `20261019092355_init` | **Applied** (recorded) | **Contains PostgreSQL-only `CREATE TYPE ... AS ENUM` (lines 1-11) — cannot run on SQLite**. All tables created with `String` status fields instead of ENUMs. |
| `20261020083135_add_masjid_user_status` | **Applied** (recorded) | **No-op** (`SELECT 1;`). `User.status` and `MasjidUser.status` columns exist in DB but not created by any migration. |
| `20261021140500_add_collection_events` | **Failed then re-applied** | First attempt rolled back (tables already existed). Re-applied successfully but: (a) tries to re-add `defaultGraceDays` (duplicate column on fresh DB), (b) adds `PaymentAllocation.collectionEventId` **without FK** (contradicts schema). |

**Schema-vs-migration drift:** The live database schema (via `sqlite_master`) matches `schema.prisma` **except** `PaymentAllocation.collectionEventId` lacks FK. Migration history does **not** faithfully represent the schema evolution.

**Destructive risks:** None in applied migrations (all additive). The init migration's ENUMs would fail on fresh SQLite.

**SQLite limitations:** No ENUM types; `CREATE TYPE` fails. No partial unique indexes (needed for nullable `idempotencyKey`/`collectionEventId`). `ON DELETE` actions supported.

---

## 10. Backup and Recovery Review

| Aspect | Finding | Evidence |
|---|---|---|
| **Backup script** | `scripts/backup.mjs` copies `data/masjid.db` → `backups/masjid-<sv-SE-timestamp>.db`; keeps 14 most recent; deletes older via `unlinkSync` | `scripts/backup.mjs:1-41` |
| **Backup destination** | Local `backups/` directory (git-ignored) | `.gitignore:41` |
| **Overwrite risk** | Timestamp includes seconds; concurrent backups could collide (unlikely for manual runs) | `toLocaleString('sv-SE')` → `YYYY-MM-DD-HH-MM-SS` |
| **VCS exclusion** | `data/` and `backups/` in `.gitignore` ✅ | `.gitignore:40-41` |
| **Completeness** | Single file copy — captures schema + data + `_prisma_migrations` table ✅ | SQLite is single file |
| **Encryption** | **None** — plain file copy | `scripts/backup.mjs` |
| **Retention/scheduling** | **None** — manual `npm run backup` only; `KEEP=14` only limits count, not time | `scripts/backup.mjs:8` |
| **Restore script** | **None exists** | No `restore.mjs` or similar |
| **Restore documentation** | ✅ **Documented in `README.md`** — manual 4-step procedure ("Stop the server → copy backup over `data/masjid.db` → delete stale `-journal`/`-wal`/`-shm` → start server") plus a manual "Verify a restore" checklist | `README.md:213-226` |
| **Consistency during active writes** | **No** — raw file copy of live SQLite DB without `VACUUM INTO` or checkpoint; can capture corrupted state if write in progress | `scripts/backup.mjs:19` uses `copyFileSync` |

**Critical:** Restore is *documented* but **never automated and never tested**. The README's own "Verify a restore" step is a manual checklist, not an automated test — no restore test evidence exists in the repository. The single backup on disk (`backups/masjid-2026-10-19-15-49-40.db`, 348 KB) predates the current 1.1 MB database and has never been restore-tested. Recoverability is therefore **unverified**, not absent.

---

## 11. Data Retention and Privacy Review

| Data | Deletion Flow | Retention | Notes |
|---|---|---|---|
| **User** | No delete action; `status` soft-delete | Indefinite | `MasjidUser.userId` FK `onDelete: Cascade` — deleting User erases memberships |
| **Masjid** | `deleteMasjidAction` (platform) — blocks if members/payments exist | Cascade deletes all tenant data | `platform/actions.ts:77-84` counts **only** `members` and `payments`; a masjid with neither is deleted, and the cascade then removes `MasjidUser`, `ContributionCategory`, `ContributionPlan`, `DuesPeriod`, `CollectionEvent`, `PaymentAllocation`, `ReceiptEvent`, `ReceiptSequence`, `ExpenseCategory`, `Expense`, `Reversal`, `AuditLog`, `Subscription`, `NotificationLog`, `MasjidNotificationSettings` rows that still reference it |
| **Member** | `status: INACTIVE` soft-delete | History retained | No hard delete action |
| **Payment/Receipt/Reversal/AuditLog** | No delete actions | Indefinite | `AuditLog.masjidId` FK `onDelete: Cascade` — **deleting masjid erases audit trail** (DB-030) ❌ |
| **Expense** | No delete action | Indefinite | `approvalStatus` only |
| **PII per model** | Member: name, phone, address, fatherName; User: email, name, phone | — | No export/purge automation |
| **FK actions erasing history** | `Masjid` Cascade → `AuditLog`, `MasjidUser`, categories, plans, dues periods, expenses | — | **Platform delete destroys the audit trail and any orphaned tenant config** |

**GDPR/privacy flags:** No automated export (`export:data` permission only for CSV transactions). No purge workflow. `AuditLog` cascade deletion on masjid delete violates audit retention principles.

---

## 12. Transaction and Concurrency Review

### 12.1 Prisma Transaction Patterns
- **Interactive transactions** (`prisma.$transaction(async (tx) => ...)`) used everywhere for atomic writes. ✅
- **Batch transactions** (`prisma.$transaction([...])`) **not used** in app code.
- **Nested transactions:** Prisma does not support nested interactive transactions; code avoids them.

### 12.2 Critical Concurrency Defects

#### DB-023 — CRITICAL — `nextExpenseNumber` is count-based → unique constraint collision under concurrency
- **File:** `src/lib/receipts/numbering.ts:68`
- **Code:** `return await tx.expense.count({ where: { masjidId, expenseNo: { startsWith: \`EXP-${fy}-\` } } }) + 1`
- **Failure:** Two concurrent `createExpenseAction` → both read count N → both generate `EXP-2026-N+1` → second insert fails `@@unique([masjidId, expenseNo])`.
- **Confidence:** CONFIRMED.

#### DB-024 — CRITICAL — `nextMemberNumber` uses lexicographic string sort (breaks at 1M) + no counter table → collision + ordering bug
- **File:** `src/lib/receipts/numbering.ts:50-57`
- **Code:** `tx.member.findFirst({ where: { masjidId, memberNo: { startsWith: "MAS-" } }, orderBy: { memberNo: "desc" } })`
- **Failure 1:** `MAS-999999` > `MAS-1000000` lexicographically → wrong "max".
- **Failure 2:** Two concurrent creates → both read same max → both generate same next → unique violation.
- **Confidence:** CONFIRMED.

#### DB-025 — HIGH — `generateDuesPeriods` runs **outside any transaction** with blanket `catch {}`
- **File:** `src/lib/dues.ts:98-124`; called from `plans/actions.ts:76` **after** plan transaction commits
- **Code:** Uses global `prisma` (not `tx`); `try { await prisma.duesPeriod.create({...}) } catch {}`
- **Impact:** Plan created but periods not generated (silent failure). Partial periods if crash mid-loop. No atomicity.
- **Confidence:** CONFIRMED.

#### DB-026 — HIGH — `createPaymentAction` validates cross-tenant references **outside transaction** (TOCTOU)
- **File:** `src/modules/payments/actions.ts:79-102` (checks) vs `112` (transaction start)
- **Impact:** Member/category/period could be deleted/moved between check and transaction. Low probability but possible.
- **Confidence:** CONFIRMED.

Also relevant to concurrency (full entries in §5):

- **DB-009 — MEDIUM** `changePlanAmountAction` has no optimistic locking (`src/modules/plans/actions.ts:113-116`) — lost updates under concurrency.
- **DB-017 — MEDIUM** `recomputeEventStatus` downgrades COMPLETED → OPEN (`src/lib/dues.ts:227-234`) — status flicker.
- **DB-016 — MEDIUM** `removeHouseholdAssignmentAction` never recomputes event status (`src/modules/collections/actions.ts:471-510`) — stale status after removal.

### 12.3 SQLite Transaction Limitations
- SQLite `better-sqlite3` adapter uses **IMMEDIATE** transactions (default). Serializes writers.
- Long-running interactive transactions block other writers. Current transactions are short (few ms).
- No `SELECT ... FOR UPDATE` equivalent; app uses read-modify-write inside transaction (e.g., `ReceiptSequence`).

---

## 13. Existing Test Coverage and Gaps

### 13.1 Tests Actually Executed (Non-Destructive, `npm test -- --run`)
| Test File | Tests | DB Writes? | Coverage |
|---|---|---|---|
| `tests/allocations.test.ts` | 7 | ✅ Yes (uses `test-masjid.db` copy) | Allocation math, tenant isolation (read-only cross-tenant check) |
| `tests/numbering.test.ts` | 4 | ✅ Yes | Receipt/member/expense numbering (serial, no concurrency) |
| `tests/dates-dues.test.ts` | 9 | ❌ Pure logic | Period generation, IST dates |
| `tests/money.test.ts` | 5 | ❌ Pure logic | Paise formatting/parsing |
| `tests/receipt-pdf.test.ts` | 7 | ❌ Pure logic | PDF generation |
| `tests/server-actions.test.ts` | 2 | ❌ Static scan | No 'use client' in actions |
| `tests/staff-validation.test.ts` | 20 | ❌ Pure logic | Role guards |
| `tests/validation-registry.test.ts` | 10 | ❌ Pure logic | Schema generation |

**Total: 64 tests passed (8 files).**

### 13.2 Coverage Gaps (Mandated Areas vs. Tests)

| Mandated Area | Test Exists? | Notes |
|---|---|---|
| Tenant isolation (write) | ❌ | `allocations.test.ts` only tests read scoping; no cross-tenant **write** attempt |
| Referential integrity (FK) | ❌ | No test inserts violating FK |
| Duplicate payments (idempotency) | ❌ | No test for concurrent same idempotencyKey |
| Reversal duplicate protection | ❌ | No test double-reversal |
| Receipt numbering uniqueness | ❌ | Serial test only; no concurrency |
| Allocation totals ≤ amount | ❌ | App check tested? Not in unit tests |
| Expense approval separation | ❌ | No test for ADMIN auto-approve vs COLLECTOR pending |
| Event generation | ❌ | E2E only (`browser-verification.spec.ts`) |
| Deletion behaviour (cascade) | ❌ | No test for masjid delete cascade |
| Backup/restore | ❌ | No test |
| Concurrency (numbering) | ❌ | Critical gap for DB-023, DB-024 |

---

## 14. Findings Ordered by Severity

| ID | Severity | Title | Affected |
|---|---|---|---|
| DB-001 | CRITICAL | Init migration has PostgreSQL-only ENUM statements | `prisma/migrations/20261019092355_init/migration.sql:1-11` |
| DB-002 | CRITICAL | Second migration is no-op; status columns untracked | `prisma/migrations/20261020083135_add_masjid_user_status/migration.sql` |
| DB-003 | CRITICAL | Third migration failed/re-applied; duplicate column add; missing FK on `PaymentAllocation.collectionEventId` | `prisma/migrations/20261021140500_add_collection_events/migration.sql` |
| DB-023 | CRITICAL | `nextExpenseNumber` count-based numbering → concurrent collision | `src/lib/receipts/numbering.ts:68` |
| DB-024 | CRITICAL | `nextMemberNumber` lexicographic scan → collision + ordering bug | `src/lib/receipts/numbering.ts:50-57` |
| DB-004 | HIGH | `PaymentAllocation` no unique constraint → duplicate allocations | `prisma/schema.prisma:276-295` |
| DB-005 | HIGH | `CollectionEventAssignment` missing `masjidId` → no DB tenant isolation | `prisma/schema.prisma:229-242` |
| DB-006 | HIGH | `Masjid.receiptPrefix` no unique constraint | `prisma/schema.prisma:20` |
| DB-007 | HIGH | No DB CHECK constraints on monetary columns | `prisma/schema.prisma` (all `Int` fields) |
| DB-025 | HIGH | `generateDuesPeriods` outside transaction, swallows errors | `src/lib/dues.ts:98-124`, `plans/actions.ts:76` |
| DB-026 | HIGH | `createPaymentAction` cross-tenant checks outside transaction (TOCTOU) | `src/modules/payments/actions.ts:79-112` |
| DB-030 | HIGH | `AuditLog.masjidId` FK Cascade — deleting a masjid erases its audit trail | `prisma/schema.prisma:391-407`, `platform/actions.ts:71-95` |
| DB-008 | MEDIUM | `ContributionPlan` no unique on `(memberId, categoryId)` | `prisma/schema.prisma:141-163` |
| DB-009 | MEDIUM | `ContributionPlan` no optimistic locking for amount changes | `prisma/schema.prisma:141-163`, `plans/actions.ts:113-116` |
| DB-010 | MEDIUM | `Member.telegramChatId` global unique, not per-masjid | `prisma/schema.prisma:96` |
| DB-011 | MEDIUM | `Reversal.reversalPaymentId` unique but never populated | `prisma/schema.prisma:362`, `payments/actions.ts:268-276` |
| DB-012 | MEDIUM | `CashSession` dead model | `prisma/schema.prisma:374-389` |
| DB-013 | MEDIUM | `NotificationLog` dead model | `prisma/schema.prisma:423-435` |
| DB-014 | MEDIUM | `PaymentAllocation.masjidId` redundant, unconstrained | `prisma/schema.prisma:276-295` |
| DB-015 | MEDIUM | Expense self-approval by ADMIN (no segregation) | `expenses/actions.ts:58` |
| DB-016 | MEDIUM | `removeHouseholdAssignmentAction` doesn't recompute event status | `collections/actions.ts:471-510` |
| DB-017 | MEDIUM | `recomputeEventStatus` can downgrade COMPLETED → OPEN | `src/lib/dues.ts:227-234` |
| DB-018 | LOW | Boolean flags as `Int` (1/0) | `schema.prisma:97-99` |
| DB-019 | LOW | `PlanAmountHistory.changedBy` no FK to User | `schema.prisma:171` |
| DB-020 | LOW | `MasjidUser` FKs both Cascade | `schema.prisma:389-390` |
| DB-021 | LOW | `Subscription` dead model | `schema.prisma:409-421` |
| DB-022 | LOW | `ContributionCategory.schedulingRules` unused | `schema.prisma:128` |
| DB-031 | INFORMATIONAL | No Prisma enums — all status fields are `String` | `schema.prisma` (no enum blocks) |
| DB-032 | INFORMATIONAL | `prisma/seed.ts` hardcodes SUPER_ADMIN credentials | `prisma/seed.ts:18-19, 219-226` |
| DB-033 | INFORMATIONAL | `scripts/backup.mjs` raw copy, no restore, no encryption, no `VACUUM INTO` | `scripts/backup.mjs` |

---

## 15. Prioritized Remediation Roadmap

### Phase 1 — Immediate (Blocks fresh deploy, data integrity)
1. **Fix migration history** (DB-001, DB-002, DB-003): Create a new baseline migration that works on SQLite. Remove ENUM statements, add proper `status` columns, add FK for `PaymentAllocation.collectionEventId`, remove duplicate `defaultGraceDays` add.
2. **Add `masjidId` to `CollectionEventAssignment`** (DB-005): Migration + backfill from `event.masjidId` + composite unique.
3. **Add unique constraint to `PaymentAllocation`** (DB-004): `@@unique([paymentId, categoryId, duesPeriodId, collectionEventId])` (handle nulls).
4. **Fix numbering concurrency** (DB-023, DB-024): Replace `nextExpenseNumber` with sequence table (like `ReceiptSequence`); replace `nextMemberNumber` with counter table + atomic increment.

### Phase 2 — High (Financial integrity, tenant isolation)
5. **Add `Masjid.receiptPrefix` unique** (DB-006).
6. **Add CHECK constraints on monetary columns** (DB-007) via raw SQL migration.
7. **Move `generateDuesPeriods` inside plan creation transaction** (DB-025) or make it idempotent + retryable.
8. **Move cross-tenant checks inside payment transaction** (DB-026).
9. **Add optimistic locking to `ContributionPlan`** (DB-009).
10. **Add unique on `(memberId, categoryId)` to `ContributionPlan`** (DB-008).
11. **Change `AuditLog.masjidId` FK to `Restrict`** (DB-030) so tenant deletion cannot erase the audit trail.

### Phase 3 — Medium (Correctness, cleanup)
12. **Fix `recomputeEventStatus` terminal COMPLETED** (DB-017).
13. **Call `recomputeEventStatus` in `removeHouseholdAssignmentAction`** (DB-016).
14. **Populate `Reversal.reversalPaymentId`** or remove column (DB-011).
15. **Change `Member.telegramChatId` to composite unique** (DB-010).
16. **Remove or implement `CashSession`, `NotificationLog`, `Subscription`, `schedulingRules`** (DB-012, DB-013, DB-021, DB-022).
17. **Remove redundant `PaymentAllocation.masjidId`** or add composite FK (DB-014).
18. **Require explicit expense approval for ADMIN** (DB-015).
19. **Add FK `PlanAmountHistory.changedBy → User`** (DB-019).

### Phase 4 — Low / Hygiene
20. **Boolean type alignment** (DB-018).
21. **Review `MasjidUser` Cascade on `userId`** (DB-020).
22. **Add `PaymentAllocation.categoryId` index** (performance).
23. **Document/implement backup restore procedure** (DB-033).

---

## 16. Business Decisions Required

| Decision | Context | Recommendation |
|---|---|---|
| **Receipt prefix uniqueness** | Global vs per-masjid? Currently app-only check. | Make global unique (simpler) or document app-only. |
| **Expense approval policy** | ADMIN auto-approves; no segregation. | Require explicit approve action for all roles; add `expense:approve` to AUDITOR? |
| **Member multi-masjid Telegram** | Global unique blocks same Telegram ID in two masjids. | Change to composite unique per masjid. |
| **Audit log retention on masjid delete** | Cascade deletes audit trail. | Change `AuditLog.masjidId` FK to `SET NULL` (audit rows become orphaned but preserved) or `RESTRICT` (block masjid delete if audit rows exist). |
| **Dead models** | `CashSession`, `NotificationLog`, `Subscription`, `schedulingRules`. | Remove unless feature planned in next quarter. |
| **Backup strategy** | Manual copy, no restore, no encryption. | Implement `VACUUM INTO` backup, add restore script, document RPO/RTO. |
| **Idempotency key null handling** | Unique index allows multiple NULLs. | Make `idempotencyKey` required in schema (Prisma `@default(cuid())` or app-generated). |

---

## 17. Files Inspected (Complete List)

```
prisma/schema.prisma
prisma/migrations/migration_lock.toml
prisma/migrations/20261019092355_init/migration.sql
prisma/migrations/20261020083135_add_masjid_user_status/migration.sql
prisma/migrations/20261021140500_add_collection_events/migration.sql
src/lib/db.ts
src/lib/receipts/numbering.ts
src/lib/dues.ts
src/lib/auth.ts
src/lib/permissions.ts
src/lib/validation-registry.ts
src/lib/validation.ts
src/modules/auth/actions.ts
src/modules/collections/actions.ts
src/modules/expenses/actions.ts
src/modules/members/actions.ts
src/modules/payments/actions.ts
src/modules/plans/actions.ts
src/modules/platform/actions.ts
src/modules/settings/actions.ts
src/modules/staff/actions.ts
src/modules/portal/actions.ts
src/modules/portal/queries.ts
src/modules/audit/write.ts
src/modules/receipts/load.ts
src/modules/receipts/view.ts
src/modules/reports/queries.ts
src/app/api/exports/transactions/route.ts
prisma/seed.ts
scripts/backup.mjs
scripts/prepare.mjs
tests/setup.ts
tests/allocations.test.ts
tests/numbering.test.ts
tests/dates-dues.test.ts
tests/money.test.ts
tests/receipt-pdf.test.ts
tests/server-actions.test.ts
tests/staff-validation.test.ts
tests/validation-registry.test.ts
vitest.config.ts
package.json
.gitignore
docs/security.md
PROJECT_VERIFICATION_AUDIT.md
PROJECT_ARCHITECTURE_AUDIT.md
FEATURE_STATUS_MATRIX.md
PROJECT_SECURITY_AUDIT.md
```

---

## 18. Tests and Commands Actually Executed

| Command | Result |
|---|---|
| `npm test -- --run` | **8 test files passed, 64 tests passed** (Duration ~9.8s) |
| `node -e "better-sqlite3 read-only inspection"` | Schema objects (68), migrations table (4 entries), FK lists, DDL for key tables — all read-only |
| Migration replay (throwaway temp DB) | Init fails on ENUM; 2nd no-op; 3rd fails on duplicate column |

**No destructive commands run.** No migrations applied, no seed executed, no backup/restore performed.

---

## 19. Explicit Statement of Files Changed

**No application source files, schema files, migrations, configuration, or tests were created, modified, deleted, renamed, or overwritten during this audit.** The only artifact produced is this report: `PROJECT_DATABASE_AUDIT.md`.

**No database was modified.** All live-database inspection used `better-sqlite3` in `readonly: true` mode. The migration replay ran against a throwaway database in the OS temp directory, never against `data/masjid.db` or `data/test-masjid.db`.

---

## Contradictions with Prior Audits (Verified)

| Prior Audit Claim | Actual Finding | Severity |
|---|---|---|
| `PROJECT_VERIFICATION_AUDIT.md:98` — "23 Models" | **22 models** in `schema.prisma` | INFORMATIONAL |
| `PROJECT_VERIFICATION_AUDIT.md:333` — "19 permissions" | **16 permissions** in `src/lib/permissions.ts` | INFORMATIONAL |
| `PROJECT_VERIFICATION_AUDIT.md:395` — "Test DB: Copy of `data/masjid.db` → `data/test-masjid.db` per run" | **Implemented** in `tests/setup.ts:9-16` (verified) | — (Claim is correct) |
| `PROJECT_VERIFICATION_AUDIT.md:476` — Email/SMTP notification channels | **No nodemailer/SMTP code exists**; only `NotificationLog` model (dead) and `MasjidNotificationSettings` | MEDIUM (docs/security.md claims not implemented) |
| `PROJECT_VERIFICATION_AUDIT.md:486-489` — "Collector creates → PENDING; Admin/Auditor approves" | **AUDITOR has no `expense:approve`**; ADMIN auto-approves at creation (`expenses/actions.ts:58`) | HIGH (DB-015) |
| `PROJECT_VERIFICATION_AUDIT.md:220` — "Allocation sum can exceed payment amount" rated Critical | App check exists (`payments/actions.ts:73-76`) but **TOCTOU** (check outside transaction); genuine defect is race, not missing check | HIGH (DB-026) |
| `PROJECT_VERIFICATION_AUDIT.md:444` — "No member sequence counter" | Confirmed — plus **lexicographic sort bug** and **concurrency race** unflagged | CRITICAL (DB-024) |
| `PROJECT_ARCHITECTURE_AUDIT.md` — "48 Prisma models" | **22 models** | INFORMATIONAL |

---

**Report completed. Awaiting explicit approval before beginning Phase 8.**