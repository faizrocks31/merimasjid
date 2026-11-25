"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePortalMember } from "@/modules/portal/queries";
import { writeAudit } from "@/modules/audit/write";

export type PreferencesState = { error?: string; ok?: boolean } | undefined;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * A member updates their own notification preferences. The member id comes
 * from the session-resolved profile, never from the form.
 */
export async function updatePreferencesAction(
  _prev: PreferencesState,
  formData: FormData
): Promise<PreferencesState> {
  const { user, member } = await requirePortalMember();

  const notifyTelegram = formData.get("notifyTelegram") === "on" ? 1 : 0;
  const notifyInApp = formData.get("notifyInApp") === "on" ? 1 : 0;
  const notifyEmail = formData.get("notifyEmail") === "on" ? 1 : 0;

  const quietHoursStart = String(formData.get("quietHoursStart") ?? "").trim();
  const quietHoursEnd = String(formData.get("quietHoursEnd") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim() || "Asia/Kolkata";

  if ((quietHoursStart && !TIME_PATTERN.test(quietHoursStart)) || (quietHoursEnd && !TIME_PATTERN.test(quietHoursEnd))) {
    return { error: "Quiet hours must be in HH:MM format." };
  }

  // One of the two ends must be set for the window to mean anything.
  if (Boolean(quietHoursStart) !== Boolean(quietHoursEnd)) {
    return { error: "Set both quiet hours start and end, or leave both blank." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: member.id },
        data: {
          notifyTelegram,
          notifyInApp,
          notifyEmail,
          quietHoursStart: quietHoursStart || null,
          quietHoursEnd: quietHoursEnd || null,
          timezone,
        },
      });

      await writeAudit(tx, {
        masjidId: member.masjidId,
        actorUserId: user.id,
        action: "member.updatePreferences",
        entityType: "Member",
        entityId: member.id,
        before: {
          notifyTelegram: member.notifyTelegram,
          notifyInApp: member.notifyInApp,
          notifyEmail: member.notifyEmail,
          quietHoursStart: member.quietHoursStart,
          quietHoursEnd: member.quietHoursEnd,
          timezone: member.timezone,
        },
        after: {
          notifyTelegram,
          notifyInApp,
          notifyEmail,
          quietHoursStart: quietHoursStart || null,
          quietHoursEnd: quietHoursEnd || null,
          timezone,
        },
      });
    });

    revalidatePath("/portal/profile");
    return { ok: true };
  } catch (err) {
    console.error("updatePreferencesAction failed", err);
    return { error: "Could not save preferences." };
  }
}
