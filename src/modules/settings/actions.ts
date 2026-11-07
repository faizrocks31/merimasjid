"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { settingsSchema, collectionDefinitionSchema, collectionEventSchema, expenseCategorySchema, staffSchema } from "@/lib/validation";
import { z } from "zod";
import { writeAudit } from "@/modules/audit/write";
import { checkLimit } from "@/lib/subscription";
import {
  COLLECTION_FREQUENCY,
  AMOUNT_TYPE,
  DONOR_ELIGIBILITY,
  MEMBER_ASSIGNMENT,
  DUE_GENERATION,
  SETTLEMENT_POLICY,
} from "@/lib/constants";

// Prayer times schema (only validates prayer time fields)
const prayerTimesSchema = z.object({
  fajrTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  sunriseTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  dhuhrTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  asrTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  maghribTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  ishaTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  jummahTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format: HH:MM (24-hour)").optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
});

export type SettingsState = { error?: string; ok?: boolean; message?: string; fieldErrors?: Record<string, string> } | undefined;

export async function updateSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const parsed = settingsSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    address: String(formData.get("address") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    receiptPrefix: String(formData.get("receiptPrefix") ?? "").toUpperCase(),
    financialYearStartMonth: Number(formData.get("financialYearStartMonth") ?? 4),
    receiptFooter: String(formData.get("receiptFooter") ?? ""),
    // Prayer times
    fajrTime: String(formData.get("fajrTime") ?? ""),
    sunriseTime: String(formData.get("sunriseTime") ?? ""),
    dhuhrTime: String(formData.get("dhuhrTime") ?? ""),
    asrTime: String(formData.get("asrTime") ?? ""),
    maghribTime: String(formData.get("maghribTime") ?? ""),
    ishaTime: String(formData.get("ishaTime") ?? ""),
    jummahTime: String(formData.get("jummahTime") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid settings" };

  const input = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.masjid.findUnique({ where: { id: user.masjidId! } });

      // Check if any prayer time field changed
      const prayerTimeFields = ["fajrTime", "sunriseTime", "dhuhrTime", "asrTime", "maghribTime", "ishaTime", "jummahTime"] as const;
      const prayerTimesChanged = prayerTimeFields.some(
        (field) => (input[field] ?? null) !== (before?.[field] ?? null)
      );

      const updateData: Record<string, unknown> = {
        name: input.name,
        address: input.address ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        receiptPrefix: input.receiptPrefix,
        financialYearStartMonth: input.financialYearStartMonth,
        receiptFooter: input.receiptFooter ?? null,
        // Prayer times
        fajrTime: input.fajrTime ?? null,
        sunriseTime: input.sunriseTime ?? null,
        dhuhrTime: input.dhuhrTime ?? null,
        asrTime: input.asrTime ?? null,
        maghribTime: input.maghribTime ?? null,
        ishaTime: input.ishaTime ?? null,
        jummahTime: input.jummahTime ?? null,
      };

      if (prayerTimesChanged) {
        updateData.prayerTimesUpdatedAt = new Date();
      }

      await tx.masjid.update({
        where: { id: user.masjidId! },
        data: updateData,
      });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "settings.update",
        entityType: "Masjid",
        entityId: user.masjidId,
        before: before ? { name: before.name, receiptPrefix: before.receiptPrefix } : undefined,
        after: { name: input.name, receiptPrefix: input.receiptPrefix },
      });
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("updateSettingsAction failed", err);
    return { error: "Could not save settings." };
  }
}

export async function updatePrayerTimesAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const parsed = prayerTimesSchema.safeParse({
    fajrTime: String(formData.get("fajrTime") ?? ""),
    sunriseTime: String(formData.get("sunriseTime") ?? ""),
    dhuhrTime: String(formData.get("dhuhrTime") ?? ""),
    asrTime: String(formData.get("asrTime") ?? ""),
    maghribTime: String(formData.get("maghribTime") ?? ""),
    ishaTime: String(formData.get("ishaTime") ?? ""),
    jummahTime: String(formData.get("jummahTime") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid prayer times" };

  const input = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.masjid.findUnique({ where: { id: user.masjidId! } });

      const prayerTimeFields = ["fajrTime", "sunriseTime", "dhuhrTime", "asrTime", "maghribTime", "ishaTime", "jummahTime"] as const;
      const prayerTimesChanged = prayerTimeFields.some(
        (field) => (input[field] ?? null) !== (before?.[field] ?? null)
      );

      const updateData: Record<string, unknown> = {
        fajrTime: input.fajrTime ?? null,
        sunriseTime: input.sunriseTime ?? null,
        dhuhrTime: input.dhuhrTime ?? null,
        asrTime: input.asrTime ?? null,
        maghribTime: input.maghribTime ?? null,
        ishaTime: input.ishaTime ?? null,
        jummahTime: input.jummahTime ?? null,
      };

      if (prayerTimesChanged) {
        updateData.prayerTimesUpdatedAt = new Date();
      }

      await tx.masjid.update({
        where: { id: user.masjidId! },
        data: updateData,
      });

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "prayerTimes.update",
        entityType: "Masjid",
        entityId: user.masjidId,
        before: before ? {
          fajrTime: before.fajrTime,
          sunriseTime: before.sunriseTime,
          dhuhrTime: before.dhuhrTime,
          asrTime: before.asrTime,
          maghribTime: before.maghribTime,
          ishaTime: before.ishaTime,
          jummahTime: before.jummahTime,
        } : undefined,
        after: input,
      });
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("updatePrayerTimesAction failed", err);
    return { error: "Could not save prayer times." };
  }
}

export async function updateNotificationSettingsAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const telegramEnabled = formData.get("telegramEnabled") === "on";
  const emailEnabled = formData.get("emailEnabled") === "on";
  const inAppEnabled = formData.get("inAppEnabled") === "on";

  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.masjidNotificationSettings.findUnique({
        where: { masjidId: user.masjidId! },
      });

      const data = {
        telegramEnabled,
        emailEnabled,
        inAppEnabled,
      };

      await tx.masjidNotificationSettings.upsert({
        where: { masjidId: user.masjidId! },
        create: { masjidId: user.masjidId!, ...data },
        update: data,
      });

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "notificationSettings.update",
        entityType: "MasjidNotificationSettings",
        entityId: user.masjidId!,
        before: before
          ? {
              telegramEnabled: before.telegramEnabled,
              emailEnabled: before.emailEnabled,
              inAppEnabled: before.inAppEnabled,
            }
          : undefined,
        after: data,
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("updateNotificationSettingsAction failed", err);
    return { error: "Could not save notification settings." };
  }
}

export async function sendAnnouncementAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const title = String(formData.get("announcementTitle") ?? "").trim();
  const body = String(formData.get("announcementBody") ?? "").trim();
  const sendToTelegram = formData.get("sendToTelegram") === "on";

  if (!title) return { error: "Announcement title is required." };
  if (title.length > 120) return { error: "Title must be 120 characters or less." };
  if (!body) return { error: "Announcement message is required." };
  if (body.length > 2000) return { error: "Message must be 2000 characters or less." };

  try {
    const members = await prisma.member.findMany({
      where: { masjidId: user.masjidId!, status: "ACTIVE" },
      select: { id: true, telegramChatId: true, user: { select: { email: true } }, phone: true },
    });

    if (members.length === 0) {
      return { error: "No active members found to send announcement." };
    }

    const { notifyAnnouncement } = await import("@/lib/notifications");
    const { initNotifications } = await import("@/lib/notifications-init");
    initNotifications();

    const results = await Promise.all(
      members.map((m) =>
        notifyAnnouncement({
          masjidId: user.masjidId!,
          memberId: m.id,
          title,
          body,
          targetChatId: m.telegramChatId ?? undefined,
        })
      )
    );

    let channelResult = null;
    if (sendToTelegram && process.env.TELEGRAM_CHANNEL_ID) {
      const { sendNotification } = await import("@/lib/notifications");
      initNotifications();
      channelResult = await sendNotification({
        masjidId: user.masjidId!,
        telegramChatId: process.env.TELEGRAM_CHANNEL_ID,
        title: `📢 ${title}`,
        body,
        template: "announcement",
      });
    }

    await prisma.$transaction(async (tx) => {
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "announcement.send",
        entityType: "Announcement",
        entityId: user.masjidId!,
        after: { title, recipientCount: members.length, sentToTelegramChannel: !!channelResult },
      });
    });

    revalidatePath("/settings");
    revalidatePath("/portal/notifications");
    const successfulRecipients = results.filter((r) => r.some((channel) => channel.success)).length;
    return { ok: true, message: String(successfulRecipients) };
  } catch (err) {
    console.error("sendAnnouncementAction failed", err);
    return { error: "Could not send announcement." };
  }
}

// ============================================
// COLLECTION DEFINITION CRUD (Phase 2A)
// ============================================

// Validate BaseCategory-Subcategory combination is valid
async function validateBaseCategorySubcategory(tx: Prisma.TransactionClient, baseCategoryId: string, subcategoryId: string) {
  const combo = await tx.baseCategorySubcategory.findUnique({
    where: { baseCategoryId_subcategoryId: { baseCategoryId, subcategoryId } },
  });
  return !!combo;
}

export async function createCollectionDefinitionAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const parsed = collectionDefinitionSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    baseCategoryId: String(formData.get("baseCategoryId") ?? ""),
    subcategoryId: String(formData.get("subcategoryId") ?? ""),
    active: formData.get("active") === "on",
    showInPaymentReceived: formData.get("showInPaymentReceived") === "on" || formData.get("showInPaymentReceived") === "true",
    frequency: String(formData.get("frequency") ?? ""),
    amountType: String(formData.get("amountType") ?? ""),
    defaultAmountPaise: formData.get("defaultAmountPaise") ? Number(formData.get("defaultAmountPaise")) : undefined,
    donorEligibility: String(formData.get("donorEligibility") ?? ""),
    memberAssignment: String(formData.get("memberAssignment") ?? ""),
    dueGeneration: String(formData.get("dueGeneration") ?? ""),
    settlementPolicy: String(formData.get("settlementPolicy") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid collection definition" };

  const input = parsed.data;

  // Amount configuration rules
  if (input.amountType === "FIXED" && !input.defaultAmountPaise) {
    return { error: "Default amount is required when amount type is FIXED." };
  }
  // VARIABLE: defaultAmountPaise is optional; when provided, acts as a suggested/default amount
  if (input.amountType === "VARIABLE" && input.defaultAmountPaise !== undefined && input.defaultAmountPaise <= 0) {
    return { error: "Default amount must be positive when provided." };
  }

  // Validate BaseCategory-Subcategory combination
  const isValidCombo = await validateBaseCategorySubcategory(prisma, input.baseCategoryId, input.subcategoryId);
  if (!isValidCombo) {
    return { error: "Invalid Base Category / Subcategory combination. Please select a valid pair." };
  }

  try {
    const existing = await prisma.collectionDefinition.findFirst({
      where: { masjidId: user.masjidId!, name: input.name },
    });
    if (existing) return { error: "A collection definition with this name already exists." };

    const currentCount = await prisma.collectionDefinition.count({
      where: { masjidId: user.masjidId!, active: true },
    });
    const limitCheck = await checkLimit(user.masjidId!, "categories", currentCount);
    if (!limitCheck.allowed) {
      return { error: `Collection definition limit exceeded. Your plan allows a maximum of ${limitCheck.limit} categories.` };
    }

    await prisma.$transaction(async (tx) => {
      const created = await tx.collectionDefinition.create({
        data: {
          masjidId: user.masjidId!,
          name: input.name,
          baseCategoryId: input.baseCategoryId,
          subcategoryId: input.subcategoryId,
          description: input.description ?? null,
          active: input.active,
          showInPaymentReceived: input.showInPaymentReceived ?? true,
          frequency: input.frequency as any,
          amountType: input.amountType as any,
          defaultAmountPaise: input.defaultAmountPaise ?? null,
          donorEligibility: input.donorEligibility as any,
          memberAssignment: input.memberAssignment as any,
          dueGeneration: input.dueGeneration as any,
          settlementPolicy: input.settlementPolicy as any,
        },
      });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "collectionDefinition.create",
        entityType: "CollectionDefinition",
        entityId: created.id,
        after: { name: input.name, frequency: input.frequency, amountType: input.amountType },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("createCollectionDefinitionAction failed", err);
    return { error: "Could not create the collection definition." };
  }
}

export async function updateCollectionDefinitionAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const definitionId = String(formData.get("definitionId") ?? "");
  if (!definitionId) return { error: "Collection definition ID is required." };

  const parsed = collectionDefinitionSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    baseCategoryId: String(formData.get("baseCategoryId") ?? ""),
    subcategoryId: String(formData.get("subcategoryId") ?? ""),
    active: formData.get("active") === "on",
    showInPaymentReceived: formData.get("showInPaymentReceived") === "on" || formData.get("showInPaymentReceived") === "true",
    frequency: String(formData.get("frequency") ?? ""),
    amountType: String(formData.get("amountType") ?? ""),
    defaultAmountPaise: formData.get("defaultAmountPaise") ? Number(formData.get("defaultAmountPaise")) : undefined,
    donorEligibility: String(formData.get("donorEligibility") ?? ""),
    memberAssignment: String(formData.get("memberAssignment") ?? ""),
    dueGeneration: String(formData.get("dueGeneration") ?? ""),
    settlementPolicy: String(formData.get("settlementPolicy") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid collection definition" };

  const input = parsed.data;

  // Amount configuration rules
  if (input.amountType === "FIXED" && !input.defaultAmountPaise) {
    return { error: "Default amount is required when amount type is FIXED." };
  }
  // VARIABLE: defaultAmountPaise is optional; when provided, acts as a suggested/default amount
  if (input.amountType === "VARIABLE" && input.defaultAmountPaise !== undefined && input.defaultAmountPaise <= 0) {
    return { error: "Default amount must be positive when provided." };
  }

  // Validate BaseCategory-Subcategory combination
  const isValidCombo = await validateBaseCategorySubcategory(prisma, input.baseCategoryId, input.subcategoryId);
  if (!isValidCombo) {
    return { error: "Invalid Base Category / Subcategory combination. Please select a valid pair." };
  }

  try {
    const existing = await prisma.collectionDefinition.findFirst({
      where: { id: definitionId, masjidId: user.masjidId! },
    });
    if (!existing) return { error: "Collection definition not found." };

    const duplicateName = await prisma.collectionDefinition.findFirst({
      where: { masjidId: user.masjidId!, name: input.name, id: { not: definitionId } },
    });
    if (duplicateName) return { error: "A collection definition with this name already exists." };

    // Prevent changing taxonomy if there are dependent records (plans, dues periods, allocations)
    const hasDependents = await prisma.$transaction(async (tx) => {
      const planCount = await tx.contributionPlan.count({ where: { collectionDefinitionId: definitionId } });
      const duesCount = await tx.duesPeriod.count({ where: { collectionDefinitionId: definitionId } });
      const allocationCount = await tx.paymentAllocation.count({ where: { collectionDefinitionId: definitionId } });
      return planCount > 0 || duesCount > 0 || allocationCount > 0;
    });

    if (hasDependents && (existing.baseCategoryId !== input.baseCategoryId || existing.subcategoryId !== input.subcategoryId)) {
      return { error: "Cannot change Base Category or Subcategory because this definition has associated plans, dues, or payments." };
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.collectionDefinition.update({
        where: { id: definitionId },
        data: {
          name: input.name,
          description: input.description ?? null,
          baseCategoryId: input.baseCategoryId,
          subcategoryId: input.subcategoryId,
          active: input.active,
          showInPaymentReceived: input.showInPaymentReceived ?? true,
          frequency: input.frequency as any,
          amountType: input.amountType as any,
          defaultAmountPaise: input.defaultAmountPaise ?? null,
          donorEligibility: input.donorEligibility as any,
          memberAssignment: input.memberAssignment as any,
          dueGeneration: input.dueGeneration as any,
          settlementPolicy: input.settlementPolicy as any,
        },
      });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "collectionDefinition.update",
        entityType: "CollectionDefinition",
        entityId: definitionId,
        before: {
          name: existing.name,
          baseCategoryId: existing.baseCategoryId,
          subcategoryId: existing.subcategoryId,
          active: existing.active,
          showInPaymentReceived: existing.showInPaymentReceived,
          frequency: existing.frequency,
          amountType: existing.amountType,
          defaultAmountPaise: existing.defaultAmountPaise,
          donorEligibility: existing.donorEligibility,
          memberAssignment: existing.memberAssignment,
          dueGeneration: existing.dueGeneration,
          settlementPolicy: existing.settlementPolicy,
        },
        after: {
          name: updated.name,
          baseCategoryId: updated.baseCategoryId,
          subcategoryId: updated.subcategoryId,
          frequency: updated.frequency,
          amountType: updated.amountType,
          defaultAmountPaise: updated.defaultAmountPaise,
          donorEligibility: updated.donorEligibility,
          memberAssignment: updated.memberAssignment,
          dueGeneration: updated.dueGeneration,
          settlementPolicy: updated.settlementPolicy,
        },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("updateCollectionDefinitionAction failed", err);
    return { error: "Could not update the collection definition." };
  }
}

export async function deleteCollectionDefinitionAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const definitionId = String(formData.get("definitionId") ?? "");
  if (!definitionId) return { error: "Collection definition ID is required." };

  try {
    const existing = await prisma.collectionDefinition.findFirst({
      where: { id: definitionId, masjidId: user.masjidId! },
    });
    if (!existing) return { error: "Collection definition not found." };

    // Check for dependent records
    const [plansUsing, duesUsing, allocationsUsing, eventsUsing] = await Promise.all([
      prisma.contributionPlan.count({ where: { collectionDefinitionId: definitionId } }),
      prisma.duesPeriod.count({ where: { collectionDefinitionId: definitionId } }),
      prisma.paymentAllocation.count({ where: { collectionDefinitionId: definitionId } }),
      prisma.collectionEvent.count({ where: { collectionDefinitionId: definitionId } }),
    ]);

    if (plansUsing > 0 || duesUsing > 0 || allocationsUsing > 0 || eventsUsing > 0) {
      const parts: string[] = [];
      if (plansUsing) parts.push(`${plansUsing} plan(s)`);
      if (duesUsing) parts.push(`${duesUsing} due period(s)`);
      if (allocationsUsing) parts.push(`${allocationsUsing} payment allocation(s)`);
      if (eventsUsing) parts.push(`${eventsUsing} collection event(s)`);
      return { error: `Cannot delete: ${parts.join(", ")} use this collection definition.` };
    }

    await prisma.$transaction(async (tx) => {
      await tx.collectionDefinition.delete({ where: { id: definitionId } });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "collectionDefinition.delete",
        entityType: "CollectionDefinition",
        entityId: definitionId,
        before: { name: existing.name },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("deleteCollectionDefinitionAction failed", err);
    return { error: "Could not delete the collection definition." };
  }
}

// ============================================
// COLLECTION EVENT CRUD
// ============================================

export async function createCollectionEventAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const parsed = collectionEventSchema.safeParse({
    collectionDefinitionId: String(formData.get("collectionDefinitionId") ?? ""),
    name: String(formData.get("name") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? "") || undefined,
    dueDate: String(formData.get("dueDate") ?? ""),
    expectedAmountPaise: formData.get("expectedAmountPaise") ? Number(formData.get("expectedAmountPaise")) : undefined,
    status: String(formData.get("status") ?? "SCHEDULED"),
    applicableMonth: formData.get("applicableMonth") ? Number(formData.get("applicableMonth")) : undefined,
    applicableYear: formData.get("applicableYear") ? Number(formData.get("applicableYear")) : undefined,
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid collection event" };

  const input = parsed.data;

  try {
    // Verify the collection definition exists and belongs to this masjid
    const def = await prisma.collectionDefinition.findFirst({
      where: { id: input.collectionDefinitionId, masjidId: user.masjidId! },
      select: { id: true },
    });
    if (!def) return { error: "Collection definition not found in this Masjid." };

    await prisma.$transaction(async (tx) => {
      const created = await tx.collectionEvent.create({
        data: {
          masjidId: user.masjidId!,
          collectionDefinitionId: input.collectionDefinitionId,
          name: input.name,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          dueDate: new Date(input.dueDate),
          expectedAmountPaise: input.expectedAmountPaise ?? null,
          status: input.status as any,
          applicableMonth: input.applicableMonth ?? null,
          applicableYear: input.applicableYear ?? null,
          notes: input.notes ?? null,
          createdBy: user.id,
        },
      });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "collectionEvent.create",
        entityType: "CollectionEvent",
        entityId: created.id,
        after: { name: input.name, collectionDefinitionId: input.collectionDefinitionId, dueDate: input.dueDate },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("createCollectionEventAction failed", err);
    return { error: "Could not create the collection event." };
  }
}

export async function updateCollectionEventAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return { error: "Event ID is required." };

  const parsed = collectionEventSchema.safeParse({
    collectionDefinitionId: String(formData.get("collectionDefinitionId") ?? ""),
    name: String(formData.get("name") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? "") || undefined,
    dueDate: String(formData.get("dueDate") ?? ""),
    expectedAmountPaise: formData.get("expectedAmountPaise") ? Number(formData.get("expectedAmountPaise")) : undefined,
    status: String(formData.get("status") ?? "SCHEDULED"),
    applicableMonth: formData.get("applicableMonth") ? Number(formData.get("applicableMonth")) : undefined,
    applicableYear: formData.get("applicableYear") ? Number(formData.get("applicableYear")) : undefined,
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid collection event" };

  const input = parsed.data;

  try {
    const existing = await prisma.collectionEvent.findFirst({
      where: { id: eventId, masjidId: user.masjidId! },
    });
    if (!existing) return { error: "Collection event not found." };

    // Verify the collection definition exists and belongs to this masjid
    const def = await prisma.collectionDefinition.findFirst({
      where: { id: input.collectionDefinitionId, masjidId: user.masjidId! },
      select: { id: true },
    });
    if (!def) return { error: "Collection definition not found in this Masjid." };

    const duplicate = await prisma.collectionEvent.findFirst({
      where: { masjidId: user.masjidId!, collectionDefinitionId: input.collectionDefinitionId, name: input.name, id: { not: eventId } },
    });
    if (duplicate) return { error: "An event with this name already exists for this collection definition." };

    await prisma.$transaction(async (tx) => {
      const updated = await tx.collectionEvent.update({
        where: { id: eventId },
        data: {
          collectionDefinitionId: input.collectionDefinitionId,
          name: input.name,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          dueDate: new Date(input.dueDate),
          expectedAmountPaise: input.expectedAmountPaise ?? null,
          status: input.status as any,
          applicableMonth: input.applicableMonth ?? null,
          applicableYear: input.applicableYear ?? null,
          notes: input.notes ?? null,
        },
      });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "collectionEvent.update",
        entityType: "CollectionEvent",
        entityId: eventId,
        before: {
          name: existing.name,
          collectionDefinitionId: existing.collectionDefinitionId,
          startDate: existing.startDate,
          endDate: existing.endDate,
          dueDate: existing.dueDate,
          expectedAmountPaise: existing.expectedAmountPaise,
          status: existing.status,
        },
        after: {
          name: updated.name,
          collectionDefinitionId: updated.collectionDefinitionId,
          startDate: updated.startDate,
          endDate: updated.endDate,
          dueDate: updated.dueDate,
          expectedAmountPaise: updated.expectedAmountPaise,
          status: updated.status,
        },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("updateCollectionEventAction failed", err);
    return { error: "Could not update the collection event." };
  }
}

export async function deleteCollectionEventAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return { error: "Event ID is required." };

  try {
    const existing = await prisma.collectionEvent.findFirst({
      where: { id: eventId, masjidId: user.masjidId! },
    });
    if (!existing) return { error: "Collection event not found." };

    const [assignmentsCount, allocationsCount] = await Promise.all([
      prisma.collectionEventAssignment.count({ where: { eventId } }),
      prisma.paymentAllocation.count({ where: { collectionEventId: eventId } }),
    ]);

    if (assignmentsCount > 0 || allocationsCount > 0) {
      const parts: string[] = [];
      if (assignmentsCount) parts.push(`${assignmentsCount} household assignment(s)`);
      if (allocationsCount) parts.push(`${allocationsCount} payment allocation(s)`);
      return { error: `Cannot delete: ${parts.join(", ")} use this collection event.` };
    }

    await prisma.$transaction(async (tx) => {
      await tx.collectionEvent.delete({ where: { id: eventId } });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "collectionEvent.delete",
        entityType: "CollectionEvent",
        entityId: eventId,
        before: { name: existing.name },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("deleteCollectionEventAction failed", err);
    return { error: "Could not delete the collection event." };
  }
}

// ============================================
// EXPENSE CATEGORY CRUD (unchanged)
// ============================================

export async function createExpenseCategoryAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const parsed = expenseCategorySchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid expense category" };

  const name = parsed.data.name;

  try {
    const existing = await prisma.expenseCategory.findFirst({ where: { masjidId: user.masjidId!, name } });
    if (existing) return { error: "That expense category already exists." };

    await prisma.$transaction(async (tx) => {
      const created = await tx.expenseCategory.create({ data: { masjidId: user.masjidId!, name } });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "expenseCategory.create",
        entityType: "ExpenseCategory",
        entityId: created.id,
        after: { name },
      });
    });

    revalidatePath("/settings");
    revalidatePath("/expenses");
    return { ok: true };
  } catch (err) {
    console.error("createExpenseCategoryAction failed", err);
    return { error: "Could not create the expense category." };
  }
}

export async function updateExpenseCategoryAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const categoryId = String(formData.get("categoryId") ?? "");
  if (!categoryId) return { error: "Category ID is required." };

  const parsed = expenseCategorySchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid expense category" };

  const { name, active } = parsed.data;

  try {
    const existing = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, masjidId: user.masjidId! },
    });
    if (!existing) return { error: "Category not found." };

    const duplicate = await prisma.expenseCategory.findFirst({
      where: { masjidId: user.masjidId!, name, id: { not: categoryId } },
    });
    if (duplicate) return { error: "An expense category with this name already exists." };

    await prisma.$transaction(async (tx) => {
      const updated = await tx.expenseCategory.update({
        where: { id: categoryId },
        data: { name, active },
      });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "expenseCategory.update",
        entityType: "ExpenseCategory",
        entityId: categoryId,
        before: { name: existing.name, active: existing.active },
        after: { name: updated.name, active: updated.active },
      });
    });

    revalidatePath("/settings");
    revalidatePath("/expenses");
    return { ok: true };
  } catch (err) {
    console.error("updateExpenseCategoryAction failed", err);
    return { error: "Could not update the expense category." };
  }
}

export async function deleteExpenseCategoryAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const categoryId = String(formData.get("categoryId") ?? "");
  if (!categoryId) return { error: "Category ID is required." };

  try {
    const existing = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, masjidId: user.masjidId! },
    });
    if (!existing) return { error: "Category not found." };

    const expensesUsing = await prisma.expense.count({
      where: { categoryId, masjidId: user.masjidId! },
    });
    if (expensesUsing > 0) {
      return { error: `Cannot delete: ${expensesUsing} expense(s) use this category.` };
    }

    await prisma.$transaction(async (tx) => {
      await tx.expenseCategory.delete({ where: { id: categoryId } });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "expenseCategory.delete",
        entityType: "ExpenseCategory",
        entityId: categoryId,
        before: { name: existing.name },
      });
    });

    revalidatePath("/settings");
    revalidatePath("/expenses");
    return { ok: true };
  } catch (err) {
    console.error("deleteExpenseCategoryAction failed", err);
    return { error: "Could not delete the expense category." };
  }
}

// ============================================
// STAFF CRUD (unchanged)
// ============================================

export async function createStaffAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  let user;
  try {
    user = await requireStaff();
    assertCan(user.role, "staff:manage");
  } catch (err) {
    if (err instanceof Error && (err.message === "UNAUTHENTICATED" || err.message === "FORBIDDEN")) {
      return { error: err.message };
    }
    throw err;
  }

  const parsed = staffSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "COLLECTOR"),
    phone: String(formData.get("phone") ?? ""),
    upiId: String(formData.get("upiId") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (issue.path.length > 0) fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: parsed.error.issues[0]?.message ?? "Invalid staff member", fieldErrors };
  }

  const input = parsed.data;

  if (input.phone) {
    const digits = input.phone.replace(/^\+91/, "");
    const conflict = await prisma.member.findFirst({
      where: {
        masjidId: user.masjidId!,
        OR: [
          { phone: digits },
          { phone: input.phone },
          { alternatePhone: digits },
          { alternatePhone: input.phone },
        ],
      },
      select: { id: true, fullName: true },
    });
    if (conflict) {
      return { error: `${conflict.fullName} is already a member with this mobile number.` };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const currentStaffCount = await tx.masjidUser.count({
        where: { masjidId: user.masjidId!, status: "ACTIVE" },
      });
      const limitCheck = await checkLimit(user.masjidId!, "staff", currentStaffCount);
      if (!limitCheck.allowed) {
        throw new Error(`STAFF_LIMIT_EXCEEDED:${limitCheck.limit}`);
      }

      let account = await tx.user.findUnique({ where: { email: input.email } });
      if (!account) {
        if (!input.password) throw new Error("PASSWORD_REQUIRED");
        account = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            passwordHash: await (await import("@/lib/auth")).hashPassword(input.password),
            phone: input.phone ?? null,
            upiId: input.upiId ?? null,
          },
        });
      } else {
        await tx.user.update({
          where: { id: account.id },
          data: {
            phone: input.phone ?? account.phone,
            upiId: input.upiId ?? account.upiId,
          },
        });
      }

      const membership = await tx.masjidUser.findUnique({
        where: { masjidId_userId: { masjidId: user.masjidId!, userId: account.id } },
      });
      if (membership) throw new Error("ALREADY_STAFF");

      const created = await tx.masjidUser.create({
        data: { masjidId: user.masjidId!, userId: account.id, role: input.role as any, status: "ACTIVE", joinedAt: new Date() },
      });

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "staff.create",
        entityType: "MasjidUser",
        entityId: created.id,
        after: { email: input.email, role: input.role, phone: input.phone, upiId: input.upiId },
      });
    });

    revalidatePath("/staff");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_STAFF") {
      return { error: "That person is already staff at this Masjid." };
    }
    if (err instanceof Error && err.message === "PASSWORD_REQUIRED") {
      return { error: "A password is required to create a new account." };
    }
    if (err instanceof Error && err.message.startsWith("STAFF_LIMIT_EXCEEDED:")) {
      const limit = err.message.split(":")[1];
      return { error: `Staff limit exceeded. Your plan allows a maximum of ${limit} staff members.` };
    }
    console.error("createStaffAction failed", err);
    return { error: "Could not add the staff member." };
  }
}

export async function updateStaffRoleAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  assertCan(user.role, "staff:manage");

  const membershipId = String(formData.get("membershipId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!["ADMIN", "COLLECTOR", "AUDITOR"].includes(role)) return;

  const membership = await prisma.masjidUser.findFirst({
    where: { id: membershipId, masjidId: user.masjidId! },
  });
  if (!membership) return;

  if (membership.userId === user.id) return;
  if (membership.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") return;

  if (
    membership.status === "ACTIVE" &&
    ["ADMIN", "SUPER_ADMIN"].includes(membership.role) &&
    !["ADMIN", "SUPER_ADMIN"].includes(role)
  ) {
    const activeAdmins = await prisma.masjidUser.count({
      where: { masjidId: user.masjidId!, role: { in: ["ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
    });
    if (activeAdmins <= 1) return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.masjidUser.update({ where: { id: membership.id }, data: { role } });
    await writeAudit(tx, {
      masjidId: user.masjidId,
      actorUserId: user.id,
      action: "staff.changeRole",
      entityType: "MasjidUser",
      entityId: membership.id,
      before: { role: membership.role },
      after: { role },
    });
  });

  revalidatePath("/staff");
}