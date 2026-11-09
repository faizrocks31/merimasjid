"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { paymentSchema, reversalSchema } from "@/lib/validation";
import { parseISODate } from "@/lib/dates";
import { nextReceiptNumber } from "@/lib/receipts/numbering";
import { recomputePeriodStatus, recomputeAssignmentStatus, recomputeEventStatus, sumEventAllocationsForMember } from "@/lib/dues";
import { writeAudit } from "@/modules/audit/write";
import { notifyPaymentReceived } from "@/lib/notifications";

export type PaymentResult =
  | { ok: true; paymentId: string; receiptNo: string; duplicate?: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; duplicate?: boolean; paymentId?: string; receiptNo?: string }

type ParsedPayment = ReturnType<typeof paymentSchema.parse>;

function parseForm(formData: FormData) {
  const allocationJson = String(formData.get("allocations") ?? "[]");
  let allocations: unknown = [];
  try {
    allocations = JSON.parse(allocationJson);
  } catch {
    allocations = [];
  }

  return paymentSchema.safeParse({
    memberId: String(formData.get("memberId") ?? ""),
    walkInName: String(formData.get("walkInName") ?? ""),
    collectionDefinitionId: String(formData.get("collectionDefinitionId") ?? ""),
    collectionEventId: String(formData.get("collectionEventId") ?? ""),
    paymentDate: String(formData.get("paymentDate") ?? ""),
    amountPaise: Number(formData.get("amountPaise") ?? 0),
    mode: String(formData.get("mode") ?? "CASH"),
    referenceNo: String(formData.get("referenceNo") ?? ""),
    verificationStatus: String(formData.get("verificationStatus") ?? "MANUAL"),
    notes: String(formData.get("notes") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    allocations,
  });
}

/**
 * Posts a contribution with automatic FIFO allocation.
 */
export async function createPaymentAction(formData: FormData): Promise<PaymentResult> {
  let user;
  try {
    user = await requireStaff();
    assertCan(user.role, "payment:create");
  } catch (err) {
    if (err instanceof Error && (err.message === "UNAUTHENTICATED" || err.message === "FORBIDDEN")) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] = issue.message;
    }
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment", fieldErrors };
  }
  const input: ParsedPayment = parsed.data;

  if (!input.memberId && !input.walkInName) {
    return { ok: false, error: "Select a member or enter a walk-in donor name." };
  }
  if (!input.collectionDefinitionId) {
    return { ok: false, error: "Collection definition is required." };
  }

  const paymentDate = parseISODate(input.paymentDate);
  if (!paymentDate) return { ok: false, error: "Invalid payment date." };
  if (input.amountPaise <= 0) return { ok: false, error: "Amount must be positive." };

  let member = null;
  if (input.memberId) {
    member = await prisma.member.findFirst({
      where: { id: input.memberId, masjidId: user.masjidId! },
      select: { id: true, fullName: true, memberNo: true },
    });
    if (!member) return { ok: false, error: "Member not found in this Masjid." };
  }

  // Validate collection definition exists and belongs to this masjid
  const definition = await prisma.collectionDefinition.findFirst({
    where: { id: input.collectionDefinitionId, masjidId: user.masjidId!, active: true },
    include: { baseCategory: { select: { code: true } } },
  });
  if (!definition) return { ok: false, error: "Collection definition not found or inactive in this Masjid." };

  // DYNAMIC WALK-IN ELIGIBILITY (server-side enforcement)
  // Uses donorEligibility field instead of hardcoded purpose codes
  if (!input.memberId && input.walkInName) {
    // Walk-in allowed only for WALKIN_ONLY or BOTH
    if (definition.donorEligibility === "MEMBERS_ONLY") {
      return { ok: false, error: "Walk-in donors are not allowed for this collection definition (Members Only)." };
    }
    // WALKIN_ONLY and BOTH are allowed
  }

  // For member payments: check donorEligibility
  if (input.memberId && definition.donorEligibility === "WALKIN_ONLY") {
    return { ok: false, error: "This collection definition is for walk-in donors only." };
  }

  // MANDATORY PURPOSE-CODE-BASED RESTRICTIONS (server-side enforcement)
  // These must be enforced regardless of donorEligibility configuration
  const mandatoryRestrictedCodes = ["ANNUAL_CHANDA", "DEATH_COLLECTION", "BARTAN_COLLECTION", "JUMMA_COLLECTION"];
  if (!input.memberId && input.walkInName && definition.purposeCode && mandatoryRestrictedCodes.includes(definition.purposeCode)) {
    return { ok: false, error: "Walk-in donors are not allowed for this collection type." };
  }

  // JUMMA_COLLECTION must use dedicated aggregate workflow (not individual payments)
  if (definition.purposeCode === "JUMMA_COLLECTION") {
    return { ok: false, error: "Jumma collections must use the dedicated Jumma aggregate workflow." };
  }

  const masjid = await prisma.masjid.findUnique({
    where: { id: user.masjidId! },
    select: { receiptPrefix: true, financialYearStartMonth: true, status: true },
  });
  if (!masjid) return { ok: false, error: "Masjid not found." };
  if (masjid.status === "SUSPENDED") return { ok: false, error: "This Masjid is suspended; payments are read-only." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findFirst({
        where: { masjidId: user.masjidId!, idempotencyKey: input.idempotencyKey },
        select: { id: true, receiptNo: true },
      });
      if (existing) {
        return { paymentId: existing.id, receiptNo: existing.receiptNo, duplicate: true };
      }

      const { receiptNo } = await nextReceiptNumber(
        tx,
        user.masjidId!,
        masjid.receiptPrefix,
        paymentDate,
        masjid.financialYearStartMonth,
      );

      const donorName = member?.fullName ?? input.walkInName ?? "Anonymous Donor";

      let allocationRows: Array<{
        duesPeriodId: string | null;
        collectionEventId: string | null;
        collectionDefinitionId: string;
        allocatedAmountPaise: number;
        purposeNote: string | null;
      }> = [];

      const isMemberPayment = !!input.memberId;

      // Use the collection definition's settlement policy to determine allocation behavior
      const settlementPolicy = definition.settlementPolicy;

      if (isMemberPayment && settlementPolicy === "OLDEST_FIRST") {
        // Dues-based FIFO allocation (OLDEST_FIRST policy)
        // Client submits selected duesPeriodIds and/or collectionEventIds
        // Server validates continuous prefix from oldest pending period

        // First, get ALL pending dues periods and assignments for this member+category, ordered by due date
        const allPendingDuesPeriods = await tx.duesPeriod.findMany({
          where: {
            memberId: input.memberId,
            masjidId: user.masjidId!,
            status: { in: ["PENDING", "PARTIAL"] },
            collectionDefinitionId: input.collectionDefinitionId,
          },
          select: { id: true, dueDate: true, expectedAmountPaise: true },
          orderBy: { dueDate: "asc" },
        });

        const allPendingAssignments = await tx.collectionEventAssignment.findMany({
          where: {
            memberId: input.memberId,
            masjidId: user.masjidId!,
            status: { in: ["PENDING", "PARTIAL"] },
            event: { collectionDefinitionId: input.collectionDefinitionId, status: { in: ["SCHEDULED", "OPEN"] } },
          },
          select: { id: true, eventId: true, expectedAmountPaise: true, event: { select: { dueDate: true } } },
          orderBy: { event: { dueDate: "asc" } },
        }) as Array<{ id: string; eventId: string; expectedAmountPaise: number; event: { dueDate: Date } }>;

        // Merge and sort by dueDate
        const allPendingDues: Array<{
          type: "duesPeriod" | "collectionEventAssignment";
          id: string;
          dueDate: Date;
          expectedAmountPaise: number;
        }> = [
          ...allPendingDuesPeriods.map(d => ({
            type: "duesPeriod" as const,
            id: d.id,
            dueDate: d.dueDate,
            expectedAmountPaise: d.expectedAmountPaise,
          })),
          ...allPendingAssignments.map(a => ({
            type: "collectionEventAssignment" as const,
            id: a.id,
            dueDate: a.event.dueDate,
            expectedAmountPaise: a.expectedAmountPaise,
          })),
        ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

        // Client-submitted selected IDs (from form allocations)
        const selectedDuesPeriodIds = [...new Set(input.allocations
          .filter((a: any) => a.duesPeriodId)
          .map((a: any) => a.duesPeriodId))].sort();
        const selectedAssignmentIds = [...new Set(input.allocations
          .filter((a: any) => a.collectionEventId)
          .map((a: any) => a.collectionEventId))].sort();

        // If no allocations provided, default to all pending (backward compatibility)
        const useAllPending = input.allocations.length === 0;

        // VALIDATE: Selected IDs must form a continuous prefix from the oldest
        if (!useAllPending && (selectedDuesPeriodIds.length > 0 || selectedAssignmentIds.length > 0)) {
          // Build the ordered list of all pending IDs
          const allPendingIds = allPendingDues.map(d => d.id);

          // Build the selected IDs list in the same order
          const selectedIds = allPendingIds.filter(id =>
            selectedDuesPeriodIds.includes(id) || selectedAssignmentIds.includes(id)
          );

          // Check continuous prefix: find first selected index, all before must also be selected
          const firstSelectedIndex = allPendingIds.findIndex(id => selectedIds.includes(id));
          if (firstSelectedIndex >= 0) {
            // Check if any earlier pending ID was NOT selected
            for (let i = 0; i < firstSelectedIndex; i++) {
              if (!selectedIds.includes(allPendingIds[i])) {
                throw new Error("OLDEST_FIRST: Cannot skip earlier pending periods. Select a continuous prefix from the oldest.");
              }
            }
          }

          // Validate all selected IDs are actually pending and belong to this member/category
          const selectedDuesPeriods = selectedDuesPeriodIds.length > 0 ? await tx.duesPeriod.findMany({
            where: { id: { in: selectedDuesPeriodIds }, memberId: input.memberId, masjidId: user.masjidId!, collectionDefinitionId: input.collectionDefinitionId, status: { in: ["PENDING", "PARTIAL"] } },
            select: { id: true, dueDate: true, expectedAmountPaise: true },
          }) : [];

          const selectedAssignments = selectedAssignmentIds.length > 0 ? await tx.collectionEventAssignment.findMany({
            where: { eventId: { in: selectedAssignmentIds }, memberId: input.memberId, masjidId: user.masjidId!, event: { collectionDefinitionId: input.collectionDefinitionId, status: { in: ["SCHEDULED", "OPEN"] } }, status: { in: ["PENDING", "PARTIAL"] } },
            select: { id: true, eventId: true, expectedAmountPaise: true, event: { select: { dueDate: true } } },
          }) : [];

          if (selectedDuesPeriods.length !== selectedDuesPeriodIds.length || selectedAssignments.length !== selectedAssignmentIds.length) {
            throw new Error("One or more selected periods are not available or do not belong to this member.");
          }

          // Lock selected records for update
          if (selectedDuesPeriodIds.length > 0) {
            await tx.$queryRaw`
              SELECT id FROM "DuesPeriod"
              WHERE id IN (${Prisma.join(selectedDuesPeriodIds)})
              FOR UPDATE
            `;
          }
          if (selectedAssignmentIds.length > 0) {
            const eventIds = [...new Set(selectedAssignments.map(a => a.eventId))].sort();
            if (eventIds.length > 0) {
              await tx.$queryRaw`
                SELECT id FROM "CollectionEvent"
                WHERE id IN (${Prisma.join(eventIds)})
                FOR UPDATE
              `;
            }
            await tx.$queryRaw`
              SELECT id FROM "CollectionEventAssignment"
              WHERE id IN (${Prisma.join(selectedAssignmentIds)})
              FOR UPDATE
            `;
          }

          // Calculate remaining amounts for selected periods
          let remainingPaymentAmount = input.amountPaise;
          const calculatedAllocations: typeof allocationRows = [];

          // Process selected dues periods in order
          for (const period of selectedDuesPeriods) {
            if (remainingPaymentAmount <= 0) break;
            const allocated = await tx.paymentAllocation.aggregate({
              where: { duesPeriodId: period.id, payment: { status: "SUCCESS" } },
              _sum: { allocatedAmountPaise: true },
            });
            const alreadyAllocated = allocated._sum.allocatedAmountPaise ?? 0;
            const remaining = period.expectedAmountPaise - alreadyAllocated;
            if (remaining > 0) {
              const allocateAmount = Math.min(remainingPaymentAmount, remaining);
              calculatedAllocations.push({
                duesPeriodId: period.id,
                collectionEventId: null,
                collectionDefinitionId: input.collectionDefinitionId,
                allocatedAmountPaise: allocateAmount,
                purposeNote: "Period Due",
              });
              remainingPaymentAmount -= allocateAmount;
            }
          }

          // Process selected assignments in order
          for (const assignment of selectedAssignments) {
            if (remainingPaymentAmount <= 0) break;
            const allocated = await tx.paymentAllocation.aggregate({
              where: { collectionEventId: assignment.eventId, payment: { status: "SUCCESS" }, duesPeriodId: null },
              _sum: { allocatedAmountPaise: true },
            });
            const alreadyAllocated = allocated._sum.allocatedAmountPaise ?? 0;
            const remaining = assignment.expectedAmountPaise - alreadyAllocated;
            if (remaining > 0) {
              const allocateAmount = Math.min(remainingPaymentAmount, remaining);
              calculatedAllocations.push({
                duesPeriodId: null,
                collectionEventId: assignment.eventId,
                collectionDefinitionId: input.collectionDefinitionId,
                allocatedAmountPaise: allocateAmount,
                purposeNote: "Event Due",
              });
              remainingPaymentAmount -= allocateAmount;
            }
          }

          // Handle Additional Voluntary Contribution for event-based FIXED amount categories
          // Only allowed for MILAD_UN_NABI and SHAB_E_QADR
          const allowedAdditionalCodes = ["MILAD_UN_NABI", "SHAB_E_QADR"];
          if (remainingPaymentAmount > 0 &&
              definition.amountType === "FIXED" &&
              (definition.frequency === "ANNUAL" || definition.frequency === "EVENT_BASED") &&
              definition.purposeCode &&
              allowedAdditionalCodes.includes(definition.purposeCode)) {
            // Find the last selected event allocation
            const lastEventAlloc = [...calculatedAllocations].reverse().find(a => a.collectionEventId);
            if (lastEventAlloc) {
              calculatedAllocations.push({
                duesPeriodId: null,
                collectionEventId: lastEventAlloc.collectionEventId,
                collectionDefinitionId: input.collectionDefinitionId,
                allocatedAmountPaise: remainingPaymentAmount,
                purposeNote: "Additional Voluntary Contribution",
              });
              remainingPaymentAmount = 0;
            }
          }

          if (remainingPaymentAmount > 0) {
            throw new Error(`Payment amount exceeds total outstanding in selected periods. Remaining unallocated: ${remainingPaymentAmount} paise.`);
          }

          allocationRows = calculatedAllocations;

        } else {
          // USE ALL PENDING (backward compatibility / default)
          // Lock all pending records
          const allDuesPeriodIds = allPendingDuesPeriods.map(d => d.id).sort();
          const allAssignmentIds = allPendingAssignments.map(a => a.id).sort();

          if (allDuesPeriodIds.length > 0) {
            await tx.$queryRaw`
              SELECT id FROM "DuesPeriod"
              WHERE id IN (${Prisma.join(allDuesPeriodIds)})
              FOR UPDATE
            `;
          }
          if (allAssignmentIds.length > 0) {
            const eventIds = [...new Set(allPendingAssignments.map(a => a.eventId))].sort();
            if (eventIds.length > 0) {
              await tx.$queryRaw`
                SELECT id FROM "CollectionEvent"
                WHERE id IN (${Prisma.join(eventIds)})
                FOR UPDATE
              `;
            }
            await tx.$queryRaw`
              SELECT id FROM "CollectionEventAssignment"
              WHERE id IN (${Prisma.join(allAssignmentIds)})
              FOR UPDATE
            `;
          }

          // Recalculate outstanding amounts with locks held
          let remainingPaymentAmount = input.amountPaise;
          const calculatedAllocations: typeof allocationRows = [];

          // Process all pending dues periods in FIFO order
          for (const due of allPendingDues) {
            if (remainingPaymentAmount <= 0) break;

            let remaining: number;
            if (due.type === "duesPeriod") {
              const period = await tx.duesPeriod.findUnique({ where: { id: due.id } });
              if (!period) continue;
              const allocated = await tx.paymentAllocation.aggregate({
                where: { duesPeriodId: period.id, payment: { status: "SUCCESS" } },
                _sum: { allocatedAmountPaise: true },
              });
              remaining = period.expectedAmountPaise - (allocated._sum.allocatedAmountPaise ?? 0);
            } else {
              const allocated = await tx.paymentAllocation.aggregate({
                where: { collectionEventId: due.id, payment: { status: "SUCCESS" }, duesPeriodId: null },
                _sum: { allocatedAmountPaise: true },
              });
              remaining = due.expectedAmountPaise - (allocated._sum.allocatedAmountPaise ?? 0);
            }

            if (remaining > 0) {
              const allocateAmount = Math.min(remainingPaymentAmount, remaining);
              if (due.type === "duesPeriod") {
                calculatedAllocations.push({
                  duesPeriodId: due.id,
                  collectionEventId: null,
                  collectionDefinitionId: input.collectionDefinitionId,
                  allocatedAmountPaise: allocateAmount,
                  purposeNote: "Period Due",
                });
              } else {
                const assignment = allPendingAssignments.find(a => a.id === due.id);
                calculatedAllocations.push({
                  duesPeriodId: null,
                  collectionEventId: assignment!.eventId,
                  collectionDefinitionId: input.collectionDefinitionId,
                  allocatedAmountPaise: allocateAmount,
                  purposeNote: "Event Due",
                });
              }
              remainingPaymentAmount -= allocateAmount;
            }
          }

          // Handle Additional Voluntary Contribution
          const allowedAdditionalCodes = ["MILAD_UN_NABI", "SHAB_E_QADR"];
          if (remainingPaymentAmount > 0 &&
              definition.amountType === "FIXED" &&
              (definition.frequency === "ANNUAL" || definition.frequency === "EVENT_BASED") &&
              definition.purposeCode &&
              allowedAdditionalCodes.includes(definition.purposeCode)) {
            const lastEventAlloc = [...calculatedAllocations].reverse().find(a => a.collectionEventId);
            if (lastEventAlloc) {
              calculatedAllocations.push({
                duesPeriodId: null,
                collectionEventId: lastEventAlloc.collectionEventId,
                collectionDefinitionId: input.collectionDefinitionId,
                allocatedAmountPaise: remainingPaymentAmount,
                purposeNote: "Additional Voluntary Contribution",
              });
              remainingPaymentAmount = 0;
            }
          }

          if (remainingPaymentAmount > 0) {
            throw new Error(`Payment amount exceeds total outstanding dues. Outstanding: ${input.amountPaise - remainingPaymentAmount} paise.`);
          }

          allocationRows = calculatedAllocations;
        }

      } else if (isMemberPayment && settlementPolicy === "ANY_PENDING_PERIOD") {
        // Member payment with ANY_PENDING_PERIOD policy - use provided allocations
        // The client submits specific duesPeriodIds and/or collectionEventIds
        // Server validates they belong to the member and are outstanding

        type NonFifoAllocation = {
          duesPeriodId?: string;
          collectionEventId?: string;
          collectionDefinitionId?: string;
          amountPaise: number;
          purposeNote?: string;
        };

        const allocationsToProcess: NonFifoAllocation[] = input.allocations.length > 0
          ? input.allocations
          : (input.collectionEventId ? [{ collectionEventId: input.collectionEventId, amountPaise: input.amountPaise }] : []);

        // Lock all selected dues periods and event assignments
        const duesPeriodIds = [...new Set(allocationsToProcess.map(a => a.duesPeriodId).filter(Boolean))].sort() as string[];
        const eventIds = [...new Set(allocationsToProcess.map(a => a.collectionEventId).filter(Boolean))].sort() as string[];

        if (duesPeriodIds.length > 0) {
          await tx.$queryRaw`
            SELECT id FROM "DuesPeriod"
            WHERE id IN (${Prisma.join(duesPeriodIds)})
            FOR UPDATE
          `;
        }
        if (eventIds.length > 0) {
          await tx.$queryRaw`
            SELECT id FROM "CollectionEvent"
            WHERE id IN (${Prisma.join(eventIds)})
            FOR UPDATE
          `;
          // Also lock the assignments
          const assignmentIdsToLock = (await tx.collectionEventAssignment.findMany({
            where: { eventId: { in: eventIds }, memberId: input.memberId },
            select: { id: true },
          })).map(a => a.id).sort();
          if (assignmentIdsToLock.length > 0) {
            await tx.$queryRaw`
              SELECT id FROM "CollectionEventAssignment"
              WHERE id IN (${Prisma.join(assignmentIdsToLock)})
              FOR UPDATE
            `;
          }
        }

        // If no allocations were provided, allow direct allocation to the collection definition
        let allocationsToUse = allocationsToProcess;
        if (allocationsToUse.length === 0) {
          allocationsToUse = [{ amountPaise: input.amountPaise }];
        }

        // Validate and process each allocation
        for (const alloc of allocationsToUse) {
          let targetEventId: string | null = (alloc.collectionEventId ?? input.collectionEventId) ?? null;

          if (targetEventId) {
            const event = await tx.collectionEvent.findFirst({
              where: { id: targetEventId, masjidId: user.masjidId!, collectionDefinitionId: input.collectionDefinitionId },
              select: { id: true, expectedAmountPaise: true },
            });
            if (!event) {
              throw new Error("Collection event not found for donation.");
            }
          }

          if (alloc.duesPeriodId) {
            const duesPeriod = await tx.duesPeriod.findFirst({
              where: { id: alloc.duesPeriodId, masjidId: user.masjidId!, collectionDefinitionId: input.collectionDefinitionId, memberId: input.memberId },
              select: { id: true, expectedAmountPaise: true },
            });
            if (!duesPeriod) {
              throw new Error("A selected due period is not available for this member in this Masjid.");
            }
          }

          allocationRows.push({
            duesPeriodId: alloc.duesPeriodId ?? null,
            collectionEventId: targetEventId,
            collectionDefinitionId: input.collectionDefinitionId,
            allocatedAmountPaise: alloc.amountPaise,
            purposeNote: targetEventId ? "Event Due" : "Period Due",
          });
        }

        // Check for excess (Additional Voluntary Contribution) for FIXED amount categories
        // Only allowed for MILAD_UN_NABI and SHAB_E_QADR
        const allowedAdditionalCodes = ["MILAD_UN_NABI", "SHAB_E_QADR"];
        const totalAllocated = allocationRows.reduce((sum, a) => sum + a.allocatedAmountPaise, 0);
        if (totalAllocated < input.amountPaise &&
            definition.amountType === "FIXED" &&
            (definition.frequency === "ANNUAL" || definition.frequency === "EVENT_BASED") &&
            definition.purposeCode &&
            allowedAdditionalCodes.includes(definition.purposeCode)) {
          // Find the last event/dues period allocated to
          const lastAlloc = allocationRows[allocationRows.length - 1];
          if (lastAlloc && lastAlloc.collectionEventId) {
            allocationRows.push({
              duesPeriodId: null,
              collectionEventId: lastAlloc.collectionEventId,
              collectionDefinitionId: input.collectionDefinitionId,
              allocatedAmountPaise: input.amountPaise - totalAllocated,
              purposeNote: "Additional Voluntary Contribution",
            });
          }
        }

        // Validate total
        const finalTotal = allocationRows.reduce((sum, a) => sum + a.allocatedAmountPaise, 0);
        if (finalTotal !== input.amountPaise) {
          throw new Error(`Allocation total (${finalTotal}) does not match payment amount (${input.amountPaise}).`);
        }

      } else {
        // Non-member (walk-in) payment - use provided allocations or single event
        type NonFifoAllocation = {
          duesPeriodId?: string;
          collectionEventId?: string;
          collectionDefinitionId?: string;
          amountPaise: number;
          purposeNote?: string;
        };

        let allocationsToProcess: NonFifoAllocation[] = input.allocations.length > 0
          ? input.allocations
          : (input.collectionEventId ? [{ collectionEventId: input.collectionEventId, amountPaise: input.amountPaise }] : []);

        // If no allocations provided and no collectionEventId, find the first open event for this category
        if (allocationsToProcess.length === 0) {
          const firstEvent = await tx.collectionEvent.findFirst({
            where: {
              masjidId: user.masjidId!,
              collectionDefinitionId: input.collectionDefinitionId,
              status: { in: ["SCHEDULED", "OPEN"] },
            },
            orderBy: { dueDate: "asc" },
            select: { id: true },
          });
          if (firstEvent) {
            allocationsToProcess = [{ collectionEventId: firstEvent.id, amountPaise: input.amountPaise }];
          }
        }

        for (const alloc of allocationsToProcess) {
          let targetEventId: string | null = (alloc.collectionEventId ?? input.collectionEventId) ?? null;

          if (targetEventId) {
            const event = await tx.collectionEvent.findFirst({
              where: { id: targetEventId, masjidId: user.masjidId!, collectionDefinitionId: input.collectionDefinitionId },
              select: { id: true, expectedAmountPaise: true },
            });
            if (!event) {
              throw new Error("Collection event not found for donation.");
            }
          }

          if (alloc.duesPeriodId) {
            const duesPeriod = await tx.duesPeriod.findFirst({
              where: { id: alloc.duesPeriodId, masjidId: user.masjidId!, collectionDefinitionId: input.collectionDefinitionId },
              select: { id: true, expectedAmountPaise: true },
            });
            if (!duesPeriod) {
              throw new Error("A selected due period is not available in this Masjid.");
            }
          }

          allocationRows.push({
            duesPeriodId: alloc.duesPeriodId ?? null,
            collectionEventId: targetEventId,
            collectionDefinitionId: input.collectionDefinitionId,
            allocatedAmountPaise: alloc.amountPaise,
            purposeNote: targetEventId ? "Event Due" : "Period Due",
          });
        }

        // If no allocations could be determined (e.g., ONE_TIME, GENERAL_DONATION without events),
        // allow direct allocation to the collection definition
        if (allocationRows.length === 0) {
          allocationRows.push({
            duesPeriodId: null,
            collectionEventId: null,
            collectionDefinitionId: input.collectionDefinitionId,
            allocatedAmountPaise: input.amountPaise,
            purposeNote: "Donation",
          });
        }

        // Check for excess (Additional Voluntary Contribution) for FIXED amount categories
        // Only allowed for MILAD_UN_NABI and SHAB_E_QADR
        const allowedAdditionalCodes = ["MILAD_UN_NABI", "SHAB_E_QADR"];
        const totalAllocated = allocationRows.reduce((sum, a) => sum + a.allocatedAmountPaise, 0);
        if (totalAllocated < input.amountPaise &&
            definition.amountType === "FIXED" &&
            (definition.frequency === "ANNUAL" || definition.frequency === "EVENT_BASED") &&
            definition.purposeCode &&
            allowedAdditionalCodes.includes(definition.purposeCode)) {
          const lastAlloc = allocationRows[allocationRows.length - 1];
          if (lastAlloc && lastAlloc.collectionEventId) {
            allocationRows.push({
              duesPeriodId: null,
              collectionEventId: lastAlloc.collectionEventId,
              collectionDefinitionId: input.collectionDefinitionId,
              allocatedAmountPaise: input.amountPaise - totalAllocated,
              purposeNote: "Additional Voluntary Contribution",
            });
          }
        }

        // Validate total
        const finalTotal = allocationRows.reduce((sum, a) => sum + a.allocatedAmountPaise, 0);
        if (finalTotal !== input.amountPaise) {
          throw new Error(`Allocation total (${finalTotal}) does not match payment amount (${input.amountPaise}).`);
        }
      }

      const payment = await tx.payment.create({
        data: {
          masjidId: user.masjidId!,
          receiptNo,
          donorMemberId: member?.id ?? null,
          donorNameSnapshot: donorName,
          paymentDate,
          amountPaise: input.amountPaise,
          mode: input.mode,
          referenceNo: input.referenceNo ?? null,
          verificationStatus: input.mode === "CASH" ? "MANUAL" : input.verificationStatus,
          status: "SUCCESS",
          enteredBy: user.id,
          notes: input.notes ?? null,
          idempotencyKey: input.idempotencyKey,
        },
      });

      for (const a of allocationRows) {
        await tx.paymentAllocation.create({
          data: {
            masjidId: user.masjidId!,
            paymentId: payment.id,
            duesPeriodId: a.duesPeriodId,
            collectionEventId: a.collectionEventId,
            collectionDefinitionId: a.collectionDefinitionId,
            allocatedAmountPaise: a.allocatedAmountPaise,
            purposeNote: a.purposeNote,
          },
        });
      }

      // REMOVED: JummaCollection upsert logic - Jumma now uses dedicated recordJummaCollectionAction

      for (const a of allocationRows) {
        if (a.duesPeriodId) await recomputePeriodStatus(tx, a.duesPeriodId);
        if (a.collectionEventId) {
          if (member?.id) {
            const assignment = await tx.collectionEventAssignment.findFirst({
              where: { eventId: a.collectionEventId, memberId: member.id },
              select: { id: true },
            });
            if (assignment) await recomputeAssignmentStatus(tx, assignment.id);
          }
          await recomputeEventStatus(tx, a.collectionEventId);
        }
      }

      await tx.receiptEvent.create({
        data: {
          masjidId: user.masjidId!,
          paymentId: payment.id,
          eventType: "ISSUED",
          actorUserId: user.id,
        },
      });

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "payment.create",
        entityType: "Payment",
        entityId: payment.id,
        after: { receiptNo, amountPaise: input.amountPaise, mode: input.mode, collectionDefinitionId: input.collectionDefinitionId },
      });

      return { paymentId: payment.id, receiptNo, member, allocations: allocationRows };
    });

    if ("error" in result) return { ok: false, error: String(result.error) };

    if (result.member) {
      for (const allocation of result.allocations) {
        await notifyPaymentReceived({
          masjidId: user.masjidId!,
          memberId: result.member!.id,
          amount: allocation.allocatedAmountPaise,
          receiptNo: result.receiptNo,
          category: definition.name,
          date: paymentDate,
        });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/members");
    // REMOVED: revalidatePath("/collections/jumma"); - Jumma now has its own workflow
    return { ok: true, paymentId: result.paymentId, receiptNo: result.receiptNo, duplicate: result.duplicate ?? false };
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message;
      const known = [
        "Member has no assignment for this collection event",
        "Collection event does not belong to this Masjid",
        "Collection event not found for donation.",
        "Collection definition not found or inactive in this Masjid.",
        "A selected due period is not available in this Masjid.",
        "A selected due period is not available for this member in this Masjid.",
        "Member not found in this Masjid.",
        "This Masjid is suspended; payments are read-only.",
        "Payment not found in this Masjid.",
        "This payment is already reversed.",
        "OLDEST_FIRST: Cannot skip earlier pending periods. Select a continuous prefix from the oldest.",
        "UNAUTHENTICATED",
        "FORBIDDEN",
      ];
      for (const prefix of known) {
        if (msg.startsWith(prefix) || msg === prefix) {
          return { ok: false, error: msg };
        }
      }
    }
    console.error(`createPaymentAction failed for masjid ${user.masjidId} (entered by ${user.id}):`, err);
    return { ok: false, error: "Could not save the payment. No changes were made." };
  }
}

export async function reversePaymentAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();
  assertCan(user.role, "payment:reverse");

  const parsed = reversalSchema.safeParse({
    paymentId: String(formData.get("paymentId") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reversal" };
  }

  const { paymentId, reason } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.$queryRaw<{
        id: string;
        masjidId: string;
        status: string;
        amountPaise: number;
        receiptNo: string;
        donorMemberId: string | null;
        donorNameSnapshot: string;
        mode: string;
      }[]>`
        SELECT id, "masjidId", status, "amountPaise", "receiptNo", "donorMemberId", "donorNameSnapshot", mode
        FROM "Payment"
        WHERE id = ${paymentId}
        FOR UPDATE
      `;

      if (payment.length === 0 || payment[0].masjidId !== user.masjidId!) {
        throw new Error("Payment not found in this Masjid.");
      }
      if (payment[0].status === "REVERSED") {
        throw new Error("This payment is already reversed.");
      }

      const allocations = await tx.paymentAllocation.findMany({
        where: { paymentId },
        select: { duesPeriodId: true, collectionEventId: true },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: "REVERSED" },
      });

      const reversalPayment = await tx.payment.create({
        data: {
          masjidId: user.masjidId!,
          receiptNo: `REV-${payment[0].receiptNo}`,
          donorMemberId: payment[0].donorMemberId,
          donorNameSnapshot: payment[0].donorNameSnapshot,
          paymentDate: new Date(),
          amountPaise: payment[0].amountPaise,
          mode: payment[0].mode,
          referenceNo: `REVERSAL-${payment[0].id}`,
          verificationStatus: "MANUAL",
          status: "REVERSED",
          enteredBy: user.id,
          notes: `Reversal of ${payment[0].receiptNo}: ${reason}`,
          idempotencyKey: `rev-${paymentId}-${Date.now()}`,
        },
      });

      await tx.reversal.create({
        data: {
          masjidId: user.masjidId!,
          originalPaymentId: paymentId,
          reversalPaymentId: reversalPayment.id,
          amountPaise: payment[0].amountPaise,
          reason,
          approvedBy: user.id,
        },
      });

      await tx.receiptEvent.create({
        data: {
          masjidId: user.masjidId!,
          paymentId,
          eventType: "CANCELLED",
          actorUserId: user.id,
          reason,
        },
      });

      for (const allocation of allocations) {
        if (allocation.duesPeriodId) await recomputePeriodStatus(tx, allocation.duesPeriodId);
        if (allocation.collectionEventId) {
          const assignments = await tx.collectionEventAssignment.findMany({
            where: { eventId: allocation.collectionEventId },
            select: { id: true },
          });
          for (const assignment of assignments) {
            await recomputeAssignmentStatus(tx, assignment.id);
          }
          await recomputeEventStatus(tx, allocation.collectionEventId);
        }
      }

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "payment.reverse",
        entityType: "Payment",
        entityId: paymentId,
        before: { status: "SUCCESS" },
        after: { status: "REVERSED" },
        metadata: { reason, receiptNo: payment[0].receiptNo },
      });

      return { paymentId, receiptNo: payment[0].receiptNo };
    });

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath(`/receipts/${result.paymentId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Payment not found in this Masjid." || err.message === "This payment is already reversed.") {
        return { ok: false, error: err.message };
      }
      if (err.message.includes("Unique constraint") && err.message.includes("originalPaymentId")) {
        return { ok: false, error: "This payment is already reversed." };
      }
    }
    console.error("reversePaymentAction failed", err);
    return { ok: false, error: "Could not reverse the payment." };
  }
}

export async function recordReprintAction(paymentId: string): Promise<void> {
  const user = await requireStaff();
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, masjidId: user.masjidId! },
    select: { id: true, receiptNo: true },
  });
  if (!payment) return;

  await prisma.$transaction(async (tx) => {
    await tx.receiptEvent.create({
      data: {
        masjidId: user.masjidId!,
        paymentId: payment.id,
        eventType: "REPRINTED",
        actorUserId: user.id,
      },
    });
    await writeAudit(tx, {
      masjidId: user.masjidId,
      actorUserId: user.id,
      action: "receipt.reprint",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { receiptNo: payment.receiptNo },
    });
  });
}
