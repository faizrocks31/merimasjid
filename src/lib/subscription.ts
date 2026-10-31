import { prisma } from "@/lib/db";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan, type SubscriptionPlanCode, type SubscriptionStatus, GRACE_PERIOD_DAYS, SUBSCRIPTION_STATUS_LABELS } from "@/lib/subscription-plans";

/**
 * Core subscription logic for the SaaS platform.
 * Provides functions to check subscription status, enforce limits, and compute effective status.
 */

export interface EffectiveSubscription {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  subscription: {
    id: string;
    masjidId: string;
    planCode: string;
    status: string;
    startsAt: Date;
    endsAt: Date | null;
    billingReference: string | null;
  } | null;
  trialEndsAt: Date | null;
  graceEndsAt: Date | null;
  isWithinLimit: (resource: "members" | "staff" | "categories", currentCount: number) => boolean;
}

export async function getSubscription(masjidId: string) {
  return prisma.subscription.findFirst({
    where: { masjidId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEffectiveSubscription(masjidId: string): Promise<EffectiveSubscription> {
  const subscription = await getSubscription(masjidId);
  const now = new Date();

  // Default to TRIAL plan if no subscription exists
  let planCode: SubscriptionPlanCode = "TRIAL";
  let subscriptionStatus: string = "TRIAL";
  let startsAt = now;
  let endsAt: Date | null = null;
  let billingReference: string | null = null;
  let subscriptionId: string | null = null;

  if (subscription) {
    subscriptionId = subscription.id;
    planCode = subscription.planCode as SubscriptionPlanCode;
    subscriptionStatus = subscription.status;
    startsAt = subscription.startsAt;
    endsAt = subscription.endsAt;
    billingReference = subscription.billingReference;
  }

  const plan = SUBSCRIPTION_PLANS[planCode] ?? SUBSCRIPTION_PLANS.TRIAL;

  // Compute trial end date
  const trialEndsAt = new Date(startsAt);
  trialEndsAt.setDate(trialEndsAt.getDate() + plan.trialDays);

  // Determine effective status
  let effectiveStatus: SubscriptionStatus;

  if (subscriptionStatus === "CANCELLED") {
    effectiveStatus = "CANCELLED";
  } else if (subscriptionStatus === "SUSPENDED") {
    effectiveStatus = "SUSPENDED";
  } else if (subscriptionStatus === "TRIAL") {
    if (now > trialEndsAt) {
      effectiveStatus = "SUSPENDED"; // Trial expired without conversion
    } else {
      effectiveStatus = "TRIAL";
    }
  } else if (subscriptionStatus === "ACTIVE") {
    if (endsAt && now > endsAt) {
      // Check if within grace period
      const graceEndsAt = new Date(endsAt);
      graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);
      if (now > graceEndsAt) {
        effectiveStatus = "SUSPENDED";
      } else {
        effectiveStatus = "GRACE";
      }
    } else {
      effectiveStatus = "ACTIVE";
    }
  } else {
    effectiveStatus = "SUSPENDED";
  }

  // Compute grace end date if applicable
  let graceEndsAt: Date | null = null;
  if (endsAt && (effectiveStatus === "GRACE" || effectiveStatus === "ACTIVE")) {
    graceEndsAt = new Date(endsAt);
    graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);
  }

  const isWithinLimit = (resource: "members" | "staff" | "categories", currentCount: number): boolean => {
    const limit = plan.limits[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof typeof plan.limits] as number;
    if (limit === -1) return true; // Unlimited
    return currentCount < limit;
  };

  return {
    status: effectiveStatus,
    plan,
    subscription: subscriptionId ? {
      id: subscriptionId,
      masjidId,
      planCode,
      status: subscriptionStatus,
      startsAt,
      endsAt,
      billingReference,
    } : null,
    trialEndsAt: plan.trialDays > 0 ? trialEndsAt : null,
    graceEndsAt,
    isWithinLimit,
  };
}

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIAL" || status === "GRACE";
}

export function canPerformFinancialWrites(status: SubscriptionStatus): boolean {
  // Allow writes during ACTIVE, TRIAL, and GRACE periods
  // Block during SUSPENDED and CANCELLED
  return isSubscriptionActive(status);
}

export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  return SUBSCRIPTION_STATUS_LABELS[status] ?? status;
}

export async function checkLimit(
  masjidId: string,
  resource: "members" | "staff" | "categories",
  currentCount: number
): Promise<{ allowed: boolean; limit: number; currentCount: number }> {
  const effective = await getEffectiveSubscription(masjidId);
  const limit = effective.plan.limits[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof typeof effective.plan.limits] as number;
  const allowed = limit === -1 || currentCount < limit;
  return { allowed, limit, currentCount };
}

export async function createSubscriptionForMasjid(
  masjidId: string,
  planCode: SubscriptionPlanCode = "TRIAL",
  startsAt: Date = new Date(),
  endsAt?: Date,
  billingReference?: string
) {
  // Deactivate any existing subscription
  await prisma.subscription.updateMany({
    where: { masjidId },
    data: { status: "CANCELLED" },
  });

  const plan = SUBSCRIPTION_PLANS[planCode];

  // For paid plans, set endsAt to 1 month from startsAt if not provided
  let computedEndsAt = endsAt;
  if (planCode !== "TRIAL" && !computedEndsAt) {
    computedEndsAt = new Date(startsAt);
    computedEndsAt.setMonth(computedEndsAt.getMonth() + 1);
  }

  const subscription = await prisma.subscription.create({
    data: {
      masjidId,
      planCode,
      status: planCode === "TRIAL" ? "TRIAL" : "ACTIVE",
      startsAt,
      endsAt: computedEndsAt ?? null,
      billingReference: billingReference ?? null,
    },
  });

  // Update denormalized fields on Masjid
  await updateMasjidSubscriptionFields(masjidId, subscription);

  return subscription;
}

export async function updateSubscription(
  subscriptionId: string,
  data: {
    planCode?: SubscriptionPlanCode;
    status?: "ACTIVE" | "SUSPENDED" | "CANCELLED" | "TRIAL";
    endsAt?: Date | null;
    billingReference?: string | null;
  }
) {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      planCode: data.planCode,
      status: data.status,
      endsAt: data.endsAt,
      billingReference: data.billingReference,
    },
  });

  await updateMasjidSubscriptionFields(subscription.masjidId, subscription);

  return subscription;
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "CANCELLED" },
  });

  await updateMasjidSubscriptionFields(subscription.masjidId, subscription);

  return subscription;
}

export async function reactivateSubscription(subscriptionId: string, newEndsAt?: Date) {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "ACTIVE",
      endsAt: newEndsAt ?? null,
    },
  });

  await updateMasjidSubscriptionFields(subscription.masjidId, subscription);

  return subscription;
}

export async function changePlan(
  subscriptionId: string,
  newPlanCode: SubscriptionPlanCode,
  newEndsAt?: Date
) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) throw new Error("Subscription not found");

  const newPlan = SUBSCRIPTION_PLANS[newPlanCode];

  // For paid plans, set endsAt to 1 month from now if not provided
  let computedEndsAt = newEndsAt;
  if (newPlanCode !== "TRIAL" && !computedEndsAt) {
    computedEndsAt = new Date();
    computedEndsAt.setMonth(computedEndsAt.getMonth() + 1);
  }

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      planCode: newPlanCode,
      status: newPlanCode === "TRIAL" ? "TRIAL" : "ACTIVE",
      startsAt: new Date(), // Reset start date on plan change
      endsAt: computedEndsAt ?? null,
    },
  });

  await updateMasjidSubscriptionFields(updated.masjidId, updated);

  return updated;
}

async function updateMasjidSubscriptionFields(
  masjidId: string,
  subscription: {
    id: string;
    planCode: string;
    status: string;
    startsAt: Date;
    endsAt: Date | null;
  }
) {
  const effective = await getEffectiveSubscription(masjidId);
  const plan = effective.plan;

  await prisma.masjid.update({
    where: { id: masjidId },
    data: {
      subscriptionStatus: effective.status,
      subscriptionEndsAt: subscription.endsAt,
      maxMembers: plan.limits.maxMembers,
      maxStaff: plan.limits.maxStaff,
      maxCategories: plan.limits.maxCategories,
    },
  });
}

export async function syncAllSubscriptionStatuses(): Promise<{ updated: number; errors: number }> {
  const masjids = await prisma.masjid.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  let updated = 0;
  let errors = 0;

  for (const masjid of masjids) {
    try {
      const effective = await getEffectiveSubscription(masjid.id);

      // Update denormalized fields
      await prisma.masjid.update({
        where: { id: masjid.id },
        data: {
          subscriptionStatus: effective.status,
          subscriptionEndsAt: effective.subscription?.endsAt ?? null,
          maxMembers: effective.plan.limits.maxMembers,
          maxStaff: effective.plan.limits.maxStaff,
        },
      });

      updated++;
    } catch (err) {
      console.error(`Failed to sync subscription for masjid ${masjid.id}:`, err);
      errors++;
    }
  }

  return { updated, errors };
}

export async function findSubscriptionByBillingReference(billingReference: string) {
  return prisma.subscription.findFirst({
    where: { billingReference },
    orderBy: { createdAt: "desc" },
  });
}