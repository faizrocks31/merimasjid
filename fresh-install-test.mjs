import "dotenv/config";
import { execFileSync } from "node:child_process";

const url = process.env.TEST_DATABASE_URL ?? "";
const parsed = new URL(url);
const dbName = `masjid_fresh_${Date.now()}`;
const host = parsed.hostname;

const adminUrl = new URL(url);
adminUrl.pathname = "/postgres";

function psql(sql) {
  try {
    execFileSync(
      process.platform === "win32" ? "psql.exe" : "psql",
      ["--dbname", adminUrl.toString(), "--command", sql, "--quiet"],
      { stdio: "inherit", env: { ...process.env, PGPASSWORD: decodeURIComponent(parsed.password) } },
    );
  } catch (e) {
    console.error("psql error:", e);
    throw e;
  }
}

console.log(`Creating fresh database "${dbName}" on ${host} ...`);
psql(`CREATE DATABASE "${dbName}";`);
console.log(`Database "${dbName}" created.`);

// Now run prisma db push
const freshUrl = new URL(url);
freshUrl.pathname = `/${dbName}`;

console.log(`Running prisma db push on ${freshUrl.toString()} ...`);
try {
  execFileSync(
    "npx",
    ["prisma", "db", "push", "--url", freshUrl.toString(), "--accept-data-loss"],
    { stdio: "inherit", env: process.env },
  );
  console.log("prisma db push completed successfully");
} catch (e) {
  console.error("prisma db push failed:", e);
  throw e;
}

// Verify schema
const testUrl = new URL(url);
testUrl.pathname = `/${dbName}`;
const testUrlStr = testUrl.toString();

console.log("Verifying Payment.status default...");
try {
  execFileSync(
    "npx",
    ["prisma", "db", "execute", "--url", testUrlStr, "--stdin"],
    {
      stdio: "inherit",
      env: process.env,
      input: `SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='Payment' AND column_name='status';`
    },
  );
} catch (e) {
  console.error("Verification query failed:", e);
}

console.log("Verifying MemberSequence table...");
try {
  execFileSync(
    "npx",
    ["prisma", "db", "execute", "--url", testUrlStr, "--stdin"],
    {
      stdio: "inherit",
      env: process.env,
      input: `SELECT * FROM "MemberSequence" LIMIT 1;`
    },
  );
} catch (e) {
  console.error("MemberSequence check failed:", e);
}

console.log("Verifying ExpenseSequence table...");
try {
  execFileSync(
    "npx",
    ["prisma", "db", "execute", "--url", testUrlStr, "--stdin"],
    {
      stdio: "inherit",
      env: process.env,
      input: `SELECT * FROM "ExpenseSequence" LIMIT 1;`
    },
  );
} catch (e) {
  console.error("ExpenseSequence check failed:", e);
}

// Now test migrate deploy
console.log("Testing prisma migrate deploy (expected to fail)...");
try {
  execFileSync(
    "npx",
    ["prisma", "migrate", "deploy", "--url", testUrlStr],
    { stdio: "inherit", env: process.env },
  );
  console.log("migrate deploy completed (unexpected success)");
} catch (e) {
  console.log("migrate deploy failed as expected:", e.message || e);
}

// Clean up
console.log(`Dropping database "${dbName}"...`);
psql(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE);`);
console.log("Done.");