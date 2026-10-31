"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { paymentSchema, reversalSchema } from "@/lib/validation";
import { parseISODate } from "@/lib/dates";
import { nextReceiptNumber } from "@/lib/receipts/numbering";
import { recomputePeriodStatus, recomputeAssignmentStatus, recomputeEventStatus } from "@/lib/dues";
import { writeAudit } from "@/modules/audit/write";

export type PaymentResult =
  | { ok: true; paymentId: string; receiptNo: string; duplicate?: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

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
 * Posts a contribution.
 *
 * Guarantees:
 *  - one payment, its allocations and its receipt number commit atomically;
 *  - a repeated idempotency key returns the original payment instead of
 *    creating a second one;
 *  - allocation totals may never exceed the payment amount;
 *  - the receipt number is allocated only after validation succeeds.
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

  const paymentDate = parseISODate(input.paymentDate);
  if (!paymentDate) return { ok: false, error: "Invalid payment date." };

  const allocationTotal = input.allocations.reduce((s, a) => s + a.amountPaise, 0);
  if (input.allocations.length > 0 && allocationTotal > input.amountPaise) {
    return { ok: false, error: "Allocated amounts exceed the payment total." };
  }
  if (input.allocations.length > 0 && allocationTotal !== input.amountPaise) {
    return { ok: false, error: "Total allocated amount must equal the payment amount. No unallocated remainder is permitted." };
  }

  // Reject cross-tenant references before opening the transaction.
  let member = null;
  if (input.memberId) {
    member = await prisma.member.findFirst({
      where: { id: input.memberId, masjidId: user.masjidId! },
      select: { id: true, fullName: true, memberNo: true },
    });
    if (!member) return { ok: false, error: "Member not found in this Masjid." };
  }

  for (const allocation of input.allocations) {
    const category = await prisma.contributionCategory.findFirst({
      where: { id: allocation.categoryId, masjidId: user.masjidId! },
      select: { id: true },
    });
    if (!category) return { ok: false, error: "A selected category is not available in this Masjid." };

    if (allocation.duesPeriodId) {
      const period = await prisma.duesPeriod.findFirst({
        where: { id: allocation.duesPeriodId, masjidId: user.masjidId! },
        select: { id: true },
      });
      if (!period) return { ok: false, error: "A selected due period is not available in this Masjid." };
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

      // ---- Concurrency-safe validation with row-level locking ----
      // Collect all lock targets and sort by stable identifier to avoid deadlocks.
      const duesPeriodIds = [...new Set(input.allocations.filter(a => a.duesPeriodId).map(a => a.duesPeriodId!))];
      const collectionEventIds = [...new Set(input.allocations.filter(a => a.collectionEventId).map(a => a.collectionEventId!))];
      const memberIdForLock = member?.id ?? null;

      // Sort for consistent lock ordering across concurrent transactions
      duesPeriodIds.sort();
      collectionEventIds.sort();

      // 1. Lock and validate DuesPeriod rows
      for (const duesPeriodId of duesPeriodIds) {
        // Acquire row lock and verify ownership in one query
        const period = await tx.$queryRaw<{ id: string; masjidId: string; expectedAmountPaise: number }[]>`
          SELECT id, "masjidId", "expectedAmountPaise"
          FROM "DuesPeriod"
          WHERE id = ${duesPeriodId}
          FOR UPDATE
        `;
        if (period.length === 0) {
          throw new Error("Dues period not found");
        }
        if (period[0].masjidId !== user.masjidId) {
          throw new Error("Dues period does not belong to this Masjid");
        }

        // Calculate already allocated amount (including from other payments)
        const allocatedSum = await tx.paymentAllocation.aggregate({
          where: {
            duesPeriodId,
            payment: { status: "SUCCESS" },
          },
          _sum: { allocatedAmountPaise: true },
        });

        const alreadyAllocated = allocatedSum._sum.allocatedAmountPaise ?? 0;
        const remaining = period[0].expectedAmountPaise - alreadyAllocated;

        // Find the allocation amount for this dues period (there may be multiple in one payment)
        const totalForThisPeriod = input.allocations
          .filter(a => a.duesPeriodId === duesPeriodId)
          .reduce((s, a) => s + a.amountPaise, 0);

        if (totalForThisPeriod > remaining) {
          throw new Error(`Allocation exceeds outstanding balance for due period. Outstanding: ${remaining} paise`);
        }
      }

      // 2. Lock and validate CollectionEvent / Assignment rows
      if (collectionEventIds.length > 0) {
        // Fetch all relevant events with lock
        const events = await tx.$queryRaw<{ id: string; masjidId: string; expectedAmountPaise: number | null }[]>`
          SELECT id, "masjidId", "expectedAmountPaise"
          FROM "CollectionEvent"
          WHERE id IN (${Prisma.join(collectionEventIds)})
          FOR UPDATE
        `;

        // Build event lookup map
        const eventMap = new Map(events.map(e => [e.id, e]));

        // For each event, validate tenant ownership
        for (const eventId of collectionEventIds) {
          const event = eventMap.get(eventId);
          if (!event) {
            throw new Error("Collection event not found");
          }
          if (event.masjidId !== user.masjidId) {
            throw new Error("Collection event does not belong to this Masjid");
          }
        }

        // If member is specified, lock their specific assignments
        if (memberIdForLock) {
          // Lock assignments for this member across all target events
          const assignments = await tx.$queryRaw<{ id: string; eventId: string; memberId: string; expectedAmountPaise: number }[]>`
            SELECT id, "eventId", "memberId", "expectedAmountPaise"
            FROM "CollectionEventAssignment"
            WHERE "eventId" IN (${Prisma.join(collectionEventIds)}) AND "memberId" = ${memberIdForLock}
            FOR UPDATE
          `;

          const assignmentMap = new Map(assignments.map(a => [`${a.eventId}-${a.memberId}`, a]));

          // Validate each event's member-specific allocation
          for (const eventId of collectionEventIds) {
            const key = `${eventId}-${memberIdForLock}`;
            const assignment = assignmentMap.get(key);

            // Calculate already allocated for this member+event
            const allocatedSum = await tx.paymentAllocation.aggregate({
              where: {
                collectionEventId: eventId,
                payment: { status: "SUCCESS", donorMemberId: memberIdForLock },
              },
              _sum: { allocatedAmountPaise: true },
            });

            const alreadyAllocated = allocatedSum._sum.allocatedAmountPaise ?? 0;

            if (assignment) {
              // Member has an assignment - use its expected amount
              const remaining = assignment.expectedAmountPaise - alreadyAllocated;
              const totalForThisEvent = input.allocations
                .filter(a => a.collectionEventId === eventId)
                .reduce((s, a) => s + a.amountPaise, 0);

              if (totalForThisEvent > remaining) {
                throw new Error(`Allocation exceeds outstanding balance for collection event assignment. Outstanding: ${remaining} paise`);
              }
            } else {
              // Member has no assignment for this event - cannot allocate to it
              const totalForThisEvent = input.allocations
                .filter(a => a.collectionEventId === eventId)
                .reduce((s, a) => s + a.amountPaise, 0);

              if (totalForThisEvent > 0) {
                throw new Error("Member has no assignment for this collection event");
              }
            }
          }
        } else {
          // Walk-in donor: validate against event total expected (if set)
          for (const eventId of collectionEventIds) {
            const event = eventMap.get(eventId);
            if (event && event.expectedAmountPaise !== null && event.expectedAmountPaise > 0) {
              const allocatedSum = await tx.paymentAllocation.aggregate({
                where: {
                  collectionEventId: eventId,
                  payment: { status: "SUCCESS" },
                },
                _sum: { allocatedAmountPaise: true },
              });
              const alreadyAllocated = allocatedSum._sum.allocatedAmountPaise ?? 0;
              const remaining = event.expectedAmountPaise - alreadyAllocated;
              const totalForThisEvent = input.allocations
                .filter(a => a.collectionEventId === eventId)
                .reduce((s, a) => s + a.amountPaise, 0);

              if (totalForThisEvent > remaining) {
                throw new Error(`Allocation exceeds outstanding balance for collection event. Outstanding: ${remaining} paise`);
              }
            }
          }
        }
      }

      // Validate individual allocation amounts are positive
      for (const a of input.allocations) {
        if (a.amountPaise <= 0) {
          throw new Error("ALLOCATION_AMOUNT_INVALID");
        }
      }

      // Allocations must exactly match the payment amount. No automatic remainder allocation.
      const rows = [...input.allocations];

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

      for (const a of rows) {
        await tx.paymentAllocation.create({
          data: {
            masjidId: user.masjidId!,
            paymentId: payment.id,
            duesPeriodId: a.duesPeriodId || null,
            collectionEventId: a.collectionEventId || null,
            categoryId: a.categoryId,
            allocatedAmountPaise: a.amountPaise,
            purposeNote: a.purposeNote ?? null,
          },
        });
      }

      for (const a of input.allocations) {
        if (a.duesPeriodId) await recomputePeriodStatus(tx, a.duesPeriodId);
        if (a.collectionEventId) {
          // Settle the household rows this payment actually covers: the
          // assignment for the paying member, if there is one.
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
        after: { receiptNo, amountPaise: input.amountPaise, mode: input.mode },
      });

      return { paymentId: payment.id, receiptNo };
    });

    if ("error" in result) return { ok: false, error: String(result.error) };

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/members");
    return { ok: true, ...result };
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
