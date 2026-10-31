import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getDictionary } from "@/i18n";
import { formatDateTime } from "@/lib/dates";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const ACTION_LABELS: Record<string, string> = {
  "payment.create": "Payment recorded",
  "payment.reverse": "Payment reversed",
  "receipt.reprint": "Receipt reprinted",
  "member.create": "Member added",
  "member.update": "Member updated",
  "plan.create": "Plan created",
  "plan.changeAmount": "Plan amount changed",
  "dues.generate": "Due periods generated",
  "expense.create": "Expense recorded",
  "expense.decide": "Expense approved/rejected",
  "settings.update": "Settings updated",
  "category.create": "Contribution category added",
  "expenseCategory.create": "Expense category added",
  "staff.create": "Staff added",
  "staff.changeRole": "Staff role changed",
  "staff.deactivate": "Staff deactivated",
  "staff.reactivate": "Staff reactivated",
  "export.transactions": "Transactions exported",
};

function actionTone(action: string): string {
  if (action.includes("reverse") || action.includes("reprint") || action.includes("decide") || action === "staff.deactivate") {
    return "bg-[var(--warning-soft)] text-[var(--warning)] border-[#efdcb8]";
  }
  if (action.startsWith("payment") || action.startsWith("expense")) {
    return "bg-[var(--brand-soft)] text-[var(--brand-deep)] border-[#cfe0d5]";
  }
  return "bg-[#f1f0ea] text-[var(--ink-muted)] border-[#e2e0d6]";
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  const user = await requireStaff();
  if (!can(user.role, "audit:read")) redirect("/dashboard");
  const { t } = await getDictionary();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const action = params.action ?? "";

  const where = {
    masjidId: user.masjidId!,
    ...(action ? { action } : {}),
  };

  const [logs, total, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["action"], where: { masjidId: user.masjidId! }, _count: true, orderBy: { action: "asc" } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title={t("auditLog")} description={`${total} entries · append-only`} />

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Link
          href="/audit"
          className={`rounded-lg border px-3 py-1.5 text-xs ${
            action === "" ? "border-[var(--brand)] bg-[var(--brand-soft)] font-medium text-[var(--brand-deep)]" : "border-[var(--border-subtle)] bg-white text-[var(--ink-muted)] hover:bg-[var(--surface)]"
          }`}
        >
          All
        </Link>
        {actions.map((a) => (
          <Link
            key={a.action}
            href={`/audit?action=${encodeURIComponent(a.action)}`}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              action === a.action
                ? "border-[var(--brand)] bg-[var(--brand-soft)] font-medium text-[var(--brand-deep)]"
                : "border-[var(--border-subtle)] bg-white text-[var(--ink-muted)] hover:bg-[var(--surface)]"
            }`}
          >
            {ACTION_LABELS[a.action] ?? a.action} <span className="num text-[10px] opacity-60">{a._count}</span>
          </Link>
        ))}
      </div>

      <Card>
        {logs.length === 0 ? (
          <EmptyState title={t("noData")} />
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {logs.map((log) => (
              <li key={log.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${actionTone(log.action)}`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  <span className="num text-[11px] text-[var(--ink-muted)]">{formatDateTime(log.createdAt)}</span>
                  <span className="text-[11px] text-[var(--ink-muted)]">· {log.actor?.name ?? "System"}</span>
                  <span className="num text-[11px] text-[var(--ink-muted)]">· {log.entityType}{log.entityId ? `/${log.entityId.slice(-8)}` : ""}</span>
                </div>
                {log.beforeJson || log.afterJson || log.metadata ? (
                  <pre className="mt-1.5 max-h-40 overflow-auto rounded-lg bg-[var(--surface)] p-2 text-[10px] leading-relaxed text-[var(--ink-muted)]" dir="ltr">
                    {[
                      log.beforeJson ? `before: ${log.beforeJson}` : null,
                      log.afterJson ? `after:  ${log.afterJson}` : null,
                      log.metadata ? `meta:   ${log.metadata}` : null,
                    ].filter(Boolean).join("\n")}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-xs text-[var(--ink-muted)]">
          <span>Page {page} / {pages}</span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`/audit?page=${page - 1}${action ? `&action=${encodeURIComponent(action)}` : ""}`} className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 hover:bg-[var(--surface)]">
                ← {t("back")}
              </Link>
            ) : null}
            {page < pages ? (
              <Link href={`/audit?page=${page + 1}${action ? `&action=${encodeURIComponent(action)}` : ""}`} className="rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-1.5 hover:bg-[var(--surface)]">
                {t("viewAll")} →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
