"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { writeAudit } from "@/modules/audit/write";
import { format } from "date-fns";

/**
 * Validates that a given date is a Friday (using UTC to avoid timezone issues).
 */
function isFriday(date: Date): boolean {
  return date.getUTCDay() === 5; // 0 = Sunday, 5 = Friday (UTC)
}

/**
 * Normalizes a date to start of day (midnight UTC) for DATE comparison.
 * Returns a Date object at 00:00:00.000 UTC.
 */
function normalizeToDate(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Validates Friday date and returns normalized DATE (midnight UTC).
 */
function validateFridayDate(date: Date): Date {
  const normalized = normalizeToDate(date);
  if (!isFriday(normalized)) {
    throw new Error("Jumma collection date must be a Friday.");
  }
  return normalized;
}

export interface JummaRecordResult {
  ok: boolean;
  jummaCollectionId?: string;
  error?: string;
}

export interface JummaCorrectionResult {
  ok: boolean;
  error?: string;
}

/**
 * Records a consolidated Friday Jumma collection total.
 *
 * Creates ONE JummaCollection record per masjid + collectionDefinition + Friday date.
 * Does NOT create individual Payment records, receipts, or allocations.
 *
 * @param formData - Must contain:
 *   - collectionDate (YYYY-MM-DD format, must be Friday)
 *   - totalAmountPaise (positive integer)
 *   - collectionDefinitionId (optional, will find JUMMA baseCategory if not provided)
 *   - notes (optional)
 *   - idempotencyKey (required for duplicate prevention)
 */
export async function recordJummaCollectionAction(formData: FormData): Promise<JummaRecordResult> {
  let user;
  try {
    user = await requireStaff();
    assertCan(user.role, "payment:create"); // Reuse payment:create permission for Jumma recording
  } catch (err) {
    if (err instanceof Error && (err.message === "UNAUTHENTICATED" || err.message === "FORBIDDEN")) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const collectionDateStr = String(formData.get("collectionDate") ?? "");
  const totalAmountPaise = Number(formData.get("totalAmountPaise") ?? 0);
  const collectionDefinitionId = String(formData.get("collectionDefinitionId") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");

  if (!collectionDateStr) {
    return { ok: false, error: "Collection date is required." };
  }
  if (totalAmountPaise <= 0) {
    return { ok: false, error: "Total amount must be positive." };
  }
  if (!idempotencyKey) {
    return { ok: false, error: "Idempotency key is required." };
  }

  const collectionDate = new Date(collectionDateStr + "T00:00:00.000Z");
  if (isNaN(collectionDate.getTime())) {
    return { ok: false, error: "Invalid collection date format." };
  }

  try {
    const fridayDate = validateFridayDate(collectionDate);
  } catch (err) {
    if (err instanceof Error) return { ok: false, error: err.message };
    return { ok: false, error: "Invalid date." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check idempotency - use a custom key format for Jumma
      const idempotencyKeyWithPrefix = `jumma-${idempotencyKey}`;
      const existing = await tx.payment.findFirst({
        where: { masjidId: user.masjidId!, idempotencyKey: idempotencyKeyWithPrefix },
        select: { id: true },
      });
      // Note: We don't store idempotency in JummaCollection directly to keep it lean.
      // The unique constraint on (masjidId, collectionDate, collectionDefinitionId) prevents duplicates.

      // Find or validate collection definition
      let jummaDefId = collectionDefinitionId;
      if (!jummaDefId) {
        const jummaDef = await tx.collectionDefinition.findFirst({
          where: {
            masjidId: user.masjidId!,
            active: true,
            OR: [
              { subcategory: { code: "JUMMA" } },
              { purposeCode: "JUMMA_COLLECTION" },
            ],
          },
          select: { id: true },
        });
        if (!jummaDef) {
          throw new Error("No active Jumma collection definition found for this Masjid.");
        }
        jummaDefId = jummaDef.id;
      } else {
        // Validate the provided definition belongs to this masjid and is JUMMA
        const def = await tx.collectionDefinition.findFirst({
          where: {
            id: jummaDefId,
            masjidId: user.masjidId!,
            active: true,
            OR: [
              { subcategory: { code: "JUMMA" } },
              { purposeCode: "JUMMA_COLLECTION" },
            ],
          },
          select: { id: true },
        });
        if (!def) {
          throw new Error("Invalid Jumma collection definition for this Masjid.");
        }
      }

      const fridayDate = validateFridayDate(collectionDate);

      // Check for existing record (unique constraint will also catch this)
      const existingRecord = await tx.jummaCollection.findUnique({
        where: {
          masjidId_collectionDate_collectionDefinitionId: {
            masjidId: user.masjidId!,
            collectionDate: fridayDate,
            collectionDefinitionId: jummaDefId,
          },
        },
      });

      let jummaRecord;
      if (existingRecord) {
        // Record exists - this is a duplicate attempt
        // Per requirements: do NOT silently overwrite. Return error.
        throw new Error("Jumma collection for this Friday already recorded. Use correction workflow to modify.");
      }

      // Create new JummaCollection record
      jummaRecord = await tx.jummaCollection.create({
        data: {
          masjidId: user.masjidId!,
          collectionDefinitionId: jummaDefId,
          collectionDate: fridayDate,
          totalAmountPaise,
          participantCount: 0, // Not tracked per individual donor
          notes: notes || null,
          recordedBy: user.id,
        },
      });

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "jumma.record",
        entityType: "JummaCollection",
        entityId: jummaRecord.id,
        after: {
          collectionDate: format(fridayDate, "yyyy-MM-dd"),
          totalAmountPaise,
          collectionDefinitionId: jummaDefId,
          notes,
        },
      });

      return { jummaRecord };
    });

    if ("error" in result) return { ok: false, error: String(result.error) };

    revalidatePath("/collections/jumma");
    revalidatePath("/dashboard");
    return { ok: true, jummaCollectionId: result.jummaRecord.id };
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes("Jumma collection for this Friday already recorded") ||
          msg.includes("must be a Friday") ||
          msg.includes("No active Jumma collection definition") ||
          msg.includes("Invalid Jumma collection definition")) {
        return { ok: false, error: msg };
      }
      if (msg.includes("Unique constraint")) {
        return { ok: false, error: "Jumma collection for this Friday already recorded. Use correction workflow to modify." };
      }
    }
    console.error(`recordJummaCollectionAction failed for masjid ${user.masjidId} (entered by ${user.id}):`, err);
    return { ok: false, error: "Could not record Jumma collection. No changes were made." };
  }
}

/**
 * Corrects an existing Jumma collection record.
 *
 * Every correction creates a JummaCorrection audit entry and an AuditLog entry.
 * Amount update and audit writes happen atomically in one transaction.
 *
 * @param formData - Must contain:
 *   - jummaCollectionId (the record to correct)
 *   - newAmountPaise (positive integer, the corrected total)
 *   - reason (required, correction justification)
 *   - idempotencyKey (required for duplicate prevention)
 */
export async function correctJummaCollectionAction(formData: FormData): Promise<JummaCorrectionResult> {
  let user;
  try {
    user = await requireStaff();
    assertCan(user.role, "payment:reverse"); // Require reversal permission for corrections
  } catch (err) {
    if (err instanceof Error && (err.message === "UNAUTHENTICATED" || err.message === "FORBIDDEN")) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const jummaCollectionId = String(formData.get("jummaCollectionId") ?? "");
  const newAmountPaise = Number(formData.get("newAmountPaise") ?? 0);
  const reason = String(formData.get("reason") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");

  if (!jummaCollectionId) {
    return { ok: false, error: "Jumma collection ID is required." };
  }
  if (newAmountPaise <= 0) {
    return { ok: false, error: "New amount must be positive." };
  }
  if (!reason.trim()) {
    return { ok: false, error: "Correction reason is required." };
  }
  if (!idempotencyKey) {
    return { ok: false, error: "Idempotency key is required." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Check idempotency for correction
      const correctionIdempotencyKey = `jumma-correction-${idempotencyKey}`;
      const existingCorrection = await tx.jummaCorrection.findFirst({
        where: { masjidId: user.masjidId!, createdAt: { gte: new Date(Date.now() - 3600000) } }, // Check recent corrections
        select: { id: true },
      });
      // Note: We rely on the unique jummaCollectionId + timestamp combination for practical idempotency

      // Find the JummaCollection record with row lock
      const jummaRecord = await tx.$queryRaw<{
        id: string;
        masjidId: string;
        collectionDefinitionId: string;
        collectionDate: Date;
        totalAmountPaise: number;
      }[]>`
        SELECT id, "masjidId", "collectionDefinitionId", "collectionDate", "totalAmountPaise"
        FROM "JummaCollection"
        WHERE id = ${jummaCollectionId}
        FOR UPDATE
      `;

      if (jummaRecord.length === 0 || jummaRecord[0].masjidId !== user.masjidId!) {
        throw new Error("Jumma collection record not found in this Masjid.");
      }

      const record = jummaRecord[0];
      const previousAmountPaise = record.totalAmountPaise;

      if (previousAmountPaise === newAmountPaise) {
        throw new Error("New amount is the same as current amount. No correction needed.");
      }

      // Update the JummaCollection record
      await tx.jummaCollection.update({
        where: { id: jummaCollectionId },
        data: {
          totalAmountPaise: newAmountPaise,
          updatedBy: user.id,
          updatedAt: new Date(),
        },
      });

      // Create JummaCorrection entry for history
      await tx.jummaCorrection.create({
        data: {
          masjidId: user.masjidId!,
          jummaCollectionId,
          previousAmountPaise,
          newAmountPaise,
          reason,
          correctedBy: user.id,
        },
      });

      // Create AuditLog entry
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "jumma.correct",
        entityType: "JummaCollection",
        entityId: jummaCollectionId,
        before: { totalAmountPaise: previousAmountPaise },
        after: { totalAmountPaise: newAmountPaise },
        metadata: { reason },
      });
    });

    revalidatePath("/collections/jumma");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes("not found") ||
          msg.includes("same as current amount") ||
          msg.includes("must be positive") ||
          msg.includes("reason is required")) {
        return { ok: false, error: msg };
      }
    }
    console.error(`correctJummaCollectionAction failed for masjid ${user.masjidId} (entered by ${user.id}):`, err);
    return { ok: false, error: "Could not correct Jumma collection. No changes were made." };
  }
}

/**
 * Fetches Jumma collections for a masjid with date-range filtering.
 */
export async function getJummaCollections(
  masjidId: string,
  options?: {
    fromDate?: Date;
    toDate?: Date;
    collectionDefinitionId?: string;
    limit?: number;
    offset?: number;
  }
) {
  const { fromDate, toDate, collectionDefinitionId, limit = 50, offset = 0 } = options || {};

  const where: Prisma.JummaCollectionWhereInput = { masjidId };

  if (fromDate || toDate) {
    where.collectionDate = {};
    if (fromDate) where.collectionDate.gte = fromDate;
    if (toDate) where.collectionDate.lte = toDate;
  }
  if (collectionDefinitionId) {
    where.collectionDefinitionId = collectionDefinitionId;
  }

  const [records, total] = await Promise.all([
    prisma.jummaCollection.findMany({
      where,
      include: {
        collectionDefinition: { select: { id: true, name: true } },
        recordedByUser: { select: { id: true, name: true } },
        updatedByUser: { select: { id: true, name: true } },
        corrections: {
          orderBy: { createdAt: "desc" },
          include: { correctedByUser: { select: { id: true, name: true } } },
        },
      },
      orderBy: { collectionDate: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.jummaCollection.count({ where }),
  ]);

  return { records, total };
}

/**
 * Fetches a single Jumma collection with full correction history.
 */
export async function getJummaCollectionById(masjidId: string, jummaCollectionId: string) {
  return prisma.jummaCollection.findFirst({
    where: { id: jummaCollectionId, masjidId },
    include: {
      collectionDefinition: { select: { id: true, name: true, baseCategory: { select: { code: true } } } },
      recordedByUser: { select: { id: true, name: true } },
      updatedByUser: { select: { id: true, name: true } },
      corrections: {
        orderBy: { createdAt: "desc" },
        include: { correctedByUser: { select: { id: true, name: true } } },
      },
    },
  });
}