// Test bootstrap.
//
// Tests run against an ISOLATED PostgreSQL database — never against the
// development database, and never against anything that is not clearly
// identified as a test database.
//
//   TEST_DATABASE_URL   the connection string for the test database (required)
//
// The bootstrap refuses to run unless the URL is recognisably a test
// database, so a mis-set environment variable cannot destroy real data.
//
// It then:
//   1. verifies the test database is at the expected schema version,
//   2. seeds the minimal structural fixture the DB-backed tests need.
//
// Tests create their own temporary rows and clean them up in `afterAll`.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { DEFAULT_EXPENSE_CATEGORIES } from "../src/lib/constants";
import { createDefaultCollectionDefinitions } from "./helpers";

/**
 * Refuses to touch a database that does not look like a test database.
 * A name has to contain "test" in some form.
 */
function assertIsTestDatabase(url: string): void {
  if (!url.trim()) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Tests require an isolated PostgreSQL test database. " +
        "See docs/phase-1-postgresql-setup.md for the exact setup commands.",
    );
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error("TEST_DATABASE_URL must be a postgresql:// connection string.");
  }
  // Strip the query string, then look for a "test" marker in the database name.
  const withoutQuery = url.split("?")[0];
  const dbName = withoutQuery.split("/").pop() ?? "";
  if (!/test/i.test(dbName)) {
    throw new Error(
      `TEST_DATABASE_URL points at "${dbName}", which is not recognisably a test database. ` +
        `Refusing to run — set it to a dedicated database whose name contains "test".`,
    );
  }
}

const testUrl = process.env.TEST_DATABASE_URL ?? "";
assertIsTestDatabase(testUrl);

// The application code under test must read this.
process.env.DATABASE_URL = testUrl;
process.env.AUTH_SECRET ||= "test-secret-that-is-long-enough-for-hs256-signing";

// Create a separate PrismaClient for the test database
const testPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testUrl }) });

/**
 * Verifies the test database has the expected schema by checking that the
 * migration record table exists and the baseline migration is recorded.
 * This avoids spawning a child process on Windows (which fails with EINVAL).
 */
async function verifySchema(): Promise<void> {
  // Check that the _prisma_migrations table exists and our baseline is recorded.
  const result = await testPrisma.$queryRawUnsafe<{ migration_name: string; finished_at: Date }[]>(
    `SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE migration_name = '20261022000000_postgres_baseline' AND finished_at IS NOT NULL`,
  );
  if (!result || result.length === 0) {
    throw new Error(
      "Test database schema is not up to date. Run `npm run db:migrate:test` to apply migrations first.",
    );
  }
}

/**
 * The structural fixture the DB-backed tests rely on: one masjid, one user,
 * one contribution category, one expense category. These are the same defaults
 * `prisma/seed.ts` creates, minus the two admin accounts (the seed accounts
 * are covered by the dedicated seed test).
 */
async function seedTestFixture(): Promise<void> {
  const masjid = await testPrisma.masjid.findFirst({ where: { slug: "test-masjid" } });
  const masjidId =
    masjid?.id ??
    (
      await testPrisma.masjid.create({
        data: {
          name: "Test Masjid",
          slug: "test-masjid",
          receiptPrefix: "TSTM",
          financialYearStartMonth: 4,
          receiptFooter: "Jazak Allah Khair for your contribution.",
          status: "ACTIVE",
        },
      })
    ).id;

  // Create default collection definitions (Phase 2A taxonomy)
  await createDefaultCollectionDefinitions(masjidId);

  // Structural taxonomy (BaseCategory, Subcategory) is assumed to be
  // handled by prisma migrate/db push since they are non-tenant tables.

  for (const name of DEFAULT_EXPENSE_CATEGORIES) {
    const exists = await testPrisma.expenseCategory.findUnique({
      where: { masjidId_name: { masjidId, name } },
    });
    if (!exists) {
      await testPrisma.expenseCategory.create({ data: { masjidId, name } });
    }
  }

  const user = await testPrisma.user.findFirst({ where: { email: "test-user@example.invalid" } });
  if (!user) {
    await testPrisma.user.create({
      data: {
        name: "Test User",
        email: "test-user@example.invalid",
        passwordHash: await bcrypt.hash("test-only-not-a-real-password", 12),
        status: "ACTIVE",
      },
    });
  }
}

// Vitest loads this file once per test file, so guard the one-time setup.
const globalForTests = globalThis as unknown as { __masjidTestDbReady?: Promise<void> };

if (!globalForTests.__masjidTestDbReady) {
  globalForTests.__masjidTestDbReady = (async () => {
    await verifySchema();
    await seedTestFixture();
  })();
}

export default globalForTests.__masjidTestDbReady;