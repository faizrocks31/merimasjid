import "dotenv/config";
import { execSync } from "node:child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// Generate new password
const newPassword = crypto.randomBytes(32).toString("base64url");

// Get current .env
const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf8");

// Update TEST_DATABASE_URL with new password
const updated = envContent.replace(
  /postgresql:\/\/masjid_app:[^@]+@/,
  "postgresql://masjid_app:" + newPassword + "@"
);

fs.writeFileSync(envPath, updated);

// Update PostgreSQL user password
// Use full path to psql on Windows
const psqlPath = '"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe"';

// Get current password from old TEST_DATABASE_URL to authenticate
const currentPassword = process.env.TEST_DATABASE_URL?.split(":")[2]?.split("@")[0];

if (!currentPassword) {
  console.error("Could not extract current password from TEST_DATABASE_URL");
  process.exit(1);
}

try {
  execSync(
    `${psqlPath} -h 127.0.0.1 -p 55432 -U masjid_app -d postgres -c "ALTER USER masjid_app PASSWORD '${newPassword}';"`,
    {
      env: { ...process.env, PGPASSWORD: currentPassword },
      stdio: "inherit",
    }
  );
  console.log("Password rotated successfully. Updated .env with new password.");
} catch (e) {
  console.error("Failed to rotate password:", e);
  process.exit(1);
}