"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/constants";
import { writeAudit } from "@/modules/audit/write";
import { assertCan } from "@/lib/permissions";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanCode, getPlanOrThrow } from "@/lib/subscription-plans";
import { createSubscriptionForMasjid, updateSubscription, cancelSubscription, reactivateSubscription, changePlan } from "@/lib/subscription";
import { hashPassword } from "@/lib/auth";

export type MasjidActionState = { ok?: boolean; error?: string } | undefined;

const DEFAULT_CATEGORIES = [
  { name: "General Donation", code: "GEN", restrictedPurpose: false, reportingGroup: "Donations" },
  { name: "Zakat", code: "ZAK", restrictedPurpose: true, reportingGroup: "Zakat" },
  { name: "Sadaqah", code: "SAD", restrictedPurpose: false, reportingGroup: "Donations" },
  { name: "Fitrah", code: "FIT", restrictedPurpose: true, reportingGroup: "Zakat" },
  { name: "Masjid Construction", code: "CON", restrictedPurpose: true, reportingGroup: "Projects" },
  { name: "Madrasa Fund", code: "MAD", restrictedPurpose: true, reportingGroup: "Education" },
  { name: "Water/Well", code: "WAT", restrictedPurpose: true, reportingGroup: "Projects" },
  { name: "Iftar/Suhur", code: "IFT", restrictedPurpose: true, reportingGroup: "Events" },
  { name: "Eid Fund", code: "EID", restrictedPurpose: true, reportingGroup: "Events" },
  { name: "Other", code: "OTH", restrictedPurpose: false, reportingGroup: "Donations" },
];

/** The platform owner: a SUPER_ADMIN membership on any masjid. */
async function requirePlatformAdmin() {
  const user = await requireUser();
  if (user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/**
 * Suspends or reactivates a masjid.
 * Called directly from the client (not through a form action), so it returns
 * a state object rather than void.
 */
export async function setMasjidStatusAction(formData: FormData): Promise<MasjidActionState> {
  const user = await requirePlatformAdmin();

  const masjidId = String(formData.get("masjidId") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!masjidId || !["suspend", "activate"].includes(action)) {
    return { error: "Invalid request." };
  }

  try {
    const masjid = await prisma.masjid.findUnique({
      where: { id: masjidId },
      select: { status: true, name: true },
    });
    if (!masjid) return { error: "Masjid not found." };

    await prisma.$transaction(async (tx) => {
      await tx.masjid.update({
        where: { id: masjidId },
        data: { status: action === "suspend" ? "SUSPENDED" : "ACTIVE" },
      });

      await writeAudit(tx, {
        masjidId,
        actorUserId: user.id,
        action: action === "suspend" ? "masjid.suspend" : "masjid.activate",
        entityType: "Masjid",
        entityId: masjidId,
        before: { status: masjid.status },
        after: { status: action === "suspend" ? "SUSPENDED" : "ACTIVE" },
      });
    });

    revalidatePath("/platform");
    return { ok: true };
  } catch (err) {
    console.error("setMasjidStatusAction failed", err);
    return { error: "Could not update masjid status." };
  }
}

/**
 * Soft-deletes a masjid by setting deletedAt.
 * Hard deletion is prevented because AuditLog must be retained permanently.
 * A masjid with members or payments cannot be deleted.
 */
export async function deleteMasjidAction(formData: FormData): Promise<MasjidActionState> {
  const user = await requirePlatformAdmin();

  const masjidId = String(formData.get("masjidId") ?? "");
  if (!masjidId) return { error: "Invalid request." };

  const masjid = await prisma.masjid.findUnique({
    where: { id: masjidId },
    select: { _count: { select: { members: true, payments: true } }, name: true, deletedAt: true },
  });

  if (!masjid) return { error: "Masjid not found." };
  if (masjid.deletedAt) return { error: "Masjid is already deleted." };
  if (masjid._count.members > 0 || masjid._count.payments > 0) {
    return { error: "Cannot delete a masjid that has members or payments." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await writeAudit(tx, {
        masjidId,
        actorUserId: user.id,
        action: "masjid.delete",
        entityType: "Masjid",
        entityId: masjidId,
        before: { name: masjid.name, deletedAt: null },
        after: { deletedAt: new Date().toISOString() },
      });

      await tx.masjid.update({
        where: { id: masjidId },
        data: { deletedAt: new Date(), status: "DELETED" },
      });
    });
  } catch (err) {
    console.error("deleteMasjidAction failed", err);
    return { error: "Could not delete masjid." };
  }

  revalidatePath("/platform");
  return { ok: true };
}

/**
 * Creates a new masjid together with the default collection definitions and expense
 * categories, so the masjid is usable straight away.
 */
export async function createMasjidAction(
  _prev: MasjidActionState,
  formData: FormData,
): Promise<MasjidActionState> {
  const user = await requirePlatformAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? name));
  const receiptPrefix = String(formData.get("receiptPrefix") ?? "").trim().toUpperCase();
  const address = String(formData.get("address") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const financialYearStartMonth = Number(formData.get("financialYearStartMonth") ?? 4);
  const receiptFooter =
    String(formData.get("receiptFooter") ?? "").trim() || "Jazak Allah Khair for your contribution.";

  const invalid = validateMasjidFields({ name, slug, receiptPrefix, financialYearStartMonth });
  if (invalid) return { error: invalid };

  const duplicate = await findDuplicate(slug, receiptPrefix, null);
  if (duplicate) return { error: duplicate };

  try {
    await prisma.$transaction(async (tx) => {
      const masjid = await tx.masjid.create({
        data: {
          name,
          slug,
          receiptPrefix,
          address,
          phone,
          email,
          financialYearStartMonth,
          receiptFooter,
          status: "ACTIVE",
        },
      });

      // Create default collection definitions
      const baseCategories = await tx.baseCategory.findMany();
      const subcategories = await tx.subcategory.findMany();

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
          defaultAmountPaise: 1000,
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
          settlementPolicy: "ANY_PENDING_PERIOD" as const,
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

      for (const def of defaultCollectionDefinitions) {
        const baseCategoryId = baseCategoryMap.get(def.baseCategoryCode);
        const subcategoryId = subcategoryMap.get(def.subcategoryCode);

        if (!baseCategoryId || !subcategoryId) {
          console.log(`⚠ Skipping ${def.name} (missing taxonomy: ${def.baseCategoryCode} / ${def.subcategoryCode})`);
          continue;
        }

        await tx.collectionDefinition.create({
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
      }

      for (const catName of DEFAULT_EXPENSE_CATEGORIES) {
        await tx.expenseCategory.create({ data: { masjidId: masjid.id, name: catName } });
      }

      await writeAudit(tx, {
        masjidId: masjid.id,
        actorUserId: user.id,
        action: "masjid.create",
        entityType: "Masjid",
        entityId: masjid.id,
        after: { name, slug, receiptPrefix, financialYearStartMonth },
      });
    });

    revalidatePath("/platform");
  } catch (err) {
    console.error("createMasjidAction failed", err);
    return { error: "Could not create masjid." };
  }

  redirect("/platform");
}

// ============================================
// TWO-STEP MASJID REGISTRATION (SUPER_ADMIN only)
// ============================================

export type MasjidStep1State = { ok?: boolean; error?: string; fieldErrors?: Record<string, string>; masjidId?: string } | undefined;
export type MasjidStep2State = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

/**
 * Step 1: Create masjid with basic details and plan selection.
 * Validates required fields including phone and email, checks global duplicates
 * against User table, creates masjid + default categories + subscription.
 * Returns masjidId to proceed to Step 2.
 */
export async function createMasjidStep1Action(
  _prev: MasjidStep1State,
  formData: FormData,
): Promise<MasjidStep1State> {
  const user = await requirePlatformAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? name));
  const receiptPrefix = String(formData.get("receiptPrefix") ?? "").trim().toUpperCase();
  const address = String(formData.get("address") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const financialYearStartMonth = Number(formData.get("financialYearStartMonth") ?? 4);
  const receiptFooter =
    String(formData.get("receiptFooter") ?? "").trim() || "Jazak Allah Khair for your contribution.";
  const planCode = String(formData.get("planCode") ?? "TRIAL") as SubscriptionPlanCode;

  // Validation
  if (!name) return { error: "Name is required.", fieldErrors: { name: "Required" } };
  if (!slug) return { error: "Slug is required.", fieldErrors: { slug: "Required" } };
  if (receiptPrefix.length < 2 || receiptPrefix.length > 8) {
    return { error: "Receipt prefix must be 2-8 characters.", fieldErrors: { receiptPrefix: "2-8 chars" } };
  }
  if (!/^[A-Z0-9]+$/.test(receiptPrefix)) {
    return { error: "Receipt prefix must be uppercase letters and digits only.", fieldErrors: { receiptPrefix: "Uppercase only" } };
  }
  if (financialYearStartMonth < 1 || financialYearStartMonth > 12) {
    return { error: "Invalid financial year start month.", fieldErrors: { financialYearStartMonth: "Invalid" } };
  }
  if (!phone) return { error: "Phone is required.", fieldErrors: { phone: "Required" } };
  if (!/^\d{10}$/.test(phone.replace(/^\+91/, ""))) {
    return { error: "Enter a valid 10-digit mobile number.", fieldErrors: { phone: "Invalid format" } };
  }
  if (!email) return { error: "Email is required.", fieldErrors: { email: "Required" } };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", fieldErrors: { email: "Invalid format" } };
  }
  if (!Object.keys(SUBSCRIPTION_PLANS).includes(planCode)) {
    return { error: "Invalid plan selected.", fieldErrors: { planCode: "Invalid plan" } };
  }

  // Check slug/receiptPrefix duplicates
  const duplicate = await findDuplicate(slug, receiptPrefix, null);
  if (duplicate) return { error: duplicate };

  // Check global email/mobile duplicates against User table
  const normalizedPhone = phone.replace(/^\+91/, "");
  const [existingEmail, existingPhone] = await Promise.all([
    prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } }),
    prisma.user.findFirst({ where: { phone: normalizedPhone }, select: { id: true } }),
  ]);
  if (existingEmail) {
    return { error: "This email is already registered.", fieldErrors: { email: "Already in use" } };
  }
  if (existingPhone) {
    return { error: "This mobile number is already registered.", fieldErrors: { phone: "Already in use" } };
  }

  try {
    const masjid = await prisma.$transaction(async (tx) => {
      const created = await tx.masjid.create({
        data: {
          name,
          slug,
          receiptPrefix,
          address,
          phone: normalizedPhone,
          email,
          financialYearStartMonth,
          receiptFooter,
          status: "ACTIVE",
        },
      });

      // Create default collection definitions
      const baseCategories = await tx.baseCategory.findMany();
      const subcategories = await tx.subcategory.findMany();

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
          defaultAmountPaise: 1000,
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
          settlementPolicy: "ANY_PENDING_PERIOD" as const,
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

      for (const def of defaultCollectionDefinitions) {
        const baseCategoryId = baseCategoryMap.get(def.baseCategoryCode);
        const subcategoryId = subcategoryMap.get(def.subcategoryCode);

        if (!baseCategoryId || !subcategoryId) {
          console.log(`⚠ Skipping ${def.name} (missing taxonomy: ${def.baseCategoryCode} / ${def.subcategoryCode})`);
          continue;
        }

        await tx.collectionDefinition.create({
          data: {
            masjidId: created.id,
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
      }

      for (const catName of DEFAULT_EXPENSE_CATEGORIES) {
        await tx.expenseCategory.create({ data: { masjidId: created.id, name: catName } });
      }

      // Create subscription for the chosen plan (pass tx for transactional consistency)
      await createSubscriptionForMasjid(tx, created.id, planCode);

      await writeAudit(tx, {
        masjidId: created.id,
        actorUserId: user.id,
        action: "masjid.create",
        entityType: "Masjid",
        entityId: created.id,
        after: { name, slug, receiptPrefix, financialYearStartMonth, planCode },
      });

      return created;
    });

    revalidatePath("/platform");
    return { ok: true, masjidId: masjid.id };
  } catch (err) {
    console.error("createMasjidStep1Action failed", err);
    // Handle unique constraint races
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      const target = (err as { meta?: { target?: string[] } }).meta?.target?.[0];
      if (target === "email") return { error: "This email is already registered.", fieldErrors: { email: "Already in use" } };
      if (target === "phone") return { error: "This mobile number is already registered.", fieldErrors: { phone: "Already in use" } };
      if (target === "slug") return { error: "A masjid with this slug already exists.", fieldErrors: { slug: "Taken" } };
      if (target === "receiptPrefix") return { error: "A masjid with this receipt prefix already exists.", fieldErrors: { receiptPrefix: "Taken" } };
    }
    return { error: "Could not create masjid." };
  }
}

/**
 * Step 2: Create initial Masjid Admin account.
 * Validates admin details, checks global email/mobile duplicates again (race-safe),
 * creates User with hashed password, creates MasjidUser ADMIN membership.
 */
export async function createMasjidStep2Action(
  _prev: MasjidStep2State,
  formData: FormData,
): Promise<MasjidStep2State> {
  const user = await requirePlatformAdmin();

  const masjidId = String(formData.get("masjidId") ?? "");
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const adminPhone = String(formData.get("adminPhone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // Validation
  if (!masjidId) return { error: "Invalid request: masjidId missing." };
  if (!adminName) return { error: "Admin name is required.", fieldErrors: { adminName: "Required" } };
  if (!adminEmail) return { error: "Admin email is required.", fieldErrors: { adminEmail: "Required" } };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return { error: "Enter a valid email address.", fieldErrors: { adminEmail: "Invalid format" } };
  }
  if (!adminPhone) return { error: "Admin mobile is required.", fieldErrors: { adminPhone: "Required" } };
  if (!/^\d{10}$/.test(adminPhone.replace(/^\+91/, ""))) {
    return { error: "Enter a valid 10-digit mobile number.", fieldErrors: { adminPhone: "Invalid format" } };
  }
  if (!password) return { error: "Password is required.", fieldErrors: { password: "Required" } };
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", fieldErrors: { password: "Too short" } };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", fieldErrors: { confirmPassword: "Mismatch" } };
  }

  // Verify masjid exists
  const masjid = await prisma.masjid.findUnique({ where: { id: masjidId } });
  if (!masjid) return { error: "Masjid not found." };

  // Race-safe global duplicate checks
  const normalizedPhone = adminPhone.replace(/^\+91/, "");
  const [existingEmail, existingPhone] = await Promise.all([
    prisma.user.findFirst({ where: { email: { equals: adminEmail, mode: "insensitive" } }, select: { id: true } }),
    prisma.user.findFirst({ where: { phone: normalizedPhone }, select: { id: true } }),
  ]);
  if (existingEmail) {
    return { error: "This email is already registered.", fieldErrors: { adminEmail: "Already in use" } };
  }
  if (existingPhone) {
    return { error: "This mobile number is already registered.", fieldErrors: { adminPhone: "Already in use" } };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Create User account
      const createdUser = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          phone: normalizedPhone,
          passwordHash: await hashPassword(password),
        },
      });

      // Create MasjidUser ADMIN membership
      await tx.masjidUser.create({
        data: {
          masjidId,
          userId: createdUser.id,
          role: "ADMIN",
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      });

      await writeAudit(tx, {
        masjidId,
        actorUserId: user.id,
        action: "masjid.admin.create",
        entityType: "MasjidUser",
        entityId: createdUser.id,
        after: { adminEmail, adminPhone: normalizedPhone, role: "ADMIN" },
      });
    });

    revalidatePath("/platform");
    revalidatePath(`/platform/masjids/${masjidId}`);
    return { ok: true };
  } catch (err) {
    console.error("createMasjidStep2Action failed", err);
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      const target = (err as { meta?: { target?: string[] } }).meta?.target?.[0];
      if (target === "email") return { error: "This email is already registered.", fieldErrors: { adminEmail: "Already in use" } };
      if (target === "phone") return { error: "This mobile number is already registered.", fieldErrors: { adminPhone: "Already in use" } };
    }
    return { error: "Could not create admin account." };
  }
}

/**
 * Updates a masjid's details, including its status.
 */
export async function updateMasjidAction(
  _prev: MasjidActionState,
  formData: FormData,
): Promise<MasjidActionState> {
  const user = await requirePlatformAdmin();

  const masjidId = String(formData.get("masjidId") ?? "");
  if (!masjidId) return { error: "Invalid request." };

  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? name));
  const receiptPrefix = String(formData.get("receiptPrefix") ?? "").trim().toUpperCase();
  const address = String(formData.get("address") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const financialYearStartMonth = Number(formData.get("financialYearStartMonth") ?? 4);
  const receiptFooter =
    String(formData.get("receiptFooter") ?? "").trim() || "Jazak Allah Khair for your contribution.";
  const status = String(formData.get("status") ?? "ACTIVE");

  const invalid = validateMasjidFields({ name, slug, receiptPrefix, financialYearStartMonth });
  if (invalid) return { error: invalid };
  if (!["ACTIVE", "SUSPENDED"].includes(status)) return { error: "Invalid status." };

  const duplicate = await findDuplicate(slug, receiptPrefix, masjidId);
  if (duplicate) return { error: duplicate };

  const existing = await prisma.masjid.findUnique({
    where: { id: masjidId },
    select: { name: true, slug: true, receiptPrefix: true, address: true, phone: true, email: true, financialYearStartMonth: true, receiptFooter: true, status: true },
  });
  if (!existing) return { error: "Masjid not found." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.masjid.update({
        where: { id: masjidId },
        data: {
          name,
          slug,
          receiptPrefix,
          address,
          phone,
          email,
          financialYearStartMonth,
          receiptFooter,
          status,
        },
      });

      await writeAudit(tx, {
        masjidId,
        actorUserId: user.id,
        action: "masjid.update",
        entityType: "Masjid",
        entityId: masjidId,
        before: { name: existing.name, slug: existing.slug, receiptPrefix: existing.receiptPrefix, address: existing.address, phone: existing.phone, email: existing.email, financialYearStartMonth: existing.financialYearStartMonth, receiptFooter: existing.receiptFooter, status: existing.status },
        after: { name, slug, receiptPrefix, address, phone, email, financialYearStartMonth, receiptFooter, status },
      });
    });
  } catch (err) {
    console.error("updateMasjidAction failed", err);
    return { error: "Could not update masjid." };
  }

  revalidatePath("/platform");
  revalidatePath(`/platform/masjids/${masjidId}`);
  redirect(`/platform/masjids/${masjidId}`);
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateMasjidFields(fields: {
  name: string;
  slug: string;
  receiptPrefix: string;
  financialYearStartMonth: number;
}): string | null {
  if (!fields.name) return "Name is required.";
  if (!fields.slug) return "Slug is required.";
  if (fields.receiptPrefix.length < 2 || fields.receiptPrefix.length > 8) {
    return "Receipt prefix must be 2-8 characters.";
  }
  if (!/^[A-Z0-9]+$/.test(fields.receiptPrefix)) {
    return "Receipt prefix must be uppercase letters and digits only.";
  }
  if (fields.financialYearStartMonth < 1 || fields.financialYearStartMonth > 12) {
    return "Invalid financial year start month.";
  }
  return null;
}

async function findDuplicate(
  slug: string,
  receiptPrefix: string,
  excludeMasjidId: string | null,
): Promise<string | null> {
  const where = excludeMasjidId ? { NOT: { id: excludeMasjidId } } : {};
  const [existingSlug, existingPrefix] = await Promise.all([
    prisma.masjid.findFirst({ where: { slug, ...where } }),
    prisma.masjid.findFirst({ where: { receiptPrefix, ...where } }),
  ]);
  if (existingSlug) return "A masjid with this slug already exists.";
  if (existingPrefix) return "A masjid with this receipt prefix already exists.";
  return null;
}

/**
 * Creates a subscription for a masjid (SUPER_ADMIN only)
 */
export async function createSubscriptionAction(
  _prev: MasjidActionState,
  formData: FormData,
): Promise<MasjidActionState> {
  const user = await requireUser();
  if (user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) {
    return { error: "FORBIDDEN" };
  }
  assertCan(user.role, "subscription:manage");

  const masjidId = String(formData.get("masjidId") ?? "");
  const planCode = String(formData.get("planCode") ?? "TRIAL") as SubscriptionPlanCode;
  const billingReference = String(formData.get("billingReference") ?? "") || null;

  if (!masjidId) return { error: "Masjid ID is required." };
  if (!Object.keys(SUBSCRIPTION_PLANS).includes(planCode)) {
    return { error: "Invalid plan code." };
  }

  try {
    const masjid = await prisma.masjid.findUnique({ where: { id: masjidId } });
    if (!masjid) return { error: "Masjid not found." };

    await createSubscriptionForMasjid(prisma, masjidId, planCode, new Date(), undefined, billingReference ?? undefined);

    revalidatePath("/platform");
    revalidatePath(`/platform/masjids/${masjidId}`);
    return { ok: true };
  } catch (err) {
    console.error("createSubscriptionAction failed", err);
    return { error: "Could not create subscription." };
  }
}

/**
 * Updates a subscription (plan change, status change, billing reference)
 */
export async function updateSubscriptionAction(
  _prev: MasjidActionState,
  formData: FormData,
): Promise<MasjidActionState> {
  const user = await requireUser();
  if (user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) {
    return { error: "FORBIDDEN" };
  }
  assertCan(user.role, "subscription:manage");

  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  const planCode = String(formData.get("planCode") ?? "") as SubscriptionPlanCode | "";
  const status = String(formData.get("status") ?? "") as "ACTIVE" | "SUSPENDED" | "CANCELLED" | "";
  const endsAt = formData.get("endsAt") ? new Date(String(formData.get("endsAt"))) : undefined;
  const billingReference = String(formData.get("billingReference") ?? "") || null;

  if (!subscriptionId) return { error: "Subscription ID is required." };

  try {
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) return { error: "Subscription not found." };

    const updateData: {
      planCode?: SubscriptionPlanCode;
      status?: "ACTIVE" | "SUSPENDED" | "CANCELLED";
      endsAt?: Date | null;
      billingReference?: string | null;
    } = {};

    if (planCode && Object.keys(SUBSCRIPTION_PLANS).includes(planCode)) {
      updateData.planCode = planCode;
    }
    if (status && ["ACTIVE", "SUSPENDED", "CANCELLED"].includes(status)) {
      updateData.status = status;
    }
    if (endsAt !== undefined) {
      updateData.endsAt = endsAt;
    }
    if (billingReference !== null || billingReference !== "") {
      updateData.billingReference = billingReference;
    }

    await updateSubscription(subscriptionId, updateData);

    revalidatePath("/platform");
    revalidatePath(`/platform/masjids/${subscription.masjidId}`);
    return { ok: true };
  } catch (err) {
    console.error("updateSubscriptionAction failed", err);
    return { error: "Could not update subscription." };
  }
}

/**
 * Cancels a subscription
 */
export async function cancelSubscriptionAction(
  _prev: MasjidActionState,
  formData: FormData,
): Promise<MasjidActionState> {
  const user = await requireUser();
  if (user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) {
    return { error: "FORBIDDEN" };
  }
  assertCan(user.role, "subscription:manage");

  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  if (!subscriptionId) return { error: "Subscription ID is required." };

  try {
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) return { error: "Subscription not found." };

    await cancelSubscription(subscriptionId);

    revalidatePath("/platform");
    revalidatePath(`/platform/masjids/${subscription.masjidId}`);
    return { ok: true };
  } catch (err) {
    console.error("cancelSubscriptionAction failed", err);
    return { error: "Could not cancel subscription." };
  }
}

/**
 * Reactivates a cancelled/suspended subscription
 */
export async function reactivateSubscriptionAction(
  _prev: MasjidActionState,
  formData: FormData,
): Promise<MasjidActionState> {
  const user = await requireUser();
  if (user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) {
    return { error: "FORBIDDEN" };
  }
  assertCan(user.role, "subscription:manage");

  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  const endsAt = formData.get("endsAt") ? new Date(String(formData.get("endsAt"))) : undefined;

  if (!subscriptionId) return { error: "Subscription ID is required." };

  try {
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) return { error: "Subscription not found." };

    await reactivateSubscription(subscriptionId, endsAt);

    revalidatePath("/platform");
    revalidatePath(`/platform/masjids/${subscription.masjidId}`);
    return { ok: true };
  } catch (err) {
    console.error("reactivateSubscriptionAction failed", err);
    return { error: "Could not reactivate subscription." };
  }
}

/**
 * Changes the plan for a subscription
 */
export async function changePlanAction(
  _prev: MasjidActionState,
  formData: FormData,
): Promise<MasjidActionState> {
  const user = await requireUser();
  if (user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) {
    return { error: "FORBIDDEN" };
  }
  assertCan(user.role, "subscription:manage");

  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  const newPlanCode = String(formData.get("newPlanCode") ?? "") as SubscriptionPlanCode;
  const endsAt = formData.get("endsAt") ? new Date(String(formData.get("endsAt"))) : undefined;

  if (!subscriptionId) return { error: "Subscription ID is required." };
  if (!newPlanCode || !Object.keys(SUBSCRIPTION_PLANS).includes(newPlanCode)) {
    return { error: "Invalid plan code." };
  }

  try {
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) return { error: "Subscription not found." };

    await changePlan(subscriptionId, newPlanCode, endsAt);

    revalidatePath("/platform");
    revalidatePath(`/platform/masjids/${subscription.masjidId}`);
    return { ok: true };
  } catch (err) {
    console.error("changePlanAction failed", err);
    return { error: "Could not change plan." };
  }
}
