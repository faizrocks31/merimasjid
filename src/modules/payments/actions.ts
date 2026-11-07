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
  console.log("[DEBUG createPaymentAction] user.masjidId:", user.masjidId, "input.collectionDefinitionId:", input.collectionDefinitionId);
  const definition = await prisma.collectionDefinition.findFirst({
    where: { id: input.collectionDefinitionId, masjidId: user.masjidId!, active: true },
    include: { baseCategory: { select: { code: true } } },
  });
  console.log("[DEBUG createPaymentAction] definition found:", definition ? "YES" : "NO", definition?.id, definition?.masjidId);
  if (!definition) return { ok: false, error: "Collection definition not found or inactive in this Masjid." };

  // WALK-IN CATEGORY RESTRICTIONS (server-side enforcement)
  // Uses stable purposeCode for reliable identification
  const purposeCode = definition.purposeCode;
  if (!input.memberId && input.walkInName) {
    // Walk-in allowed only for specific purpose codes
    const ALLOWED_WALKIN_PURPOSE_CODES = [
      "GENERAL_DONATION",
      "SADAQAH",
      "CONSTRUCTION_FUND",
      "JUMMA_COLLECTION",
      "MILAD_UN_NABI",
      "SHAB_E_QADR",
      "FITRAH",
      "MADRASA_FUND",
      "CUSTOM_DONATION",
    ];
    if (!purposeCode || !ALLOWED_WALKIN_PURPOSE_CODES.includes(purposeCode)) {
      return { ok: false, error: "Walk-in donors cannot use this collection definition. Allowed: General Donation, Sadaqah, Construction Fund, Jumma Collection, Milad-un-Nabi, Shab-e-Qadr, Fitrah, Madrasa Fund, Custom Donation." };
    }
    // Additional donorEligibility check
    if (definition.donorEligibility === "MEMBERS_ONLY") {
      return { ok: false, error: "Walk-in donors are not allowed for this collection definition (Members Only)." };
    }
  }

  // For member payments: check donorEligibility
  if (input.memberId && definition.donorEligibility === "WALKIN_ONLY") {
    return { ok: false, error: "This collection definition is for walk-in donors only." };
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
        // Dues-based FIFO allocation
        const duesPeriods = await tx.duesPeriod.findMany({
          where: {
            memberId: input.memberId,
            masjidId: user.masjidId!,
            status: { in: ["PENDING", "PARTIAL"] },
            collectionDefinitionId: input.collectionDefinitionId,
          },
          select: { id: true, dueDate: true },
          orderBy: { dueDate: "asc" },
        });

        const assignments = await tx.collectionEventAssignment.findMany({
          where: {
            memberId: input.memberId,
            masjidId: user.masjidId!,
            status: { in: ["PENDING", "PARTIAL"] },
            event: { collectionDefinitionId: input.collectionDefinitionId, status: { in: ["SCHEDULED", "OPEN"] } },
          },
          select: { id: true, eventId: true, expectedAmountPaise: true, event: { select: { dueDate: true } } },
          orderBy: { event: { dueDate: "asc" } },
        }) as Array<{ id: string; eventId: string; expectedAmountPaise: number; event: { dueDate: Date } }>;

        const duesPeriodIdsToLock = duesPeriods.map(d => d.id).sort();
        if (duesPeriodIdsToLock.length > 0) {
          await tx.$queryRaw`
            SELECT id FROM "DuesPeriod"
            WHERE id IN (${Prisma.join(duesPeriodIdsToLock)})
            FOR UPDATE
          `;
        }

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

        let outstandingDues: Array<{
          type: "duesPeriod" | "collectionEventAssignment";
          id: string;
          dueDate: Date;
          expectedAmountPaise: number;
          allocatedAmountPaise: number;
          remainingAmountPaise: number;
        }> = [];

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

        const lockedAssignments = await tx.collectionEventAssignment.findMany({
          where: { id: { in: assignmentIdsToLock } },
          include: { event: { select: { id: true, dueDate: true } } },
          orderBy: { event: { dueDate: "asc" } },
        });

        for (const assignment of lockedAssignments) {
          const allocated = await sumEventAllocationsForMember(tx, assignment.eventId ?? "", input.memberId ?? "");
          const remaining = assignment.expectedAmountPaise - allocated;
          console.log("[DEBUG FIFO event] assignmentId:", assignment.id, "eventId:", assignment.eventId, "expected:", assignment.expectedAmountPaise, "allocated:", allocated, "remaining:", remaining);
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

        outstandingDues.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

        let remainingPaymentAmount = input.amountPaise;
        const calculatedAllocations: typeof allocationRows = [];

        for (const due of outstandingDues) {
          if (remainingPaymentAmount <= 0) break;

          const allocateAmount = Math.min(remainingPaymentAmount, due.remainingAmountPaise);

          if (due.type === "duesPeriod") {
            calculatedAllocations.push({
              duesPeriodId: due.id,
              collectionEventId: null,
              collectionDefinitionId: input.collectionDefinitionId,
              allocatedAmountPaise: allocateAmount,
              purposeNote: "Period Due",
            });
          } else {
            const assignment = lockedAssignments.find(a => a.id === due.id);
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

        if (remainingPaymentAmount > 0 && definition.baseCategory?.code === "ANNUAL") {
          const lastDue = outstandingDues[outstandingDues.length - 1];
          if (lastDue && lastDue.type === "collectionEventAssignment") {
            const assignment = lockedAssignments.find(a => a.id === lastDue.id);
            if (assignment) {
              calculatedAllocations.push({
                duesPeriodId: null,
                collectionEventId: assignment.eventId,
                collectionDefinitionId: input.collectionDefinitionId,
                allocatedAmountPaise: remainingPaymentAmount,
                purposeNote: "Additional Voluntary Contribution",
              });
              remainingPaymentAmount = 0;
            }
          }
        }

        if (remainingPaymentAmount > 0) {
          throw new Error(`Payment amount exceeds total outstanding dues. Outstanding: ${input.amountPaise - remainingPaymentAmount} paise.`);
        }

        allocationRows = calculatedAllocations;

      } else {
        // Non-FIFO or walk-in payment - use provided allocations
        // Support both: allocations array OR top-level collectionEventId for event-based walk-in payments
        type NonFifoAllocation = {
          duesPeriodId?: string;
          collectionEventId?: string;
          collectionDefinitionId?: string; // optional for the synthetic array, we add it later
          amountPaise: number;
          purposeNote?: string;
        };

        const allocationsToProcess: NonFifoAllocation[] = input.allocations.length > 0
          ? input.allocations
          : (input.collectionEventId ? [{ collectionEventId: input.collectionEventId, amountPaise: input.amountPaise }] : []);

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
