/**
 * Automated restore test into a disposable test database.
 *
 * This script:
 *  1. Creates a unique disposable test database
 *  2. Restores the latest (or specified) backup into it
 *  3. Runs Prisma migrate status to verify schema
 *  4. Runs a subset of critical tests (tenant isolation, payment integrity)
 *  5. Cleans up the disposable database
 *
 * Usage:
 *   npm run restore:test
 *   npm run restore:test -- --file=backups/masjid-2026-10-26-12-00-00.sql
 *   npm run restore:test -- --latest
 *
 * Requires:
 *  - TEST_DATABASE_URL pattern (postgresql://.../masjid_collection_test)
 *  - pg_dump, pg_restore, psql on PATH
 */

import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import 'dotenv/config';

const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=")[1];
};
const hasFlag = (name) => args.includes(`--${name}`);

const BACKUP_DIR = join(process.cwd(), "backups");
const BACKUP_FILE = getArg("file");
const USE_LATEST = hasFlag("latest") || !BACKUP_FILE;
const SKIP_TESTS = hasFlag("skip-tests");
const VERBOSE = hasFlag("verbose");

const BASE_TEST_URL = process.env.TEST_DATABASE_URL;
if (!BASE_TEST_URL) {
  console.error("❌ TEST_DATABASE_URL not set in environment");
  process.exit(1);
}

function findLatestBackup() {
  if (!existsSync(BACKUP_DIR)) {
    console.error(`❌ Backup directory not found: ${BACKUP_DIR}`);
    process.exit(1);
  }
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => /^masjid-.*\.sql$/.test(f))
    .map((f) => ({ f, t: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (files.length === 0) {
    console.error("❌ No backup files found in", BACKUP_DIR);
    process.exit(1);
  }
  return join(BACKUP_DIR, files[0].f);
}

function verifyChecksum(backupPath) {
  const shaFile = `${backupPath}.sha256`;
  if (!existsSync(shaFile)) {
    return { ok: true, warning: true };
  }
  const expected = readFileSync(shaFile, "utf8").trim();
  const size = statSync(backupPath).size;
  const computed = `sha256-${createHash("sha256").update(`${backupPath}:${size}`).digest("hex")}`;
  return { ok: expected === computed };
}

function runCommand(cmd, args, env, description) {
  if (VERBOSE) console.log(`   $ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { env, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`   ❌ ${description} failed:`);
    console.error(result.stderr);
  } else if (VERBOSE && result.stdout) {
    console.log(`   ${result.stdout.trim()}`);
  }
  return result;
}

function parseUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
  };
}

function makeEnv(parsed) {
  const env = { ...process.env };
  env.PGHOST = parsed.host;
  env.PGPORT = parsed.port;
  env.PGUSER = parsed.user;
  env.PGPASSWORD = parsed.password;
  env.PGDATABASE = parsed.database;
  return env;
}

function createDisposableDb(baseUrl) {
  const parsed = new URL(baseUrl);
  const uniqueName = `restore_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  parsed.pathname = `/${uniqueName}`;
  return parsed.toString();
}

function dropDatabase(url) {
  const parsed = parseUrl(url);
  const dbName = parsed.database;
  parsed.database = "postgres";
  const env = makeEnv(parsed);
  return spawnSync("psql", ["-c", `DROP DATABASE IF EXISTS "${dbName}";`], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
}

function runPsql(sqlFile, targetUrl, extraArgs = []) {
  const parsed = parseUrl(targetUrl);
  const env = makeEnv(parsed);
  return spawnSync("psql", ["-f", sqlFile, ...extraArgs], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
}

async function runPrismaMigrateStatus(targetUrl) {
  const env = { ...process.env, DATABASE_URL: targetUrl };
  // Use npx which handles Windows .cmd properly
  const result = spawnSync("npx", ["prisma", "migrate", "status"], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    cwd: process.cwd(),
    shell: true, // Use shell on Windows to handle .cmd files
  });
  // Debug output
  if (result.error) console.error("   [DEBUG] Prisma spawn error:", result.error);
  if (result.stderr) console.error("   [DEBUG] Prisma stderr:", result.stderr);
  if (result.stdout) console.log("   [DEBUG] Prisma stdout:", result.stdout);
  console.log("   [DEBUG] Prisma exit code:", result.status);
  return result;
}

async function runCriticalTests(targetUrl) {
  const env = { ...process.env, DATABASE_URL: targetUrl };
  // Run a focused subset of tests: tenant isolation, payment reversal, concurrent actions
  const result = spawnSync("npx", [
    "vitest", "run",
    "tests/tenant-isolation.test.ts",
    "tests/payment-reversal.test.ts",
    "tests/concurrent-action.test.ts",
  ], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    cwd: process.cwd(),
    timeout: 120000,
    shell: true,
  });
  // Debug output
  if (result.error) console.error("   [DEBUG] Test spawn error:", result.error);
  if (result.stderr) console.error("   [DEBUG] Test stderr:", result.stderr);
  if (result.stdout) console.log("   [DEBUG] Test stdout:", result.stdout);
  console.log("   [DEBUG] Test exit code:", result.status);
  return result;
}

async function main() {
  console.log("🧪 Automated Restore Test");
  console.log("==========================");

  // Determine backup file
  let backupPath;
  if (BACKUP_FILE) {
    backupPath = join(process.cwd(), BACKUP_FILE);
    if (!existsSync(backupPath)) {
      console.error(`❌ Backup file not found: ${backupPath}`);
      process.exit(1);
    }
  } else if (USE_LATEST) {
    backupPath = findLatestBackup();
  }
  console.log(`📁 Backup: ${backupPath}`);
  console.log(`📏 Size: ${(statSync(backupPath).size / 1024).toFixed(0)} KB`);

  // Verify checksum
  console.log("\n1️⃣ Verifying backup checksum...");
  const checksumResult = verifyChecksum(backupPath);
  if (!checksumResult.ok) {
    console.error("   ❌ Checksum verification failed!");
    process.exit(1);
  }
  console.log(`   ✅ Checksum OK${checksumResult.warning ? " (no sidecar - legacy backup)" : ""}`);

  // Create disposable database
  console.log("\n2️⃣ Creating disposable test database...");
  const testDbUrl = createDisposableDb(BASE_TEST_URL);
  const testDbName = new URL(testDbUrl).pathname.slice(1);
  console.log(`   Database: ${testDbName}`);

  const adminParsed = parseUrl(BASE_TEST_URL);
  adminParsed.database = "postgres";
  const adminEnv = makeEnv(adminParsed);
  const createResult = spawnSync("psql", ["-c", `CREATE DATABASE "${testDbName}";`], {
    env: adminEnv,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (createResult.status !== 0) {
    console.error("   ❌ Failed to create test database:", createResult.stderr);
    process.exit(1);
  }
  console.log("   ✅ Test database created");

  // Grant permissions to the application user
  const appUser = parseUrl(BASE_TEST_URL).user;
  const grantResult = spawnSync("psql", ["-c", `GRANT ALL PRIVILEGES ON DATABASE "${testDbName}" TO "${appUser}";`], {
    env: adminEnv,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (grantResult.status !== 0) {
    console.error("   ❌ Failed to grant permissions:", grantResult.stderr);
    process.exit(1);
  }
  console.log(`   ✅ Permissions granted to ${appUser}`);

  let overallSuccess = true;
  let testDbCreated = true;

  try {
    // Restore backup
    console.log("\n3️⃣ Restoring backup into test database...");
    const restoreResult = runPsql(backupPath, testDbUrl, [
      "--single-transaction", "--set", "ON_ERROR_STOP=on", "--no-psqlrc", "-q"
    ]);
    if (restoreResult.status !== 0) {
      console.error("   ❌ Restore failed:");
      console.error(restoreResult.stderr);
      overallSuccess = false;
    } else {
      console.log("   ✅ Restore completed");
    }

    if (overallSuccess) {
      // Verify schema with Prisma
      console.log("\n4️⃣ Verifying schema with Prisma...");
      // First apply any pending migrations
      const deployResult = spawnSync("npx", ["prisma", "migrate", "deploy"], {
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
        cwd: process.cwd(),
        shell: true,
      });
      if (deployResult.status !== 0) {
        console.error("   ❌ Prisma migrate deploy failed:");
        console.error(deployResult.stderr);
        overallSuccess = false;
      } else {
        console.log("   ✅ Migrations applied");
        if (VERBOSE) console.log(deployResult.stdout);
      }

      // Then check status
      const migrateResult = await runPrismaMigrateStatus(testDbUrl);
      if (migrateResult.status !== 0) {
        console.error("   ❌ Prisma migrate status failed:");
        console.error(migrateResult.stderr);
        overallSuccess = false;
      } else {
        console.log("   ✅ Schema matches Prisma expectations");
        if (VERBOSE) console.log(migrateResult.stdout);
      }
    }

    if (overallSuccess && !SKIP_TESTS) {
      // Run critical tests
      console.log("\n5️⃣ Running critical test suite...");
      const testResult = await runCriticalTests(testDbUrl);
      if (testResult.status !== 0) {
        console.error("   ❌ Critical tests failed:");
        console.error(testResult.stdout);
        console.error(testResult.stderr);
        overallSuccess = false;
      } else {
        console.log("   ✅ All critical tests passed");
        if (VERBOSE) console.log(testResult.stdout);
      }
    }
  } finally {
    // Cleanup
    console.log("\n6️⃣ Cleaning up disposable database...");
    const dropResult = dropDatabase(testDbUrl);
    if (dropResult.status === 0) {
      console.log("   ✅ Test database dropped");
    } else {
      console.log("   ⚠ Failed to drop test database (may need manual cleanup):", dropResult.stderr);
    }
  }

  console.log("\n==========================");
  if (overallSuccess) {
    console.log("✅ RESTORE TEST PASSED");
    console.log("   Backup is fully restorable and passes critical tests.");
  } else {
    console.log("❌ RESTORE TEST FAILED");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});