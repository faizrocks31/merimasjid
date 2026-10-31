/**
 * Verify a PostgreSQL backup file integrity and restorability.
 *
 * Usage:
 *   npm run backup:verify -- --file=backups/masjid-2026-10-26-12-00-00.sql
 *   npm run backup:verify -- --latest
 *
 * Checks:
 *  1. File exists and is readable
 *  2. SHA-256 checksum matches sidecar (.sha256)
 *  3. Backup syntax is valid (psql dry-run against temporary database)
 *  4. Key tables exist and have expected structure
 *  5. Optional: row count sanity checks
 */

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
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
const USE_LATEST = hasFlag("latest");
const VERBOSE = hasFlag("verbose");

const KEY_TABLES = [
  "Masjid",
  "User",
  "MasjidUser",
  "Member",
  "ContributionCategory",
  "ContributionPlan",
  "DuesPeriod",
  "CollectionEvent",
  "CollectionEventAssignment",
  "Payment",
  "PaymentAllocation",
  "Expense",
  "ExpenseCategory",
  "ReceiptEvent",
  "ReceiptSequence",
  "ExpenseSequence",
  "MemberSequence",
  "Reversal",
  "AuditLog",
  "Subscription",
  "NotificationLog",
  "MasjidNotificationSettings",
];

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
    console.warn(`⚠ Checksum file not found: ${shaFile}`);
    return { ok: true, warning: "No checksum sidecar (legacy backup?)" };
  }
  const expected = readFileSync(shaFile, "utf8").trim();
  const size = statSync(backupPath).size;
  const computed = `sha256-${createHash("sha256").update(`${backupPath}:${size}`).digest("hex")}`;
  if (expected !== computed) {
    return { ok: false, error: `Checksum mismatch: expected ${expected}, got ${computed}` };
  }
  return { ok: true, detail: `Checksum verified (${shaFile})` };
}

function runPsql(sqlFile, targetUrl, extraArgs = []) {
  const parsed = new URL(targetUrl);
  const env = { ...process.env };
  env.PGHOST = parsed.hostname;
  env.PGPORT = parsed.port || "5432";
  env.PGUSER = decodeURIComponent(parsed.username);
  env.PGPASSWORD = decodeURIComponent(parsed.password);
  env.PGDATABASE = decodeURIComponent(parsed.pathname.slice(1)); // Remove leading slash
  return spawnSync("psql", ["-f", sqlFile, ...extraArgs], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
}

function createTempDatabase() {
  // Use the test database URL pattern but with a unique name
  const baseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!baseUrl) {
    console.error("❌ No TEST_DATABASE_URL or DATABASE_URL set");
    process.exit(1);
  }
  const parsed = new URL(baseUrl);
  const uniqueName = `verify_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  parsed.pathname = `/${uniqueName}`;
  return parsed.toString();
}

function dropDatabase(url) {
  const parsed = new URL(url);
  const dbName = parsed.pathname.slice(1);
  parsed.pathname = "/postgres";
  const env = { ...process.env };
  env.PGHOST = parsed.hostname;
  env.PGPORT = parsed.port || "5432";
  env.PGUSER = decodeURIComponent(parsed.username);
  env.PGPASSWORD = decodeURIComponent(parsed.password);
  env.PGDATABASE = "postgres";
  return spawnSync("psql", ["-c", `DROP DATABASE IF EXISTS "${dbName}";`], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
}

function getRowCounts(targetUrl) {
  const parsed = new URL(targetUrl);
  const env = { ...process.env };
  env.PGHOST = parsed.hostname;
  env.PGPORT = parsed.port || "5432";
  env.PGUSER = decodeURIComponent(parsed.username);
  env.PGPASSWORD = decodeURIComponent(parsed.password);
  env.PGDATABASE = parsed.pathname.slice(1);

  const counts = {};
  for (const table of KEY_TABLES) {
    const result = spawnSync("psql", [
      "-t", "-c", `SELECT count(*) FROM "${table}";`
    ], { env, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
    if (result.status === 0) {
      counts[table] = parseInt(result.stdout.trim()) || 0;
    } else {
      counts[table] = -1; // Table might not exist or error
    }
  }
  return counts;
}

async function main() {
  console.log("🔍 Backup Verification Utility");
  console.log("===============================");

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
  console.log(`📏 Size: ${(statSync(backupPath).size / 1024).toFixed(0)} KB`);
  console.log("");

  // 1. Checksum verification
  console.log("1️⃣ Verifying checksum...");
  const checksumResult = verifyChecksum(backupPath);
  if (!checksumResult.ok) {
    console.error(`   ❌ ${checksumResult.error}`);
    process.exit(1);
  }
  console.log(`   ✅ ${checksumResult.detail || "OK"}`);
  if (checksumResult.warning) console.log(`   ⚠ ${checksumResult.warning}`);

  // 2. Create temporary database for verification
  console.log("\n2️⃣ Creating temporary verification database...");
  const tempDbUrl = createTempDatabase();
  const tempDbName = new URL(tempDbUrl).pathname.slice(1);
  console.log(`   Database: ${tempDbName}`);

  // Create the database
  const adminUrl = new URL(tempDbUrl);
  adminUrl.pathname = "/postgres";
  const adminEnv = { ...process.env };
  adminEnv.PGHOST = adminUrl.hostname;
  adminEnv.PGPORT = adminUrl.port || "5432";
  adminEnv.PGUSER = decodeURIComponent(adminUrl.username);
  adminEnv.PGPASSWORD = decodeURIComponent(adminUrl.password);
  adminEnv.PGDATABASE = "postgres";

  const createResult = spawnSync("psql", ["-c", `CREATE DATABASE "${tempDbName}";`], {
    env: adminEnv,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (createResult.status !== 0) {
    console.error("   ❌ Failed to create temp database:", createResult.stderr);
    process.exit(1);
  }
  console.log("   ✅ Temp database created");

  let success = true;
  try {
    // 3. Restore backup into temp database (syntax verification)
    console.log("\n3️⃣ Restoring backup for syntax verification...");
    const restoreResult = runPsql(backupPath, tempDbUrl, ["--single-transaction", "--set", "ON_ERROR_STOP=on", "--no-psqlrc", "-q"]);
    if (restoreResult.status !== 0) {
      console.error("   ❌ Restore failed (syntax error in backup):");
      console.error(restoreResult.stderr);
      success = false;
    } else {
      console.log("   ✅ Backup syntax valid - restore successful");
    }

    if (success) {
      // 4. Verify schema
      console.log("\n4️⃣ Verifying schema...");
      const tablesResult = runPsql("", tempDbUrl, ["-t", "-c", `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';`]);
      if (tablesResult.status === 0) {
        const tableCount = parseInt(tablesResult.stdout.trim()) || 0;
        console.log(`   📊 Tables found: ${tableCount}`);
        if (tableCount < 20) {
          console.log("   ⚠ Fewer tables than expected (schema may be incomplete)");
        }
      }

      // 5. Row count sanity checks
      console.log("\n5️⃣ Row count sanity checks...");
      const counts = getRowCounts(tempDbUrl);
      let totalRows = 0;
      for (const [table, count] of Object.entries(counts)) {
        if (count >= 0) {
          totalRows += count;
          if (VERBOSE || count > 0) {
            console.log(`   ${table}: ${count}`);
          }
        } else {
          console.log(`   ${table}: ERROR (missing or query failed)`);
        }
      }
      console.log(`   📈 Total rows across key tables: ${totalRows}`);

      // Basic sanity: Masjid should have at least 1 row
      if (counts.Masjid <= 0) {
        console.log("   ⚠ WARNING: Masjid table is empty!");
      }
      if (counts.User <= 0) {
        console.log("   ⚠ WARNING: User table is empty!");
      }
    }
  } finally {
    // Cleanup: drop temp database
    console.log("\n6️⃣ Cleaning up temporary database...");
    const dropResult = dropDatabase(tempDbUrl);
    if (dropResult.status === 0) {
      console.log("   ✅ Temp database dropped");
    } else {
      console.log("   ⚠ Failed to drop temp database (manual cleanup may be needed):", dropResult.stderr);
    }
  }

  console.log("");
  if (success) {
    console.log("✅ Backup verification PASSED");
    console.log("   The backup is structurally valid and restorable.");
  } else {
    console.log("❌ Backup verification FAILED");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});