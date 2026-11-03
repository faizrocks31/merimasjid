import { getDictionary } from "@/i18n";
import { CheckCircle } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, PageHeader } from "@/components/ui";
import { requirePortalMember } from "@/modules/portal/queries";
import { getUnreadNotificationCount, getMemberNotificationsUI } from "@/modules/portal/notification-queries";
import { markAllNotificationsReadActionDirect } from "@/modules/portal/notification-actions";
import { NotificationList } from "./notification-list";

export const dynamic = "force-dynamic";

export default async function PortalNotificationsPage() {
  const { user, member } = await requirePortalMember();
  const { t } = await getDictionary();
  const notifications = await getMemberNotificationsUI(member.id, user.masjidId!);
  const unreadCount = await getUnreadNotificationCount(member.id, user.masjidId!);

  return (
    <>
      <PageHeader
        title={t("portalNotifications")}
        description={unreadCount > 0 ? `${unreadCount} ${t("portalUnread")}` : t("portalAllCaughtUp")}
      />

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("inAppNotifications")}</CardTitle>
          {unreadCount > 0 && (
            <form action={markAllNotificationsReadActionDirect}>
              <Button type="submit" variant="ghost" size="sm">
                <CheckCircle className="h-3.5 w-3.5" /> {t("portalMarkAllRead")}
              </Button>
            </form>
          )}
        </CardHeader>
        <NotificationList
          notifications={notifications}
          labels={{
            paymentReceived: t("portalPaymentReceived"),
            duesReminder: t("portalDuesReminder"),
            announcement: t("portalAnnouncement"),
            expenseApproved: t("portalExpenseApproved"),
            markedRead: t("portalMarkedRead"),
            markAsRead: t("portalMarkAsRead"),
            noNotifications: t("portalNoNotifications"),
            noNotificationsDesc: t("portalNoNotificationsDesc"),
            unread: t("portalUnread"),
          }}
        />
      </Card>
    </>
  );
}