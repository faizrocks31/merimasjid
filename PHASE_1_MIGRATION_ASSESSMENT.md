# PHASE 1 — DATABASE MIGRATION RECOVERY: TECHNICAL ASSESSMENT

**Status:** Assessment only — **no Phase 1 implementation has been performed.**
**Date:** 2026-10-22
**Roadmap source:** `PROJECT IMPLEMENTATION ROADMAP.md` (identical copy at `C:\Users\hp\Videos\New folder\New folder\PROJECT IMPLEMENTATION ROADMAP.md`), §4 Phase 1
**Baseline reference:** `PROJECT_IMPLEMENTATION_PROGRESS.md` (Phase 0, complete) — all Phase 0 findings are preserved and carried forward here; that file was **not modified** by this assessment.
**Roadmap §4 constraint honoured:** *"Do not immediately rewrite or delete existing migration files."* — no migration file, schema file, package file, env file, or application source file was modified by this assessment. No migration was run against `data/masjid.db`. No additional backup was created.

---

## 0. Scope, method, and safety statement

### 0.1 What was done

| Activity | Where | Write access |
| -------- | ----- | ------------- |
| Read schema, migrations, config, scripts, source | repository | read-only |
| Queried live database | `data/masjid.db` | **read-only** (`better-sqlite3` opened with `{ readonly: true }`) |
| Generated canonical SQLite DDL from `schema.prisma` | `Temp\msj-baseline\canonical.sql` | temp only |
| Built synthetic drift/legacy-history simulators | `Temp\msj-baseline\*.db`, `Temp\msj-chain\` | temp only, **zero rows, no personal data** |
| Ran `prisma migrate diff` (read-only operation) | repo + isolated temp workspaces | read-only against target DBs |
| Ran `prisma migrate deploy` / `migrate resolve` | **only** against synthetic temp databases | temp only |

### 0.2 What was NOT done

- No `migrate deploy`, `migrate reset`, `db push`, `db seed`, or `db execute` was run against `data/masjid.db` or either backup.
- No file in the repository was created, modified, renamed, or deleted — **except this report**, `PHASE_1_MIGRATION_ASSESSMENT.md`, which was confirmed not to exist beforehand.
- No second backup was created. The backup analysed below is the one made during Phase 0.
- No restore was performed. Task 9 below is a **recommendation only**.
- No personal member data, payment-level detail, credential, or secret appears in this document. Only counts, aggregates, schema DDL, and error codes are quoted.

### 0.3 Important scope limitation

The live database was **never copied** for analysis. A copy of the live file into a temp directory was requested during the investigation and was correctly refused by the safety classifier because it duplicates personal member and payment data. Consequently:

- All migration-replay and repair testing was done against **structurally faithful synthetic databases** (same DDL, same drift, same migration-history rows, zero data rows).
- The one validation that could not be completed without a live copy — applying the repair migration to a **populated** drifted database — is listed as an open item in §11 and must be performed as the first step of implementation, under backup cover, on a restored copy.

This limitation is stated plainly rather than papered over. It does not weaken the schema findings, which are structural, but it does mean **no repair has been proven against real data volumes**.

---

## 1. Provider, ORM, and configuration reconfirmation

| Item | Value | Evidence |
| ---- | ----- | -------- |
| ORM | Prisma **7.10.1** | `package.json` |
| Driver adapter | `@prisma/adapter-better-sqlite3` 7.10.1 | `package.json`, `src/lib/db.ts` |
| Config file | `prisma.config.ts` (uses `defineConfig`, `env` from `prisma/config`) | `prisma.config.ts` |
| Schema path | `prisma/schema.prisma` | `prisma.config.ts` |
| Migrations path | `prisma/migrations` | `prisma.config.ts` |
| Seed | `tsx ./prisma/seed.ts` | `prisma.config.ts` |
| Datasource provider | `sqlite` | `prisma/schema.prisma:7` |
| Live URL | `file:./data/masjid.db` | `.env` → `DATABASE_URL` |
| `migration_lock.toml` provider | `sqlite` | `prisma/migrations/migration_lock.toml` |
| Schema engine | `d1b3f377ca835d73d50954a5e22128b9ebdd6b8` | Prisma 7.10.1 |
| Node | v24.21.0 | environment |
| Models / Prisma enums | 22 models, **0 enums** | `prisma/schema.prisma` |

**Findings**

- **F-1.1 — The Prisma configuration is correct for SQLite and needs no change.** `prisma.config.ts` declares `provider = "sqlite"` and the lock file agrees. There is no PostgreSQL residue in the *configuration*; the PostgreSQL residue is confined to migration SQL (§2).
- **F-1.2 — `prisma migrate status` is not a correctness signal.** It compares the *recorded migration list* against the *migration folder*. It reports "Database schema is up to date!" on the live database while the live schema is missing a foreign key that `schema.prisma` declares. It must never be used as acceptance evidence on its own. The only trustworthy drift signal is `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`, which returns `-- This is an empty migration.` when there is no drift.
- **F-1.3 — Prisma 7 CLI surface differs from Prisma 5/6.** `--from-schema-datamodel` / `--from-url` do not exist in Prisma 7; the equivalents are `--from-config-datasource`, `--from-migrations`, `--from-empty`, `--to-schema`, `--to-url`. `--skip-seed` is not accepted by `migrate deploy`. Anyone following an older Prisma runbook will hit this.
- **F-1.4 — `npm run setup` is currently unusable.** `setup` = `preflight && prisma migrate deploy && prisma generate && tsx prisma/seed.ts`. Because `migrate deploy` fails on a fresh database (§3), `npm run setup` fails on every clean machine. This is the single most visible symptom of R-1.

---

## 2. The three states compared

Roadmap §4.1 requires comparing (1) `prisma/schema.prisma`, (2) the actual live schema, (3) the migration history and migration SQL. None is assumed correct. All three were compared; results below.

### 2.1 State (3) — the migration chain as written

Three migrations exist:

| # | Directory | Content summary |
| - | --------- | -------------- |
| 1 | `20261019092355_init` | 21 `CREATE TABLE`s + 36 `CREATE INDEX`es. **Opens with 4 PostgreSQL-only statements:** `CREATE TYPE "Frequency" AS ENUM (...)`, `"CollectionMode"`, `"EventStatus"`, `"AssignmentStatus"`. Uses `DATETIME`/`BOOLEAN` declared types (acceptable in SQLite as affinity hints). Declares `MasjidNotificationSettings` with `BOOLEAN` flags, `DATETIME` timestamps, `ON UPDATE CASCADE`, and `masjidId TEXT NOT NULL UNIQUE` (inline, so SQLite creates `sqlite_autoindex_…`). |
| 2 | `20261020083135_add_masjid_user_status` | **No-op: `SELECT 1;`** — 155 bytes. Despite the name, `User.status` and `MasjidUser.status` are actually created by migration 1 (`init` lines 39 and 402). The migration contributes nothing. |
| 3 | `20261021140500_add_collection_events` | Creates `CollectionEvent` + `CollectionEventAssignment`; `ALTER TABLE "ContributionCategory" ADD COLUMN` × 7; `ALTER TABLE "PaymentAllocation" ADD COLUMN "collectionEventId" TEXT`; 5 `CREATE INDEX`es. **Two defects:** (a) it re-adds `defaultGraceDays`, `description`, `defaultAmountPaise`, `frequency`, `collectionMode`, `schedulingRules`, `defaultDueDay` — **all seven of which migration 1 already created**; (b) it adds `collectionEventId` **with no foreign key**. |

Directly reproduced by executing the migration SQL against a synthetic SQLite file:

```
init (with CREATE TYPE stripped) applied OK
migration3 applied -> FAILED: duplicate column name: description
```

So even after removing the PostgreSQL enums, **the chain still does not replay**, because migration 3 assumes a `ContributionCategory` that lacks the seven columns migration 1 creates. This is DB-003's "duplicate-column problem", confirmed by execution rather than by inspection.

### 2.2 State (2) — the live schema, as actually created

The live tables were produced by a **hand-repair** path, not by the chain:

| Table | Live DDL differs from migration 1 because |
| ----- | ---------------------------------------- |
| `Masjid` | inline `UNIQUE` on `slug` was **dropped** — `slug TEXT NOT NULL` with no `UNIQUE`. A separate named index `Masjid_slug_key` exists, so uniqueness *is* enforced — but the declaration is inverted relative to migration 1. |
| `User` | inline `UNIQUE` on `email` was **dropped**; named index `User_email_key` exists. `upiId` was appended by `ALTER TABLE ADD COLUMN`. |
| `Member` | inline `UNIQUE` on `telegramChatId` was **dropped**; named index `Member_telegramChatId_key` exists. `telegramChatId`, `notifyTelegram`, `notifyInApp`, `notifyEmail`, `quietHoursStart`, `quietHoursEnd`, `timezone` were appended by `ALTER TABLE ADD COLUMN`. |
| `ContributionCategory` | the 7 columns now sit at the end of the table via `ALTER TABLE` (migration 1 had them in the original `CREATE TABLE`). |
| `PaymentAllocation` | `collectionEventId` appended via `ALTER TABLE` — **no FK constraint**. |
| `MasjidNotificationSettings` | **Not from migration 1 at all.** Created by `scripts/add-notification-columns.ts` with `INTEGER` flags, `TEXT NOT NULL DEFAULT (datetime('now'))` timestamps, `masjidId TEXT NOT NULL UNIQUE` (inline). No named `MasjidNotificationSettings_masjidId_key` index. |
| `Member.telegramChatId` | appended by `scripts/add-telegram-column.ts`. |

Live schema object counts: **22 tables**, **45 named indexes**, **24 SQLite autoindexes**.

### 2.3 State (1) — `schema.prisma` as the intended target

22 models. `schema.prisma` is the *most accurate* of the three states with respect to intended structure — it declares the `collectionEventId` FK with `onDelete: SetNull` (`prisma/schema.prisma:288`) and `MasjidNotificationSettings` with `Boolean` flags and `onUpdate: NoAction` (`prisma/schema.prisma:437-447`).

**But it is not the source of truth either**, for these reasons:

- **F-2.1 — `schema.prisma` cannot express what the live database actually does.** It declares `MasjidNotificationSettings.masjidId` as `@unique`, which Prisma renders as a *named* unique index. The live table has an *inline* `UNIQUE`, i.e. a `sqlite_autoindex`. SQLite treats these as different schema objects, so Prisma reports drift on the index even though uniqueness is equally enforced. This is a cosmetic difference, but it is why `migrate diff` keeps emitting a `RedefineTables` block for that table forever.
- **F-2.2 — `schema.prisma` declares zero Prisma enums.** Every `status`, `role`, `frequency`, `collectionMode`, `approvalStatus`, `mode` field is a free-form `String` (DB-031). SQLite has no `CREATE TYPE … AS ENUM`, so the four enum types in migration 1 have no counterpart in the schema and no possible SQLite representation. **The migration 1 enums are dead weight that must be deleted, not translated.** The schema's use of `String` is the platform-correct choice and should be retained; DB-031 is informational, not a defect to fix.
- **F-2.3 — `schema.prisma` does not model `Masjid.receiptPrefix` uniqueness**, which Phase 0 flagged as convention-only (Decision 3). This is a Phase 1 constraint question, not a drift item.

### 2.4 The recorded migration history (live `_prisma_migrations`)

| `migration_name` | `finished_at` | `rolled_back_at` | `logs` | Checksum vs. current file |
| ---------------- | ------------- | ---------------- | ------ | -------------------------- |
| `20261019092355_init` | set | null | — | **MISMATCH** |
| `20261020083135_add_masjid_user_status` | set | null | — | **MISMATCH** |
| `20261021140500_add_collection_events` | null | **set** | "A migration failed to apply…" | match |
| `20261021140500_add_collection_events` | set | null | — | match |

**F-2.4 — NEW FINDING: two of the three migration files have been edited after they were applied.** The checksums recorded in the live `_prisma_migrations` for `20261019092355_init` and `20261020083135_add_masjid_user_status` do not equal the SHA-256 of the files currently on disk (verified byte-for-byte; files use LF endings, so CRLF normalisation is not the cause). Migration 3's checksum matches exactly.

*Why this matters:* the files in `prisma/migrations/` are **not** the artefacts that produced the live database. Whatever the live schema was actually built from no longer exists in the repository. Consequences:

1. Prisma will never flag these as "modified" for already-applied migrations (it only warns on `migrate dev` for pending ones), so the divergence is silent.
2. **Editing an applied migration file is currently happening without any record.** This is exactly the practice Phase 1 must stop, and it is why §7.3 recommends a checksum manifest.
3. The live schema's inverted inline-`UNIQUE` style and the appended columns are consistent with the files having been edited after use and then re-run against a partially hand-fixed database — this is the most probable history, and it is consistent with the rolled-back migration 3 row.

**F-2.5 — The rolled-back row is a permanent P3009 landmine.** The live `_prisma_migrations` contains a failed (rolled-back) row for `20261021140500_add_collection_events` *and* a successful row for the same name. Prisma's `migrate deploy` checks for failed rows and refuses to apply anything new when one exists. The live database is currently in a state where **any new migration will be blocked by P3009** until that row is marked as rolled back or resolved. This is the single biggest operational blocker for Phase 1 and it must be cleared before any forward migration can be tested.

---

## 3. Exactly why a fresh install fails

**Symptom.** `prisma migrate deploy` against an empty SQLite database fails on the very first migration:

```
Applying migration `20261019092355_init`
Error: P3018
  Migration `20261019092355_init` failed to apply cleanly to the shadow database.
  near "TYPE": syntax error
```

The same failure appears as **P3006** when Prisma replays the chain into its shadow database (`prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma`):

```
Error: P3006
  Migration `20261019092355_init` failed to apply cleanly to the shadow database
  ... near "TYPE": syntax error
```

**Root cause.** `prisma/migrations/20261019092355_init/migration.sql` lines 1–11 are:

```sql
CREATE TYPE "Frequency" AS ENUM ('WEEKLY','MONTHLY','SEMI_ANNUAL','ANNUAL','YEARLY','EVENT_BASED','OCCASIONAL');
CREATE TYPE "CollectionMode" AS ENUM ('HOUSEHOLD_WISE','COMBINED');
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED','OPEN','COMPLETED','CANCELLED');
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING','PARTIAL','PAID','WAIVED');
```

`CREATE TYPE` is PostgreSQL syntax. SQLite has no user-defined types; the parser rejects the statement at the keyword `TYPE`. The four statements are the first executable SQL in the file, so the migration aborts before creating a single table.

**This is not a configuration problem.** `migration_lock.toml` says `provider = "sqlite"`, `prisma.config.ts` says `provider = "sqlite"`, and `schema.prisma` says `provider = "sqlite"`. The chain was authored for PostgreSQL and later relabelled as SQLite without being regenerated.

**Second, independent failure.** Even with the four `CREATE TYPE` statements deleted, the chain still fails — migration 3 tries to `ALTER TABLE "ContributionCategory" ADD COLUMN "description"` on a table that migration 1 already created with that column:

```
init (CREATE TYPE removed) applied OK
migration3 -> FAILED: duplicate column name: description
```

So the fresh-install failure is **two-layered**, and fixing only the enums is not sufficient.

**Third layer — the columns that migration 3 would have added but that migration 1 already has.** All seven `ContributionCategory` columns (`description`, `defaultAmountPaise`, `frequency`, `collectionMode`, `schedulingRules`, `defaultDueDay`, `defaultGraceDays`) are created by migration 1. Migration 3 re-adds all seven. Migration 3 is therefore not merely "partly redundant" — it is *entirely* redundant against migration 1, apart from the two new tables, the `PaymentAllocation` column, and the five indexes.

**Fourth layer — `User.status` / `MasjidUser.status` (DB-002).** The audit finding says these "exist in DB but are not represented by any real migration." On inspection that is **partly incorrect**: `init` *does* create them (`"status" TEXT NOT NULL DEFAULT 'ACTIVE'` on `User` at line 39 and on `MasjidUser` at line 402, with a `MasjidUser_masjidId_status_idx`). The real defect is different and arguably worse:

- Migration 2 is named `add_masjid_user_status` and contains `SELECT 1;` — it does nothing.
- Migration 1 already created those columns.

So the migration named after the change performs no change, and the change it claims to make was performed by a *different* migration. The audit's conclusion (columns are untracked) is right; its explanation (they are in no migration) is wrong. **This distinction matters, because it changes the fix:** the columns do not need to be added anywhere — they need to be *renamed away from* a migration that has already been applied.

**Fifth layer — `PaymentAllocation.collectionEventId` has no FK in any artefact.** Migration 3 adds the column without a constraint; the live table was hand-patched without a constraint; only `schema.prisma:288` declares one. The FK has **never** existed in the live database.

---

## 4. Complete schema-difference list

### 4.1 Live database ↔ `schema.prisma` (measured with `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`)

The diff is **exactly two tables**. Nothing else differs.

**Difference 1 — `PaymentAllocation`**

| Aspect | Live DB | `schema.prisma` |
| ------ | ------- | --------------- |
| `collectionEventId` column | present, `TEXT`, nullable | present, `String?` — agrees |
| FK on `collectionEventId` | **ABSENT** | present, `onDelete: SetNull` (`:288`) |
| Other 4 FKs | present, matching | matching |
| Indexes `@@index([masjidId, paymentId])`, `@@index([duesPeriodId])`, `@@index([collectionEventId])` | all 3 present | matching |

**Difference 2 — `MasjidNotificationSettings`**

| Aspect | Live DB | `schema.prisma` |
| ------ | ------- | --------------- |
| `telegramEnabled` / `emailEnabled` / `inAppEnabled` declared type | `INTEGER` | `BOOLEAN` |
| `createdAt` / `updatedAt` declared type | `TEXT`, `NOT NULL DEFAULT (datetime('now'))` | `DATETIME`, `NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| `updatedAt` `@updatedAt` semantics | not expressible as a DDL default | `DATETIME NOT NULL` (no default) |
| Unique index on `masjidId` | **inline `UNIQUE`** → `sqlite_autoindex_MasjidNotificationSettings_2` | **named** `MasjidNotificationSettings_masjidId_key` |
| FK `onUpdate` | `CASCADE` (implicit) | `NO ACTION` (`:447`) |

**Unique constraint reality check (important — the uniqueness is NOT missing):** the live table declares `masjidId TEXT NOT NULL UNIQUE` inline, and SQLite materialised it as `sqlite_autoindex_MasjidNotificationSettings_2`. Uniqueness **is enforced**. What is missing is the *named* index object that Prisma expects. The live table has **3 rows**, and 3 distinct `masjidId` values — no duplicates, so adding the named index is safe.

**Index-set comparison (live vs. canonical SQLite DDL generated from `schema.prisma`):**

- canonical: 46 named indexes; live: 45 named indexes
- **missing in live: exactly 1** — `MasjidNotificationSettings_masjidId_key`
- **extra in live: 0**

The 24 SQLite autoindexes in the live database cover the inline `UNIQUE` declarations that the canonical form expresses as named indexes (`Masjid_slug_key`, `User_email_key`, `Member_telegramChatId_key`, `Reversal_originalPaymentId_key`, `Reversal_reversalPaymentId_key`, `MasjidNotificationSettings_masjidId_key`). Both forms enforce the same constraint; only the object names differ.

### 4.2 Migration SQL ↔ `schema.prisma`

| # | Migration-side fact | Schema-side fact | Verdict |
| - | ------------------- | ---------------- | ------ |
| M-1 | 4 `CREATE TYPE … AS ENUM` | 0 Prisma enums | Migration is wrong; schema is right (SQLite cannot express enums) |
| M-2 | Migration 1 creates `User.status`, `MasjidUser.status` | both present | Migration 1 is right; **migration 2 is redundant** |
| M-3 | Migration 3 re-adds 7 existing `ContributionCategory` columns | all 7 present | Migration 3 is wrong |
| M-4 | Migration 3 adds `PaymentAllocation.collectionEventId` with no FK | FK declared at `:288` | Migration 3 is wrong |
| M-5 | Migration 3 creates `CollectionEvent`/`CollectionEventAssignment` | both present | Correct — but migration 3 as a whole cannot run |
| M-6 | Migration 1's `MasjidNotificationSettings` uses `BOOLEAN`/`DATETIME`/`ON UPDATE CASCADE`/inline `UNIQUE` | `Boolean`/`DateTime`/`NoAction`/named unique | Semantically equivalent except the `onUpdate` clause and index naming |
| M-7 | Migration 1 has no `PaymentAllocation`→`CollectionEvent` FK | required | Missing in migration 1 too (the table does not exist there) |

### 4.3 Live DB ↔ migration SQL

| # | Live fact | Migration fact |
| - | --------- | -------------- |
| L-1 | `Masjid.slug`, `User.email`, `Member.telegramChatId`, `Reversal.originalPaymentId`, `Reversal.reversalPaymentId` have **inline** `UNIQUE` | migration 1 has the same inline `UNIQUE`; the **named** index form comes from `schema.prisma` |
| L-2 | `MasjidNotificationSettings` created by `scripts/add-notification-columns.ts` | migration 1 also creates it — but the live table's DDL is the script's, not the migration's |
| L-3 | `Member` has 7 columns appended via `ALTER TABLE` | migration 1 creates them inside `CREATE TABLE` |
| L-4 | `ContributionCategory` has 7 columns appended via `ALTER TABLE` | migration 1 creates them inside `CREATE TABLE` |
| L-5 | `PaymentAllocation.collectionEventId` appended, no FK | migration 3 appends it, no FK |
| L-6 | `Masjid` and `PaymentAllocation` and `User` DDL text shows an appended column on the same line as the closing paren | artifact of `ALTER TABLE`; cosmetic only |

### 4.4 Discrepancy summary (Phase 0 D-1…D-8, updated)

| # | Phase 0 label | Status after this assessment |
| - | ------------- | --------------------------- |
| D-1 | `CREATE TYPE` statements | **Confirmed and fully characterised** — 4 statements, lines 1–11 of migration 1; must be deleted, not translated. |
| D-2 | `User.status` / `MasjidUser.status` untracked | **Refined.** They *are* created by migration 1. The defect is that migration 2 (`add_masjid_user_status`) is a no-op named after work migration 1 already did. |
| D-3 | `ContributionCategory.defaultGraceDays` re-added | **Confirmed and widened** — all **7** columns are re-added, not 1. |
| D-4 | `PaymentAllocation.collectionEventId` FK missing | **Confirmed.** Missing in live DB, in migration 3, and in migration 1. Exists only in `schema.prisma`. |
| D-5 | `MasjidNotificationSettings` `INTEGER` flags | **Confirmed.** Also `TEXT` timestamps, `onUpdate CASCADE` vs `NO ACTION`, and inline vs named unique index. Uniqueness itself is enforced. |
| D-6 | `Member.notifyTelegram` etc. as `Int` (1/0) | **Confirmed as intended** — deliberately numeric, not drift. No action. |
| D-7 | `CollectionEventAssignment` has no `masjidId` | **Confirmed.** Tenant scoping is app-level only. This is a Phase 3 (tenant isolation) item, not a migration item. |
| D-8 | Enum-typed fields are `String` | **Confirmed as a SQLite platform constraint**, not a modelling defect. No action; retain `String`. |

---

## 5. Can a safe SQLite baseline be prepared without changing the live database?

**Yes — demonstrated.** The canonical SQLite DDL was generated directly from `schema.prisma` with Prisma's own diff engine:

```
prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```

and applied to a fresh temporary SQLite file. Result:

| Check | Result |
| ----- | ------ |
| Tables created | 22 |
| Named indexes created | 46 |
| `PRAGMA integrity_check` | `ok` |
| `PRAGMA foreign_key_check` | 0 violations |
| `prisma migrate diff` canonical-vs-`schema.prisma` | **`-- This is an empty migration.`** → **zero drift** |

A second synthetic database was then built by applying the canonical DDL and then **swapping in the two drifted tables** to reproduce the live database's exact drift, followed by applying the repair script (the table-rebuild pattern: create new table → `INSERT … SELECT` → drop → rename → recreate indexes, wrapped in `PRAGMA foreign_keys=OFF` / `defer_foreign_keys=ON`). Result:

| Check | Result |
| ----- | ------ |
| `PRAGMA integrity_check` | `ok` |
| `PRAGMA foreign_key_check` | 0 violations |
| Semantic comparison of **68 schema objects** against canonical | **0 differences** |

**Conclusion.** A correct, SQLite-compatible, zero-drift baseline **can** be produced entirely offline, from `schema.prisma`, without touching `data/masjid.db`. The repair of the two drifted tables is likewise proven to converge exactly on canonical. The live database is not required, and is not required to be modified, to *design* the fix.

**Two caveats, stated precisely:**

1. **The repair was proven on a zero-row database.** The table-rebuild pattern preserves rows via `INSERT … SELECT` with an explicit column list, so it is designed to preserve data, but it has **not** been proven against the live 51 members / 15 payments / 19 allocations / 914 dues periods. This must be the first thing validated in implementation, on a restored copy (§11, step 2).
2. **One data question is unresolved and must be answered before the repair can be applied to real data.** Adding the `collectionEventId` FK with `ON DELETE SET NULL` is safe only if no `PaymentAllocation` row points at a non-existent `CollectionEvent`. On the live database the answer is **0 orphaned rows** (verified, read-only), and `MasjidNotificationSettings` has **0 duplicate `masjidId`** (3 rows, 3 distinct). Both preconditions for the repair are therefore already satisfied by the live data. They must still be re-checked against the restored copy at execution time, because the restored copy may be older than the live file.

---

## 6. Recovery strategy comparison

### Option A — Correct the chain in place (edit the three existing migration files)

**Mechanism.** Rewrite `20261019092355_init` to remove the four `CREATE TYPE` statements and fix the FK; delete or empty `20261020083135_add_masjid_user_status`; rewrite `20261021140500_add_collection_events` to drop the seven duplicate `ALTER TABLE`s and add the `collectionEventId` FK.

**Fresh installs:** ✅ works.
**Existing installs:** ❌ **broken.** Prisma compares recorded checksums against the files on disk. Editing an already-applied migration changes its checksum, so every existing database — including the live one — will report the migration as *modified*. `migrate deploy` refuses to run against a database with modified applied migrations, and `migrate dev` will demand a `reset`. Every deployment that already ran the old chain would need `migrate resolve --applied` on names that no longer match the files, or a manual history rewrite.

**Additional problem:** the original artefacts that produced the live database **no longer exist** (§2.4, F-2.4). Editing the files makes the divergence permanent and irreversible.

**Verdict: rejected.** It destroys the ability to audit what actually happened and breaks every existing install.

### Option B — Squash to a single baseline migration, delete the old chain

**Mechanism.** Replace the three migrations with one canonical baseline (`2026xxxx_baseline`) containing the exact canonical DDL from §5; delete the three old migration directories.

**Fresh installs:** ✅ works — verified, zero drift.
**Existing installs:** ❌ **broken.** Deleting the old migration directories means Prisma sees the live database's recorded migration names (`20261019092355_init`, …) as "migrations from the database not found locally". `migrate status` reports the histories have diverged; `migrate deploy` will attempt to apply the baseline against tables that already exist and fail with **P3018** ("table already exists"). Verified on a synthetic existing install: deploy fails P3018, and a second run fails **P3009** ("migrate found failed migrations in the target database, new migrations will not be applied"). The failed row is then permanently written to the live database's history.

**Verdict: rejected for the live database.** It would have to be paired with a `migrate resolve` dance that silently marks the baseline as applied — which reconciles the *history* while leaving the *schema* untouched (see Option C's failure mode). It is defensible for a brand-new deployment with no data, but the project has a live database with data.

### Option C — History reconciliation only (`migrate resolve --applied`)

**Mechanism.** Mark the three legacy migration names as applied so the history matches the folder, without touching the schema.

**Fresh installs:** n/a.
**Existing installs:** partially works. Verified on a synthetic drifted install: `migrate resolve --applied` for each legacy name succeeds, and `migrate status` then reports "up to date".

**Critical limitation:** it reconciles the **history**, not the **schema**. After resolving, the missing `collectionEventId` FK and the `MasjidNotificationSettings` type/index differences are **still there**. The database will report "up to date" while the schema is still wrong. Verified: after resolution the drift diff still returns the same two-table `RedefineTables` block.

**Verdict: necessary but not sufficient.** History reconciliation is a *prerequisite*, not a *solution*. It must be paired with a forward repair migration.

### Option D — History reconciliation + forward repair migration (RECOMMENDED)

**Mechanism.**

1. Keep the three original migration files **exactly as they are** (do not edit, do not delete) so the record of what happened is preserved. Their checksum mismatch (§2.4) is documented, not "fixed".
2. Add **one** new forward migration (e.g. `20261022000001_repair_drift`) whose SQL is the Prisma-generated repair script — the table-rebuild pattern for `MasjidNotificationSettings` and `PaymentAllocation`, adding the `collectionEventId` FK with `ON DELETE SET NULL`, correcting the flag/timestamp column types and the `onUpdate` clause, and adding the named `MasjidNotificationSettings_masjidId_key` index.
3. Add a **second** new migration that carries the canonical SQLite DDL for a **fresh** install (or, equivalently, ship the canonical DDL as the baseline in the migration folder with the legacy names preserved as no-op archival entries) — this is the mechanism that makes fresh installs work *without* breaking existing installs.
4. For the existing live database: `migrate resolve --applied` on the three legacy names → clears the rolled-back P3009 landmine → `migrate deploy` applies the forward repair → drift diff returns `-- This is an empty migration.`

**Fresh installs:** ✅ once step 3 is in place.
**Existing installs:** ✅ history reconciled, schema repaired, forward-only, no data deletion, no reset.
**Rollback:** SQLite DDL is not transactionally rollback-safe for table rebuilds in a general sense, but this specific rebuild *is* wrapped in `PRAGMA defer_foreign_keys=ON` / `PRAGMA foreign_keys=OFF` and executed inside Prisma's per-migration transaction, so a failure aborts cleanly. The belt-and-braces recovery is the verified backup (§9).

**Verified in this assessment (on synthetic databases):**

| Step | Result |
| ---- | ------ |
| Canonical DDL applied to an empty SQLite file | ✅ 22 tables, 46 named indexes, integrity `ok`, 0 FK violations, zero drift vs `schema.prisma` |
| Repair script applied to a drifted database | ✅ integrity `ok`, 0 FK violations, **68 objects compared → 0 differences** from canonical |
| `migrate resolve --applied` on a drifted install with legacy history | ✅ succeeds; `migrate status` → "up to date" |
| `migrate deploy` of a canonical baseline against a drifted existing install | ❌ P3018 → then P3009 (this is why the baseline must **not** be the thing deployed to an existing database) |

**Verdict: recommended.** It is the only option that satisfies every Phase 1 acceptance criterion simultaneously: fresh install works, existing data is preserved, migration history matches intent, the missing FK exists, and no migration is ever tested only against the production database.

### Option E — Rebuild the database from the canonical DDL and re-import data

**Mechanism.** Create a brand-new database from canonical DDL, copy all rows table-by-table from the live database, swap the files.

**Verdict: rejected.** It is the highest-risk option (silent row-loss or column-value-coercion risk on `TEXT` ↔ `DATETIME`/`BOOLEAN` conversions), it requires the app to be down, and it offers no advantage over Option D, which uses the same table-rebuild pattern *in place* and is already proven to converge exactly on canonical.

### Summary table

| Option | Fresh install | Existing install | Data preserved | History auditable | Verdict |
| ------ | ------------ | ---------------- | -------------- | ----------------- | ------- |
| A — edit chain in place | ✅ | ❌ checksum break | ✅ | ❌ | Rejected |
| B — squash & delete | ✅ | ❌ P3018/P3009 | ✅ | ❌ | Rejected |
| C — resolve only | n/a | ⚠️ history only | ✅ | ⚠️ | Necessary, insufficient |
| D — resolve + forward repair | ✅ | ✅ | ✅ | ✅ | **Recommended** |
| E — rebuild & re-import | ✅ | ✅ | ⚠️ risky | ⚠️ | Rejected |

---

## 7. Risks of baselining, squashing, editing applied migrations, and replacement migrations

### 7.1 Baselining (`migrate resolve --applied` on an existing database)

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| **Reconciles history but leaves schema wrong.** The database reports "up to date" while the `collectionEventId` FK is still missing. A false sense of safety. | **High** | Never treat `migrate status` as acceptance evidence. Always require `migrate diff --from-config-datasource --to-schema` to return `-- This is an empty migration.` |
| **The failed (rolled-back) row must be cleared first.** `migrate resolve --rolled-back 20261021140500_add_collection_events` is the documented way; if skipped, `migrate deploy` fails with P3009 and writes another failed row. | **High** | Sequence explicitly: (1) mark the rolled-back row as rolled back, (2) resolve the three legacy names as applied, (3) deploy. Verify with `migrate status` before each step. |
| **A second successful row already exists for the same name.** Resolving blindly could produce two "applied" rows for `20261021140500_add_collection_events`. | Medium | Inspect `_prisma_migrations` first; the resolution plan must be written against the actual rows. |
| **No rollback path.** `migrate resolve` rewrites history metadata; there is no undo. | Medium | Take a verified backup of the live database *before* any resolve operation (§9). |
| **Resolving the wrong migration name marks schema as applied when it is not.** | Medium | Only resolve names whose effects are demonstrably present in the live schema. Every one of the three has been verified present. |

### 7.2 Squashing (replacing the chain with one baseline)

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| **Existing installs cannot apply it** — P3018 "table already exists", then P3009. Verified. | **Critical** | A squashed baseline must never be the migration that is deployed to an existing database. Use it only for fresh installs; pair with a forward repair for existing ones. |
| **The record of the original failure is destroyed** — the rolled-back row and the "table CollectionEvent already exists" log are the only evidence of the original hand-repair. | High | Archive the legacy chain rather than deleting it (see 7.3). |
| **Data-loss window** — a squash invites "just recreate and re-import", which is Option E. | High | Never re-import as part of a migration change. |
| **A future developer cannot tell whether a drift is pre- or post-baseline.** | Medium | Document the baseline point in `PROJECT_IMPLEMENTATION_PROGRESS.md` and in the migration folder itself. |

### 7.3 Editing an already-applied migration file

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| **It is already happening, silently.** The live `_prisma_migrations` checksums for migrations 1 and 2 do not match the files on disk (§2.4). | **Critical** | Adopt a written rule: **no file under `prisma/migrations/` may be edited once it has been applied to any environment.** New changes go in a new migration. |
| **Checksum mismatch breaks `migrate deploy`/`migrate dev` for existing databases.** | High | Treat the current mismatch as a documented historical fact; do not attempt to "restore" the originals — they no longer exist. |
| **Future drift becomes undetectable.** Prisma will not compare checksums of already-applied migrations on `migrate deploy`. | High | Add a checksum manifest to the repo (§11, step 6) so drift is detectable by a scripted check rather than by a tool that no longer looks. |
| **Loss of forensic evidence.** | Medium | Do not delete or rewrite the legacy files as part of this repair. Leave them byte-identical. |

### 7.4 Replacement migrations (a forward migration that redefines tables)

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |
| **Table rebuild can lose data** if the `INSERT … SELECT` column list is incomplete or the column order changes. | **Critical** | The repair script uses an explicit, complete column list. Validate on a restored copy with row-count parity checks **before** touching the live file. |
| **Foreign keys must be disabled during the rebuild.** Without `PRAGMA foreign_keys=OFF` / `defer_foreign_keys=ON`, dropping and recreating a referenced table can cascade-delete child rows. | **Critical** | The generated repair script sets `PRAGMA defer_foreign_keys=ON; PRAGMA foreign_keys=OFF;` at the top and restores them at the end. Do not hand-edit these away. |
| **`TEXT` ↔ `DATETIME`/`BOOLEAN` coercion.** The live `MasjidNotificationSettings` stores timestamps as `TEXT` (`datetime('now')`) and flags as `INTEGER`; the target stores `DATETIME` and `BOOLEAN`. SQLite uses type *affinity*, so values survive the copy, but the stored representation changes. | Medium | Compare values before and after on the restored copy — count non-null, count distinct, and spot-check min/max timestamps — rather than trusting affinity. |
| **A failed repair leaves the database mid-rebuild.** | High | Run inside a verified backup; the recovery path is restore-from-backup (§9), not manual repair. |
| **`ON UPDATE` clause change from `CASCADE` to `NO ACTION`.** SQLite's `ON UPDATE` is effectively inert for the app's update patterns (it updates rows, not keys), but the semantic intent should be confirmed by whoever owns the schema. | Low | Documented here; no data impact expected. |
| **Non-atomicity across multiple table rebuilds in one migration.** | Medium | Prisma wraps each migration in a transaction; SQLite supports transactional DDL, so a failure rolls back the whole migration. Verified in the synthetic runs — `integrity_check` was `ok` after each successful application. |

---

## 8. Testing future migrations without touching `data/masjid.db`

### 8.1 The hard rule

**No migration may ever be tested — or applied — against `data/masjid.db` directly.** The roadmap (§4 acceptance criteria) states this explicitly: *"No migration has been tested only against the production database."*

### 8.2 Required test matrix

| # | Test | Target database | Data | Pass condition |
| - | ---- | --------------- | ---- | -------------- |
| T-1 | Fresh database creation | `data/.test-fresh.db` (disposable) | none | `migrate deploy` exits 0; 22 tables; 46 named indexes |
| T-2 | Full migration replay (shadow) | Prisma shadow DB | none | `migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma` succeeds with no P3006 |
| T-3 | Drift check | any test DB | none | `migrate diff --from-config-datasource --to-schema` → `-- This is an empty migration.` |
| T-4 | Upgrade from representative existing schema | `data/.test-existing.db` | seeded from canonical DDL + the 4 legacy history rows + the two drifted tables | `migrate deploy` exits 0; drift check empty |
| T-5 | Upgrade from **populated** existing schema | `data/.test-populated.db` | a copy of a **restored** backup (see §9) | row-count parity for all 22 tables; financial totals unchanged; integrity `ok`; 0 FK violations |
| T-6 | Foreign-key enforcement | T-1/T-5 DBs | — | inserting an orphan `collectionEventId` is **rejected**; deleting a referenced `CollectionEvent` **nulls** the allocation's `collectionEventId` (SET NULL) |
| T-7 | Data preservation | T-5 DB | — | every table's row count identical pre/post; per-Payment allocation sums identical; no receipt number changed |
| T-8 | Application startup after migration | T-5 DB | — | `prisma generate` succeeds; the app boots; a read-only dashboard page renders against the migrated DB |
| T-9 | Rollback / forward-recovery | T-5 DB | — | restore-from-backup reproduces the pre-migration state exactly (see §9) |
| T-10 | Rerun idempotence | T-1/T-5 DBs | — | `migrate deploy` a second time exits 0 and applies nothing |
| T-11 | Fresh-install entry point | disposable | — | `npm run setup` completes end-to-end on a clean checkout |

### 8.3 How to run the tests without touching the live database

The safe pattern, using the tooling actually present in this repo:

1. **Isolated workspace.** Create a scratch directory (e.g. `data/.mig-test/`) containing its **own** `prisma.config.ts` pointing at a **different** `file:` URL. Never reuse the repo's `prisma.config.ts` for a test run — it resolves `DATABASE_URL` from `.env`, which points at the live file. This is the single most important safety mechanism.

   ```ts
   // data/.mig-test/prisma.config.ts
   import { defineConfig } from "prisma/config";
   export default defineConfig({
     schema: "../../prisma/schema.prisma",
     datasource: { url: "file:./fresh.db" },
     migrations: { path: "../../prisma/migrations" },
   });
   ```

2. **Point the run at the test config.** `prisma --config data/.mig-test/prisma.config.ts migrate deploy`. (Prisma 7 supports `--config`; if it does not resolve in this installation, `cd` into the scratch directory so `prisma.config.ts` is discovered there — this is the mechanism already used successfully during this assessment in `Temp\msj-chain`.)

3. **Never copy the live file by hand.** If a populated test DB is needed, obtain it by **restoring the verified backup** into the scratch directory (§9) — a restore into a *new* path, never an overwrite of `data/masjid.db`.

4. **Clean up deterministically.** Test databases live under `data/.mig-test/` (gitignored by convention) and are deleted at the end of each run. Add the directory to `.gitignore` explicitly.

5. **Never run `migrate dev` against the live DB.** `migrate dev` will detect drift (the two drifted tables) and **prompt to reset the database**, which would drop the live database. Use `migrate deploy` for the live database and `migrate diff` for drift detection. This is a live hazard: `migrate dev` sees the live DB as "up to date" but the *schema* differs, and the reset prompt is one keystroke away.

### 8.4 Test-environment hygiene

- Run tests with `DATABASE_URL` overridden or with the scratch `prisma.config.ts`; never rely on the repo-root config in a test context.
- Add a guard to the test harness: assert the resolved database path is under `data/.mig-test/` or `Temp/` before any migration command runs, and abort otherwise. A path assertion is cheap and prevents the worst outcome.
- The disposable-DB names used during Phase 0 (`data/fresh-test.db`) must be removed from the repo — a stale test database in `data/` is a source of confusion and an accidental target.

---

## 9. Recommended backup-verification and isolated restore-test procedure

> **This section is a recommendation only. No restore was performed and no additional backup was created during this assessment, per the Phase 1 brief.**

### 9.1 Current backup inventory (read-only inspection)

| File | Size | Opens | `integrity_check` | `foreign_key_check` | Content | Usable recovery point? |
| ---- | ---- | ----- | ----------------- | ------------------- | ------- | --------------------- |
| `backups/masjid-2026-10-19-15-49-40.db` | 340 KB | ✅ | `ok` | 0 | 20 tables, **1 Masjid, 0 members, 0 payments**, 1 migration row (init only) | ❌ **No** — empty, pre-dates the collection-events work |
| `backups/masjid-2026-10-22T03-55-45-083Z.db` | 1.1 MB | ✅ | `ok` | 0 | 23 tables; Masjid 3, Member 51, Payment 15, PaymentAllocation 19, DuesPeriod 914, AuditLog 352, CollectionEvent 26; all 4 legacy migration rows | ✅ **Candidate** — see 9.2 |

The live database currently matches the Phase 0 backup on row counts.

### 9.2 Defects in the current backup regime

| # | Defect | Evidence | Severity |
| - | ------ | -------- | -------- |
| B-1 | **No restore has ever been verified.** The backup has been *opened and counted*, which is not a restore. | Phase 0 recorded "Queryable: Yes — reopened read-only and counted rows successfully" | **Critical** |
| B-2 | **`scripts/backup.mjs` uses a raw `copyFileSync`,** not SQLite's online backup API. A copy taken while the app is writing can be a torn file. The script's own docstring acknowledges this ("accept a hot copy"). | `scripts/backup.mjs:28` | **High** |
| B-3 | **No checksum is recorded** with any backup. Corruption cannot be distinguished from a legitimate older file. | `scripts/backup.mjs` | **High** |
| B-4 | **No restore script or documented restore test** exists. | repository | **High** |
| B-5 | **Retention is 14 by count only.** The oldest usable backup can be deleted by a routine run if 14 newer ones exist. | `scripts/backup.mjs:12` | Medium |
| B-6 | **The backup directory is inside the repository** and is not covered by the (non-existent) VCS. | `backups/` | Medium |
| B-7 | **The backup contains the same failed-migration history** as the live DB, including the rolled-back row. Restoring it restores the P3009 landmine. | inspected above | Medium |

### 9.3 Recommended backup procedure (Phase 6 hardening, but the *first* thing Phase 1 needs)

1. **Use SQLite's online backup API**, not a file copy:
   ```js
   await db.backup(destinationPath);   // better-sqlite3: db.backup(file)
   ```
   This produces a transactionally consistent snapshot even with the app running. (This is the method used for the Phase 0 backup.)
2. **Write a SHA-256 checksum sidecar** (`<backup>.db.sha256`) for every backup.
3. **Record metadata** alongside: source path, source size, row counts per table, `integrity_check` result, and the `_prisma_migrations` content.
4. **Never delete the last verified-good backup.** Retention should keep the newest N *and* at least one backup that has passed a restore test.
5. **Store backups outside the repository** (or at minimum in a directory that is explicitly excluded from source control and from any deployment artefact).

### 9.4 Recommended isolated restore-test procedure

**Purpose.** To prove, before Phase 1 touches the live database, that a backup can be restored into a working database and that the restoration is complete and correct.

**Procedure — all steps read-only with respect to the live database:**

| Step | Action | Pass criterion |
| ---- | ------ | -------------- |
| 1 | Stop the application (or confirm no writes are in flight) | no active writer |
| 2 | Re-verify the **source** backup file: `PRAGMA integrity_check` → `ok`; `PRAGMA foreign_key_check` → 0 rows; SHA-256 matches its sidecar | all three hold |
| 3 | **Restore into a NEW path** — e.g. `data/.restore-test/restore-01.db`. **Never over `data/masjid.db`.** | file exists, is a valid SQLite DB |
| 4 | Open the restored copy **read-only** and verify: `integrity_check` → `ok`; `foreign_key_check` → 0 | both hold |
| 5 | Compare **row counts** for all 22 tables against the source live database | exact match on every table |
| 6 | Compare **financial aggregates** — total `Payment` rows by status, per-Payment allocation sums vs. Payment amounts, count of `PaymentAllocation` with `allocatedAmountPaise <= 0` (must be 0), distinct `receiptNo` count vs. `Payment` count | all identical; no new non-positive amounts; no duplicate receipt numbers |
| 7 | Compare **schema** of the restored copy against `prisma/schema.prisma` via `migrate diff --from-url … --to-schema` | the **same two known differences** as the live DB (i.e. the restore is faithful — it reproduces the drift, which is expected, and does not introduce new drift) |
| 8 | Verify `_prisma_migrations` content in the restored copy | matches the source, including the rolled-back row |
| 9 | Run the **repair migration** (T-4/T-5) against the restored copy only | exits 0; drift check empty; row counts unchanged; financial aggregates unchanged |
| 10 | **Destroy the restored copy** (or retain it as the "post-migration rehearsal" artefact) | — |

**Outcome of a successful restore test:** the backup is proven restorable, the repair migration is proven against real data volumes, and the exact row-level effect of the table rebuilds is measured — *before* the live database is touched. Only then should the live procedure run.

### 9.5 The live procedure, once the restore test has passed

1. Take a **fresh** backup via the online backup API, with checksum sidecar. Record it.
2. Verify it immediately (integrity, FK, checksum).
3. Run the resolution sequence against `data/masjid.db`:
   `migrate resolve --rolled-back 20261021140500_add_collection_events` → `migrate resolve --applied <each legacy name>` → `migrate deploy`.
4. Verify: `integrity_check` → `ok`; `foreign_key_check` → 0; row counts unchanged on all 22 tables; financial aggregates unchanged; `migrate diff` → `-- This is an empty migration.`
5. If anything fails: **stop**, and restore from the backup by copying the backup file to `data/masjid.db` **only after renaming the current file to `data/masjid.db.pre-restore-<timestamp>`** (never deleting it).

**Until the restore test in 9.4 has been performed and passed, the existing backup must be treated as "present but unproven". It is not yet a verified recovery point.**

---

## 10. Business decisions from Section 18 that must be resolved before the relevant work

All eight Section 18 decisions remain unanswered. Those that block or shape Phase 1 work:

| Decision | Question (roadmap §18) | Relevance to Phase 1 | Blocks? |
| -------- | ---------------------- | --------------------- | ------- |
| **3 — Receipt prefix** | Must receipt prefixes be unique across all Masjids, or only within each Masjid? The database and the application must enforce the same rule. | Phase 1 §4.3 is the natural point to add the constraint. The live DB has **0 duplicate `Masjid.receiptPrefix`** (HMA, MMA, JMA) — but uniqueness today is **by convention only**, with no DB constraint. Adding a unique index is safe *if* the answer is per-Masjid-or-global in a way the data already satisfies; the live data satisfies **both** readings today, so the constraint can be added either way **only after the decision is made**, because the two options diverge as soon as a second Masjid wants an existing prefix. | **Yes** — before adding the index |
| **7 — Technology scaling** | Single application server with local SQLite, or multi-instance deployment required? Affects concurrency, backup, and database-platform decisions. | Determines whether SQLite is retained. If multi-instance or serverless is required, SQLite is not viable (Phase 0 found no deployment config and a Vercel-shaped `.gitignore`, and SQLite on serverless is non-viable). A Postgres migration would render the SQLite-specific baseline and table-rebuild strategy unnecessary and would change *everything* in this assessment. | **Yes** — this is the highest-leverage decision; it must be settled **before** any migration work begins, because it determines whether the canonical SQLite baseline is even the right target |
| **4 — Masjid deletion and audit retention** | Should a Masjid be archived rather than permanently deleted? | Affects `AuditLog.masjidId` `onDelete: Cascade` (Phase 0 R-11) — an `ON DELETE` clause change is a migration, which is Phase 1's subject. | Recommended before Phase 4; **not** blocking Phase 1 |
| **2 — Expense approval** | May an ADMIN approve their own expenses? | Affects `Expense.approvalStatus` semantics, not the schema. | No — Phase 4 |
| **5 — Collection-event completion** | What conditions make an event COMPLETED, and when may it be reopened? | Affects `CollectionEvent.status` values, which the SQLite baseline stores as `TEXT`. A change of allowed values is an application/data change, not a DDL change (no enum to alter — see F-2.2). | No — Phase 4 |
| **6 — Restricted-purpose contributions** | Which categories require separate accounting or special approval? | May add a boolean/flag column to `ContributionCategory` — a future migration. | No |
| **1 — Subscription expiry** | What happens when a Masjid's subscription expires? | May add columns to `Subscription`. | No — Phase 7 |
| **8 — Notification providers** | Which messaging/email providers, and who configures credentials? | May add columns to `MasjidNotificationSettings` — note this table is one of the two being rebuilt, so any decision here should land **in the same repair migration** rather than as a second rebuild of the same table. | **Coordinate, not blocking** |

**Summary: Decisions 3 and 7 are hard blockers for Phase 1 implementation.** Decision 7 in particular must be answered first, because it decides the target database platform; every technical finding in this assessment is stated for SQLite.

**Roadmap rule honoured:** §18 — *"Do not silently invent business policies where they affect financial records or tenant access."* No policy has been applied here.

---

## 11. Safest implementation sequence with objective acceptance criteria

> **This is a proposal for approval. Nothing in this section has been executed.** The Phase 1 brief states: *"Stop after the assessment. Do not implement any migration fixes."*

### Step 0 — Gate: obtain decisions

| Action | Acceptance criterion |
| ------ | -------------------- |
| Obtain **Decision 7** (technology scaling) and **Decision 3** (receipt prefix) | Both answered in writing and recorded in `PROJECT_IMPLEMENTATION_PROGRESS.md`. |
| If Decision 7 selects Postgres, **stop and re-assess** — this document's SQLite-specific baseline and table-rebuild strategy do not transfer. | Recorded in the progress document. |

### Step 1 — Establish and verify a recoverable recovery point

| Action | Acceptance criterion |
| ------ | -------------------- |
| Take a fresh backup of `data/masjid.db` using the **online backup API**; write a SHA-256 sidecar; record row counts and `integrity_check` output. | Backup file exists; sidecar matches; `integrity_check` = `ok`; `foreign_key_check` = 0; row counts match the live DB. |
| Perform the **isolated restore test** (§9.4, steps 1–8) into `data/.restore-test/`. | Restored copy opens; integrity `ok`; FK 0; row counts identical across all 22 tables; financial aggregates identical; drift in the restored copy = exactly the two known differences. |
| Publish a restore command in `PROJECT_IMPLEMENTATION_PROGRESS.md`. | The restore procedure is written down and has been executed at least once end-to-end. |

*Rationale:* the roadmap's §20.5 requires a verified backup **before** any database change. At the time of writing, no restore has been verified (B-1), so this is genuinely step one, not a formality.

### Step 2 — Prove the repair against populated data (never against the live DB)

| Action | Acceptance criterion |
| ------ | -------------------- |
| Restore the backup into `data/.restore-test/populated.db` and run the repair migration against **that** copy. | Migration exits 0; `integrity_check` = `ok`; `foreign_key_check` = 0; row counts on all 22 tables **identical** to the source; financial aggregates identical (Payment counts by status, per-Payment allocation sums, no new non-positive amounts, receipt numbers unchanged). |
| Specifically verify the `TEXT`→`DATETIME` / `INTEGER`→`BOOLEAN` conversion on `MasjidNotificationSettings`. | All 3 rows present with all flag values preserved (0/1 → false/true, no value flipped) and timestamps preserved to the second. |
| Verify FK enforcement on the migrated copy. | Inserting an orphan `PaymentAllocation.collectionEventId` is **rejected**; deleting a referenced `CollectionEvent` sets the allocation's `collectionEventId` to `NULL` (SET NULL) rather than cascading. |

### Step 3 — Build the clean-install chain (fresh installs)

| Action | Acceptance criterion |
| ------ | -------------------- |
| Add the canonical SQLite baseline (the exact DDL verified in §5) as a **new** migration directory. | `prisma migrate deploy` against an empty database exits 0; 22 tables; 46 named indexes; `integrity_check` = `ok`; `foreign_key_check` = 0. |
| **Do not delete or edit the three legacy migration directories.** | The three legacy directories are byte-identical to their current state. |
| Ensure the fresh path does not execute the broken legacy SQL. | A fresh `migrate deploy` performs no `CREATE TYPE` and no duplicate-column `ALTER TABLE`; no P3006/P3018 in the shadow replay. |

### Step 4 — Build the forward repair migration (existing installs)

| Action | Acceptance criterion |
| ------ | -------------------- |
| Add **one** new forward migration containing the table-rebuild repair for `MasjidNotificationSettings` and `PaymentAllocation` (adding the `collectionEventId` FK, correcting the flag/timestamp types, correcting `onUpdate`, adding the named unique index). | The migration is a single file; it contains no `DROP TABLE` outside the two rebuilds; it sets and restores `PRAGMA foreign_keys` correctly. |
| Apply it to the populated restore-test copy (Step 2 artefact). | Drift check returns `-- This is an empty migration.`; all data checks from Step 2 still pass. |
| Apply it to the **drifted synthetic** install with legacy history, after `migrate resolve`. | `migrate status` → "up to date"; drift check empty; integrity `ok`. |

### Step 5 — Reconcile the live database's history and deploy

| Action | Acceptance criterion |
| ------ | -------------------- |
| With the app stopped and the Step-1 backup verified: `migrate resolve --rolled-back 20261021140500_add_collection_events`. | The rolled-back row is no longer "failed"; `migrate status` no longer reports a failed migration. |
| `migrate resolve --applied` for each of the three legacy names. | `migrate status` reports "up to date" **and** the drift check still shows exactly the two known differences — proving the resolve reconciled history only, not schema. |
| `migrate deploy`. | Exits 0; the repair migration is recorded as applied. |
| Full post-deploy verification of the live database. | `integrity_check` = `ok`; `foreign_key_check` = 0; **row counts on all 22 tables identical to the backup**; financial aggregates identical; `migrate diff --from-config-datasource --to-schema` → `-- This is an empty migration.` |
| Application smoke test. | The app boots against the migrated live database and renders a read-only dashboard without error. |

### Step 6 — Prevent recurrence

| Action | Acceptance criterion |
| ------ | -------------------- |
| Add a checksum manifest of `prisma/migrations/**` to the repository, and a check that compares it to `_prisma_migrations`. | The check runs in CI or as an npm script and reports the current known mismatches for migrations 1 and 2 explicitly, rather than silently. |
| Document the rule: **applied migrations are immutable.** | The rule is in `docs/` or the repo's contributing notes. |
| Make `migrate dev` safe. | Either document that `migrate dev` must never be run against `data/masjid.db`, or add a guard script that refuses to run destructive Prisma commands when `DATABASE_URL` points at the live file. |
| Fix the backup script (online backup API + checksum sidecar + metadata + retention of the last verified-good backup). | `npm run backup` produces a checksummed, consistent snapshot; a restore test script exists and has passed once. |

### Step 7 — Update the tracking document and report

| Action | Acceptance criterion |
| ------ | -------------------- |
| Update `PROJECT_IMPLEMENTATION_PROGRESS.md` in the roadmap's §20 completion-report format. | Contains phase name, tasks completed/in-progress/blocked, files changed, migrations created, tests run and results, backup/rollback status, remaining risks, decisions awaiting approval. |
| Do **not** proceed to Phase 2. | Report ends with a stop and a recommended next phase. |

### Objective acceptance criteria for Phase 1 overall (roadmap §4)

| Roadmap criterion | How it is met | Evidence it produces |
| ----------------- | -------------- | --------------------- |
| Fresh installation can create the complete schema | Step 3 | `migrate deploy` on an empty DB exits 0; 22 tables / 46 indexes; zero drift |
| Existing data can be preserved during the upgrade | Steps 2, 5 | Row-count parity and financial-aggregate parity, before and after, on a populated copy and then on the live DB |
| Migration history matches the intended database state | Step 5 | `migrate status` = up to date; no rolled-back/failed rows; `_prisma_migrations` contains one applied row per migration, with the legacy three marked applied and the repair applied |
| Required foreign keys exist and work | Steps 2, 4, 5 | `PaymentAllocation.collectionEventId` FK present; orphan insert rejected; parent delete → `SET NULL` |
| No migration has been tested only against the production database | Steps 2, 3, 4 | Every migration validated on at least one disposable DB **and** one populated restored copy before touching the live DB |
| Recovery instructions are documented | Steps 1, 7 | Verified restore procedure + the exact restore command recorded in the progress document |

---

## 12. Carry-forward of Phase 0 findings (preserved)

All Phase 0 findings remain valid and are carried forward. The Phase 0 risks most affected by this assessment are re-stated with updated severity.

| # | Phase 0 risk | Phase 1 status after assessment |
| - | ------------- | ----------------------------- |
| R-1 | Fresh install is broken | **Confirmed and refined.** Two independent failure layers: (a) 4 PostgreSQL `CREATE TYPE` statements; (b) migration 3 re-adds 7 columns migration 1 already created. Confirmed by execution, not inspection. |
| R-2 | Failed-and-resolved migration row in live history | **Confirmed and escalated.** The live DB is in a state where `migrate deploy` will fail with **P3009** on any new migration until the rolled-back row is cleared. This is the top operational blocker. |
| R-3 | `defaultGraceDays` re-added | **Confirmed and widened** — 7 columns, not 1. |
| R-4 | `PaymentAllocation.collectionEventId` FK missing | **Confirmed.** Never existed in any migration or in the live DB. Repair proven on synthetic data. |
| R-5 | Expense numbering uses `COUNT(*)` | Unchanged. Phase 2. |
| R-6 | Member numbering sorts lexicographically | Unchanged. Phase 2. |
| R-7 | Dues generation outside transaction, bare `catch {}` | Unchanged. Phase 2. |
| R-8 | ADMIN self-approves own expense | Unchanged. Phase 4. |
| R-9 | `removeHouseholdAssignmentAction` never recomputes event status | Unchanged. Phase 4. |
| R-10 | `recomputeEventStatus` can downgrade COMPLETED → OPEN | Unchanged. Phase 4. |
| R-11 | `AuditLog.masjidId` is `onDelete: Cascade` | Unchanged. Phase 4 — but the fix is a migration, so it belongs in the Phase 1/4 boundary. Depends on Decision 4. |
| R-12 | `CollectionEventAssignment` has no `masjidId` | Unchanged. Phase 3. |
| R-13 | **No Git repository** | **Escalated in importance.** The two checksum mismatches (§2.4) prove migration files *were* edited after use with no version control to detect or revert it. Phase 1 has no diffable rollback path. **Initialising version control should be treated as a prerequisite for Step 3.** |
| R-14 | Live secrets in `.env` | Unchanged. Phase 11. |
| R-15 | Hardcoded seed password | Unchanged. Phase 11. |
| R-16 | `lib/notifications.ts` orphaned | Unchanged. Phase 8. |
| R-17 | `CashSession` / `Reversal.reversalPaymentId` dead | Unchanged. Phase 5. |
| R-18 | `Subscription` unused | Unchanged. Phase 7. |
| R-19 | E2E suite never executed | Unchanged. Phase 13. |

**New risks introduced by this assessment:**

| # | Risk | Severity | Evidence |
| - | ---- | -------- | -------- |
| R-20 | **Applied migration files were edited after use, with no version control to detect it.** The live `_prisma_migrations` checksums for migrations 1 and 2 do not match the files on disk; the artefacts that actually produced the live database no longer exist. | **Critical** | SHA-256 of `prisma/migrations/20261019092355_init/migration.sql` and `.../20261020083135_add_masjid_user_status/migration.sql` vs. the checksums in `data/masjid.db → _prisma_migrations` |
| R-21 | **The live database will refuse all new migrations (P3009)** because of the retained rolled-back row. | **Critical** | Live `_prisma_migrations` |
| R-22 | **The repair has not been proven against populated data.** All repair validation used zero-row synthetic databases. | **High** | §0.3, §5 caveats |
| R-23 | **`migrate dev` against the live database is a data-loss hazard.** The live DB shows drift; `migrate dev` will offer to reset, which drops the database. | **High** | Prisma 7 behaviour with schema drift |
| R-24 | **`scripts/backup.mjs` takes hot file copies** with no checksum, no restore test, and a count-only retention policy. The most recent backup is unproven as a recovery point. | **High** | `scripts/backup.mjs:28`; §9.2 |
| R-25 | **Stale disposable test database may remain in `data/`** from Phase 0 (`data/fresh-test.db`), a future accidental migration target. | Medium | Phase 0 baseline |

---

## 13. Open items and what this assessment did not establish

**Not established (and stated as such):**

1. **No migration was validated against a populated database.** All replay and repair testing used structurally faithful, zero-row synthetic databases. A live-data copy was correctly refused during the investigation because it duplicates personal member and payment data.
2. **The original contents of migrations 1 and 2 are lost.** The checksums prove they were edited; nothing in the repository or the database retains them.
3. **The exact history of the hand-repair was not reconstructed.** `scripts/add-notification-columns.ts` and `scripts/add-telegram-column.ts` explain the live drift for those two areas, but the sequence that dropped the inline `UNIQUE` declarations from `Masjid`, `User`, `Member`, and `Reversal` was not recovered from any artefact.
4. **Application startup after migration was not exercised.** Phase 0 also did not start the server. No claim is made that the app builds, boots, or renders.
5. **The E2E suite has never been executed** in this project (R-19).
6. **Whether the legacy chain's `Payment`/`DuesPeriod`/`Expense` DDL matches the live tables exactly** was not exhaustively diffed table-by-table. The `migrate diff` result (only two tables differ) is authoritative for this question, and it says the rest matches — but the drift engine compares against `schema.prisma`, not against the *historical* intent of the chain.

**Recommended follow-up before implementation begins:** answer Decisions 3 and 7 (§10), then perform the restore test (§9.4) and Step 2 populated-data validation. Both are prerequisites for the Step 5 live procedure.

---

## 14. Recommendation

**Adopt Option D — history reconciliation + forward repair migration — and treat Decision 7 (technology scaling) as a hard gate.**

The technical picture is now complete and unambiguous:

- The migration chain is **PostgreSQL DDL wearing a SQLite label**, and it is broken in **two** independent ways, both confirmed by execution.
- The live database is **structurally sound and internally consistent** — integrity `ok`, 0 FK violations, no orphaned references, no duplicate keys in the areas that will be touched — but it was **hand-repaired**, and its schema differs from `schema.prisma` in exactly **two tables**.
- A **zero-drift, SQLite-compatible baseline can be produced offline** from `schema.prisma`, and a repair for both drifted tables has been **proven to converge exactly on canonical** (68 objects, 0 differences).
- The live database currently **cannot accept any new migration** (P3009) until its failed-migration row is cleared.
- **The most recent backup has not been restore-tested.** Under the roadmap's own rules, it is not yet a verified recovery point.

The safest path forward is therefore: **verify the restore first** → **prove the repair on a populated restored copy** → **build the clean-install chain and the forward repair as new, additive migrations (leaving the legacy files untouched)** → **reconcile the live history and deploy** → **verify against objective criteria** → **stop**. No data is deleted, no migration is rewritten, no business policy is invented, and no step touches the live database before a verified backup exists.

---

*End of assessment. No Phase 1 implementation has been performed. `PROJECT_IMPLEMENTATION_PROGRESS.md` was not modified by this assessment and remains the authoritative Phase 0 record.*
