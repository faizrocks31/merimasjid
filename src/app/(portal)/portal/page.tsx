import Link from "next/link";
import { ArrowRight, CalendarClock, ReceiptText, Wallet } from "lucide-react";
import { getDictionary } from "@/i18n";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Button, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { PaymentStatusBadge, PeriodStatusBadge } from "@/components/status-badges";
import { portalSummary, requirePortalMember } from "@/modules/portal/queries";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const { user, member } = await requirePortalMember();
  const { t } = await getDictionary();
  const summary = await portalSummary(member.id, user.masjidId!);

  return (
    <>
      <PageHeader title={t("memberPortal")} description={`${member.memberNo} · ${member.fullName}`} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t("outstandingDues")} value={formatPaise(summary.outstandingPaise)} sub={`${summary.open.length} ${t("dues").toLowerCase()}`} tone={summary.outstandingPaise > 0 ? "warning" : "success"} />
        <StatCard label={t("paid")} value={formatPaise(summary.paidPaise)} sub={`${summary.payments.filter((p) => p.status === "SUCCESS").length} ${t("receipts").toLowerCase()}`} tone="brand" />
        <StatCard
          label={t("dueDate")}
          value={summary.nextDue ? formatDate(summary.nextDue.dueDate) : "—"}
          sub={summary.nextDue ? formatPaise(summary.nextDue.outstandingPaise) : t("noData")}
          tone="neutral"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
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
                    <p className="truncate text-sm font-medium">{p.plan.category.name}</p>
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

        <Card>
          <CardHeader>
            <CardTitle>{t("myReceipts")}</CardTitle>
            <Link href="/portal/receipts" className="text-[11px] font-medium text-[var(--brand)] hover:underline">{t("viewAll")}</Link>
          </CardHeader>
          {summary.payments.length === 0 ? (
            <EmptyState title={t("noData")} />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {summary.payments.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/receipts/${p.id}`} className="num text-sm font-medium text-[var(--brand)] hover:underline">
                      {p.receiptNo}
                    </Link>
                    <p className="num text-[11px] text-[var(--ink-muted)]">{formatDate(p.paymentDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="num text-sm font-semibold">{formatPaise(p.amountPaise)}</span>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
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

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
        <CalendarClock className="h-3.5 w-3.5" /> {member.masjid.name}
      </p>
    </>
  );
}
