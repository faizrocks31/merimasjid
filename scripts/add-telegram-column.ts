/**
 * Verifies that the `telegramChatId` column on Member exists and is unique.
 *
 * This script used to ALTER TABLE the SQLite database directly. On
 * PostgreSQL the schema is owned by the migration chain, so the column and
 * its unique index are created by
 * `prisma/migrations/20261022000000_postgres_baseline` and this script only
 * checks that they are present.
 *
 * Run with: npx tsx scripts/add-telegram-column.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !connectionString.trim()) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const columns = await prisma.$queryRaw<{ column_name: string; is_nullable: string }[]>`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Member' AND column_name = 'telegramChatId'
  `;

  if (columns.length === 0) {
    console.error("telegramChatId is MISSING. Run `npx prisma migrate deploy`.");
    process.exitCode = 1;
    return;
  }

  console.log("telegramChatId: present (nullable:", columns[0].is_nullable === "YES", ")");

  const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'Member' AND indexname = 'Member_telegramChatId_key'
  `;
  console.log(
    indexes.length > 0
      ? "unique index Member_telegramChatId_key: present"
      : "unique index Member_telegramChatId_key: MISSING",
  );
  if (indexes.length === 0) process.exitCode = 1;

  const count = await prisma.member.count();
  console.log("Member rows:", count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
