import Link from "next/link";
import { Download } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { formatPaise } from "@/lib/money";
import { addDays, formatDate, parseISODate, toISODate } from "@/lib/dates";
import { Button, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { PeriodStatusBadge } from "@/components/status-badges";
import {
  categoryTotals, collectionSummary, collectorTotals, eventTotals, expenseSummary, modeTotals, pendingDueRows, ranges,
} from "@/modules/reports/queries";
import { PAYMENT_MODE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

type ReportKey = "collection" | "dues" | "category" | "event" | "mode" | "collector" | "expense";

const REPORT_KEYS: ReportKey[] = ["collection", "dues", "category", "event", "mode", "collector", "expense"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; from?: string; to?: string }>;
}) {
  const user = await requireStaff();
  const { t } = await getDictionary();
  const p = await searchParams;
  const masjidId = user.masjidId!;

  const report: ReportKey = (REPORT_KEYS as string[]).includes(p.report ?? "") ? (p.report as ReportKey) : "collection";

  const preset = ranges();
  const customFrom = p.from ? parseISODate(p.from) : null;
  const customTo = p.to ? parseISODate(p.to) : null;
  const range = {
    from: customFrom ?? preset.month.from,
    toExclusive: customTo ? addDays(customTo, 1) : preset.month.toExclusive,
  };
  const toInclusive = addDays(range.toExclusive, -1);

  const [summary, expenses, categories, modes, collectors, dues, events] = await Promise.all([
    collectionSummary(masjidId, range),
    expenseSummary(masjidId, range),
    categoryTotals(masjidId, range),
    modeTotals(masjidId, range),
    collectorTotals(masjidId, range),
    pendingDueRows(masjidId, 500),
    eventTotals(masjidId, range),
  ]);

  const netMovement = summary.netPaise - expenses.totalPaise;
  const rangeLabel = `${formatDate(range.from)} – ${formatDate(toInclusive)}`;

  const tabs: { key: ReportKey; label: string }[] = [
    { key: "collection", label: t("grossCollection") },
    { key: "dues", label: t("dueList") },
    { key: "category", label: t("categoryTotals") },
    { key: "event", label: t("collectionEvents") },
    { key: "mode", label: t("modeTotals") },
    { key: "collector", label: t("collectorTotals") },
    { key: "expense", label: t("incomeVsExpense") },
  ];

  return (
    <>
      <PageHeader
        title={t("reports")}
        description={rangeLabel}
        actions={
          <Link href={`/api/exports/transactions?from=${toISODate(range.from)}&to=${toISODate(toInclusive)}`}>
            <Button variant="secondary" size="sm"><Download className="h-4 w-4" /> {t("exportCsv")}</Button>
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("grossCollection")} value={formatPaise(summary.grossPaise)} sub={`${summary.count} ${t("transactions").toLowerCase()}`} tone="brand" />
        <StatCard label={t("reversals")} value={formatPaise(summary.reversedPaise)} sub={`${summary.reversedCount}`} tone="danger" />
        <StatCard label={t("netCollection")} value={formatPaise(summary.netPaise)} tone="success" />
        <StatCard label={t("netCash")} value={formatPaise(netMovement)} sub={`${t("expenses")}: ${formatPaise(expenses.totalPaise)}`} tone={netMovement >= 0 ? "brand" : "danger"} />
      </div>

      <Card className="mb-4">
        <form className="flex flex-wrap items-end gap-2 p-3" action="/reports">
          <input type="hidden" name="report" value={report} />
          <label className="text-[11px] text-[var(--ink-muted)]">
            {t("reportRange")}
            <input type="date" name="from" defaultValue={toISODate(range.from)} className="ms-2 h-9 rounded-lg border border-[var(--border-subtle)] bg-white px-2 text-xs" />
          </label>
          <label className="text-[11px] text-[var(--ink-muted)]">
            –
            <input type="date" name="to" defaultValue={toISODate(toInclusive)} className="ms-2 h-9 rounded-lg border border-[var(--border-subtle)] bg-white px-2 text-xs" />
          </label>
          <Button type="submit" variant="secondary" size="sm">{t("search")}</Button>
        </form>
      </Card>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/reports?report=${tab.key}&from=${toISODate(range.from)}&to=${toISODate(toInclusive)}`}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              report === tab.key
                ? "border-[var(--brand)] bg-[var(--brand-soft)] font-medium text-[var(--brand-deep)]"
                : "border-[var(--border-subtle)] bg-white text-[var(--ink-muted)] hover:bg-[var(--surface)]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>{tabs.find((x) => x.key === report)?.label}</CardTitle></CardHeader>

        {report === "category" ? (
          categories.length === 0 ? <EmptyState title={t("noData")} /> : (
            <SimpleTable
              headers={[t("category"), t("total")]}
              rows={categories.map((c) => [
                <span key="n" className="flex items-center gap-2">{c.name}</span>,
                <span key="v" className="num">{formatPaise(c.totalPaise)}</span>,
              ])}
            />
          )
        ) : report === "event" ? (
          events.length === 0 ? <EmptyState title={t("noEvents")} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                    <th className="px-4 py-2 text-start font-medium">{t("collectionEvent")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("category")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("eventStatus")}</th>
                    <th className="px-3 py-2 text-end font-medium">{t("eventExpectedAmount")}</th>
                    <th className="px-3 py-2 text-end font-medium">{t("eventReceived")}</th>
                    <th className="px-3 py-2 text-end font-medium">{t("assignmentOutstanding")}</th>
                    <th className="px-3 py-2 text-end font-medium">{t("assignedHouseholds")}</th>
                    <th className="px-3 py-2 text-end font-medium">{t("assignmentReceived")}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-4 py-2">
                        <span className="font-medium">{e.name}</span>
                        <p className="text-[11px] text-[var(--ink-muted)]">
                          {e.applicableMonth && e.applicableYear ? `${e.applicableMonth}/${e.applicableYear}` : ""}
                          {e.startDate && e.endDate ? ` · ${formatDate(e.startDate)}–${formatDate(e.endDate)}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-2">{e.collectionDefinitionName}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          e.status === "COMPLETED" ? "bg-[var(--success-soft)] text-[var(--success)]" :
                          e.status === "OPEN" ? "bg-[var(--brand-soft)] text-[var(--brand-deep)]" :
                          e.status === "SCHEDULED" ? "bg-[var(--warning-soft)] text-[var(--warning)]" :
                          "bg-[var(--danger-soft)] text-[var(--danger)]"
                        }`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="num px-3 py-2 text-end">{formatPaise(e.expectedPaise)}</td>
                      <td className="num px-3 py-2 text-end text-[var(--success)]">{formatPaise(e.receivedPaise)}</td>
                      <td className="num px-3 py-2 text-end font-medium text-[var(--warning)]">{formatPaise(e.outstandingPaise)}</td>
                      <td className="num px-3 py-2 text-end">{e.householdCount}</td>
                      <td className="num px-3 py-2 text-end">{e.paidHouseholds}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--border-subtle)] bg-[var(--surface)]">
                    <td colSpan={3} className="px-4 py-2 text-end text-xs font-medium">{t("total")}</td>
                    <td className="num px-3 py-2 text-end font-semibold">{formatPaise(events.reduce((s, e) => s + e.expectedPaise, 0))}</td>
                    <td className="num px-3 py-2 text-end font-semibold text-[var(--success)]">{formatPaise(events.reduce((s, e) => s + e.receivedPaise, 0))}</td>
                    <td className="num px-3 py-2 text-end font-semibold text-[var(--warning)]">{formatPaise(events.reduce((s, e) => s + e.outstandingPaise, 0))}</td>
                    <td className="num px-3 py-2 text-end font-semibold">{events.reduce((s, e) => s + e.householdCount, 0)}</td>
                    <td className="num px-3 py-2 text-end font-semibold">{events.reduce((s, e) => s + e.paidHouseholds, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : report === "mode" ? (
          modes.length === 0 ? <EmptyState title={t("noData")} /> : (
            <SimpleTable
              headers={[t("mode"), t("transactions"), t("total")]}
              rows={modes.map((m) => [
                PAYMENT_MODE_LABELS[m.mode] ?? m.mode,
                <span key="c" className="num">{m.count}</span>,
                <span key="v" className="num">{formatPaise(m.totalPaise)}</span>,
              ])}
            />
          )
        ) : report === "collector" ? (
          collectors.length === 0 ? <EmptyState title={t("noData")} /> : (
            <SimpleTable
              headers={[t("collector"), t("transactions"), t("total")]}
              rows={collectors.map((c) => [
                c.name,
                <span key="c" className="num">{c.count}</span>,
                <span key="v" className="num">{formatPaise(c.totalPaise)}</span>,
              ])}
            />
          )
        ) : report === "expense" ? (
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-[var(--success-soft)] px-4 py-3">
              <span className="text-sm font-medium text-[var(--success)]">{t("netCollection")}</span>
              <span className="num text-lg font-semibold text-[var(--success)]">{formatPaise(summary.netPaise)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[var(--danger-soft)] px-4 py-3">
              <span className="text-sm font-medium text-[var(--danger)]">{t("expenses")} ({t("approved")})</span>
              <span className="num text-lg font-semibold text-[var(--danger)]">{formatPaise(expenses.totalPaise)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
              <span className="text-sm font-semibold">{t("netCash")}</span>
              <span className={`num text-xl font-semibold ${netMovement >= 0 ? "text-[var(--brand-deep)]" : "text-[var(--danger)]"}`}>
                {formatPaise(netMovement)}
              </span>
            </div>
            <p className="text-[11px] text-[var(--ink-muted)]">
              {t("netCash")} = {t("netCollection")} − {t("expenses")}. This is not a bank balance.
            </p>
          </CardBody>
        ) : report === "dues" ? (
          dues.length === 0 ? <EmptyState title={t("noData")} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                    <th className="px-4 py-2 text-start font-medium">{t("members")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("periodCovered")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("dueDate")}</th>
                    <th className="px-3 py-2 text-end font-medium">{t("expected")}</th>
                    <th className="px-3 py-2 text-end font-medium">{t("outstanding")}</th>
                    <th className="px-4 py-2 text-end font-medium">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {dues.map((d) => (
                    <tr key={d.id} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-4 py-2">
                        <Link href={`/members/${d.memberId}`} className="hover:underline">{d.memberName}</Link>
                        <p className="num text-[11px] text-[var(--ink-muted)]">{d.memberNo}{d.phone ? ` · ${d.phone}` : ""}</p>
                      </td>
                      <td className="num px-3 py-2">{formatDate(d.periodStart)} – {formatDate(d.periodEnd)}</td>
                      <td className="num px-3 py-2 text-[var(--ink-muted)]">{formatDate(d.dueDate)}</td>
                      <td className="num px-3 py-2 text-end">{formatPaise(d.expectedPaise)}</td>
                      <td className="num px-3 py-2 text-end font-medium text-[var(--warning)]">{formatPaise(d.outstandingPaise)}</td>
                      <td className="px-4 py-2 text-end"><PeriodStatusBadge status={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--border-subtle)] bg-[var(--surface)]">
                    <td colSpan={4} className="px-4 py-2 text-end text-xs font-medium">{t("total")} {t("outstanding")}</td>
                    <td className="num px-3 py-2 text-end font-semibold">{formatPaise(dues.reduce((s, d) => s + d.outstandingPaise, 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : (
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label={t("grossCollection")} value={formatPaise(summary.grossPaise)} />
              <Metric label={t("reversals")} value={formatPaise(summary.reversedPaise)} tone="danger" />
              <Metric label={t("netCollection")} value={formatPaise(summary.netPaise)} tone="success" />
            </div>
            <p className="text-[11px] text-[var(--ink-muted)]">
              {t("grossCollection")} − {t("reversals")} = {t("netCollection")}. {summary.count} {t("transactions").toLowerCase()}.
            </p>
          </CardBody>
        )}
      </Card>
    </>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
            {headers.map((h, i) => (
              <th key={h} className={`px-4 py-2 font-medium ${i === headers.length - 1 ? "text-end" : "text-start"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
              {r.map((cell, j) => (
                <td key={j} className={`px-4 py-2 ${j === r.length - 1 ? "text-end" : ""}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] p-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{label}</p>
      <p className={`num mt-1 text-lg font-semibold ${tone === "danger" ? "text-[var(--danger)]" : tone === "success" ? "text-[var(--success)]" : ""}`}>{value}</p>
    </div>
  );
}
