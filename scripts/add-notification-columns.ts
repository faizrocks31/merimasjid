/**
 * Verifies that the notification-preference columns on Member and the
 * MasjidNotificationSettings table exist.
 *
 * This script used to ALTER TABLE the SQLite database directly. On
 * PostgreSQL the schema is owned by the migration chain, so the columns are
 * created by `prisma/migrations/20261022000000_postgres_baseline` and this
 * script only checks that they are present.
 *
 * Run with: npx tsx scripts/add-notification-columns.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !connectionString.trim()) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const EXPECTED_MEMBER_COLUMNS = [
  "notifyTelegram",
  "notifyInApp",
  "notifyEmail",
  "quietHoursStart",
  "quietHoursEnd",
  "timezone",
];

async function main() {
  const columns = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Member'
  `;
  const present = new Set(columns.map((c) => c.column_name));

  console.log("=== Member notification columns ===");
  const missing: string[] = [];
  for (const name of EXPECTED_MEMBER_COLUMNS) {
    if (present.has(name)) {
      console.log(`  ${name}: present`);
    } else {
      console.log(`  ${name}: MISSING`);
      missing.push(name);
    }
  }

  console.log("\n=== MasjidNotificationSettings table ===");
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'MasjidNotificationSettings'
  `;
  console.log(tables.length > 0 ? "  present" : "  MISSING");
  if (tables.length === 0) missing.push("MasjidNotificationSettings");

  const count = await prisma.masjidNotificationSettings.count();
  console.log("\nMasjidNotificationSettings rows:", count);

  if (missing.length > 0) {
    console.error(
      `\nMissing: ${missing.join(", ")}. Run \`npx prisma migrate deploy\` to bring the schema up to date.`,
    );
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
