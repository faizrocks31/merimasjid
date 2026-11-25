import Link from "next/link";
import { ArrowRight, HandCoins, Users, AlertTriangle, Wallet } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { can } from "@/lib/permissions";
import {
  collectionSummary, expenseSummary, monthlyTrend, outstandingDues, ranges,
} from "@/modules/reports/queries";
import { prisma } from "@/lib/db";
import { Card, CardBody, CardHeader, CardTitle, PageHeader, StatCard, EmptyState, Button } from "@/components/ui";
import { PaymentStatusBadge } from "@/components/status-badges";
import { CollectionTrend } from "@/components/charts/collection-trend";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireStaff();
  const { t } = await getDictionary();
  const masjidId = user.masjidId!;
  const r = ranges();

  const [today, month, year, dues, monthExpenses, trend, recent, memberCount] = await Promise.all([
    collectionSummary(masjidId, r.today),
    collectionSummary(masjidId, r.month),
    collectionSummary(masjidId, { from: r.year.start, toExclusive: r.year.end }),
    outstandingDues(masjidId),
    expenseSummary(masjidId, r.month),
    monthlyTrend(masjidId, 6),
    prisma.payment.findMany({
      where: { masjidId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { donorMember: { select: { id: true, fullName: true } } },
    }),
    prisma.member.count({ where: { masjidId, status: "ACTIVE" } }),
  ]);

  const netMovement = month.netPaise - monthExpenses.totalPaise;

  return (
    <>
      <PageHeader
        title={t("dashboard")}
        description={`${user.masjid?.name ?? ""} · ${t("thisMonth")}`}
        actions={
          can(user.role, "payment:create") ? (
            <Link href="/collections/new">
              <Button size="sm">
                <HandCoins className="h-4 w-4" /> {t("newPayment")}
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("todayCollection")} value={formatPaise(today.netPaise)} sub={`${today.count} ${t("transactions").toLowerCase()}`} tone="brand" />
        <StatCard label={t("thisMonth")} value={formatPaise(month.netPaise)} sub={`${t("grossCollection")}: ${formatPaise(month.grossPaise)}`} tone="success" />
        <StatCard label={t("thisYear")} value={formatPaise(year.netPaise)} sub={`${t("reversals")}: ${formatPaise(year.reversedPaise)}`} />
        <StatCard label={t("outstandingDues")} value={formatPaise(dues.totalPaise)} sub={`${dues.periods} ${t("dues").toLowerCase()}`} tone="warning" />
        <StatCard label={t("expensesThisMonth")} value={formatPaise(monthExpenses.totalPaise)} sub={`${monthExpenses.count} ${t("expenses").toLowerCase()}`} tone="danger" />
        <StatCard label={t("balance")} value={formatPaise(netMovement)} sub={`${t("netCash")}`} tone={netMovement >= 0 ? "brand" : "danger"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("collectionTrend")}</CardTitle>
          </CardHeader>
          <CardBody className="pt-3">
            <CollectionTrend data={trend} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("outstandingDues")}</CardTitle>
            <Link href="/reports?report=dues" className="text-[11px] font-medium text-[var(--brand)] hover:underline">
              {t("viewAll")}
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-[var(--warning-soft)] p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning)]" />
              <div className="min-w-0">
                <p className="num text-sm font-semibold text-[var(--warning)]">{formatPaise(dues.totalPaise)}</p>
                <p className="text-[11px] text-[var(--ink-muted)]">{dues.periods} {t("dues").toLowerCase()} · {memberCount} {t("active").toLowerCase()} {t("members").toLowerCase()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-[var(--surface)] p-3">
              <Users className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
              <div className="min-w-0">
                <p className="num text-sm font-semibold text-[var(--ink)]">{memberCount}</p>
                <p className="text-[11px] text-[var(--ink-muted)]">{t("members")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-[var(--surface)] p-3">
              <Wallet className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
              <div className="min-w-0">
                <p className="num text-sm font-semibold text-[var(--ink)]">{formatPaise(monthExpenses.totalPaise)}</p>
                <p className="text-[11px] text-[var(--ink-muted)]">{t("expensesThisMonth")}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("recentTransactions")}</CardTitle>
          <Link href="/transactions" className="flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline">
            {t("viewAll")} <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        {recent.length === 0 ? (
          <EmptyState
            title={t("noData")}
            description={t("receivePayment")}
            action={
              can(user.role, "payment:create") ? (
                <Link href="/collections/new" className="mt-2">
                  <Button size="sm" variant="secondary">{t("newPayment")}</Button>
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-start text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                  <th className="px-5 py-2 text-start font-medium">{t("receiptNo")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("receivedFrom")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("date")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("amount")}</th>
                  <th className="px-5 py-2 text-end font-medium">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                    <td className="px-5 py-2.5">
                      <Link href={`/receipts/${p.id}`} className="num font-medium text-[var(--brand)] hover:underline">
                        {p.receiptNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[var(--ink)]">{p.donorNameSnapshot}</span>
                      {p.donorMember ? (
                        <span className="ms-1 text-[11px] text-[var(--ink-muted)]">{p.donorMember.fullName !== p.donorNameSnapshot ? p.donorMember.fullName : ""}</span>
                      ) : null}
                    </td>
                    <td className="num px-3 py-2.5 text-[var(--ink-muted)]">{formatDate(p.paymentDate)}</td>
                    <td className="num px-3 py-2.5 text-end font-medium">{formatPaise(p.amountPaise)}</td>
                    <td className="px-5 py-2.5 text-end"><PaymentStatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
