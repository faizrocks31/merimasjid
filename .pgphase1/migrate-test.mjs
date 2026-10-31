import { execFileSync } from "node:child_process";

const url = "postgresql://masjid_app:xNyfsjngYpP9TiJgIQa75rVi1rvnHLVWUFENg37CGMw_@127.0.0.1:55432/masjid_collection_test";

try {
  execFileSync(
    "npx.cmd",
    ["prisma", "migrate", "deploy"],
    {
      env: { ...process.env, TEST_DATABASE_URL: url },
      stdio: "inherit",
      encoding: "utf8",
    },
  );
  console.log("Test DB migrations applied successfully.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
}