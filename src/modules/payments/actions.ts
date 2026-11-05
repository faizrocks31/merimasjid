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
  // For backward compatibility, still parse allocations if present
  // but they will be IGNORED for member dues FIFO
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
    categoryId: String(formData.get("categoryId") ?? ""),
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
 *
 * Guarantees:
 *  - one payment, its allocations and its receipt number commit atomically;
 *  - a repeated idempotency key returns the original payment instead of
 *    creating a second one;
 *  - FIFO allocation is calculated server-side for member dues;
 *  - Walk-in category restrictions enforced server-side;
 *  - Single category per receipt enforced;
 *  - The receipt number is allocated only after validation succeeds.
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
  if (!input.categoryId) {
    return { ok: false, error: "Category is required." };
  }

  const paymentDate = parseISODate(input.paymentDate);
  if (!paymentDate) return { ok: false, error: "Invalid payment date." };
  if (input.amountPaise <= 0) return { ok: false, error: "Amount must be positive." };

  // Reject cross-tenant references before opening the transaction.
  let member = null;
  if (input.memberId) {
    member = await prisma.member.findFirst({
      where: { id: input.memberId, masjidId: user.masjidId! },
      select: { id: true, fullName: true, memberNo: true },
    });
    if (!member) return { ok: false, error: "Member not found in this Masjid." };
  }

  // Validate category exists and belongs to this masjid
  const category = await prisma.contributionCategory.findFirst({
    where: { id: input.categoryId, masjidId: user.masjidId! },
    select: { id: true, code: true, name: true, collectionMode: true, frequency: true, restrictedPurpose: true },
  });
  if (!category) return { ok: false, error: "Category not found in this Masjid." };

  // WALK-IN CATEGORY RESTRICTIONS (server-side enforcement)
  if (!input.memberId && input.walkInName) {
    // Walk-in donors can only use these 3 categories
    const ALLOWED_WALKIN_CODES = ["SHAB_E_QADR", "MILAD", "GENERAL", "GENERAL_DONATION"];

    // JUMMA is allowed ONLY when using the event-based workflow (with collectionEventId)
    // Check if this is a JUMMA walk-in with a valid event reference
    const hasCollectionEventId = input.collectionEventId || input.allocations.some((a: any) => a.collectionEventId);

    if (category.code === "JUMMA") {
      if (!hasCollectionEventId) {
        return { ok: false, error: "Jumma non-member payments must use the Jumma event workflow." };
      }
      // Allow JUMMA with collectionEventId - will be validated in walk-in handling
    } else if (!ALLOWED_WALKIN_CODES.includes(category.code)) {
      // Specific error messages for each blocked category
      const categoryMessages: Record<string, string> = {
        "MONTHLY": "Monthly Collection is for registered members only.",
        "DEATH": "Death Collection is for assigned members only.",
        "BARTAN": "Bartan Collection is for registered members only.",
        "ANNUAL": "This category is for registered members only.",
      };
      const msg = categoryMessages[category.code] || "Walk-in donors cannot use this category. Allowed: Shab-e-Qadr, Milad-un-Nabi, General Donation.";
      return { ok: false, error: msg };
    }
  }

  const masjid = await prisma.masjid.findUnique({
    where: { id: user.masjidId! },
    select: { receiptPrefix: true, financialYearStartMonth: true, status: true },
  });
  if (!masjid) return { ok: false, error: "Masjid not found." };
  if (masjid.status === "SUSPENDED") return { ok: false, error: "This Masjid is suspended; payments are read-only." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Idempotency: a repeated submission returns the original record.
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

      // =========================================================
      // SERVER-SIDE AUTOMATIC FIFO ALLOCATION CALCULATION
      // =========================================================
      // Client-submitted allocations are IGNORED for member dues.
      // The server calculates FIFO based on the selected category.
      // =========================================================

      let allocationRows: Array<{
        duesPeriodId: string | null;
        collectionEventId: string | null;
        categoryId: string;
        allocatedAmountPaise: number;
        purposeNote: string | null;
      }> = [];

      const isMemberPayment = !!input.memberId;
      const categoryCode = category.code;

      // Categories that use FIFO dues-based allocation
      const FIFO_CATEGORIES = ["MONTHLY", "MILAD", "SHAB_E_QADR", "DEATH", "ANNUAL"];

      // Categories that are non-dues, event-based or transaction-based
      // (General Donation, Jumma voluntary, Bartan transaction, etc.)
      const NON_DUES_CATEGORIES = ["GENERAL", "GENERAL_DONATION", "JUMMA", "BARTAN", "ZAKAT", "SADAQAH", "CONSTRUCTION"];

      if (isMemberPayment && FIFO_CATEGORIES.includes(categoryCode)) {
        // --------------------------------------------------------
        // CASE 1: MEMBER PAYMENT FOR FIFO CATEGORY
        // Calculate automatic FIFO allocation server-side
        // --------------------------------------------------------

        // STEP 1: Find IDs of all outstanding dues for this member+category
        // We first identify the candidate rows, then lock them, then compute actual remaining amounts
        // This prevents race conditions where concurrent transactions read stale remaining amounts

        // Get outstanding DuesPeriod IDs for this member+category
        const duesPeriods = await tx.duesPeriod.findMany({
          where: {
            memberId: input.memberId,
            masjidId: user.masjidId!,
            status: { in: ["PENDING", "PARTIAL"] },
            plan: { categoryId: input.categoryId },
          },
          select: { id: true, dueDate: true },
          orderBy: { dueDate: "asc" },
        });

        // Get outstanding CollectionEventAssignment IDs for this member+category
        const assignments = await tx.collectionEventAssignment.findMany({
          where: {
            memberId: input.memberId,
            masjidId: user.masjidId!,
            status: { in: ["PENDING", "PARTIAL"] },
            event: { categoryId: input.categoryId, status: { in: ["SCHEDULED", "OPEN"] } },
          },
          select: { id: true, eventId: true, expectedAmountPaise: true, event: { select: { dueDate: true } } },
          orderBy: { event: { dueDate: "asc" } },
        }) as Array<{ id: string; eventId: string; expectedAmountPaise: number; event: { dueDate: Date } }>;

        // STEP 2: Acquire FOR UPDATE locks on all candidate rows in consistent order
        // Lock dues periods first (sorted by ID)
        const duesPeriodIdsToLock = duesPeriods.map(d => d.id).sort();
        if (duesPeriodIdsToLock.length > 0) {
          await tx.$queryRaw`
            SELECT id FROM "DuesPeriod"
            WHERE id IN (${Prisma.join(duesPeriodIdsToLock)})
            FOR UPDATE
          `;
        }

        // Lock collection events and assignments (sorted by ID)
        const assignmentIdsToLock = assignments.map(a => a.id).sort();
        if (assignmentIdsToLock.length > 0) {
          const eventIds = [...new Set(assignments.map(a => a.eventId))].sort();
          if (eventIds.length > 0) {
            await tx.$queryRaw`
              SELECT id FROM "CollectionEvent"
              WHERE id IN (${Prisma.join(eventIds)})
              FOR UPDATE
            `;
          }
          await tx.$queryRaw`
            SELECT id FROM "CollectionEventAssignment"
            WHERE id IN (${Prisma.join(assignmentIdsToLock)})
            FOR UPDATE
          `;
        }

        // STEP 3: NOW compute actual remaining amounts (after locks acquired)
        let outstandingDues: Array<{
          type: "duesPeriod" | "collectionEventAssignment";
          id: string;
          dueDate: Date;
          expectedAmountPaise: number;
          allocatedAmountPaise: number;
          remainingAmountPaise: number;
        }> = [];

        // Re-query dues periods with fresh allocations (within lock)
        const lockedDuesPeriods = await tx.duesPeriod.findMany({
          where: { id: { in: duesPeriodIdsToLock } },
          include: {
            allocations: { include: { payment: { select: { status: true } } } },
          },
          orderBy: { dueDate: "asc" },
        });

        for (const period of lockedDuesPeriods) {
          const allocated = period.allocations
            .filter(a => a.payment.status === "SUCCESS")
            .reduce((sum, a) => sum + a.allocatedAmountPaise, 0);
          const remaining = period.expectedAmountPaise - allocated;
          if (remaining > 0) {
            outstandingDues.push({
              type: "duesPeriod",
              id: period.id,
              dueDate: period.dueDate,
              expectedAmountPaise: period.expectedAmountPaise,
              allocatedAmountPaise: allocated,
              remainingAmountPaise: remaining,
            });
          }
        }

        // Re-query assignments with fresh allocations (within lock)
        const lockedAssignments = await tx.collectionEventAssignment.findMany({
          where: { id: { in: assignmentIdsToLock } },
          include: { event: { select: { id: true, dueDate: true } } },
          orderBy: { event: { dueDate: "asc" } },
        });

        for (const assignment of lockedAssignments) {
          const allocated = await sumEventAllocationsForMember(tx, assignment.eventId ?? "", input.memberId ?? "");
          const remaining = assignment.expectedAmountPaise - allocated;
          if (remaining > 0) {
            outstandingDues.push({
              type: "collectionEventAssignment",
              id: assignment.id,
              dueDate: assignment.event.dueDate,
              expectedAmountPaise: assignment.expectedAmountPaise,
              allocatedAmountPaise: allocated,
              remainingAmountPaise: remaining,
            });
          }
        }

        // Sort by dueDate ASC for strict FIFO
        outstandingDues.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

        // Now calculate FIFO allocation
        let remainingPaymentAmount = input.amountPaise;
        const calculatedAllocations: typeof allocationRows = [];

        for (const due of outstandingDues) {
          if (remainingPaymentAmount <= 0) break;

          const allocateAmount = Math.min(remainingPaymentAmount, due.remainingAmountPaise);

          if (due.type === "duesPeriod") {
            calculatedAllocations.push({
              duesPeriodId: due.id,
              collectionEventId: null,
              categoryId: input.categoryId,
              allocatedAmountPaise: allocateAmount,
              purposeNote: "Event Due",
            });
          } else {
            const assignment = lockedAssignments.find(a => a.id === due.id);
            calculatedAllocations.push({
              duesPeriodId: null,
              collectionEventId: assignment!.eventId,
              categoryId: input.categoryId,
              allocatedAmountPaise: allocateAmount,
              purposeNote: "Event Due",
            });
          }

          remainingPaymentAmount -= allocateAmount;
        }

        // Handle excess payment for Milad/Shab-e-Qadr (voluntary contribution)
        // Phase 1: Record excess as "Additional Voluntary Contribution" allocation to same event
        if (remainingPaymentAmount > 0 && (categoryCode === "MILAD" || categoryCode === "SHAB_E_QADR")) {
          // Add excess as Additional Voluntary Contribution to the LAST event (newest)
          // The last outstanding due was the newest event
          const lastDue = outstandingDues[outstandingDues.length - 1];
          if (lastDue && lastDue.type === "collectionEventAssignment") {
            // Find the assignment to get the eventId
            const assignment = lockedAssignments.find(a => a.id === lastDue.id);
            if (assignment) {
              calculatedAllocations.push({
                duesPeriodId: null,
                collectionEventId: assignment.eventId,
                categoryId: input.categoryId,
                allocatedAmountPaise: remainingPaymentAmount,
                purposeNote: "Additional Voluntary Contribution",
              });
              remainingPaymentAmount = 0;
            }
          }
        }

        if (remainingPaymentAmount > 0) {
          // For other FIFO categories, reject excess
          throw new Error(`Payment amount exceeds total outstanding dues. Outstanding: ${input.amountPaise - remainingPaymentAmount} paise.`);
        }

        allocationRows = calculatedAllocations;

      } else if (isMemberPayment && categoryCode === "BARTAN") {
        // --------------------------------------------------------
        // CASE 2: BARTAN TRANSACTION (member only, no dues)
        // Single allocation to the category (no dues/event)
        // --------------------------------------------------------
        allocationRows.push({
          duesPeriodId: null,
          collectionEventId: null,
          categoryId: input.categoryId,
          allocatedAmountPaise: input.amountPaise,
          purposeNote: "Bartan Collection",
        });

      } else if (!isMemberPayment) {
        // --------------------------------------------------------
        // CASE 3: WALK-IN DONOR
        // Only allowed categories: SHAB_E_QADR, MILAD, GENERAL/GENERAL_DONATION
        // For Milad/Shab-e-Qadr walk-in: need a collection event
        // For General Donation: direct category allocation
        // --------------------------------------------------------

        // For walk-in Milad/Shab-e-Qadr, they must select an event
        // The UI should enforce this by only showing events for those categories
        // Server-side: check both top-level collectionEventId and legacy input.allocations

        let targetEventId: string | null = null;

        // Check if client provided a collectionEventId (top-level field or legacy in allocations)
        const clientEventId = input.collectionEventId || input.allocations.find(a => a.collectionEventId)?.collectionEventId;

        if ((categoryCode === "MILAD" || categoryCode === "SHAB_E_QADR" || categoryCode === "JUMMA") && clientEventId) {
          // Validate the event exists and belongs to this masjid and category
          const event = await tx.collectionEvent.findFirst({
            where: { id: clientEventId, masjidId: user.masjidId!, categoryId: input.categoryId },
            select: { id: true, expectedAmountPaise: true },
          });
          if (!event) {
            throw new Error("Collection event not found for walk-in donation.");
          }

          // Check event outstanding if expectedAmount is set
          if (event.expectedAmountPaise !== null && event.expectedAmountPaise > 0) {
            const allocatedSum = await tx.paymentAllocation.aggregate({
              where: {
                collectionEventId: clientEventId,
                payment: { status: "SUCCESS" },
              },
              _sum: { allocatedAmountPaise: true },
            });
            const alreadyAllocated = allocatedSum._sum.allocatedAmountPaise ?? 0;
            const remaining = event.expectedAmountPaise - alreadyAllocated;

            if (input.amountPaise > remaining) {
              throw new Error(`Payment exceeds event outstanding balance. Outstanding: ${remaining} paise.`);
            }
          }

          // Lock the event
          await tx.$queryRaw`
            SELECT id FROM "CollectionEvent"
            WHERE id = ${clientEventId}
            FOR UPDATE
          `;

          targetEventId = clientEventId;
        }

        allocationRows.push({
          duesPeriodId: null,
          collectionEventId: targetEventId,
          categoryId: input.categoryId,
          allocatedAmountPaise: input.amountPaise,
          purposeNote: targetEventId ? "Event Due" : "General Donation",
        });

      } else {
        // --------------------------------------------------------
        // CASE 4: OTHER NON-DUES MEMBER PAYMENTS (General Donation, Jumma, etc.)
        // Direct allocation to category
        // --------------------------------------------------------
        allocationRows.push({
          duesPeriodId: null,
          collectionEventId: null,
          categoryId: input.categoryId,
          allocatedAmountPaise: input.amountPaise,
          purposeNote: "General Donation",
        });
      }

      // =========================================================
      // ONE CATEGORY PER RECEIPT ENFORCEMENT
      // =========================================================
      // All allocation rows must have the same categoryId
      const uniqueCategories = [...new Set(allocationRows.map(a => a.categoryId))];
      if (uniqueCategories.length > 1) {
        throw new Error("One category per receipt: mixed categories not allowed.");
      }
      // Also verify the category matches the selected category
      if (uniqueCategories[0] !== input.categoryId) {
        throw new Error("Category mismatch.");
      }

      // =========================================================
      // CREATE PAYMENT AND ALLOCATIONS
      // =========================================================
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
            categoryId: a.categoryId,
            allocatedAmountPaise: a.allocatedAmountPaise,
            purposeNote: a.purposeNote,
          },
        });
      }

      // Recompute statuses for affected periods/assignments/events
      for (const a of allocationRows) {
        if (a.duesPeriodId) await recomputePeriodStatus(tx, a.duesPeriodId);
        if (a.collectionEventId) {
          // Recompute assignment status for the paying member
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
        after: { receiptNo, amountPaise: input.amountPaise, mode: input.mode, categoryId: input.categoryId },
      });

      return { paymentId: payment.id, receiptNo, member, allocations: allocationRows };
    });

    if ("error" in result) return { ok: false, error: String(result.error) };

    // Send notification if payment is for a registered member
    if (result.member) {
      const categoryNames = result.allocations.map(a => a.categoryId);
      const categories = await prisma.contributionCategory.findMany({
        where: { id: { in: categoryNames } },
        select: { id: true, name: true },
      });
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      for (const allocation of result.allocations) {
        const categoryName = categoryMap.get(allocation.categoryId) ?? "Contribution";
        await notifyPaymentReceived({
          masjidId: user.masjidId!,
          memberId: result.member!.id,
          amount: allocation.allocatedAmountPaise,
          receiptNo: result.receiptNo,
          category: categoryName,
          date: paymentDate,
        });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/members");
    return { ok: true, paymentId: result.paymentId, receiptNo: result.receiptNo, duplicate: result.duplicate ?? false };
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message;
      const known = [
        "Member has no assignment for this collection event",
        "Collection event does not belong to this Masjid",
        "A selected category is not available in this Masjid.",
        "A selected due period is not available in this Masjid.",
        "Member not found in this Masjid.",
        "This Masjid is suspended; payments are read-only.",
        "Payment not found in this Masjid.",
        "This payment is already reversed.",
        "UNAUTHENTICATED",
        "FORBIDDEN",
      ];
      for (const prefix of known) {
        if (msg.startsWith(prefix) || msg === prefix) {
          return { ok: false, error: msg };
        }
      }
    }
    if (err instanceof Error && err.message === "CATEGORY_REQUIRED") {
      return { ok: false, error: "Select a category for this contribution." };
    }
    // Keep the operator's only copy of the cause: the UI shows a generic
    // message, so this line is what makes a failure fixable.
    console.error(
      `createPaymentAction failed for masjid ${user.masjidId} (entered by ${user.id}):`,
      err,
    );
    return { ok: false, error: "Could not save the payment. No changes were made." };
  }
}

/**
 * Reverses a payment. The original row is never edited or deleted: it is
 * marked REVERSED, a Reversal record is written with a mandatory reason, the
 * period statuses are recalculated, and the audit log records the actor.
 *
 * Concurrency safety: the payment row is locked with FOR UPDATE inside the
 * transaction, and status is re-checked after acquiring the lock. This prevents
 * duplicate reversals under concurrent requests. The database unique constraint
 * on Reversal.originalPaymentId provides a final safety net.
 */
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
      // Lock the payment row and verify ownership + status inside the transaction
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

      if (payment.length === 0) {
        throw new Error("Payment not found in this Masjid.");
      }
      if (payment[0].masjidId !== user.masjidId!) {
        throw new Error("Payment not found in this Masjid.");
      }
      if (payment[0].status === "REVERSED") {
        throw new Error("This payment is already reversed.");
      }

      // Fetch allocations within the same transaction
      const allocations = await tx.paymentAllocation.findMany({
        where: { paymentId },
        select: { duesPeriodId: true, collectionEventId: true },
      });

      // Update payment status to REVERSED
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: "REVERSED" },
      });

      // Create reversal record (unique constraint on originalPaymentId prevents duplicates)
      // First create the reversal payment (the offsetting entry)
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

      // Create cancelled receipt event
      await tx.receiptEvent.create({
        data: {
          masjidId: user.masjidId!,
          paymentId,
          eventType: "CANCELLED",
          actorUserId: user.id,
          reason,
        },
      });

      // Recompute balances for all affected dues periods and collection events
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
      // Known safe errors: re-throw to be handled uniformly below
      if (err.message === "Payment not found in this Masjid." ||
          err.message === "This payment is already reversed.") {
        return { ok: false, error: err.message };
      }
      // Unique constraint violation on Reversal.originalPaymentId (concurrent race)
      if (err.message.includes("Unique constraint") && err.message.includes("originalPaymentId")) {
        return { ok: false, error: "This payment is already reversed." };
      }
    }
    console.error("reversePaymentAction failed", err);
    return { ok: false, error: "Could not reverse the payment." };
  }
}

/** Logs a reprint so duplicate copies remain auditable. */
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
