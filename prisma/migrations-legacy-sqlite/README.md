# Legacy SQLite migration chain (archived — reference only)

These three migration folders are the **original SQLite-era migration history**
of this project. They are kept verbatim for reference and for historical
audit. **They are not applied to any database and are not part of the active
migration chain.**

The active chain lives in `../migrations/` and is a single PostgreSQL baseline
migration.

## Why they were archived rather than repaired

The SQLite chain could not be replayed to completion — it was broken in two
independent layers, both confirmed by replaying the SQL against a scratch
database:

1. **Layer 1 — `20261019092355_init`** opens with four PostgreSQL-only
   statements (`CREATE TYPE ... AS ENUM`) that SQLite cannot execute at all.
   The migration was written for PostgreSQL and then labelled as SQLite.
2. **Layer 2 — `20261021140500_add_collection_events`** re-adds all seven
   `ContributionCategory` columns that the init migration already creates.
   Even after the enum statements are stripped, this migration fails with
   `duplicate column name: description`.

On top of that:

- `20261020083135_add_masjid_user_status` contains only `SELECT 1;`. It is a
  **no-op** — the `User.status` and `MasjidUser.status` columns it is named
  after are already created by the init migration. (The earlier
  `PROJECT_DATABASE_AUDIT.md` finding DB-002, which said those columns were
  "in no real migration", is incorrect: they are in the init migration.)
- The `PaymentAllocation.collectionEventId` foreign key has **never** existed
  in any of these migrations, nor in the live SQLite database. It exists only
  in `schema.prisma`.

Because the Phase 1 brief states that the old SQLite data is disposable and
that a clean PostgreSQL database should be created, the chain was **superseded
by a new baseline** rather than patched. Patching it would have meant either
rewriting history in place (the artefacts that actually built the live
database are already lost — see the checksum mismatch recorded in
`PHASE_1_MIGRATION_ASSESSMENT.md`) or carrying four known defects forward.

## Historical contents

| Migration | Size | What it does |
| --- | --- | --- |
| `20261019092355_init` | 21 `CREATE TABLE`, 36 `CREATE INDEX` | Full initial schema, preceded by 4 PostgreSQL `CREATE TYPE` statements. |
| `20261020083135_add_masjid_user_status` | 1 statement | `SELECT 1;` — no-op. |
| `20261021140500_add_collection_events` | 2 tables, 1 column, 5 indexes | Adds `CollectionEvent` and `CollectionEventAssignment`; re-adds the 7 `ContributionCategory` columns (duplicate-column failure); adds `PaymentAllocation.collectionEventId` with **no** FK. |

`migration_lock.toml` in this folder records the original `provider = "sqlite"`
lock and is kept for reference only. The active lock in `../migrations/` records
`provider = "postgresql"`.

## Do not

- Do not copy these files back into `../migrations/`.
- Do not run `prisma migrate deploy` against a database that has this history
  recorded. The live SQLite database's `_prisma_migrations` table contains a
  rolled-back row, which makes the Prisma CLI refuse to apply any new
  migration (error **P3009**) until that row is cleared.
