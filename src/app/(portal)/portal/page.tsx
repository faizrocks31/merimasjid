import Link from "next/link";
import { ArrowRight, CalendarClock, ReceiptText, Wallet, Bell, FileText, MessageCircle, Clock } from "lucide-react";
import { getDictionary } from "@/i18n";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Button, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { PaymentStatusBadge, PeriodStatusBadge } from "@/components/status-badges";
import { portalSummary, requirePortalMember } from "@/modules/portal/queries";
import { getMemberNotificationsUI, getUnreadNotificationCount } from "@/modules/portal/notification-queries";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const { user, member } = await requirePortalMember();
  const { t } = await getDictionary();
  const summary = await portalSummary(member.id, user.masjidId!);
  const unreadCount = await getUnreadNotificationCount(member.id, user.masjidId!);
  const notifications = await getMemberNotificationsUI(member.id, user.masjidId!);

  // Helper to convert 24-hour (HH:mm) to 12-hour format (h:mm AM/PM)
  const formatTo12Hour = (time24: string | null): string => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const prayerTimes = [
    { label: t("fajrTime"), time: formatTo12Hour(member.masjid.fajrTime) },
    { label: t("sunriseTime"), time: formatTo12Hour(member.masjid.sunriseTime) },
    { label: t("dhuhrTime"), time: formatTo12Hour(member.masjid.dhuhrTime) },
    { label: t("asrTime"), time: formatTo12Hour(member.masjid.asrTime) },
    { label: t("maghribTime"), time: formatTo12Hour(member.masjid.maghribTime) },
    { label: t("ishaTime"), time: formatTo12Hour(member.masjid.ishaTime) },
    { label: t("jummahTime"), time: formatTo12Hour(member.masjid.jummahTime) },
  ].filter(pt => pt.time);

  return (
    <>
      <PageHeader title={t("memberPortal")} description={`${member.memberNo} · ${member.fullName}`} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mt-6">
        <StatCard
          label={t("outstandingDues")}
          value={formatPaise(summary.outstandingPaise)}
          sub={`${summary.open.length} ${t("dues").toLowerCase()}`}
          tone={summary.outstandingPaise > 0 ? "warning" : "success"}
        />
        <StatCard
          label={t("paid")}
          value={formatPaise(summary.paidPaise)}
          sub={`${summary.payments.filter((p) => p.status === "SUCCESS").length} ${t("receipts").toLowerCase()}`}
          tone="brand"
        />
        <StatCard
          label={t("notifications")}
          value={unreadCount > 0 ? `${unreadCount} ${t("portalUnread")}` : t("portalAllCaughtUp")}
          sub={notifications.length > 0 ? `${notifications.length} ${t("totalNotifications")}` : t("noNotifications")}
          tone={unreadCount > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* Prayer Times Card */}
      {prayerTimes.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--brand)]" />
              {t("prayerTimes")}
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {prayerTimes.map((pt) => (
                <div key={pt.label} className="rounded-lg border border-[var(--border-subtle)] bg-white p-3 text-center">
                  <p className="text-[11px] font-medium text-[var(--ink-muted)] uppercase tracking-wide">{pt.label}</p>
                  <p className="num text-xl font-bold text-[var(--ink)]">{pt.time}</p>
                </div>
              ))}
            </div>
            {member.masjid.prayerTimesUpdatedAt && (
              <p className="mt-3 text-[11px] text-[var(--ink-muted)] text-center">
                {t("prayerTimesLastUpdated").replace("{date}", new Date(member.masjid.prayerTimesUpdatedAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })).replace("{time}", new Date(member.masjid.prayerTimesUpdatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true }))}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Outstanding Dues Card */}
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{t("dues")}</CardTitle>
            <Link href="/portal/dues" className="text-[11px] font-medium text-[var(--brand)] hover:underline">{t("viewAll")}</Link>
          </CardHeader>
          {summary.open.length === 0 ? (
            <EmptyState title={t("noData")} description={t("paid")} />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {summary.open.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.plan?.collectionDefinition?.name ?? "—"}</p>
                    <p className="num text-[11px] text-[var(--ink-muted)]">
                      {formatDate(p.periodStart)} – {formatDate(p.periodEnd)} · {t("dueDate")} {formatDate(p.dueDate)}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="num text-sm font-semibold text-[var(--warning)]">{formatPaise(p.outstandingPaise)}</p>
                    <PeriodStatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Notifications Card */}
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{t("inAppNotifications")}</CardTitle>
            <Link href="/portal/notifications" className="text-[11px] font-medium text-[var(--brand)] hover:underline">{t("viewAll")}</Link>
          </CardHeader>
          {notifications.length === 0 ? (
            <EmptyState title={t("portalNoNotifications")} description={t("portalNoNotificationsDesc")} />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {notifications.slice(0, 4).map((n) => (
                <li key={n.id} className="p-4 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {n.template === "payment_received" && <Bell className="h-5 w-5 text-[var(--success)]" />}
                    {n.template === "dues_reminder" && <CalendarClock className="h-5 w-5 text-[var(--warning)]" />}
                    {n.template === "announcement" && <MessageCircle className="h-5 w-5 text-[var(--brand)]" />}
                    {n.template === "expense_approved" && <FileText className="h-5 w-5 text-[var(--brand)]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {n.template === "payment_received" && t("portalPaymentReceived")}
                        {n.template === "dues_reminder" && t("portalDuesReminder")}
                        {n.template === "announcement" && t("portalAnnouncement")}
                        {n.template === "expense_approved" && t("portalExpenseApproved")}
                      </p>
                      <span className="num text-[11px] text-[var(--ink-muted)]">
                        {formatDate(new Date(n.createdAt))}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--ink)] line-clamp-2">{n.title ?? n.body ?? "Notification"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("quickActions")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <Link
              href="/portal/dues"
              className="inline-flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-white px-4 py-3 text-[var(--ink)] hover:bg-[var(--surface)]"
            >
              <CalendarClock className="h-5 w-5 text-[var(--warning)]" />
              <span className="font-medium">{t("viewDues")}</span>
            </Link>
            <Link
              href="/portal/receipts"
              className="inline-flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-white px-4 py-3 text-[var(--ink)] hover:bg-[var(--surface)]"
            >
              <FileText className="h-5 w-5 text-[var(--brand)]" />
              <span className="font-medium">{t("viewReceipts")}</span>
            </Link>
            <Link
              href="/portal/notifications"
              className="inline-flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-white px-4 py-3 text-[var(--ink)] hover:bg-[var(--surface)]"
            >
              <Bell className="h-5 w-5 text-[var(--ink-muted)]" />
              <span className="font-medium">{t("viewNotifications")}</span>
            </Link>
            <Link
              href="/portal/profile"
              className="inline-flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-white px-4 py-3 text-[var(--ink)] hover:bg-[var(--surface)]"
            >
              <MessageCircle className="h-5 w-5 text-[var(--ink-muted)]" />
              <span className="font-medium">{t("profile")}</span>
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand)]" />
            <div>
              <p className="text-sm font-medium">{t("thankYou")}</p>
              <p className="text-xs text-[var(--ink-muted)]">{t("taxNote")}</p>
            </div>
          </div>
          <Link href="/portal/receipts">
            <Button size="sm" variant="secondary"><ReceiptText className="h-4 w-4" /> {t("myReceipts")} <ArrowRight className="h-3.5 w-3.5" /></Button>
          </Link>
        </CardBody>
      </Card>

      <p className="mt-6 flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
        <CalendarClock className="h-3.5 w-3.5" /> {member.masjid.name}
      </p>
    </>
  );
}