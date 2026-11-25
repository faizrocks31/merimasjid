"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { writeAudit } from "@/modules/audit/write";

export type StaffStatusState = { ok?: boolean; error?: string } | undefined;

/**
 * Roles that count as an administrator for the "at least one admin must
 * remain" guard. A SUPER_ADMIN is the platform owner; an ADMIN is the
 * masjid's own treasurer.
 */
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

/**
 * Deactivates or reactivates a staff membership for the current masjid.
 *
 * Deactivation is per-masjid and soft: the membership row stays, past payments
 * and receipts keep their attribution, and the staff member keeps their
 * account and their access to any other masjid they belong to.
 *
 * The guards below are enforced here, not in the UI — hiding a button is not
 * an access control (see docs/security.md).
 */
export async function setStaffStatusAction(formData: FormData): Promise<StaffStatusState> {
  const user = await requireStaff();
  assertCan(user.role, "staff:manage");

  const membershipId = String(formData.get("membershipId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "ACTIVE" && status !== "INACTIVE") {
    return { error: "Invalid staff status." };
  }

  // Tenant-scoped: a membership from another masjid is simply not found.
  const membership = await prisma.masjidUser.findFirst({
    where: { id: membershipId, masjidId: user.masjidId! },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!membership) return { error: "Staff member not found in this Masjid." };

  // Guard 1 — nobody may lock themselves out.
  if (membership.userId === user.id) {
    return { error: "You cannot deactivate yourself." };
  }

  // Guard 2 — a SUPER_ADMIN membership is only the platform owner's to touch.
  if (membership.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
    return { error: "You do not have permission to change this staff member." };
  }

  if (membership.status === status) {
    return { error: "That staff member is already in that state." };
  }

  // Guard 3 — the last active administrator must not be deactivated, or nobody
  // would be left able to manage this masjid.
  if (status === "INACTIVE" && ADMIN_ROLES.includes(membership.role)) {
    const activeAdmins = await prisma.masjidUser.count({
      where: { masjidId: user.masjidId!, role: { in: ADMIN_ROLES }, status: "ACTIVE" },
    });
    if (activeAdmins <= 1) {
      return { error: "At least one admin must remain active at this Masjid." };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.masjidUser.update({
        where: { id: membership.id },
        data: { status },
      });
      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: status === "ACTIVE" ? "staff.reactivate" : "staff.deactivate",
        entityType: "MasjidUser",
        entityId: membership.id,
        before: { status: membership.status, role: membership.role },
        after: { status, role: membership.role },
        metadata: { email: membership.user.email },
      });
    });

    revalidatePath("/staff");
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error("setStaffStatusAction failed", err);
    return { error: "Could not update the staff member." };
  }
}
