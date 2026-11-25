import { prisma } from "@/lib/db";
import { financialYearLabel } from "@/lib/dates";
import { Prisma } from "@prisma/client";

/**
 * Allocates the next receipt number for a masjid and financial year.
 *
 * MUST be called inside a Prisma interactive transaction: the atomic upsert
 * on ReceiptSequence is only safe when serialized with the payment insert.
 * Uses Prisma's atomic upsert to avoid lost-update race conditions under
 * concurrent payment creation.
 */
export async function nextReceiptNumber(
  tx: Pick<typeof prisma, "receiptSequence">,
  masjidId: string,
  receiptPrefix: string,
  date: Date,
  financialYearStartMonth: number,
): Promise<{ receiptNo: string; sequence: number }> {
  const fy = financialYearLabel(date, financialYearStartMonth);

  // Atomic upsert: insert new row with lastNumber=1, or increment existing row.
  // Prisma's upsert is atomic at the database level (INSERT ... ON CONFLICT).
  const result = await tx.receiptSequence.upsert({
    where: { masjidId_financialYear: { masjidId, financialYear: fy } },
    create: { masjidId, financialYear: fy, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });

  const next = result.lastNumber;
  const receiptNo = `${receiptPrefix}-${fy}-${String(next).padStart(6, "0")}`;
  return { receiptNo, sequence: next };
}

/**
 * Allocates the next member number for a masjid. Member numbers are permanent
 * and never reused, even if a member is deactivated.
 * Uses atomic upsert on MemberSequence to avoid race conditions.
 */
export async function nextMemberNumber(
  tx: Pick<typeof prisma, "member" | "memberSequence" | "$queryRaw">,
  masjidId: string,
): Promise<string> {
  const id = crypto.randomUUID();

  // Atomic upsert: initialize from existing members if creating,
  // otherwise increment the existing sequence.
  // This handles concurrent first-time creation safely via PostgreSQL's
  // INSERT ... ON CONFLICT DO UPDATE.
  const result = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "MemberSequence" ("id", "masjidId", "lastNumber")
    VALUES (
      ${id},
      ${masjidId},
      (SELECT COALESCE(MAX(CAST(SUBSTRING("memberNo" FROM 5) AS INTEGER)), 0) + 1 FROM "Member" WHERE "masjidId" = ${masjidId} AND "memberNo" LIKE 'MAS-%')

    )
    ON CONFLICT ("masjidId") DO UPDATE
    SET "lastNumber" = "MemberSequence"."lastNumber" + 1
    RETURNING "lastNumber"
  `;

  const next = result[0]?.lastNumber;
  if (next === undefined || next === null) {
    throw new Error("Failed to allocate member number");
  }
  return `MAS-${String(next).padStart(6, "0")}`;
}

/** Allocates the next expense number for a masjid and financial year. */
export async function nextExpenseNumber(
  tx: Pick<typeof prisma, "expense" | "expenseSequence" | "$queryRaw">,
  masjidId: string,
  date: Date,
  financialYearStartMonth: number,
): Promise<string> {
  const fy = financialYearLabel(date, financialYearStartMonth);
  const id = crypto.randomUUID();

  // Atomic upsert using raw SQL: initialize from existing expense count if creating,
  // otherwise increment the existing sequence.
  // This handles concurrent first-time creation safely via PostgreSQL's
  // INSERT ... ON CONFLICT DO UPDATE.
  const result = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "ExpenseSequence" ("id", "masjidId", "financialYear", "lastNumber")
    VALUES (
      ${id},
      ${masjidId},
      ${fy},
      (SELECT COUNT(*) + 1 FROM "Expense" WHERE "masjidId" = ${masjidId} AND "expenseNo" LIKE ${`EXP-${fy}-%`})
    )
    ON CONFLICT ("masjidId", "financialYear") DO UPDATE
    SET "lastNumber" = "ExpenseSequence"."lastNumber" + 1
    RETURNING "lastNumber"
  `;

  const next = result[0]?.lastNumber;
  if (next === undefined || next === null) {
    throw new Error("Failed to allocate expense number");
  }
  return `EXP-${fy}-${String(next).padStart(6, "0")}`;
}
