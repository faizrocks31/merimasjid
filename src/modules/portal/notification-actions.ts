"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePortalMember } from "@/modules/portal/queries";

export type NotificationState = { error?: string; ok?: boolean } | undefined;

/**
 * Mark a notification as read.
 */
export async function markNotificationReadAction(
  _prev: NotificationState,
  formData: FormData
): Promise<NotificationState> {
  const { user, member } = await requirePortalMember();

  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) return { error: "Notification ID required." };

  try {
    const notification = await prisma.notificationLog.findFirst({
      where: { id: notificationId, masjidId: member.masjidId, recipient: member.id },
      select: { id: true, readAt: true },
    });

    if (!notification) return { error: "Notification not found." };
    if (notification.readAt) return { ok: true }; // Already read

    await prisma.notificationLog.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    revalidatePath("/portal/notifications");
    return { ok: true };
  } catch (err) {
    console.error("markNotificationReadAction failed", err);
    return { error: "Could not update notification." };
  }
}

/**
 * Mark all notifications as read for the current member.
 */
export async function markAllNotificationsReadAction(
  _prev: NotificationState,
  formData: FormData
): Promise<NotificationState> {
  const { user, member } = await requirePortalMember();

  try {
    await prisma.notificationLog.updateMany({
      where: {
        masjidId: member.masjidId,
        recipient: member.id,
        channel: "IN_APP",
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    revalidatePath("/portal/notifications");
    return { ok: true };
  } catch (err) {
    console.error("markAllNotificationsReadAction failed", err);
    return { error: "Could not update notifications." };
  }
}

/**
 * Wrapper for direct form action (takes only formData, compatible with <form action={...}>)
 */
export async function markAllNotificationsReadActionDirect(
  formData: FormData
): Promise<void> {
  await markAllNotificationsReadAction(undefined, formData);
}