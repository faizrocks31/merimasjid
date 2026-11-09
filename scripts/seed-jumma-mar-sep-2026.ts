/**
 * Seed Jumma Collection data for March to September 2026
 * Adds to existing Oct/Nov 2026 data
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
if (connectionString.startsWith("file:")) throw new Error("Requires PostgreSQL");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const TEST_MASJID_SLUG = process.env.SEED_TEST_MASJID_SLUG?.trim() || "test-masjid";

// March to September 2026 Fridays
const FRIDAYS_MAR_SEP_2026 = [
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
];

function isFriday(dateStr: string): boolean {
  const date = new Date(dateStr + "T00:00:00.000Z");
  return date.getUTCDay() === 5;
}

async function main() {
  console.log("=== Jumma Mar-Sep 2026 Seeding ===\n");

  const masjid = await prisma.masjid.findUnique({ where: { slug: TEST_MASJID_SLUG } });
  if (!masjid) throw new Error(`Test masjid not found: ${TEST_MASJID_SLUG}`);
  console.log(`Masjid: ${masjid.name}`);

  const localAdminEmail = (process.env.SEED_LOCAL_ADMIN_EMAIL || "masjid-admin@example.invalid").toLowerCase();
  const adminUser = await prisma.user.findUnique({ where: { email: localAdminEmail } });
  if (!adminUser) throw new Error(`Admin user not found: ${localAdminEmail}`);
  console.log(`Admin: ${adminUser.name}`);

  const jummaDef = await prisma.collectionDefinition.findFirst({
    where: { masjidId: masjid.id, active: true, OR: [{ subcategory: { code: "JUMMA" } }, { purposeCode: "JUMMA_COLLECTION" }] },
    select: { id: true, name: true },
  });
  if (!jummaDef) throw new Error("Jumma definition not found");
  console.log(`Definition: ${jummaDef.name}`);

  // Varying amounts for realistic data
  const amounts = [
    12000, 18000, 15000, 22000, 19000, 25000, 17000, 21000,
    16000, 20000, 23000, 14000, 24000, 18000, 22000, 19000,
    21000, 17000, 23000, 15000, 20000, 24000, 16000, 22000,
    18000, 25000, 19000, 21000, 17000, 23000,
  ];

  let created = 0, skipped = 0;

  for (let i = 0; i < FRIDAYS_MAR_SEP_2026.length; i++) {
    const dateStr = FRIDAYS_MAR_SEP_2026[i];
    const amountPaise = amounts[i % amounts.length];

    if (!isFriday(dateStr)) {
      console.log(`⚠ ${dateStr} not Friday, skipping`);
      skipped++;
      continue;
    }

    const existing = await prisma.jummaCollection.findUnique({
      where: { masjidId_collectionDate_collectionDefinitionId: { masjidId: masjid.id, collectionDate: new Date(dateStr + "T00:00:00.000Z"), collectionDefinitionId: jummaDef.id } },
    });

    if (existing) {
      console.log(`⚠ ${dateStr} exists, skipping`);
      skipped++;
      continue;
    }

    await prisma.jummaCollection.create({
      data: {
        masjidId: masjid.id,
        collectionDefinitionId: jummaDef.id,
        collectionDate: new Date(dateStr + "T00:00:00.000Z"),
        totalAmountPaise: amountPaise,
        participantCount: 0,
        notes: `Seeded Mar-Sep 2026: ${dateStr}`,
        recordedBy: adminUser.id,
      },
    });

    console.log(`✓ ${dateStr} - ₹${(amountPaise / 100).toFixed(2)}`);
    created++;
  }

  // Show all records
  const all = await prisma.jummaCollection.findMany({
    where: { masjidId: masjid.id },
    orderBy: { collectionDate: "asc" },
    select: { collectionDate: true, totalAmountPaise: true },
  });

  console.log(`\n=== Total Records: ${all.length} (Created: ${created}, Skipped: ${skipped}) ===`);
  for (const r of all) {
    console.log(`  ${r.collectionDate.toISOString().split("T")[0]} - ₹${(r.totalAmountPaise / 100).toFixed(2)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });