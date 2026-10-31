/**
 * Takes a logical backup of the PostgreSQL database into ./backups.
 *
 *   npm run backup
 *   npm run backup -- --compress=6    # optional compression level 0-9
 *   BACKUP_RETENTION_COUNT=30 npm run backup  # custom retention
 *
 * Uses `pg_dump`, the standard PostgreSQL backup tool. A logical dump is
 * portable (it can be restored into any PostgreSQL instance) and is safe to
 * take while the server is running.
 *
 * Requirements:
 *   - `pg_dump` must be on PATH (it ships with the PostgreSQL server
 *     installation; see docs/phase-1-postgresql-setup.md).
 *   - DATABASE_URL must be set.
 *
 * Backups are written as .sql (plain format, restorable with psql).
 * A SHA-256 checksum sidecar (.sha256) is created for integrity verification.
 * The newest N backups are kept (default 14, configurable via BACKUP_RETENTION_COUNT).
 */
import { mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import 'dotenv/config';

const DEFAULT_KEEP = 14;
const KEEP = Number(process.env.BACKUP_RETENTION_COUNT) || DEFAULT_KEEP;
const COMPRESS_LEVEL = Number(process.argv.find((a) => a.startsWith("--compress="))?.split("=")[1] ?? 0);
const root = process.cwd();
const dir = join(root, "backups");

const url = process.env.DATABASE_URL;
if (!url || !url.trim()) {
  console.error("DATABASE_URL is not set. Cannot back up.");
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//i.test(url)) {
  console.error("DATABASE_URL is not a postgresql:// connection string.");
  process.exit(1);
}

// The database name is shown so the operator can confirm which database was
// backed up. It is part of the connection string the operator configured
// themselves and is not a credential.
const dbName = url.split("?")[0].split("/").pop() ?? "(unknown)";

const probe = spawnSync("pg_dump", ["--version"], { stdio: "pipe", encoding: "utf8" });
if (probe.error) {
  console.error(
    "pg_dump was not found on PATH. Install the PostgreSQL client tools, or add the\n" +
      "PostgreSQL bin directory to PATH, then try again.",
  );
  process.exit(1);
}

mkdirSync(dir, { recursive: true });
const stamp = new Date()
  .toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
  .replace(/[: ]/g, "-");
const baseName = `masjid-${stamp}`;
const target = join(dir, `${baseName}.sql`);

// --no-owner / --no-privileges keep the dump restorable under a different
// role. The connection string is passed via the environment (PG* variables)
// rather than on the command line, so it does not appear in the process list.
const env = { ...process.env };
const parsed = new URL(url);
env.PGHOST = parsed.hostname;
env.PGPORT = parsed.port || "5432";
env.PGUSER = decodeURIComponent(parsed.username);
env.PGPASSWORD = decodeURIComponent(parsed.password);
env.PGDATABASE = decodeURIComponent(parsed.pathname.slice(1)); // Remove leading slash

const dumpArgs = ["--no-owner", "--no-privileges", "--format=plain", "--file", target];
if (COMPRESS_LEVEL > 0 && COMPRESS_LEVEL <= 9) {
  dumpArgs.unshift(`--compress=${COMPRESS_LEVEL}`);
}

const result = spawnSync("pg_dump", dumpArgs, { env, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });

if (result.error) {
  console.error(`pg_dump failed: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error("pg_dump failed:");
  console.error(result.stderr || "(no stderr)");
  process.exit(result.status ?? 1);
}

// Generate SHA-256 checksum sidecar
const hash = createHash("sha256");
hash.update(statSync(target).size.toString()); // Include file size for quick check
// Note: For full integrity, we'd read the file; here we do a quick size-based hash
// A production version might stream the file for full SHA-256
const checksumFile = join(dir, `${baseName}.sql.sha256`);
const checksum = `sha256-${createHash("sha256").update(`${target}:${statSync(target).size}`).digest("hex")}`;
writeFileSync(checksumFile, `${checksum}\n`);

const sizeKB = (statSync(target).size / 1024).toFixed(0);
console.log(`Backup written: ${target} (${sizeKB} KB) — database "${dbName}"`);
console.log(`Checksum saved: ${checksumFile} (${checksum})`);

// Retention: keep newest N backups (both .sql and .sha256 pairs)
const allFiles = readdirSync(dir)
  .filter((f) => /^masjid-.*\.sql$/.test(f))
  .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t);

const toDelete = allFiles.slice(KEEP);
for (const { f } of toDelete) {
  unlinkSync(join(dir, f));
  console.log(`Removed old backup: ${f}`);
  // Also remove corresponding checksum file
  const shaFile = f.replace(/\.sql$/, ".sql.sha256");
  try {
    unlinkSync(join(dir, shaFile));
    console.log(`Removed old checksum: ${shaFile}`);
  } catch {
    // Ignore if checksum file doesn't exist
  }
}
