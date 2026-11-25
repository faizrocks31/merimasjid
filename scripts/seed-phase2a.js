const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
if (!connectionString || !connectionString.trim()) {
  throw new Error("DATABASE_URL or TEST_DATABASE_URL is not set. Cannot seed.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// 7 Base Categories
const BASE_CATEGORIES = [
  { code: "CONSTRUCTION", name: "Construction", description: "Construction and infrastructure projects" },
  { code: "GENERAL", name: "General", description: "General donations and purposes" },
  { code: "SADAQAH", name: "Sadaqah", description: "Voluntary charity (Sadaqah)" },
  { code: "ZAKAT", name: "Zakat", description: "Obligatory alms (Zakat)" },
  { code: "JUMMA", name: "Jumma", description: "Friday congregation collections" },
  { code: "MONTHLY", name: "Monthly", description: "Regular monthly recurring collections" },
  { code: "ANNUAL", name: "Annual", description: "Annual recurring collections" },
];

// 3 Subcategories
const SUBCATEGORIES = [
  { code: "GENERAL", name: "General", description: "General purpose donations" },
  { code: "RESTRICTED", name: "Restricted", description: "Restricted purpose (Zakat, Construction, etc.)" },
  { code: "RECURRING_DONATION", name: "Recurring Donation", description: "Regular recurring contributions" },
];

// Valid BaseCategory-Subcategory combinations
const VALID_COMBINATIONS = [
  { baseCategoryCode: "CONSTRUCTION", subcategoryCode: "RESTRICTED" },
  { baseCategoryCode: "GENERAL", subcategoryCode: "GENERAL" },
  { baseCategoryCode: "GENERAL", subcategoryCode: "RESTRICTED" },
  { baseCategoryCode: "SADAQAH", subcategoryCode: "GENERAL" },
  { baseCategoryCode: "ZAKAT", subcategoryCode: "RESTRICTED" },
  { baseCategoryCode: "JUMMA", subcategoryCode: "RECURRING_DONATION" },
  { baseCategoryCode: "MONTHLY", subcategoryCode: "RECURRING_DONATION" },
  { baseCategoryCode: "ANNUAL", subcategoryCode: "GENERAL" },
  { baseCategoryCode: "ANNUAL", subcategoryCode: "RECURRING_DONATION" },
];

// Default Collection Definitions for new masjids
const DEFAULT_COLLECTION_DEFINITIONS = [
  {
    name: "Monthly Chanda",
    baseCategoryCode: "MONTHLY",
    subcategoryCode: "RECURRING_DONATION",
    description: "Regular monthly contribution from members",
    frequency: "MONTHLY",
    amountType: "VARIABLE",
    defaultAmountPaise: null,
    donorEligibility: "MEMBERS_ONLY",
    memberAssignment: "ALL_ELIGIBLE",
    dueGeneration: "AUTOMATIC",
    settlementPolicy: "OLDEST_FIRST",
  },
  {
    name: "Annual Chanda",
    baseCategoryCode: "ANNUAL",
    subcategoryCode: "RECURRING_DONATION",
    description: "Annual contribution from members",
    frequency: "ANNUAL",
    amountType: "VARIABLE",
    defaultAmountPaise: null,
    donorEligibility: "MEMBERS_ONLY",
    memberAssignment: "ALL_ELIGIBLE",
    dueGeneration: "AUTOMATIC",
    settlementPolicy: "OLDEST_FIRST",
  },
  {
    name: "General Donation",
    baseCategoryCode: "GENERAL",
    subcategoryCode: "GENERAL",
    description: "General purpose donations from members and walk-ins",
    frequency: "ONE_TIME",
    amountType: "VARIABLE",
    defaultAmountPaise: null,
    donorEligibility: "BOTH",
    memberAssignment: "SELECTED",
    dueGeneration: "ADMIN",
    settlementPolicy: "ANY_PENDING_PERIOD",
  },
  {
    name: "Zakat",
    baseCategoryCode: "ZAKAT",
    subcategoryCode: "RESTRICTED",
    description: "Obligatory Zakat collections (restricted purpose)",
    frequency: "ANNUAL",
    amountType: "VARIABLE",
    defaultAmountPaise: null,
    donorEligibility: "MEMBERS_ONLY",
    memberAssignment: "SELECTED",
    dueGeneration: "ADMIN",
    settlementPolicy: "ANY_PENDING_PERIOD",
  },
  {
    name: "Construction Fund",
    baseCategoryCode: "CONSTRUCTION",
    subcategoryCode: "RESTRICTED",
    description: "Building and infrastructure fund (restricted purpose)",
    frequency: "EVENT_BASED",
    amountType: "VARIABLE",
    defaultAmountPaise: null,
    donorEligibility: "BOTH",
    memberAssignment: "SELECTED",
    dueGeneration: "ADMIN",
    settlementPolicy: "ANY_PENDING_PERIOD",
  },
  {
    name: "Jumma Collection",
    baseCategoryCode: "JUMMA",
    subcategoryCode: "RECURRING_DONATION",
    description: "Friday congregation collection",
    frequency: "WEEKLY",
    amountType: "FIXED",
    defaultAmountPaise: 1000, // ₹10 default
    donorEligibility: "BOTH",
    memberAssignment: "SELECTED",
    dueGeneration: "ADMIN",
    settlementPolicy: "ANY_PENDING_PERIOD",
  },
  {
    name: "Milad-un-Nabi",
    baseCategoryCode: "ANNUAL",
    subcategoryCode: "GENERAL",
    description: "Annual Milad-un-Nabi celebration collection",
    frequency: "ANNUAL",
    amountType: "VARIABLE",
    defaultAmountPaise: null,
    donorEligibility: "BOTH",
    memberAssignment: "SELECTED",
    dueGeneration: "ADMIN",
    settlementPolicy: "ANY_PENDING_PERIOD",
  },
  {
    name: "Shab-e-Qadr",
    baseCategoryCode: "ANNUAL",
    subcategoryCode: "GENERAL",
    description: "Shab-e-Qadr night collection",
    frequency: "EVENT_BASED",
    amountType: "VARIABLE",
    defaultAmountPaise: null,
    donorEligibility: "BOTH",
    memberAssignment: "SELECTED",
    dueGeneration: "ADMIN",
    settlementPolicy: "ANY_PENDING_PERIOD",
  },
];

async function seedBaseCategories() {
  console.log("\n=== Seeding Base Categories ===");
  for (const cat of BASE_CATEGORIES) {
    const existing = await prisma.baseCategory.findUnique({ where: { code: cat.code } });
    if (!existing) {
      await prisma.baseCategory.create({
        data: { ...cat, isSystem: true },
      });
      console.log(`✓ Created BaseCategory: ${cat.code}`);
    } else {
      console.log(`• BaseCategory already exists: ${cat.code}`);
    }
  }
}

async function seedSubcategories() {
  console.log("\n=== Seeding Subcategories ===");
  for (const sub of SUBCATEGORIES) {
    const existing = await prisma.subcategory.findUnique({ where: { code: sub.code } });
    if (!existing) {
      await prisma.subcategory.create({
        data: { ...sub, isSystem: true },
      });
      console.log(`✓ Created Subcategory: ${sub.code}`);
    } else {
      console.log(`• Subcategory already exists: ${sub.code}`);
    }
  }
}

async function seedValidCombinations() {
  console.log("\n=== Seeding Valid Combinations ===");
  for (const combo of VALID_COMBINATIONS) {
    const baseCategory = await prisma.baseCategory.findUnique({ where: { code: combo.baseCategoryCode } });
    const subcategory = await prisma.subcategory.findUnique({ where: { code: combo.subcategoryCode } });

    if (!baseCategory || !subcategory) {
      console.log(`✗ Skipping ${combo.baseCategoryCode} → ${combo.subcategoryCode} (missing category)`);
      continue;
    }

    const existing = await prisma.baseCategorySubcategory.findUnique({
      where: { baseCategoryId_subcategoryId: { baseCategoryId: baseCategory.id, subcategoryId: subcategory.id } },
    });

    if (!existing) {
      await prisma.baseCategorySubcategory.create({
        data: { baseCategoryId: baseCategory.id, subcategoryId: subcategory.id },
      });
      console.log(`✓ Linked ${combo.baseCategoryCode} → ${combo.subcategoryCode}`);
    } else {
      console.log(`• Combination already exists: ${combo.baseCategoryCode} → ${combo.subcategoryCode}`);
    }
  }
}

async function seedCollectionDefinitions() {
  console.log("\n=== Seeding Collection Definitions ===");
  const masjids = await prisma.masjid.findMany({ where: { status: "ACTIVE" } });

  for (const masjid of masjids) {
    console.log(`\n  Masjid: ${masjid.name} (${masjid.id})`);

    for (const def of DEFAULT_COLLECTION_DEFINITIONS) {
      const baseCategory = await prisma.baseCategory.findUnique({ where: { code: def.baseCategoryCode } });
      const subcategory = await prisma.subcategory.findUnique({ where: { code: def.subcategoryCode } });

      if (!baseCategory || !subcategory) {
        console.log(`    ✗ Skipping ${def.name} (missing taxonomy)`);
        continue;
      }

      const existing = await prisma.collectionDefinition.findUnique({
        where: { masjidId_name: { masjidId: masjid.id, name: def.name } },
      });

      if (!existing) {
        await prisma.collectionDefinition.create({
          data: {
            masjidId: masjid.id,
            name: def.name,
            baseCategoryId: baseCategory.id,
            subcategoryId: subcategory.id,
            description: def.description,
            active: true,
            frequency: def.frequency,
            amountType: def.amountType,
            defaultAmountPaise: def.defaultAmountPaise,
            donorEligibility: def.donorEligibility,
            memberAssignment: def.memberAssignment,
            dueGeneration: def.dueGeneration,
            settlementPolicy: def.settlementPolicy,
          },
        });
        console.log(`    ✓ Created: ${def.name} [${def.baseCategoryCode} → ${def.subcategoryCode}]`);
      } else {
        console.log(`    • Already exists: ${def.name}`);
      }
    }
  }
}

async function main() {
  try {
    console.log("Starting Phase 2A System Taxonomy Seed...");
    await prisma.$connect();

    await seedBaseCategories();
    await seedSubcategories();
    await seedValidCombinations();
    await seedCollectionDefinitions();

    // Verify
    const counts = {
      baseCategories: await prisma.baseCategory.count(),
      subcategories: await prisma.subcategory.count(),
      combinations: await prisma.baseCategorySubcategory.count(),
      collectionDefinitions: await prisma.collectionDefinition.count(),
    };

    console.log("\n=== SEED SUMMARY ===");
    console.log(`Base Categories: ${counts.baseCategories}`);
    console.log(`Subcategories: ${counts.subcategories}`);
    console.log(`Valid Combinations: ${counts.combinations}`);
    console.log(`Collection Definitions: ${counts.collectionDefinitions}`);

  } catch (e) {
    console.error("Seed error:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();