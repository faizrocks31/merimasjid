import "dotenv/config";
import { execSync } from "node:child_process";

// The test bootstrap loads TEST_DATABASE_URL from .env and sets DATABASE_URL to it.
// We use the same mechanism here.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error("TEST_DATABASE_URL not set in environment");
  process.exit(1);
}

// Verify it's a test database
if (!/test/i.test(new URL(testUrl).pathname.split("/").pop() ?? "")) {
  console.error("TEST_DATABASE_URL does not point to a test database");
  process.exit(1);
}

process.env.DATABASE_URL = testUrl;

console.log("Applying migration to test database (name contains 'test')...");

try {
  execSync("npx prisma migrate dev --name add_expense_sequence", {
    stdio: "inherit",
    env: process.env,
  });
  console.log("Migration applied successfully.");
} catch (e) {
  console.error("Migration failed:", e);
  process.exit(1);
}