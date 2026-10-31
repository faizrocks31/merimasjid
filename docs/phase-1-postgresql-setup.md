# Phase 1: PostgreSQL Setup Guide

**Last updated:** 2026-10-22  
**Prerequisites:** Windows 10/11, Administrator access for PostgreSQL installation

---

## Overview

This guide documents the PostgreSQL 18 setup for the Masjid Collection application as implemented in Phase 1. The application now uses PostgreSQL (via Prisma's `@prisma/adapter-pg`) instead of SQLite.

**Key architectural decision:** An isolated PostgreSQL cluster runs on **port 55432** (separate from the system PostgreSQL on 5432) with a dedicated data directory owned by the application user. This avoids permission issues with the system PostgreSQL's `scram-sha-256` authentication and missing superuser credentials.

---

## Installation

### 1. Install PostgreSQL 18

Download the Windows installer from [postgresql.org](https://www.postgresql.org/download/windows/).

- Run as Administrator
- Default installation path: `C:\Program Files\PostgreSQL\18\`
- **Important:** Note the password you set for the `postgres` superuser (or leave blank if you plan to use the isolated cluster only)
- Port: **5432** (system default — we will create a second cluster on 55432)

### 2. Add PostgreSQL `bin` to PATH

```powershell
$env:PATH += ";C:\Program Files\PostgreSQL\18\bin"
# Or permanently via System Properties → Environment Variables
```

Verify:
```cmd
psql --version
# Should output: psql (PostgreSQL) 18.x
```

---

## Isolated Cluster Setup (Port 55432)

The application uses a dedicated PostgreSQL cluster on port 55432. This cluster is created and owned by your user account, so no superuser credentials are needed.

### Automated Setup (Recommended)

Run the provided setup script:

```cmd
cd C:\Users\hp\Documents\Claude Project\Masjid Collection
node .pgphase1/setup.mjs
```

This script:
1. Creates a data directory at `.pgphase1/data`
2. Initializes the cluster with `initdb`
3. Creates a `masjid_app` role with a generated password
4. Creates databases `masjid_collection` and `masjid_collection_test`
5. Starts the cluster on port 55432
6. Writes the password to `.pgphase1/initpw.txt` (local file, not committed)
7. Generates `.env` with the correct connection strings

### Manual Setup

If you prefer manual control:

```cmd
# 1. Create data directory
mkdir .pgphase1\data

# 2. Initialize cluster (locale C.UTF-8 for consistent sorting)
"C:\Program Files\PostgreSQL\18\bin\initdb.exe" -D .pgphase1\data -E UTF8 --locale=C.UTF-8 -U masjid_app -W

# 3. Configure postgresql.conf for port 55432
# Edit .pgphase1\data\postgresql.conf:
#   port = 55432
#   listen_addresses = '127.0.0.1'

# 4. Start cluster
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D .pgphase1\data -l .pgphase1\server.log -o "-p 55432 -c listen_addresses=127.0.0.1" start

# 5. Create databases and role
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 55432 -U masjid_app -d postgres -c "CREATE DATABASE masjid_collection;"
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 55432 -U masjid_app -d postgres -c "CREATE DATABASE masjid_collection_test;"
```

---

## Environment Configuration

### `.env` (Git-ignored, created by setup)

```env
# ============================================
# DATABASE (PostgreSQL 18)
# ============================================
DATABASE_URL="postgresql://masjid_app:<password>@127.0.0.1:55432/masjid_collection"
TEST_DATABASE_URL="postgresql://masjid_app:<password>@127.0.0.1:55432/masjid_collection_test"

# ============================================
# SEED - Two administrator accounts
# ============================================
SEED_SUPER_ADMIN_EMAIL="platform-admin@example.invalid"
SEED_SUPER_ADMIN_PASSWORD="<generated-secret>"
SEED_SUPER_ADMIN_NAME="Platform Super Admin"

SEED_LOCAL_ADMIN_EMAIL="masjid-admin@example.invalid"
SEED_LOCAL_ADMIN_PASSWORD="<generated-secret>"
SEED_LOCAL_ADMIN_NAME="Masjid Admin"

SEED_TEST_MASJID_NAME="Test Masjid"
SEED_TEST_MASJID_SLUG="test-masjid"
SEED_TEST_MASJID_RECEIPT_PREFIX="TSTM"

# ============================================
# APP
# ============================================
AUTH_SECRET="<32+ char secret>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ============================================
# TELEGRAM BOT (Optional)
# ============================================
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHANNEL_ID=""
```

### `.env.example` (Committed template)

Copy `.env.example` to `.env` and fill in the passwords:

```cmd
copy .env.example .env
# Edit .env with your actual passwords
```

**Critical:** Never commit `.env`. The `.gitignore` already excludes it.

---

## Running Migrations

### Development Database

```cmd
npm run db:migrate
# Or directly:
npx prisma migrate dev
```

This applies the baseline migration (`20261022000000_postgres_baseline`) and any subsequent migrations.

### Test Database

```cmd
npm run db:migrate:test
# Or directly:
TEST_DATABASE_URL="postgresql://masjid_app:<password>@127.0.0.1:55432/masjid_collection_test" npx prisma migrate deploy
```

The test database name **must contain "test"** (enforced by `tests/setup.ts`).

---

## Seeding the Database

```cmd
npm run seed
```

This creates exactly two accounts:
1. **Super Admin** — Platform administrator (`SEED_SUPER_ADMIN_*` vars)
2. **Local Masjid Admin** — Bound to the test masjid (`SEED_LOCAL_ADMIN_*` vars)

**Passwords are never printed.** They are read from environment variables only.

---

## Running Tests

```cmd
npm test
# Or with explicit test DB URL:
TEST_DATABASE_URL="postgresql://masjid_app:<password>@127.0.0.1:55432/masjid_collection_test" npm test
```

Expected: **99 tests pass** (9 test files).

---

## Development Server

```cmd
npm run dev
```

Starts Next.js on `http://localhost:3000` with Turbopack.

---

## Operational Scripts

### Backup

```cmd
npm run backup
```

Uses `pg_dump` via `PG*` environment variables (no secrets on command line). Keeps newest 14 backups in `./backups/`.

### Reset Test Database

```cmd
npx tsx scripts/reset-test-db.ts --yes
```

**Safety guards (all must pass):**
1. `TEST_DATABASE_URL` is set
2. URL contains "test" in database name
3. Host is `127.0.0.1` or `localhost`
4. Port is `55432`
5. User is `masjid_app`

Drops and recreates `masjid_collection_test`, then applies migrations.

### Prepare (Pre-dev Check)

```cmd
npm run prepare
```

Warns if `DATABASE_URL` is not a PostgreSQL connection string.

---

## Connection Details Reference

| Property | Development | Test |
| -------- | ----------- | ---- |
| Host | 127.0.0.1 | 127.0.0.1 |
| Port | 55432 | 55432 |
| Database | masjid_collection | masjid_collection_test |
| User | masjid_app | masjid_app |
| Password | From `.pgphase1/initpw.txt` | Same |
| SSL | Disabled (local) | Disabled (local) |

### Prisma Studio

```cmd
npx prisma studio
```

Opens at `http://localhost:5555` connected to the development database.

---

## Troubleshooting

### "pg_dump not found"

Add PostgreSQL `bin` to PATH:
```powershell
$env:PATH += ";C:\Program Files\PostgreSQL\18\bin"
```

### "Connection refused" on 55432

Check if cluster is running:
```cmd
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D .pgphase1\data status
```

Start if stopped:
```cmd
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D .pgphase1\data -l .pgphase1\server.log -o "-p 55432 -c listen_addresses=127.0.0.1" start
```

### "Database does not exist"

Run migrations:
```cmd
npm run db:migrate
npm run db:migrate:test
```

### "TEST_DATABASE_URL points at non-test database"

Ensure the test database name contains "test":
```env
TEST_DATABASE_URL="postgresql://.../masjid_collection_test"
#                                         ^^^^
```

### Prisma migration fails with "relation already exists"

The test database may have stale state. Reset it:
```cmd
npx tsx scripts/reset-test-db.ts --yes
```

### "EINVAL" spawning npx.cmd on Windows (tests)

Fixed in `tests/setup.ts` — schema verification now uses direct Prisma query instead of spawning `prisma migrate deploy`. If you encounter this, ensure you're on the latest code.

---

## File Structure

```
C:\Users\hp\Documents\Claude Project\Masjid Collection\
├── .pgphase1/
│   ├── data/                 # PostgreSQL data directory (port 55432)
│   ├── server.log            # Cluster log
│   ├── initpw.txt            # Generated password (local only)
│   ├── setup.mjs             # Automated cluster setup
│   ├── migrate-test.mjs      # Test DB migration helper
│   └── write-env.mjs         # .env generator
├── prisma/
│   ├── schema.prisma         # Schema (provider = postgresql)
│   ├── migrations/
│   │   └── 20261022000000_postgres_baseline/migration.sql
│   ├── migrations-legacy-sqlite/   # Preserved SQLite chain
│   ├── seed.ts               # Idempotent seed (2 admins via env)
│   └── config.ts             # Prisma CLI config
├── tests/
│   ├── setup.ts              # PG test bootstrap (no child process)
│   └── tenant-isolation.test.ts
├── scripts/
│   ├── backup.mjs            # pg_dump with PG* env vars
│   ├── prepare.mjs           # Pre-dev PG check
│   └── reset-test-db.ts      # Safe test DB reset
├── src/lib/db.ts             # PrismaPg adapter
├── .env                      # Actual config (gitignored)
├── .env.example              # Template
└── package.json              # Scripts + @prisma/adapter-pg
```

---

## Production Considerations

This guide covers **development only**. For production:

1. **Use a managed PostgreSQL** (Vercel Postgres, Neon, Supabase, AWS RDS, etc.)
2. **Set `DATABASE_URL`** to the managed instance connection string
3. **Run `prisma migrate deploy`** during deployment (not `migrate dev`)
4. **Configure connection pooling** (PgBouncer) for serverless
5. **Enable SSL** (`sslmode=require` in connection string)
6. **Set up automated backups** via the managed service
7. **Rotate credentials** regularly; never store in repo

The `scripts/backup.mjs` is for development convenience only — production should use the provider's backup solution.

---

## Verification Checklist

After setup, verify:

- [ ] `psql --version` shows 18.x
- [ ] `npm run db:migrate` succeeds
- [ ] `npm run db:migrate:test` succeeds
- [ ] `npm run seed` creates 2 admin accounts
- [ ] `npm test` shows 99 tests passing
- [ ] `npm run build` compiles without errors
- [ ] `npm run dev` starts server on localhost:3000
- [ ] `npx prisma studio` opens and shows tables
- [ ] `npm run backup` creates a `.sql` file in `./backups/`

---

## Support

For issues with the isolated cluster, check:
1. `.pgphase1/server.log` for PostgreSQL errors
2. `TEST_DATABASE_URL` format in `.env`
3. Port 55432 not blocked by firewall
4. `masjid_app` role exists in the cluster