"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff, hashPassword } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { settingsSchema, categorySchema, expenseCategorySchema, staffSchema, collectionEventSchema } from "@/lib/validation";
import { writeAudit } from "@/modules/audit/write";
import { checkLimit } from "@/lib/subscription";

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
    // Fetch all active members
    const members = await prisma.member.findMany({
      where: { masjidId: user.masjidId!, status: "ACTIVE" },
      select: { id: true, telegramChatId: true, user: { select: { email: true } }, phone: true },
    });

    if (members.length === 0) {
      return { error: "No active members found to send announcement." };
    }

    // Import notifyAnnouncement dynamically to avoid circular imports
    const { notifyAnnouncement } = await import("@/lib/notifications");
    const { initNotifications } = await import("@/lib/notifications-init");
    initNotifications();

    // Send to each member
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

    // If sendToTelegram and channel ID is configured, also send to channel
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

export async function createCategoryAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const parsed = categorySchema.safeParse({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? "").toUpperCase(),
    restrictedPurpose: formData.get("restrictedPurpose") === "on",
    reportingGroup: String(formData.get("reportingGroup") ?? ""),
    description: String(formData.get("description") ?? ""),
    defaultAmountPaise: formData.get("defaultAmountPaise") ? Number(formData.get("defaultAmountPaise")) : undefined,
    frequency: String(formData.get("frequency") ?? "") || undefined,
    collectionMode: String(formData.get("collectionMode") ?? "") || undefined,
    defaultDueDay: formData.get("defaultDueDay") ? Number(formData.get("defaultDueDay")) : undefined,
    defaultGraceDays: formData.get("defaultGraceDays") ? Number(formData.get("defaultGraceDays")) : 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid category" };

  const input = parsed.data;

  try {
    const existing = await prisma.contributionCategory.findFirst({
      where: { masjidId: user.masjidId!, code: input.code },
    });
    if (existing) return { error: "A category with this code already exists." };

    // Check category limit before creating
    const currentCategoryCount = await prisma.contributionCategory.count({
      where: { masjidId: user.masjidId! },
    });
    const limitCheck = await checkLimit(user.masjidId!, "categories", currentCategoryCount);
    if (!limitCheck.allowed) {
      return { error: `Category limit exceeded. Your plan allows a maximum of ${limitCheck.limit} categories.` };
    }

    await prisma.$transaction(async (tx) => {
      const created = await tx.contributionCategory.create({
        data: {
          masjidId: user.masjidId!,
          name: input.name,
          code: input.code,
          restrictedPurpose: input.restrictedPurpose,
          reportingGroup: input.reportingGroup ?? null,
          description: input.description ?? null,
          defaultAmountPaise: input.defaultAmountPaise ?? null,
          frequency: input.frequency ?? null,
          collectionMode: input.collectionMode ?? null,
          defaultDueDay: input.defaultDueDay ?? null,
          defaultGraceDays: input.defaultGraceDays ?? 0,
        },
      });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "category.create",
        entityType: "ContributionCategory",
        entityId: created.id,
        after: { name: input.name, code: input.code },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("createCategoryAction failed", err);
    return { error: "Could not create the category." };
  }
}

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

export async function updateCategoryAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").toUpperCase().trim();
  const restrictedPurpose = formData.get("restrictedPurpose") === "on";
  const reportingGroup = String(formData.get("reportingGroup") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const defaultAmountPaise = formData.get("defaultAmountPaise") ? Number(formData.get("defaultAmountPaise")) : undefined;
  const frequency = String(formData.get("frequency") ?? "") || undefined;
  const collectionMode = String(formData.get("collectionMode") ?? "") || undefined;
  const defaultDueDay = formData.get("defaultDueDay") ? Number(formData.get("defaultDueDay")) : undefined;
  const defaultGraceDays = formData.get("defaultGraceDays") ? Number(formData.get("defaultGraceDays")) : undefined;

  if (!categoryId) return { error: "Category ID is required." };
  if (name.length < 1 || name.length > 200) return { error: "Enter a category name (1–200 characters)." };
  if (code.length < 2 || code.length > 20) return { error: "Code must be 2–20 characters." };
  if (!/^[A-Z0-9_]+$/.test(code)) return { error: "Code must contain only capital letters, digits, and underscores." };

  try {
    // Check if category exists and belongs to this masjid
    const existing = await prisma.contributionCategory.findFirst({
      where: { id: categoryId, masjidId: user.masjidId! },
    });
    if (!existing) return { error: "Category not found." };

    // Check for duplicate name
    const duplicateName = await prisma.contributionCategory.findFirst({
      where: { masjidId: user.masjidId!, name, id: { not: categoryId } },
    });
    if (duplicateName) return { error: "A category with this name already exists." };

    // Check for duplicate code (code can be changed, but must remain unique)
    if (code !== existing.code) {
      const duplicateCode = await prisma.contributionCategory.findFirst({
        where: { masjidId: user.masjidId!, code, id: { not: categoryId } },
      });
      if (duplicateCode) return { error: "A category with this code already exists." };
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.contributionCategory.update({
        where: { id: categoryId },
        data: {
          name,
          code,
          restrictedPurpose,
          reportingGroup,
          description,
          defaultAmountPaise: defaultAmountPaise ?? null,
          frequency: frequency ?? null,
          collectionMode: collectionMode ?? null,
          defaultDueDay: defaultDueDay ?? null,
          defaultGraceDays: defaultGraceDays ?? 0,
        },
      });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "category.update",
        entityType: "ContributionCategory",
        entityId: categoryId,
        before: {
          name: existing.name,
          code: existing.code,
          restrictedPurpose: existing.restrictedPurpose,
          reportingGroup: existing.reportingGroup,
          description: existing.description,
          defaultAmountPaise: existing.defaultAmountPaise,
          frequency: existing.frequency,
          collectionMode: existing.collectionMode,
          defaultDueDay: existing.defaultDueDay,
          defaultGraceDays: existing.defaultGraceDays,
        },
        after: {
          name: updated.name,
          code: updated.code,
          restrictedPurpose: updated.restrictedPurpose,
          reportingGroup: updated.reportingGroup,
          description: updated.description,
          defaultAmountPaise: updated.defaultAmountPaise,
          frequency: updated.frequency,
          collectionMode: updated.collectionMode,
          defaultDueDay: updated.defaultDueDay,
          defaultGraceDays: updated.defaultGraceDays,
        },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("updateCategoryAction failed", err);
    return { error: "Could not update the category." };
  }
}

export async function deleteCategoryAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const categoryId = String(formData.get("categoryId") ?? "");
  if (!categoryId) return { error: "Category ID is required." };

  try {
    // Check if category exists and belongs to this masjid
    const existing = await prisma.contributionCategory.findFirst({
      where: { id: categoryId, masjidId: user.masjidId! },
    });
    if (!existing) return { error: "Category not found." };

    // Check for dependencies - plans using this category
    const plansUsing = await prisma.contributionPlan.count({
      where: { categoryId, masjidId: user.masjidId! },
    });
    if (plansUsing > 0) {
      return { error: `Cannot delete: ${plansUsing} contribution plan(s) use this category.` };
    }

    await prisma.$transaction(async (tx) => {
      await tx.contributionCategory.delete({ where: { id: categoryId } });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "category.delete",
        entityType: "ContributionCategory",
        entityId: categoryId,
        before: { name: existing.name, code: existing.code },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("deleteCategoryAction failed", err);
    return { error: "Could not delete the category." };
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
    // Check if category exists and belongs to this masjid
    const existing = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, masjidId: user.masjidId! },
    });
    if (!existing) return { error: "Category not found." };

    // Check for duplicate name
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
    // Check if category exists and belongs to this masjid
    const existing = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, masjidId: user.masjidId! },
    });
    if (!existing) return { error: "Category not found." };

    // Check for dependencies - expenses using this category
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

  // A mobile that already belongs to a member of this masjid must not become
  // a staff login — the same person would then hold two identities.
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
      // Check staff limit before creating
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
            passwordHash: await hashPassword(input.password),
            phone: input.phone ?? null,
            upiId: input.upiId ?? null,
          },
        });
      } else {
        // Update phone and UPI ID if provided for existing user
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
        data: { masjidId: user.masjidId!, userId: account.id, role: input.role, joinedAt: new Date() },
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

  // Tenant-scoped: a membership from another masjid is simply not found.
  const membership = await prisma.masjidUser.findFirst({
    where: { id: membershipId, masjidId: user.masjidId! },
  });
  if (!membership) return;

  // Guard 1 — nobody may change their own role.
  if (membership.userId === user.id) return;

  // Guard 2 — a SUPER_ADMIN membership is only the platform owner's to touch.
  if (membership.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") return;

  // Guard 3 — the last active administrator must not be demoted.
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
