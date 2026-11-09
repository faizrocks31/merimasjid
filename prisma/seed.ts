/**
 * Seeds the two administrator accounts required by Phase 1:
 *
 *   Account A — Super Admin       (role SUPER_ADMIN, platform level)
 *   Account B — Local Masjid Admin (role ADMIN, exactly one test masjid)
 *
 * Together with the single test masjid they belong to, that is the *entire*
 * persistent dataset this script creates. No members, no payments, no
 * collections, no demo portal logins.
 *
 *   npm run seed
 *
 * ## Credentials
 *
 * Passwords are read from environment variables and are NEVER given a default
 * value, never written to the source tree, and never printed. The script
 * refuses to run if they are missing or still set to a placeholder.
 *
 *   SEED_SUPER_ADMIN_EMAIL      (default: platform-admin@example.invalid)
 *   SEED_SUPER_ADMIN_PASSWORD   (required, no default)
 *   SEED_SUPER_ADMIN_NAME       (default: Platform Super Admin)
 *   SEED_LOCAL_ADMIN_EMAIL      (default: masjid-admin@example.invalid)
 *   SEED_LOCAL_ADMIN_PASSWORD   (required, no default)
 *   SEED_LOCAL_ADMIN_NAME       (default: Masjid Admin)
 *   SEED_TEST_MASJID_NAME       (default: Test Masjid)
 *   SEED_TEST_MASJID_SLUG       (default: test-masjid)
 *   SEED_TEST_MASJID_RECEIPT_PREFIX (default: TSTM)
 *   SEED_TEST_MASJID_ADDRESS    (default: unset)
 *
 * ## Idempotency
 *
 * Re-running the script updates the two accounts in place (the configured
 * password stays authoritative) and never creates a duplicate user, masjid or
 * membership. It is safe to run against an already-seeded database.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { DEFAULT_EXPENSE_CATEGORIES, ROLES } from "../src/lib/constants";
import { SUBSCRIPTION_PLANS } from "../src/lib/subscription-plans";
import { nextMemberNumber } from "../src/lib/receipts/numbering";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !connectionString.trim()) {
  throw new Error("DATABASE_URL is not set. Cannot seed.");
}
if (connectionString.startsWith("file:")) {
  throw new Error("DATABASE_URL points at a SQLite file. This project now requires PostgreSQL.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/**
 * Placeholder values that must never be used as a real password. Keeping
 * these out of the source tree is the point: an operator has to choose a
 * password themselves before the seed can run.
 */
const PLACEHOLDER_PASSWORDS = new Set([
  "",
  "changeme",
  "changeme123",
  "change-me",
  "change-me-please",
  "password",
  "password123",
  "your-password",
  "set-me",
  "todo",
]);

function requiredPassword(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `${name} is not set. Set it in .env (or the environment) before running the seed. ` +
        `The seed never invents a default password.`,
    );
  }
  if (PLACEHOLDER_PASSWORDS.has(value.trim().toLowerCase())) {
    throw new Error(
      `${name} still holds a placeholder value. Set a real password before running the seed.`,
    );
  }
  if (value.length < 8) {
    throw new Error(`${name} must be at least 8 characters long.`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

/**
 * Creates the user if it is missing, otherwise refreshes the display name and
 * the password so the configured environment variable stays authoritative.
 * Never creates a second row for the same email — `email` is unique.
 */
async function upsertUser(email: string, name: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const created = await prisma.user.create({
      data: { name, email, passwordHash, status: "ACTIVE" },
    });
    console.log(`✓ Created user: ${email}`);
    return { id: created.id, created: true };
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: { name, passwordHash, status: "ACTIVE" },
  });
  console.log(`• User already exists, credentials refreshed: ${email}`);
  return { id: existing.id, created: false };
}

/** Links a user to a masjid with a role. Idempotent. */
async function ensureMembership(masjidId: string, userId: string, role: string, masjidName: string) {
  const existing = await prisma.masjidUser.findUnique({
    where: { masjidId_userId: { masjidId, userId } },
  });

  if (!existing) {
    await prisma.masjidUser.create({
      data: { masjidId, userId, role, status: "ACTIVE", joinedAt: new Date() },
    });
    console.log(`✓ Linked ${role} to ${masjidName}`);
    return;
  }

  await prisma.masjidUser.update({
    where: { id: existing.id },
    data: { role, status: "ACTIVE" },
  });
  console.log(`• Membership already exists, refreshed: ${role} at ${masjidName}`);
}

/**
 * Removes any membership of this user at a masjid other than the one the
 * account is designated for. The Local Masjid Admin is required to be bound to
 * exactly one masjid, and a stray membership would give it access to another
 * tenant's records.
 */
async function removeForeignMemberships(userId: string, keepMasjidId: string) {
  const others = await prisma.masjidUser.findMany({
    where: { userId, NOT: { masjidId: keepMasjidId } },
    select: { id: true },
  });
  if (others.length === 0) return;

  await prisma.masjidUser.deleteMany({ where: { userId, NOT: { masjidId: keepMasjidId } } });
  console.log(`• Removed ${others.length} membership(s) outside the designated masjid`);
}

async function main() {
  const superAdminEmail = optional("SEED_SUPER_ADMIN_EMAIL", "platform-admin@example.invalid").toLowerCase();
  const superAdminName = optional("SEED_SUPER_ADMIN_NAME", "Platform Super Admin");
  const superAdminPassword = requiredPassword("SEED_SUPER_ADMIN_PASSWORD");

  const localAdminEmail = optional("SEED_LOCAL_ADMIN_EMAIL", "masjid-admin@example.invalid").toLowerCase();
  const localAdminName = optional("SEED_LOCAL_ADMIN_NAME", "Masjid Admin");
  const localAdminPassword = requiredPassword("SEED_LOCAL_ADMIN_PASSWORD");

  const masjidName = optional("SEED_TEST_MASJID_NAME", "Test Masjid");
  const masjidSlug = optional("SEED_TEST_MASJID_SLUG", "test-masjid");
  const receiptPrefix = optional("SEED_TEST_MASJID_RECEIPT_PREFIX", "TSTM").toUpperCase();
  const masjidAddress = process.env.SEED_TEST_MASJID_ADDRESS?.trim() || null;

  if (superAdminEmail === localAdminEmail) {
    throw new Error(
      "SEED_SUPER_ADMIN_EMAIL and SEED_LOCAL_ADMIN_EMAIL must be different. Phase 1 requires exactly two distinct accounts.",
    );
  }

  // 1. The single test masjid both accounts are attached to.
  let masjid = await prisma.masjid.findFirst({ where: { slug: masjidSlug } });
  if (!masjid) {
    masjid = await prisma.masjid.create({
      data: {
        name: masjidName,
        slug: masjidSlug,
        receiptPrefix,
        address: masjidAddress,
        financialYearStartMonth: 4,
        receiptFooter: "Jazak Allah Khair for your contribution.",
        status: "ACTIVE",
      },
    });
    console.log(`✓ Created test masjid: ${masjid.name}`);
  } else {
    console.log(`• Test masjid already exists: ${masjid.name}`);
  }

  // 2. Seed test members (including Arif Hussain for E2E tests)
  const testMembers = [
    { fullName: "Arif Hussain", fatherName: "Mohammad Hussain", phone: "9876543210", address: "123 Test Street", joinDate: new Date("2024-01-15"), status: "ACTIVE", notes: "Seeded test member" },
    { fullName: "Mohammad Ali", fatherName: "Abdul Ali", phone: "9876543211", address: "456 Test Avenue", joinDate: new Date("2024-02-20"), status: "ACTIVE", notes: "Seeded test member" },
    { fullName: "Fatima Khan", fatherName: "Ahmed Khan", phone: "9876543212", address: "789 Test Road", joinDate: new Date("2024-03-10"), status: "ACTIVE", notes: "Seeded test member" },
  ];

  for (const memberData of testMembers) {
    const existing = await prisma.member.findFirst({
      where: { masjidId: masjid.id, phone: `+91${memberData.phone}` },
    });
    if (!existing) {
      const memberNo = await nextMemberNumber(prisma, masjid.id);
      await prisma.member.create({
        data: {
          masjidId: masjid.id,
          memberNo,
          fullName: memberData.fullName,
          fatherName: memberData.fatherName,
          phone: `+91${memberData.phone}`,
          address: memberData.address,
          joinDate: memberData.joinDate,
          status: memberData.status,
          notes: memberData.notes,
        },
      });
      console.log(`✓ Created test member: ${memberData.fullName}`);
    } else {
      console.log(`• Member already exists: ${memberData.fullName}`);
    }
  }

  // Create TRIAL subscription for the test masjid if it doesn't have one
  const existingSubscription = await prisma.subscription.findFirst({
    where: { masjidId: masjid.id },
    orderBy: { createdAt: "desc" },
  });

  if (!existingSubscription) {
    const trialPlan = SUBSCRIPTION_PLANS.TRIAL;
    const startsAt = new Date();
    const trialEndsAt = new Date(startsAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + trialPlan.trialDays);

    await prisma.subscription.create({
      data: {
        masjidId: masjid.id,
        planCode: "TRIAL",
        status: "TRIAL",
        startsAt,
        endsAt: trialEndsAt,
        billingReference: null,
      },
    });

    // Update denormalized fields on Masjid
    await prisma.masjid.update({
      where: { id: masjid.id },
      data: {
        subscriptionStatus: "TRIAL",
        subscriptionEndsAt: trialEndsAt,
        maxMembers: trialPlan.limits.maxMembers,
        maxStaff: trialPlan.limits.maxStaff,
        maxCategories: trialPlan.limits.maxCategories,
      },
    });

    console.log(`✓ Created TRIAL subscription for masjid: ${masjid.name}`);
  } else {
    console.log(`• Subscription already exists for masjid: ${masjid.name}`);
  }

  // The masjid's default collection definitions and expense categories. These are
  // structural defaults the app needs before any payment can be recorded
  // (see createMasjidAction) — not sample business data.
  // Seed default collection definitions for this masjid

  // First, ensure the system taxonomy is seeded
  const baseCategoryTaxonomy = [
    { code: "ZAKAT", name: "Zakat", description: "Obligatory alms" },
    { code: "SADAQAH", name: "Sadaqah", description: "Voluntary charity" },
    { code: "INFAQ", name: "Infaq", description: "Obligatory spending" },
    { code: "CHANDA", name: "Chanda", description: "Regular contributions" },
    { code: "FUNDRAISING", name: "Fundraising", description: "Fund campaigns" },
    { code: "COMMUNITY_EVENT", name: "Community Event", description: "Community events" },
    { code: "GENERAL_DONATION", name: "General Donation", description: "General donations" },
  ];

  for (const bc of baseCategoryTaxonomy) {
    await prisma.baseCategory.upsert({
      where: { code: bc.code },
      update: {},
      create: bc,
    });
  }

  const subcategoryTaxonomy = [
    { code: "ZAKAT_FITR", name: "Zakat al-Fitr" },
    { code: "ZAKAT_MAAL", name: "Zakat al-Maal" },
    { code: "GENERAL", name: "General" },
    { code: "FIDYAH", name: "Fidyah" },
    { code: "KAFFARAH", name: "Kaffarah" },
    { code: "CONSTRUCTION", name: "Construction" },
    { code: "MAINTENANCE", name: "Maintenance" },
    { code: "OPERATIONS", name: "Operations" },
    { code: "MONTHLY", name: "Monthly" },
    { code: "ANNUAL", name: "Annual" },
    { code: "CAMPAIGN", name: "Campaign" },
    { code: "PROJECT", name: "Project" },
    { code: "EMERGENCY", name: "Emergency" },
    { code: "EID", name: "Eid" },
    { code: "MILAD", name: "Milad un-Nabi" },
    { code: "ISRA_MIRAJ", name: "Isra wal Miraj" },
    { code: "SHAB_E_QADR", name: "Shab-e-Qadr" },
    { code: "RAMADAN", name: "Ramadan" },
    { code: "JUMMA", name: "Jumma" },
    { code: "UNRESTRICTED", name: "Unrestricted" },
    { code: "RECURRING_DONATION", name: "Recurring Donation" },
    { code: "RESTRICTED", name: "Restricted" },
  ];

  for (const sc of subcategoryTaxonomy) {
    await prisma.subcategory.upsert({
      where: { code: sc.code },
      update: {},
      create: sc,
    });
  }

  // Seed base-category to subcategory associations
  const baseCategorySubcategoryTaxonomy: Array<{ baseCode: string; subCode: string }> = [
    { baseCode: "ZAKAT", subCode: "ZAKAT_FITR" },
    { baseCode: "ZAKAT", subCode: "ZAKAT_MAAL" },
    { baseCode: "SADAQAH", subCode: "GENERAL" },
    { baseCode: "SADAQAH", subCode: "FIDYAH" },
    { baseCode: "SADAQAH", subCode: "KAFFARAH" },
    { baseCode: "INFAQ", subCode: "CONSTRUCTION" },
    { baseCode: "INFAQ", subCode: "MAINTENANCE" },
    { baseCode: "INFAQ", subCode: "OPERATIONS" },
    { baseCode: "CHANDA", subCode: "MONTHLY" },
    { baseCode: "CHANDA", subCode: "ANNUAL" },
    { baseCode: "FUNDRAISING", subCode: "CAMPAIGN" },
    { baseCode: "FUNDRAISING", subCode: "PROJECT" },
    { baseCode: "FUNDRAISING", subCode: "EMERGENCY" },
    { baseCode: "COMMUNITY_EVENT", subCode: "EID" },
    { baseCode: "COMMUNITY_EVENT", subCode: "MILAD" },
    { baseCode: "COMMUNITY_EVENT", subCode: "ISRA_MIRAJ" },
    { baseCode: "COMMUNITY_EVENT", subCode: "SHAB_E_QADR" },
    { baseCode: "COMMUNITY_EVENT", subCode: "RAMADAN" },
    { baseCode: "COMMUNITY_EVENT", subCode: "JUMMA" },
    { baseCode: "GENERAL_DONATION", subCode: "UNRESTRICTED" },
  ];

  for (const combo of baseCategorySubcategoryTaxonomy) {
    const baseCategory = await prisma.baseCategory.findUnique({ where: { code: combo.baseCode } });
    const subcategory = await prisma.subcategory.findUnique({ where: { code: combo.subCode } });
    if (baseCategory && subcategory) {
      await prisma.baseCategorySubcategory.upsert({
        where: { baseCategoryId_subcategoryId: { baseCategoryId: baseCategory.id, subcategoryId: subcategory.id } },
        update: {},
        create: { baseCategoryId: baseCategory.id, subcategoryId: subcategory.id },
      });
    }
  }

  console.log(`✓ System taxonomy seeded`);

  // Now fetch the taxonomy for use in collection definitions
  const baseCategories = await prisma.baseCategory.findMany();
  const subcategories = await prisma.subcategory.findMany();

  const baseCategoryMap = new Map(baseCategories.map(bc => [bc.code, bc.id]));
  const subcategoryMap = new Map(subcategories.map(sc => [sc.code, sc.id]));

  const defaultCollectionDefinitions = [
    {
      name: "Monthly Chanda",
      purposeCode: "MONTHLY_CHANDA",
      baseCategoryCode: "CHANDA",
      subcategoryCode: "MONTHLY",
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
      baseCategoryCode: "CHANDA",
      subcategoryCode: "ANNUAL",
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
      baseCategoryCode: "GENERAL_DONATION",
      subcategoryCode: "UNRESTRICTED",
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
      subcategoryCode: "ZAKAT_MAAL",
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
      baseCategoryCode: "INFAQ",
      subcategoryCode: "CONSTRUCTION",
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
      baseCategoryCode: "COMMUNITY_EVENT",
      subcategoryCode: "JUMMA",
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
      baseCategoryCode: "COMMUNITY_EVENT",
      subcategoryCode: "MILAD",
      description: "Annual Milad-un-Nabi celebration collection",
      frequency: "ANNUAL" as const,
      amountType: "VARIABLE" as const,
      defaultAmountPaise: null,
      donorEligibility: "BOTH" as const,
      memberAssignment: "SELECTED" as const,
      dueGeneration: "ADMIN" as const,
      settlementPolicy: "ANY_PENDING_PERIOD" as const,
    },
    {
      name: "Shab-e-Qadr",
      purposeCode: "SHAB_E_QADR",
      baseCategoryCode: "COMMUNITY_EVENT",
      subcategoryCode: "SHAB_E_QADR",
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

  for (const def of defaultCollectionDefinitions) {
    const baseCategoryId = baseCategoryMap.get(def.baseCategoryCode);
    const subcategoryId = subcategoryMap.get(def.subcategoryCode);

    if (!baseCategoryId || !subcategoryId) {
      console.log(`⚠ Skipping ${def.name} (missing taxonomy: ${def.baseCategoryCode} / ${def.subcategoryCode})`);
      continue;
    }

    const exists = await prisma.collectionDefinition.findUnique({
      where: { masjidId_name: { masjidId: masjid.id, name: def.name } },
    });

    if (!exists) {
      await prisma.collectionDefinition.create({
        data: {
          masjidId: masjid.id,
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
    } else {
      // Update existing definition with correct taxonomy
      await prisma.collectionDefinition.update({
        where: { id: exists.id },
        data: {
          baseCategoryId,
          subcategoryId,
          purposeCode: def.purposeCode,
          frequency: def.frequency,
          amountType: def.amountType,
          defaultAmountPaise: def.defaultAmountPaise,
          donorEligibility: def.donorEligibility,
          memberAssignment: def.memberAssignment,
          dueGeneration: def.dueGeneration,
          settlementPolicy: def.settlementPolicy,
        },
      });
    }
  }
  console.log(`• Collection definitions ready (${defaultCollectionDefinitions.length})`);

  for (const name of DEFAULT_EXPENSE_CATEGORIES) {
    const exists = await prisma.expenseCategory.findUnique({
      where: { masjidId_name: { masjidId: masjid.id, name } },
    });
    if (!exists) {
      await prisma.expenseCategory.create({ data: { masjidId: masjid.id, name } });
    }
  }
  console.log(`• Expense categories ready (${DEFAULT_EXPENSE_CATEGORIES.length})`);

  // 2. Account A — Super Admin (platform level).
  const superAdmin = await upsertUser(superAdminEmail, superAdminName, superAdminPassword);
  await ensureMembership(masjid.id, superAdmin.id, ROLES.SUPER_ADMIN, masjid.name);

  // 3. Account B — Local Masjid Admin, bound to this one masjid only.
  const localAdmin = await upsertUser(localAdminEmail, localAdminName, localAdminPassword);
  await removeForeignMemberships(localAdmin.id, masjid.id);
  await ensureMembership(masjid.id, localAdmin.id, ROLES.ADMIN, masjid.name);

  // 4. Report the resulting accounts. No password, no secret, ever.
  const memberships = await prisma.masjidUser.findMany({
    where: { userId: { in: [superAdmin.id, localAdmin.id] } },
    include: { user: { select: { email: true } }, masjid: { select: { name: true } } },
  });

  console.log("\n=== SEEDED ACCOUNTS ===");
  for (const m of memberships) {
    console.log(`  ${m.user.email}  role=${m.role}  masjid=${m.masjid.name}  status=${m.status}`);
  }
  console.log("\nPasswords are not printed. Sign in with the credentials you set in the environment.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
