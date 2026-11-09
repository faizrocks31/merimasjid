"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { collectionEventSchema, collectionEventAssignmentSchema } from "@/lib/validation";
import { writeAudit } from "@/modules/audit/write";
import { recomputeEventStatus } from "@/lib/dues";
import { generateDuesForCategory, generateAllAutomaticDues, assignMembersToCategory, previewDuesGeneration } from "@/lib/dues-generation";

export type CollectionState = {
  error?: string;
  ok?: boolean;
  fieldErrors?: Record<string, string>;
  message?: string;
  created?: number;
  skipped?: number;
  errors?: string[];
} | undefined;

export async function createCollectionEventAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
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
    // Verify collection definition belongs to this masjid
    const definition = await prisma.collectionDefinition.findFirst({
      where: { id: input.collectionDefinitionId, masjidId: user.masjidId! },
    });
    if (!definition) return { error: "Collection definition not found." };

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

export async function updateCollectionEventAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
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
    // Check if event exists and belongs to this masjid
    const existing = await prisma.collectionEvent.findFirst({
      where: { id: eventId, masjidId: user.masjidId! },
      include: { collectionDefinition: true },
    });
    if (!existing) return { error: "Collection event not found." };

    // Verify collection definition belongs to this masjid
    if (input.collectionDefinitionId !== existing.collectionDefinitionId) {
      const definition = await prisma.collectionDefinition.findFirst({
        where: { id: input.collectionDefinitionId, masjidId: user.masjidId! },
      });
      if (!definition) return { error: "Collection definition not found." };
    }

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
          collectionDefinitionId: existing.collectionDefinitionId,
          startDate: existing.startDate.toISOString(),
          endDate: existing.endDate?.toISOString() ?? null,
          dueDate: existing.dueDate.toISOString(),
          status: existing.status,
        },
        after: {
          name: updated.name,
          collectionDefinitionId: updated.collectionDefinitionId,
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
        before: { name: existing.name, collectionDefinitionId: existing.collectionDefinitionId },
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

  const collectionDefinitionId = String(formData.get("collectionDefinitionId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!collectionDefinitionId) return { error: "Collection Definition ID is required." };
  if (!startDate || !endDate) return { error: "Start and end dates are required." };

  try {
    const definition = await prisma.collectionDefinition.findFirst({
      where: { id: collectionDefinitionId, masjidId: user.masjidId! },
    });
    if (!definition) return { error: "Collection definition not found." };

    if (!definition.frequency || !definition.defaultAmountPaise) {
      return { error: "Collection definition must have frequency and default amount configured." };
    }

    const frequency = definition.frequency;
    const defaultAmount = definition.defaultAmountPaise;
    const defaultDueDay = 10; // TODO: get from definition or use a sensible default
    const defaultGraceDays = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const eventsToCreate: Array<{
      collectionDefinitionId: string;
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
          name = `${definition.name} - Week ${eventNumber}`;
          applicableMonth = current.getMonth() + 1;
          applicableYear = current.getFullYear();
          current.setDate(current.getDate() + 7);
          break;
        }
        case "MONTHLY": {
          periodStart = new Date(current.getFullYear(), current.getMonth(), 1);
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          dueDate = new Date(current.getFullYear(), current.getMonth(), defaultDueDay);
          name = `${definition.name} - ${periodStart.toLocaleString("default", { month: "long", year: "numeric" })}`;
          applicableMonth = current.getMonth() + 1;
          applicableYear = current.getFullYear();
          current.setMonth(current.getMonth() + 1);
          break;
        }
        case "SEMI_ANNUAL": {
          periodStart = new Date(current.getFullYear(), current.getMonth(), 1);
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 5, 0);
          dueDate = new Date(current.getFullYear(), current.getMonth(), defaultDueDay);
          name = `${definition.name} - H${Math.floor(current.getMonth() / 6) + 1} ${current.getFullYear()}`;
          applicableMonth = current.getMonth() + 1;
          applicableYear = current.getFullYear();
          current.setMonth(current.getMonth() + 6);
          break;
        }
        case "ANNUAL": {
          periodStart = new Date(current.getFullYear(), 0, 1);
          periodEnd = new Date(current.getFullYear(), 11, 31);
          dueDate = new Date(current.getFullYear(), 3, defaultDueDay); // Default April 10
          name = `${definition.name} - ${current.getFullYear()}`;
          applicableMonth = 1;
          applicableYear = current.getFullYear();
          current.setFullYear(current.getFullYear() + 1);
          break;
        }
        default:
          // EVENT_BASED and ONE_TIME don't auto-generate
          return { error: `Frequency "${frequency}" does not support auto-generation.` };
      }

      if (periodStart > end) break;

      eventsToCreate.push({
        collectionDefinitionId,
        name,
        startDate: periodStart,
        endDate: periodEnd,
        dueDate,
        expectedAmountPaise: defaultAmount,
        status: "SCHEDULED",
        applicableMonth,
        applicableYear,
        notes: `Auto-generated from collection definition ${definition.name}`,
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
          collectionDefinitionId,
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
        entityId: collectionDefinitionId,
        after: { collectionDefinitionId, generatedCount: toCreate.length, dateRange: { start, end } },
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

/**
 * Generates dues periods for a specific collection definition.
 */
export async function generateDuesForCategoryAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const categoryId = String(formData.get("categoryId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const memberIdsRaw = String(formData.get("memberIds") ?? "[]");
  const forceRegenerate = String(formData.get("forceRegenerate") ?? "false") === "true";

  if (!categoryId) return { error: "Category ID is required." };
  if (!startDate || !endDate) return { error: "Start and end dates are required." };

  let memberIds: string[] = [];
  try {
    memberIds = JSON.parse(memberIdsRaw);
  } catch {
    memberIds = [];
  }

  try {
    const result = await generateDuesForCategory(user.masjidId!, categoryId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      memberIds: memberIds.length > 0 ? memberIds : undefined,
      forceRegenerate,
      actorUserId: user.id,
    });

    revalidatePath("/settings");
    revalidatePath("/collections");

    if (result.errors.length > 0) {
      return { error: result.errors.join("; "), ok: result.created > 0 };
    }
    return { ok: true, message: `Created ${result.created} dues periods, skipped ${result.skipped} existing.` };
  } catch (err) {
    console.error("generateDuesForCategoryAction failed", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: `Could not generate dues periods: ${errorMessage}` };
  }
}

/**
 * Generates dues for all categories with AUTOMATIC dueGeneration mode.
 * Called by cron job.
 */
export async function generateAllDuesAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  try {
    const result = await generateAllAutomaticDues(user.masjidId!);

    revalidatePath("/settings");
    revalidatePath("/collections");
    revalidatePath("/dashboard");

    if (result.totalErrors > 0) {
      return { error: `Errors encountered: ${result.totalErrors}`, ok: result.totalCreated > 0 };
    }
    return { ok: true, message: `Created ${result.totalCreated} dues periods, skipped ${result.totalSkipped} existing.` };
  } catch (err) {
    console.error("generateAllDuesAction failed", err);
    return { error: "Could not generate dues periods." };
  }
}

/**
 * Preview dues generation for a category.
 */
export async function previewDuesGenerationAction(
  categoryId: string,
  startDate: string,
  endDate: string,
  memberIds?: string[]
): Promise<{ error?: string; totalPeriods?: number; totalMembers?: number; preview?: any }> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  if (!categoryId || !startDate || !endDate) {
    return { error: "Missing required parameters." };
  }

  try {
    const preview = await previewDuesGeneration(
      user.masjidId!,
      categoryId,
      new Date(startDate),
      new Date(endDate),
      memberIds
    );
    return {
      totalPeriods: preview.totalPeriods,
      totalMembers: preview.totalMembers,
      preview: {
        periodsCount: preview.periods.length,
        membersCount: preview.members.length,
        samplePeriods: preview.periods.slice(0, 3).map(p => ({
          start: p.periodStart.toISOString().split("T")[0],
          end: p.periodEnd.toISOString().split("T")[0],
          due: p.dueDate.toISOString().split("T")[0],
          amount: p.expectedAmountPaise,
        })),
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to preview dues generation" };
  }
}

/**
 * Assigns members to a collection definition (for SELECTED memberAssignment mode).
 */
export async function assignMembersToCategoryAction(
  _prev: CollectionState,
  formData: FormData
): Promise<CollectionState> {
  const user = await requireStaff();
  assertCan(user.role, "settings:write");

  const categoryId = String(formData.get("categoryId") ?? "");
  const memberIdsRaw = String(formData.get("memberIds") ?? "[]");
  const expectedAmountPaise = Number(formData.get("expectedAmountPaise") ?? 0);

  if (!categoryId) return { error: "Category ID is required." };
  if (expectedAmountPaise < 1) return { error: "Expected amount must be positive." };

  let memberIds: string[] = [];
  try {
    memberIds = JSON.parse(memberIdsRaw);
  } catch {
    return { error: "Invalid member IDs format." };
  }

  if (!memberIds.length) return { error: "At least one member is required." };

  try {
    const count = await assignMembersToCategory(user.masjidId!, categoryId, memberIds, expectedAmountPaise);

    revalidatePath("/settings");
    return { ok: true, message: `Assigned ${count} members successfully.` };
  } catch (err) {
    console.error("assignMembersToCategoryAction failed", err);
    return { error: err instanceof Error ? err.message : "Could not assign members." };
  }
}