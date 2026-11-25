import "dotenv/config";
import { execSync } from "node:child_process";

// Load environment from .env (dotenv/config does this automatically)
// Verify TEST_DATABASE_URL is set and points to a test database
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error("TEST_DATABASE_URL not set");
  process.exit(1);
}

if (!/test/i.test(new URL(testUrl).pathname.split("/").pop() ?? "")) {
  console.error("TEST_DATABASE_URL does not point to a test database");
  process.exit(1);
}

// Set DATABASE_URL for Prisma CLI (it reads this env var)
process.env.DATABASE_URL = testUrl;

console.log("Applying migration to test database...");

try {
  execSync("npx prisma migrate dev --name add_expense_sequence", {
    stdio: "inherit",
    env: process.env,
  });
  console.log("Migration applied successfully.");
} catch (e) {
  console.error("Migration failed");
  process.exit(1);
}