import { prisma } from "@/lib/db";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/constants";

/**
 * Creates default collection definitions for a test masjid using the new Phase 2A taxonomy.
 * This mirrors the seed.ts and createMasjidAction logic.
 */
export async function createDefaultCollectionDefinitions(masjidId: string) {
  const baseCategories = await prisma.baseCategory.findMany();
  const subcategories = await prisma.subcategory.findMany();

  const baseCategoryMap = new Map(baseCategories.map(bc => [bc.code, bc.id]));
  const subcategoryMap = new Map(subcategories.map(sc => [sc.code, sc.id]));

  const defaultCollectionDefinitions = [
    {
      name: "Monthly Chanda",
      purposeCode: "MONTHLY_CHANDA",
      baseCategoryCode: "MONTHLY",
      subcategoryCode: "RECURRING_DONATION",
      description: "Regular monthly contribution from members",
      frequency: "MONTHLY" as const,
      amountType: "VARIABLE" as const,
      defaultAmountPaise: null,
      donorEligibility: "MEMBERS_ONLY" as const,
      memberAssignment: "ALL_ELIGIBLE" as const,
      dueGeneration: "AUTOMATIC" as const,
      settlementPolicy: "OLDEST_FIRST" as const,
    },
    {
      name: "Annual Chanda",
      purposeCode: "ANNUAL_CHANDA",
      baseCategoryCode: "ANNUAL",
      subcategoryCode: "RECURRING_DONATION",
      description: "Annual contribution from members",
      frequency: "ANNUAL" as const,
      amountType: "VARIABLE" as const,
      defaultAmountPaise: null,
      donorEligibility: "MEMBERS_ONLY" as const,
      memberAssignment: "ALL_ELIGIBLE" as const,
      dueGeneration: "AUTOMATIC" as const,
      settlementPolicy: "OLDEST_FIRST" as const,
    },
    {
      name: "General Donation",
      purposeCode: "GENERAL_DONATION",
      baseCategoryCode: "GENERAL",
      subcategoryCode: "GENERAL",
      description: "General purpose donations from members and walk-ins",
      frequency: "ONE_TIME" as const,
      amountType: "VARIABLE" as const,
      defaultAmountPaise: null,
      donorEligibility: "BOTH" as const,
      memberAssignment: "SELECTED" as const,
      dueGeneration: "ADMIN" as const,
      settlementPolicy: "ANY_PENDING_PERIOD" as const,
    },
    {
      name: "Zakat",
      purposeCode: "ZAKAT",
      baseCategoryCode: "ZAKAT",
      subcategoryCode: "RESTRICTED",
      description: "Obligatory Zakat collections (restricted purpose)",
      frequency: "ANNUAL" as const,
      amountType: "VARIABLE" as const,
      defaultAmountPaise: null,
      donorEligibility: "MEMBERS_ONLY" as const,
      memberAssignment: "SELECTED" as const,
      dueGeneration: "ADMIN" as const,
      settlementPolicy: "ANY_PENDING_PERIOD" as const,
    },
    {
      name: "Construction Fund",
      purposeCode: "CONSTRUCTION_FUND",
      baseCategoryCode: "CONSTRUCTION",
      subcategoryCode: "RESTRICTED",
      description: "Building and infrastructure fund (restricted purpose)",
      frequency: "EVENT_BASED" as const,
      amountType: "VARIABLE" as const,
      defaultAmountPaise: null,
      donorEligibility: "BOTH" as const,
      memberAssignment: "SELECTED" as const,
      dueGeneration: "ADMIN" as const,
      settlementPolicy: "ANY_PENDING_PERIOD" as const,
    },
    {
      name: "Jumma Collection",
      purposeCode: "JUMMA_COLLECTION",
      baseCategoryCode: "JUMMA",
      subcategoryCode: "RECURRING_DONATION",
      description: "Friday congregation collection",
      frequency: "WEEKLY" as const,
      amountType: "FIXED" as const,
      defaultAmountPaise: 1000, // ₹10 default
      donorEligibility: "BOTH" as const,
      memberAssignment: "SELECTED" as const,
      dueGeneration: "ADMIN" as const,
      settlementPolicy: "ANY_PENDING_PERIOD" as const,
    },
    {
      name: "Milad-un-Nabi",
      purposeCode: "MILAD_UN_NABI",
      baseCategoryCode: "ANNUAL",
      subcategoryCode: "GENERAL",
      description: "Annual Milad-un-Nabi celebration collection",
      frequency: "ANNUAL" as const,
      amountType: "VARIABLE" as const,
      defaultAmountPaise: null,
      donorEligibility: "BOTH" as const,
      memberAssignment: "SELECTED" as const,
      dueGeneration: "ADMIN" as const,
      settlementPolicy: "OLDEST_FIRST" as const,
    },
    {
      name: "Shab-e-Qadr",
      purposeCode: "SHAB_E_QADR",
      baseCategoryCode: "ANNUAL",
      subcategoryCode: "GENERAL",
      description: "Shab-e-Qadr night collection",
      frequency: "EVENT_BASED" as const,
      amountType: "VARIABLE" as const,
      defaultAmountPaise: null,
      donorEligibility: "BOTH" as const,
      memberAssignment: "SELECTED" as const,
      dueGeneration: "ADMIN" as const,
      settlementPolicy: "ANY_PENDING_PERIOD" as const,
    },
  ];

  const createdIds: string[] = [];
  for (const def of defaultCollectionDefinitions) {
    const baseCategoryId = baseCategoryMap.get(def.baseCategoryCode);
    const subcategoryId = subcategoryMap.get(def.subcategoryCode);

    if (!baseCategoryId || !subcategoryId) {
      console.log(`⚠ Skipping ${def.name} (missing taxonomy: ${def.baseCategoryCode} / ${def.subcategoryCode})`);
      continue;
    }

    const exists = await prisma.collectionDefinition.findUnique({
      where: { masjidId_name: { masjidId, name: def.name } },
    });

    if (!exists) {
      const created = await prisma.collectionDefinition.create({
        data: {
          masjidId,
          name: def.name,
          purposeCode: def.purposeCode,
          baseCategoryId,
          subcategoryId,
          description: def.description,
          active: true,
          showInPaymentReceived: true,
          frequency: def.frequency,
          amountType: def.amountType,
          defaultAmountPaise: def.defaultAmountPaise,
          donorEligibility: def.donorEligibility,
          memberAssignment: def.memberAssignment,
          dueGeneration: def.dueGeneration,
          settlementPolicy: def.settlementPolicy,
        },
      });
      createdIds.push(created.id);
    } else {
      createdIds.push(exists.id);
    }
  }
  return createdIds;
}

export async function createMasjidWithDefaults(name: string, slug: string) {
  const masjid = await prisma.masjid.create({
    data: {
      name,
      slug,
      receiptPrefix: "TMP",
      financialYearStartMonth: 4,
      status: "ACTIVE",
    },
  });

  // Create default collection definitions (new Phase 2A)
  await createDefaultCollectionDefinitions(masjid.id);

  // Copy expense categories
  for (const n of DEFAULT_EXPENSE_CATEGORIES) {
    await prisma.expenseCategory.create({
      data: { masjidId: masjid.id, name: n },
    });
  }

  return masjid.id;
}

/**
 * Gets the first collection definition for a masjid (for backward compatibility with tests)
 */
export async function getFirstCollectionDefinition(masjidId: string) {
  return prisma.collectionDefinition.findFirst({
    where: { masjidId, active: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Gets a collection definition by purposeCode for a specific masjid
 */
export async function getCollectionDefinitionByPurposeCode(masjidId: string, purposeCode: string) {
  return prisma.collectionDefinition.findFirst({
    where: { masjidId, purposeCode, active: true },
  });
}

/**
 * Gets a collection definition by name for a specific masjid
 */
export async function getCollectionDefinitionByName(masjidId: string, name: string) {
  return prisma.collectionDefinition.findFirst({
    where: { masjidId, name, active: true },
  });
}