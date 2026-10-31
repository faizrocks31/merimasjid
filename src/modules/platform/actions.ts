"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { writeAudit } from "@/modules/audit/write";
import { assertCan } from "@/lib/permissions";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanCode, getPlanOrThrow } from "@/lib/subscription-plans";
import { createSubscriptionForMasjid, updateSubscription, cancelSubscription, reactivateSubscription, changePlan } from "@/lib/subscription";

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

const DEFAULT_EXPENSE_CATEGORIES = [
  "Electricity", "Water", "Maintenance", "Salaries", "Rent",
  "Cleaning", "Security", "Internet/Phone", "Stationery", "Events",
  "Madrasa Expenses", "Construction", "Zakat Distribution", "Other",
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
 * Deletes a masjid that has no members and no payments.
 */
export async function deleteMasjidAction(formData: FormData): Promise<MasjidActionState> {
  const user = await requirePlatformAdmin();

  const masjidId = String(formData.get("masjidId") ?? "");
  if (!masjidId) return { error: "Invalid request." };

  const masjid = await prisma.masjid.findUnique({
    where: { id: masjidId },
    select: { _count: { select: { members: true, payments: true } }, name: true },
  });

  if (!masjid) return { error: "Masjid not found." };
  if (masjid._count.members > 0 || masjid._count.payments > 0) {
    return { error: "Cannot delete a masjid that has members or payments." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Write audit log BEFORE deleting the masjid to avoid FK violation
      await writeAudit(tx, {
        masjidId,
        actorUserId: user.id,
        action: "masjid.delete",
        entityType: "Masjid",
        entityId: masjidId,
        before: { name: masjid.name },
      });

      await tx.masjid.delete({ where: { id: masjidId } });
    });
  } catch (err) {
    console.error("deleteMasjidAction failed", err);
    return { error: "Could not delete masjid." };
  }

  revalidatePath("/platform");
  return { ok: true };
}

/**
 * Creates a new masjid together with the default contribution and expense
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

      for (const c of DEFAULT_CATEGORIES) {
        await tx.contributionCategory.create({ data: { masjidId: masjid.id, ...c } });
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

    await createSubscriptionForMasjid(masjidId, planCode, new Date(), undefined, billingReference ?? undefined);

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
