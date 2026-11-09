import { FullConfig } from "@playwright/test";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Valid dates we want to keep (March-Nov 2026 Fridays - all seeded data)
const VALID_DATES = new Set([
  // March 2026
  "2026-03-06", "2026-03-13", "2026-03-20", "2026-03-27",
  // April 2026
  "2026-04-03", "2026-04-10", "2026-04-17", "2026-04-24",
  // May 2026
  "2026-05-01", "2026-05-08", "2026-05-15", "2026-05-22", "2026-05-29",
  // June 2026
  "2026-06-05", "2026-06-12", "2026-06-19", "2026-06-26",
  // July 2026
  "2026-07-03", "2026-07-10", "2026-07-17", "2026-07-24", "2026-07-31",
  // August 2026
  "2026-08-07", "2026-08-14", "2026-08-21", "2026-08-28",
  // September 2026
  "2026-09-04", "2026-09-11", "2026-09-18", "2026-09-25",
  // October 2026
  "2026-10-02", "2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30",
  // November 2026
  "2026-11-06", "2026-11-13", "2026-11-20", "2026-11-27",
]);

async function globalTeardown(config: FullConfig) {
  console.log("\n=== Global Teardown: Cleaning up test Jumma data ===");

  try {
    const masjid = await prisma.masjid.findFirst({ where: { slug: "test-masjid" } });
    if (!masjid) {
      console.log("Test masjid not found, skipping cleanup");
      return;
    }

    const jummaDef = await prisma.collectionDefinition.findFirst({
      where: { masjidId: masjid.id, OR: [{ subcategory: { code: "JUMMA" } }, { purposeCode: "JUMMA_COLLECTION" }] },
    });
    if (!jummaDef) {
      console.log("Jumma definition not found, skipping cleanup");
      return;
    }

    // Find ALL records
    const allRecords = await prisma.jummaCollection.findMany({
      where: { masjidId: masjid.id },
      select: { id: true, collectionDate: true, totalAmountPaise: true },
    });

    // Separate valid vs test records
    const deleteIds: string[] = [];
    for (const r of allRecords) {
      const dateStr = r.collectionDate.toISOString().split("T")[0];
      if (!VALID_DATES.has(dateStr)) {
        deleteIds.push(r.id);
      }
    }

    if (deleteIds.length > 0) {
      const deletedCorrections = await prisma.jummaCorrection.deleteMany({
        where: { jummaCollectionId: { in: deleteIds } },
      });
      const deletedRecords = await prisma.jummaCollection.deleteMany({
        where: { id: { in: deleteIds } },
      });
      console.log(`Cleaned up ${deletedRecords.count} test Jumma records and ${deletedCorrections.count} corrections`);
    } else {
      console.log("No test records to clean up");
    }
  } catch (e) {
    console.error("Cleanup error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;