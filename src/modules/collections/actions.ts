"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { collectionEventSchema, collectionEventAssignmentSchema } from "@/lib/validation";
import { writeAudit } from "@/modules/audit/write";
import { recomputeEventStatus } from "@/lib/dues";

export type CollectionState = { error?: string; ok?: boolean; fieldErrors?: Record<string, string> } | undefined;

export async function createCollectionEventAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const parsed = collectionEventSchema.safeParse({
    categoryId: String(formData.get("categoryId") ?? ""),
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
    // Verify category belongs to this masjid
    const category = await prisma.contributionCategory.findFirst({
      where: { id: input.categoryId, masjidId: user.masjidId! },
    });
    if (!category) return { error: "Category not found." };

    await prisma.$transaction(async (tx) => {
      const created = await tx.collectionEvent.create({
        data: {
          masjidId: user.masjidId!,
          categoryId: input.categoryId,
          name: input.name,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          dueDate: new Date(input.dueDate),
          expectedAmountPaise: input.expectedAmountPaise ?? null,
          status: input.status,
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
        after: { name: input.name, categoryId: input.categoryId, dueDate: input.dueDate },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("createCollectionEventAction failed", err);
    return { error: "Could not create the collection event." };
  }
}

export async function updateCollectionEventAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return { error: "Event ID is required." };

  const parsed = collectionEventSchema.safeParse({
    categoryId: String(formData.get("categoryId") ?? ""),
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
    // Check if event exists and belongs to this masjid
    const existing = await prisma.collectionEvent.findFirst({
      where: { id: eventId, masjidId: user.masjidId! },
      include: { category: true },
    });
    if (!existing) return { error: "Collection event not found." };

    // Verify category belongs to this masjid
    if (input.categoryId !== existing.categoryId) {
      const category = await prisma.contributionCategory.findFirst({
        where: { id: input.categoryId, masjidId: user.masjidId! },
      });
      if (!category) return { error: "Category not found." };
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.collectionEvent.update({
        where: { id: eventId },
        data: {
          categoryId: input.categoryId,
          name: input.name,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          dueDate: new Date(input.dueDate),
          expectedAmountPaise: input.expectedAmountPaise ?? null,
          status: input.status,
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
          categoryId: existing.categoryId,
          startDate: existing.startDate.toISOString(),
          endDate: existing.endDate?.toISOString() ?? null,
          dueDate: existing.dueDate.toISOString(),
          status: existing.status,
        },
        after: {
          name: updated.name,
          categoryId: updated.categoryId,
          startDate: updated.startDate.toISOString(),
          endDate: updated.endDate?.toISOString() ?? null,
          dueDate: updated.dueDate.toISOString(),
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

export async function deleteCollectionEventAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return { error: "Event ID is required." };

  try {
    // Check if event exists and belongs to this masjid
    const existing = await prisma.collectionEvent.findFirst({
      where: { id: eventId, masjidId: user.masjidId! },
    });
    if (!existing) return { error: "Collection event not found." };

    // Check for dependencies - allocations using this event
    const allocationsUsing = await prisma.paymentAllocation.count({
      where: { collectionEventId: eventId, masjidId: user.masjidId! },
    });
    if (allocationsUsing > 0) {
      return { error: `Cannot delete: ${allocationsUsing} payment allocation(s) reference this event.` };
    }

    // Check for assignments
    const assignmentsCount = await prisma.collectionEventAssignment.count({
      where: { eventId },
    });
    if (assignmentsCount > 0) {
      return { error: `Cannot delete: ${assignmentsCount} household assignment(s) exist for this event.` };
    }

    await prisma.$transaction(async (tx) => {
      await tx.collectionEvent.delete({ where: { id: eventId } });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "collectionEvent.delete",
        entityType: "CollectionEvent",
        entityId: eventId,
        before: { name: existing.name, categoryId: existing.categoryId },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("deleteCollectionEventAction failed", err);
    return { error: "Could not delete the collection event." };
  }
}

export async function assignHouseholdsAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const eventId = String(formData.get("eventId") ?? "");
  const memberIds = JSON.parse(String(formData.get("memberIds") ?? "[]"));
  const expectedAmountPaise = Number(formData.get("expectedAmountPaise") ?? 0);

  if (!eventId) return { error: "Event ID is required." };
  if (!memberIds.length) return { error: "At least one member is required." };
  if (expectedAmountPaise < 1) return { error: "Expected amount must be positive." };

  try {
    // Verify event belongs to this masjid
    const event = await prisma.collectionEvent.findFirst({
      where: { id: eventId, masjidId: user.masjidId! },
    });
    if (!event) return { error: "Collection event not found." };

    // Verify all members belong to this masjid
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds }, masjidId: user.masjidId! },
      select: { id: true },
    });
    if (members.length !== memberIds.length) {
      return { error: "Some members not found in this masjid." };
    }

    await prisma.$transaction(async (tx) => {
      // Delete existing assignments for these members in this event
      await tx.collectionEventAssignment.deleteMany({
        where: { eventId, memberId: { in: memberIds } },
      });

      // Create new assignments
      await tx.collectionEventAssignment.createMany({
        data: memberIds.map((memberId: string) => ({
          eventId,
          memberId,
          expectedAmountPaise,
          status: "PENDING",
        })),
      });

      // Recompute event status after assignment changes
      await recomputeEventStatus(tx, eventId);

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "collectionEvent.assignHouseholds",
        entityType: "CollectionEventAssignment",
        entityId: eventId,
        after: { eventId, memberCount: memberIds.length, expectedAmountPaise },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("assignHouseholdsAction failed", err);
    return { error: "Could not assign households." };
  }
}

export async function generateEventsFromCategoryAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const categoryId = String(formData.get("categoryId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!categoryId) return { error: "Category ID is required." };
  if (!startDate || !endDate) return { error: "Start and end dates are required." };

  try {
    const category = await prisma.contributionCategory.findFirst({
      where: { id: categoryId, masjidId: user.masjidId! },
    });
    if (!category) return { error: "Category not found." };

    if (!category.frequency || !category.defaultAmountPaise) {
      return { error: "Category must have frequency and default amount configured." };
    }

    const frequency = category.frequency;
    const defaultAmount = category.defaultAmountPaise;
    const defaultDueDay = category.defaultDueDay ?? 10;
    const defaultGraceDays = category.defaultGraceDays ?? 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const eventsToCreate: Array<{
      categoryId: string;
      name: string;
      startDate: Date;
      endDate: Date | null;
      dueDate: Date;
      expectedAmountPaise: number;
      status: string;
      applicableMonth?: number;
      applicableYear?: number;
      notes?: string;
      createdBy: string;
    }> = [];

    let current = new Date(start);
    let eventNumber = 1;

    while (current <= end) {
      let periodStart: Date;
      let periodEnd: Date;
      let dueDate: Date;
      let name: string;
      let applicableMonth: number;
      let applicableYear: number;

      switch (frequency) {
        case "WEEKLY": {
          // Weekly on same day of week as start
          const dayOfWeek = current.getDay(); // 0 = Sunday
          // Find next occurrence of this day
          periodStart = new Date(current);
          periodEnd = new Date(current);
          periodEnd.setDate(periodEnd.getDate() + 6); // End of week
          dueDate = new Date(current);
          dueDate.setDate(dueDate.getDate() + defaultDueDay);
          name = `${category.name} - Week ${eventNumber}`;
          applicableMonth = current.getMonth() + 1;
          applicableYear = current.getFullYear();
          current.setDate(current.getDate() + 7);
          break;
        }
        case "MONTHLY": {
          periodStart = new Date(current.getFullYear(), current.getMonth(), 1);
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          dueDate = new Date(current.getFullYear(), current.getMonth(), defaultDueDay);
          name = `${category.name} - ${periodStart.toLocaleString("default", { month: "long", year: "numeric" })}`;
          applicableMonth = current.getMonth() + 1;
          applicableYear = current.getFullYear();
          current.setMonth(current.getMonth() + 1);
          break;
        }
        case "SEMI_ANNUAL": {
          periodStart = new Date(current.getFullYear(), current.getMonth(), 1);
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 5, 0);
          dueDate = new Date(current.getFullYear(), current.getMonth(), defaultDueDay);
          name = `${category.name} - H${Math.floor(current.getMonth() / 6) + 1} ${current.getFullYear()}`;
          applicableMonth = current.getMonth() + 1;
          applicableYear = current.getFullYear();
          current.setMonth(current.getMonth() + 6);
          break;
        }
        case "ANNUAL":
        case "YEARLY": {
          periodStart = new Date(current.getFullYear(), 0, 1);
          periodEnd = new Date(current.getFullYear(), 11, 31);
          dueDate = new Date(current.getFullYear(), 3, defaultDueDay); // Default April 10
          name = `${category.name} - ${current.getFullYear()}`;
          applicableMonth = 1;
          applicableYear = current.getFullYear();
          current.setFullYear(current.getFullYear() + 1);
          break;
        }
        default:
          // EVENT_BASED and OCCASIONAL don't auto-generate
          return { error: `Frequency "${frequency}" does not support auto-generation.` };
      }

      if (periodStart > end) break;

      eventsToCreate.push({
        categoryId,
        name,
        startDate: periodStart,
        endDate: periodEnd,
        dueDate,
        expectedAmountPaise: defaultAmount,
        status: "SCHEDULED",
        applicableMonth,
        applicableYear,
        notes: `Auto-generated from category ${category.name}`,
        createdBy: user.id,
      });

      eventNumber++;
    }

    if (eventsToCreate.length === 0) {
      return { error: "No events generated for the given date range." };
    }

    await prisma.$transaction(async (tx) => {
      // Check for existing events in the same range to avoid duplicates
      const existingEvents = await tx.collectionEvent.findMany({
        where: {
          categoryId,
          startDate: { gte: start },
          endDate: { lte: end },
        },
        select: { startDate: true, endDate: true },
      });

      const toCreate = eventsToCreate.filter((e) => {
        return !existingEvents.some((ex) => {
          const exStart = new Date(ex.startDate).getTime();
          const exEnd = ex.endDate ? new Date(ex.endDate).getTime() : exStart;
          const newStart = e.startDate.getTime();
          const newEnd = e.endDate ? e.endDate.getTime() : newStart;
          return newStart >= exStart && newEnd <= exEnd;
        });
      });

      if (toCreate.length === 0) {
        return { error: "Events already exist for this range." };
      }

      await tx.collectionEvent.createMany({
        data: toCreate.map((e) => ({
          ...e,
          masjidId: user.masjidId!,
        })),
      });

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "collectionEvent.generate",
        entityType: "CollectionEvent",
        entityId: categoryId,
        after: { categoryId, generatedCount: toCreate.length, dateRange: { start, end } },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("generateEventsFromCategoryAction failed", err);
    return { error: "Could not generate events." };
  }
}

export async function removeHouseholdAssignmentAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const eventId = String(formData.get("eventId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  if (!eventId || !memberId) return { error: "Event ID and Member ID are required." };

  try {
    const event = await prisma.collectionEvent.findFirst({
      where: { id: eventId, masjidId: user.masjidId! },
    });
    if (!event) return { error: "Collection event not found." };

    await prisma.$transaction(async (tx) => {
      await tx.collectionEventAssignment.deleteMany({
        where: { eventId, memberId },
      });

      // Recompute event status after assignment removal
      await recomputeEventStatus(tx, eventId);

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "collectionEvent.removeAssignment",
        entityType: "CollectionEventAssignment",
        entityId: eventId,
        before: { eventId, memberId },
      });
    });

    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("removeHouseholdAssignmentAction failed", err);
    return { error: "Could not remove assignment." };
  }
}