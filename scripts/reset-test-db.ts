/**
 * Drops and recreates the isolated PostgreSQL TEST database.
 *
 *   npm run db:reset-test
 *
 * This is a DESTRUCTIVE operation. It refuses to run unless every one of the
 * following is true:
 *
 *   1. TEST_DATABASE_URL is set and is a postgresql:// URL.
 *   2. The database name contains "test".
 *   3. The database is not the same as DATABASE_URL.
 *   4. The target host is local (localhost / 127.0.0.1 / ::1) unless
 *      RESET_TEST_DB_ALLOW_REMOTE=1 is set.
 *   5. The operator passes --yes.
 *
 * The database that is dropped is printed before anything happens, and the
 * confirmation must be typed as a flag — there is no interactive prompt.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const url = process.env.TEST_DATABASE_URL ?? "";
if (!url.trim()) {
  fail("TEST_DATABASE_URL is not set. Nothing was done.");
}
if (!/^postgres(ql)?:\/\//i.test(url)) {
  fail("TEST_DATABASE_URL must be a postgresql:// connection string. Nothing was done.");
}

const parsed = new URL(url);
const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
const host = parsed.hostname;

if (!/test/i.test(dbName)) {
  fail(
    `Refusing to reset "${dbName}" — the database name does not contain "test". Nothing was done.`,
  );
}

const devUrl = process.env.DATABASE_URL ?? "";
if (devUrl.trim()) {
  const devName = decodeURIComponent(
    new URL(devUrl).pathname.replace(/^\//, ""),
  );
  if (devName === dbName) {
    fail(
      `Refusing to reset "${dbName}" — it is the same database as DATABASE_URL. ` +
        `The development database would be destroyed. Nothing was done.`,
    );
  }
}

const isLocal = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(host);
if (!isLocal && process.env.RESET_TEST_DB_ALLOW_REMOTE !== "1") {
  fail(
    `Refusing to reset a database on the remote host "${host}". ` +
      `Set RESET_TEST_DB_ALLOW_REMOTE=1 if that is genuinely intended. Nothing was done.`,
  );
}

if (!process.argv.includes("--yes")) {
  fail(
    `This would DROP and recreate the test database "${dbName}" on ${host}.\n` +
      `Re-run with: npm run db:reset-test -- --yes`,
  );
}

const adminUrl = new URL(url);
// Connect to the default `postgres` maintenance database to issue the DROP.
adminUrl.pathname = "/postgres";

function psql(sql: string) {
  execFileSync(
    process.platform === "win32" ? "psql.exe" : "psql",
    ["--dbname", adminUrl.toString(), "--command", sql, "--quiet"],
    { stdio: "inherit", env: { ...process.env, PGPASSWORD: decodeURIComponent(parsed.password) } },
  );
}

console.log(`Dropping and recreating test database "${dbName}" on ${host} ...`);
psql(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE);`);
psql(`CREATE DATABASE "${dbName}";`);
console.log(`Test database "${dbName}" is empty. Run \`npx prisma migrate deploy\` to build the schema.`);
