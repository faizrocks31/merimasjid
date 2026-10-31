"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { assertCan, can } from "@/lib/permissions";
import { expenseSchema } from "@/lib/validation";
import { parseISODate } from "@/lib/dates";
import { nextExpenseNumber } from "@/lib/receipts/numbering";
import { writeAudit } from "@/modules/audit/write";

export type ExpenseState = { error?: string; ok?: boolean } | undefined;

export async function createExpenseAction(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
  let user;
  try {
    user = await requireStaff();
    assertCan(user.role, "expense:create");
  } catch (err) {
    if (err instanceof Error && (err.message === "UNAUTHENTICATED" || err.message === "FORBIDDEN")) {
      return { error: err.message };
    }
    throw err;
  }

  const parsed = expenseSchema.safeParse({
    categoryId: String(formData.get("categoryId") ?? ""),
    date: String(formData.get("date") ?? ""),
    payee: String(formData.get("payee") ?? ""),
    amountPaise: Number(formData.get("amountPaise") ?? 0),
    mode: String(formData.get("mode") ?? "CASH"),
    referenceNo: String(formData.get("referenceNo") ?? ""),
    description: String(formData.get("description") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid expense" };

  const input = parsed.data;
  const date = parseISODate(input.date);
  if (!date) return { error: "Invalid date." };

  const category = await prisma.expenseCategory.findFirst({
    where: { id: input.categoryId, masjidId: user.masjidId! },
  });
  if (!category) return { error: "Expense category not found in this Masjid." };

  const masjid = await prisma.masjid.findUnique({
    where: { id: user.masjidId! },
    select: { financialYearStartMonth: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
      // Idempotency: a repeated submission returns the original record.
      const existing = await tx.expense.findFirst({
        where: { masjidId: user.masjidId!, idempotencyKey: input.idempotencyKey },
        select: { id: true, expenseNo: true },
      });
      if (existing) {
        return { ok: true };
      }

      const expenseNo = await nextExpenseNumber(tx, user.masjidId!, date, masjid?.financialYearStartMonth ?? 4);
      const created = await tx.expense.create({
        data: {
          masjidId: user.masjidId!,
          expenseNo,
          categoryId: category.id,
          date,
          payee: input.payee,
          amountPaise: input.amountPaise,
          mode: input.mode,
          referenceNo: input.referenceNo ?? null,
          description: input.description ?? null,
          enteredBy: user.id,
          approvalStatus: "PENDING",
          idempotencyKey: input.idempotencyKey,
        },
      });

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "expense.create",
        entityType: "Expense",
        entityId: created.id,
        after: { expenseNo, amountPaise: input.amountPaise, payee: input.payee },
      });
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("createExpenseAction failed", err);
    return { error: "Could not save the expense." };
  }
}


export async function approveExpenseAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  assertCan(user.role, "expense:approve");

  const expenseId = String(formData.get("expenseId") ?? "");
  const decision = String(formData.get("decision") ?? "APPROVED");
  if (!["APPROVED", "REJECTED"].includes(decision)) return;

  const expense = await prisma.expense.findFirst({ where: { id: expenseId, masjidId: user.masjidId! } });
  if (!expense) return;

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({ where: { id: expense.id }, data: { approvalStatus: decision } });
    await writeAudit(tx, {
      masjidId: user.masjidId,
      actorUserId: user.id,
      action: "expense.decide",
      entityType: "Expense",
      entityId: expense.id,
      before: { approvalStatus: expense.approvalStatus },
      after: { approvalStatus: decision },
    });
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
