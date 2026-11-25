"use client";

import { useActionState } from "react";
import { format } from "date-fns";
import { Bell, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { markNotificationReadAction, type NotificationState } from "@/modules/portal/notification-actions";

type Labels = Record<string, string>;

type Notification = {
  id: string;
  template: string;
  status: string;
  createdAt: string;
  channel: string;
  title?: string;
  body?: string;
  readAt?: string | null;
};

export function NotificationList({
  notifications,
  labels,
}: {
  notifications: Notification[];
  labels: Labels;
}) {
  const [, markAsRead] = useActionState(markNotificationReadAction, undefined);

  if (notifications.length === 0) {
    return (
      <div className="p-10 text-center">
        <Bell className="mx-auto h-12 w-12 text-[var(--ink-muted)]" />
        <h3 className="mt-3 text-base font-medium">{labels.noNotifications}</h3>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">{labels.noNotificationsDesc}</p>
      </div>
    );
  }

  const getTemplateIcon = (template: string) => {
    switch (template) {
      case "payment_received":
        return <CheckCircle className="h-5 w-5 text-[var(--success)]" />;
      case "dues_reminder":
        return <Clock className="h-5 w-5 text-[var(--warning)]" />;
      case "announcement":
        return <AlertCircle className="h-5 w-5 text-[var(--brand)]" />;
      case "expense_approved":
        return <CheckCircle className="h-5 w-5 text-[var(--brand)]" />;
      default:
        return <Bell className="h-5 w-5 text-[var(--ink-muted)]" />;
    }
  };

  const getTemplateLabel = (template: string) => {
    switch (template) {
      case "payment_received":
        return labels.paymentReceived;
      case "dues_reminder":
        return labels.duesReminder;
      case "announcement":
        return labels.announcement;
      case "expense_approved":
        return labels.expenseApproved;
      default:
        return template;
    }
  };

  return (
    <ul className="divide-y divide-[var(--border-subtle)]">
      {notifications.map((n) => {
        const isUnread = !n.readAt;
        return (
          <li key={n.id} className={`p-4 flex items-start gap-3 ${isUnread ? "bg-[var(--surface)]" : ""}`}>
            <div className="mt-0.5 shrink-0">{getTemplateIcon(n.template)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-medium ${isUnread ? "font-semibold" : ""}`}>
                  {getTemplateLabel(n.template)}
                </p>
                <span className="num text-[11px] text-[var(--ink-muted)]">
                  {format(new Date(n.createdAt), "MMM d, yyyy h:mm a")}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--ink)] line-clamp-2">{n.body ?? n.title ?? "Notification"}</p>
            </div>
            {isUnread && (
              <form action={(fd) => markAsRead(fd)}>
                <input type="hidden" name="notificationId" value={n.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-[11px]">
                  {labels.markAsRead ?? labels.unread}
                </Button>
              </form>
            )}
            <Badge tone={n.status === "SENT" ? "success" : "danger"}>{n.status}</Badge>
          </li>
        );
      })}
    </ul>
  );
}