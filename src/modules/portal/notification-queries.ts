import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePortalMember } from "@/modules/portal/queries";

/**
 * Get member's in-app notifications.
 */
export async function getMemberNotifications(memberId: string, masjidId: string, limit = 50) {
  return prisma.notificationLog.findMany({
    where: {
      masjidId,
      recipient: memberId,
      channel: "IN_APP",
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get unread notification count for member.
 */
export async function getUnreadNotificationCount(memberId: string, masjidId: string) {
  return prisma.notificationLog.count({
    where: {
      masjidId,
      recipient: memberId,
      channel: "IN_APP",
      readAt: null,
    },
  });
}

// Type for the notification list component
export type MemberNotification = {
  id: string;
  template: string;
  status: string;
  createdAt: string; // ISO string
  channel: string;
  title?: string;
  body?: string;
  readAt?: string | null;
};

/**
 * Get member's in-app notifications formatted for the UI.
 */
export async function getMemberNotificationsUI(memberId: string, masjidId: string, limit = 50): Promise<MemberNotification[]> {
  const notifications = await getMemberNotifications(memberId, masjidId, limit);
  return notifications.map((n) => ({
    id: n.id,
    template: n.template,
    status: n.status,
    createdAt: n.createdAt.toISOString(),
    channel: n.channel,
    title: n.title ?? getNotificationTitle(n.template),
    body: n.body ?? undefined,
    readAt: n.readAt?.toISOString() ?? null,
  }));
}

function getNotificationTitle(template: string): string {
  switch (template) {
    case "payment_received":
      return "Payment Received";
    case "dues_reminder":
      return "Due Reminder";
    case "announcement":
      return "Announcement";
    case "expense_approved":
      return "Expense Approved";
    default:
      return "Notification";
  }
}