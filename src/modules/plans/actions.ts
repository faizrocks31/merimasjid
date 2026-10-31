"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { planSchema } from "@/lib/validation";
import { parseISODate } from "@/lib/dates";
import { generateDuesPeriods } from "@/lib/dues";
import { writeAudit } from "@/modules/audit/write";

export type PlanState = { error?: string; ok?: boolean } | undefined;

export async function createPlanAction(_prev: PlanState, formData: FormData): Promise<PlanState> {
  const user = await requireStaff();
  assertCan(user.role, "plan:write");

  const parsed = planSchema.safeParse({
    memberId: String(formData.get("memberId") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    frequency: String(formData.get("frequency") ?? "MONTHLY"),
    amountPaise: Number(formData.get("amountPaise") ?? 0),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    dueDay: Number(formData.get("dueDay") ?? 10),
    graceDays: Number(formData.get("graceDays") ?? 0),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid plan" };

  const input = parsed.data;
  const startDate = parseISODate(input.startDate);
  if (!startDate) return { error: "Invalid start date." };
  const endDate = input.endDate ? parseISODate(input.endDate) : null;
  if (input.endDate && !endDate) return { error: "Invalid end date." };

  const member = await prisma.member.findFirst({ where: { id: input.memberId, masjidId: user.masjidId! } });
  if (!member) return { error: "Member not found in this Masjid." };

  const category = await prisma.contributionCategory.findFirst({
    where: { id: input.categoryId, masjidId: user.masjidId! },
  });
  if (!category) return { error: "Category not found in this Masjid." };

  try {
    const plan = await prisma.$transaction(async (tx) => {
      // Idempotency: a repeated submission returns the original record.
      const existing = await tx.contributionPlan.findFirst({
        where: { masjidId: user.masjidId!, idempotencyKey: input.idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        return { id: existing.id, duplicate: true };
      }

      // Check for duplicate active plan for same member+category
      const duplicateActive = await tx.contributionPlan.findFirst({
        where: {
          masjidId: user.masjidId!,
          memberId: member.id,
          categoryId: category.id,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (duplicateActive) {
        throw new Error("DUPLICATE_ACTIVE_PLAN");
      }

      const created = await tx.contributionPlan.create({
        data: {
          masjidId: user.masjidId!,
          memberId: member.id,
          categoryId: category.id,
          frequency: input.frequency,
          amountPaise: input.amountPaise,
          startDate,
          endDate,
          dueDay: input.dueDay,
          graceDays: input.graceDays,
          idempotencyKey: input.idempotencyKey,
        },
      });

      await tx.planAmountHistory.create({
        data: { planId: created.id, amountPaise: input.amountPaise, effectiveFrom: startDate, changedBy: user.id, reason: "Initial amount" },
      });

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "plan.create",
        entityType: "ContributionPlan",
        entityId: created.id,
        after: { frequency: input.frequency, amountPaise: input.amountPaise },
      });

      return created;
    });

    if ("duplicate" in plan && plan.duplicate) {
      revalidatePath("/plans");
      revalidatePath(`/members/${member.id}`);
      return { ok: true };
    }

    await generateDuesPeriods(plan.id);
    revalidatePath("/plans");
    revalidatePath(`/members/${member.id}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === "DUPLICATE_ACTIVE_PLAN") {
      return { error: "An active plan already exists for this member and category." };
    }
    // Catch Prisma unique constraint violation (P2002)
    if (err instanceof Error && err.message.includes("P2002") && err.message.includes("ContributionPlan_masjid_member_category_active_key")) {
      return { error: "An active plan already exists for this member and category." };
    }
    console.error("createPlanAction failed", err);
    return { error: "Could not create the plan." };
  }
}

/**
 * Changes a plan amount from an effective date. Historical periods keep their
 * original expected amount; only periods starting on/after the effective date
 * are updated. This preserves the ledger.
 */
export async function changePlanAmountAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();
  assertCan(user.role, "plan:write");

  const planId = String(formData.get("planId") ?? "");
  const amountPaise = Number(formData.get("amountPaise") ?? 0);
  const effectiveFromRaw = String(formData.get("effectiveFrom") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const effectiveFrom = parseISODate(effectiveFromRaw);

  if (!Number.isInteger(amountPaise) || amountPaise <= 0) return { ok: false, error: "Enter a valid amount." };
  if (!effectiveFrom) return { ok: false, error: "Enter a valid effective date." };

  const plan = await prisma.contributionPlan.findFirst({ where: { id: planId, masjidId: user.masjidId! } });
  if (!plan) return { ok: false, error: "Plan not found in this Masjid." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.planAmountHistory.create({
        data: { planId: plan.id, amountPaise, effectiveFrom, changedBy: user.id, reason: reason || null },
      });
      await tx.contributionPlan.update({ where: { id: plan.id }, data: { amountPaise } });
      await tx.duesPeriod.updateMany({
        where: { planId: plan.id, periodStart: { gte: effectiveFrom }, status: "PENDING" },
        data: { expectedAmountPaise: amountPaise },
      });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "plan.changeAmount",
        entityType: "ContributionPlan",
        entityId: plan.id,
        before: { amountPaise: plan.amountPaise },
        after: { amountPaise, effectiveFrom: effectiveFromRaw },
        metadata: { reason },
      });
    });

    revalidatePath("/plans");
    revalidatePath(`/members/${plan.memberId}`);
    return { ok: true };
  } catch (err) {
    // Catch Prisma unique constraint violation (P2002) for duplicate active plan
    if (err instanceof Error && err.message.includes("P2002") && err.message.includes("ContributionPlan_masjid_member_category_active_key")) {
      return { ok: false, error: "An active plan already exists for this member and category." };
    }
    console.error("changePlanAmountAction failed", err);
    return { ok: false, error: "Could not update the plan amount." };
  }
}

export async function generateDuesAction(): Promise<void> {
  const user = await requireStaff();
  assertCan(user.role, "plan:write");

  try {
    const plans = await prisma.contributionPlan.findMany({
      where: { masjidId: user.masjidId!, status: "ACTIVE" },
      select: { id: true },
    });
    let created = 0;
    for (const p of plans) created += await generateDuesPeriods(p.id);

    await prisma.$transaction(async (tx) => {
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "dues.generate",
        entityType: "DuesPeriod",
        metadata: { created, plans: plans.length },
      });
    });

    revalidatePath("/plans");
    revalidatePath("/dashboard");
  } catch (err) {
    console.error("generateDuesAction failed", err);
  }
}
