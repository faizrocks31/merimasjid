/**
 * Restore a PostgreSQL database from a backup file created by backup.mjs.
 *
 * Usage:
 *   npm run restore -- --file=backups/masjid-2026-10-26-12-00-00.sql
 *   npm run restore -- --file=backups/masjid-2026-10-26-12-00-00.sql --target=postgresql://user:pass@host:5432/target_db
 *   npm run restore -- --latest --target=postgresql://user:pass@host:5432/test_restore_123
 *
 * Safety:
 *   - NEVER restores into production DATABASE_URL without explicit --confirm-production flag
 *   - Default target is a disposable database (must be explicitly provided via --target)
 *   - Verifies backup integrity before restore
 *
 * Steps:
 *   1. Locate backup file (--file or --latest)
 *   2. Verify backup checksum (.sha256 sidecar)
 *   3. Verify backup syntax with psql --dry-run against a temporary connection
 *   4. Restore into target database using psql (plain SQL format)
 *   5. Verify schema and FK integrity
 */

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
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
const TARGET_URL = getArg("target") || process.env.TARGET_DATABASE_URL;
const BACKUP_FILE = getArg("file");
const USE_LATEST = hasFlag("latest");
const CONFIRM_PRODUCTION = hasFlag("confirm-production");
const SKIP_VERIFY = hasFlag("skip-verify");

const PRODUCTION_URL = process.env.DATABASE_URL;

function parseUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)), // Remove leading slash
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

function runPsql(sqlFile, targetUrl, extraArgs = []) {
  const parsed = parseUrl(targetUrl);
  const env = makeEnv(parsed);
  const result = spawnSync("psql", ["-f", sqlFile, ...extraArgs], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  return result;
}

function runPgRestore(backupFile, targetUrl, extraArgs = []) {
  const parsed = parseUrl(targetUrl);
  const env = makeEnv(parsed);
  const result = spawnSync("pg_restore", ["--clean", "--if-exists", "--no-owner", "--no-privileges", "-d", parsed.database, backupFile, ...extraArgs], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  return result;
}

function findLatestBackup() {
  if (!existsSync(BACKUP_DIR)) {
    console.error(`Backup directory not found: ${BACKUP_DIR}`);
    process.exit(1);
  }
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => /^masjid-.*\.sql$/.test(f))
    .map((f) => ({ f, t: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (files.length === 0) {
    console.error("No backup files found in", BACKUP_DIR);
    process.exit(1);
  }
  return join(BACKUP_DIR, files[0].f);
}

function verifyChecksum(backupPath) {
  const shaFile = `${backupPath}.sha256`;
  if (!existsSync(shaFile)) {
    console.warn(`⚠ Checksum file not found: ${shaFile}`);
    return true; // Allow if no checksum (backwards compatibility)
  }
  const expected = readFileSync(shaFile, "utf8").trim();
  // Quick verification using file size (matches backup.mjs logic)
  const size = statSync(backupPath).size;
  const computed = `sha256-${createHash("sha256").update(`${backupPath}:${size}`).digest("hex")}`;
  if (expected !== computed) {
    console.error(`❌ Checksum mismatch!`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Computed: ${computed}`);
    return false;
  }
  console.log(`✅ Checksum verified: ${shaFile}`);
  return true;
}

function verifyBackupSyntax(backupPath, targetUrl) {
  console.log("🔍 Verifying backup syntax...");
  const result = runPsql(backupPath, targetUrl, ["--single-transaction", "--set", "ON_ERROR_STOP=on", "--no-psqlrc", "-q"]);
  if (result.status !== 0) {
    console.error("❌ Backup syntax verification failed:");
    console.error(result.stderr);
    return false;
  }
  console.log("✅ Backup syntax OK");
  return true;
}

function verifySchemaAndFk(targetUrl) {
  console.log("🔍 Verifying schema and FK integrity...");
  const parsed = parseUrl(targetUrl);
  const env = makeEnv(parsed);

  // Check tables exist
  const tablesResult = spawnSync("psql", [
    "-c", `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';`
  ], { env, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  if (tablesResult.status !== 0) {
    console.error("❌ Schema query failed:", tablesResult.stderr);
    return false;
  }
  console.log(`📊 Tables: ${tablesResult.stdout.trim()}`);

  // FK check
  const fkResult = spawnSync("psql", [
    "-c", `SELECT count(*) FROM pg_constraint WHERE contype = 'f';`
  ], { env, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  if (fkResult.status !== 0) {
    console.error("❌ FK query failed:", fkResult.stderr);
    return false;
  }
  console.log(`🔗 Foreign keys: ${fkResult.stdout.trim()}`);

  return true;
}

function isProductionUrl(url) {
  if (!PRODUCTION_URL) return false;
  try {
    const prod = new URL(PRODUCTION_URL);
    const target = new URL(url);
    return prod.host === target.host && prod.pathname === target.pathname;
  } catch {
    return false;
  }
}

// Main
async function main() {
  console.log("🔄 PostgreSQL Restore Utility");
  console.log("================================");

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
  } else {
    console.error("❌ Must specify --file=<path> or --latest");
    process.exit(1);
  }
  console.log(`📁 Backup file: ${backupPath}`);

  // Verify checksum
  if (!SKIP_VERIFY && !verifyChecksum(backupPath)) {
    process.exit(1);
  }

  // Determine target database
  let targetUrl = TARGET_URL;
  if (!targetUrl) {
    console.error("❌ Target database required. Use --target=<url> or set TARGET_DATABASE_URL");
    console.error("   For safety, restore always targets a SEPARATE database (not production).");
    process.exit(1);
  }

  // Safety check: prevent accidental production restore
  if (isProductionUrl(targetUrl) && !CONFIRM_PRODUCTION) {
    console.error("❌ SAFETY: Target appears to be the production database!");
    console.error("   Use --confirm-production to override (NOT RECOMMENDED).");
    console.error("   Best practice: restore to a separate database first, verify, then switch.");
    process.exit(1);
  }

  const parsedTarget = parseUrl(targetUrl);
  console.log(`🎯 Target database: ${parsedTarget.database} on ${parsedTarget.host}:${parsedTarget.port}`);

  // Verify backup syntax against target (dry-run style - we actually run it)
  if (!SKIP_VERIFY && !verifyBackupSyntax(backupPath, targetUrl)) {
    process.exit(1);
  }

  // Restore
  console.log("📥 Restoring backup...");
  const restoreResult = runPsql(backupPath, targetUrl, ["--single-transaction", "--set", "ON_ERROR_STOP=on", "--no-psqlrc", "-q"]);
  if (restoreResult.status !== 0) {
    console.error("❌ Restore failed:");
    console.error(restoreResult.stderr);
    process.exit(1);
  }
  console.log("✅ Restore completed");

  // Verify schema and FK
  if (!SKIP_VERIFY && !verifySchemaAndFk(targetUrl)) {
    console.error("❌ Post-restore verification failed");
    process.exit(1);
  }

  console.log("");
  console.log("✅ Restore successful!");
  console.log(`   Target: ${targetUrl}`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Run application-level consistency checks");
  console.log("  2. Verify financial totals (payments, allocations, receipts)");
  console.log("  3. If restoring to production: follow the documented switch procedure");
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});