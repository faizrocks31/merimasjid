import { getDictionary } from "@/i18n";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { PeriodStatusBadge } from "@/components/status-badges";
import { portalSummary, requirePortalMember } from "@/modules/portal/queries";

export const dynamic = "force-dynamic";

export default async function PortalDuesPage() {
  const { user, member } = await requirePortalMember();
  const { t } = await getDictionary();
  const summary = await portalSummary(member.id, user.masjidId!);

  return (
    <>
      <PageHeader
        title={t("dues")}
        description={`${t("outstanding")}: ${formatPaise(summary.outstandingPaise)}`}
      />

      <Card>
        {summary.periods.length === 0 ? (
          <EmptyState title={t("noPlan")} description={t("noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                  <th className="px-4 py-2 text-start font-medium">{t("periodCovered")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("dueDate")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("expected")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("allocated")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("outstanding")}</th>
                  <th className="px-4 py-2 text-end font-medium">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {summary.periods.map((p) => {
                  const allocated = p.allocations.reduce((s, a) => s + a.allocatedAmountPaise, 0);
                  const outstanding = p.status === "WAIVED" ? 0 : Math.max(p.expectedAmountPaise - allocated, 0);
                  return (
                    <tr key={p.id} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-4 py-2">
                        <p className="text-sm">{p.plan.category.name}</p>
                        <p className="num text-[11px] text-[var(--ink-muted)]">{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}</p>
                      </td>
                      <td className="num px-3 py-2 text-[var(--ink-muted)]">{formatDate(p.dueDate)}</td>
                      <td className="num px-3 py-2 text-end">{formatPaise(p.expectedAmountPaise)}</td>
                      <td className="num px-3 py-2 text-end text-[var(--ink-muted)]">{formatPaise(allocated)}</td>
                      <td className={`num px-3 py-2 text-end ${outstanding > 0 ? "font-medium text-[var(--warning)]" : "text-[var(--ink-muted)]"}`}>
                        {formatPaise(outstanding)}
                      </td>
                      <td className="px-4 py-2 text-end"><PeriodStatusBadge status={p.status} /></td>
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
