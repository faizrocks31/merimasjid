import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { generateDuesAction } from "@/modules/plans/actions";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { FREQUENCY_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await requireStaff();
  const { t } = await getDictionary();

  const plans = await prisma.contributionPlan.findMany({
    where: { masjidId: user.masjidId! },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      member: { select: { id: true, fullName: true, memberNo: true } },
      collectionDefinition: { select: { name: true } },
      duesPeriods: {
        select: {
          status: true,
          expectedAmountPaise: true,
          allocations: { where: { payment: { status: "SUCCESS" } }, select: { allocatedAmountPaise: true } },
        },
      },
    },
  });

  const totals = plans.reduce(
    (acc, plan) => {
      const periods = plan.duesPeriods;
      acc.expected += periods.reduce((s, p) => s + p.expectedAmountPaise, 0);
      acc.collected += periods.reduce(
        (s, p) => s + p.allocations.reduce((a, b) => a + b.allocatedAmountPaise, 0),
        0,
      );
      acc.paidPeriods += periods.filter((p) => p.status === "PAID").length;
      acc.totalPeriods += periods.length;
      return acc;
    },
    { expected: 0, collected: 0, paidPeriods: 0, totalPeriods: 0 },
  );

  return (
    <>
      <PageHeader
        title={t("plans")}
        description={`${t("expected")}: ${formatPaise(totals.expected)} · ${t("paid")}: ${formatPaise(totals.collected)}`}
        actions={
          can(user.role, "plan:write") ? (
            <>
              <form action={generateDuesAction}>
                <Button type="submit" size="sm" variant="secondary"><RefreshCw className="h-4 w-4" /> {t("generateDues")}</Button>
              </form>
              <Link href="/plans/new">
                <Button size="sm"><Plus className="h-4 w-4" /> {t("plans")}</Button>
              </Link>
            </>
          ) : null
        }
      />

      <Card>
        {plans.length === 0 ? (
          <EmptyState
            title={t("noPlan")}
            description={t("plans")}
            action={
              can(user.role, "plan:write") ? (
                <Link href="/plans/new" className="mt-2"><Button size="sm" variant="secondary">{t("plans")}</Button></Link>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                  <th className="px-4 py-2 text-start font-medium">{t("members")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("category")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("frequency")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("planAmount")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("dues")}</th>
                  <th className="px-4 py-2 text-end font-medium">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const outstanding = plan.duesPeriods.reduce((sum, p) => {
                    const allocated = p.allocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
                    return sum + Math.max(p.expectedAmountPaise - allocated, 0);
                  }, 0);
                  return (
                    <tr key={plan.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="px-4 py-2.5">
                        <Link href={`/members/${plan.member.id}`} className="font-medium hover:text-[var(--brand)] hover:underline">
                          {plan.member.fullName}
                        </Link>
                        <p className="num text-[11px] text-[var(--ink-muted)]">{plan.member.memberNo}</p>
                      </td>
                      <td className="px-3 py-2.5">{plan.collectionDefinition?.name ?? "—"}</td>
                      <td className="px-3 py-2.5 text-[var(--ink-muted)]">
                        {FREQUENCY_LABELS[plan.frequency]}
                        <p className="num text-[11px]">{formatDate(plan.startDate)}{plan.endDate ? ` – ${formatDate(plan.endDate)}` : ""}</p>
                      </td>
                      <td className="num px-3 py-2.5 text-end">{formatPaise(plan.amountPaise)}</td>
                      <td className="num px-3 py-2.5 text-end">
                        {outstanding > 0 ? (
                          <span className="font-medium text-[var(--warning)]">{formatPaise(outstanding)}</span>
                        ) : (
                          <span className="text-[var(--ink-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-end text-[11px] text-[var(--ink-muted)]">{plan.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
