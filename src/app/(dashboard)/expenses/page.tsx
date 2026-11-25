import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { approveExpenseAction } from "@/modules/expenses/actions";
import { Card, EmptyState, PageHeader, Button, Badge } from "@/components/ui";
import { ExpenseStatusBadge } from "@/components/status-badges";
import { ExpenseForm } from "./expense-form";
import { PAYMENT_MODE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const user = await requireStaff();
  const { t } = await getDictionary();

  const [categories, expenses] = await Promise.all([
    prisma.expenseCategory.findMany({ where: { masjidId: user.masjidId!, active: true }, orderBy: { name: "asc" } }),
    prisma.expense.findMany({
      where: { masjidId: user.masjidId! },
      orderBy: { date: "desc" },
      take: 100,
      include: { category: true, enteredByUser: { select: { name: true } } },
    }),
  ]);

  const approvedTotal = expenses.filter((e) => e.approvalStatus === "APPROVED").reduce((s, e) => s + e.amountPaise, 0);

  const labels: Record<string, string> = {
    expenses: t("expenses"),
    category: t("category"),
    date: t("date"),
    payee: "Payee",
    amount: t("amount"),
    mode: t("mode"),
    reference: t("reference"),
    description: t("notes"),
    save: t("save"),
    loading: t("loading"),
    cash: t("cash"),
    upi: t("upi"),
    bankTransfer: t("bankTransfer"),
    other: t("other"),
    optional: t("optional"),
  };

  return (
    <>
      <PageHeader title={t("expenses")} description={`${t("approved")}: ${formatPaise(approvedTotal)}`} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <div className="border-b border-[var(--border-subtle)] px-5 py-4">
              <h2 className="text-sm font-semibold">{t("expenses")}</h2>
            </div>
            <div className="p-5">
              {can(user.role, "expense:create") ? (
                <ExpenseForm labels={labels} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
              ) : (
                <p className="text-xs text-[var(--ink-muted)]">{t("forbidden")}</p>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <h2 className="text-sm font-semibold">{t("transactions")}</h2>
              <Badge tone="neutral">{expenses.length}</Badge>
            </div>
            {expenses.length === 0 ? (
              <EmptyState title={t("noData")} description={t("expenses")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                      <th className="px-4 py-2 text-start font-medium">{t("date")}</th>
                      <th className="px-3 py-2 text-start font-medium">{t("category")}</th>
                      <th className="px-3 py-2 text-start font-medium">Payee</th>
                      <th className="px-3 py-2 text-end font-medium">{t("amount")}</th>
                      <th className="px-4 py-2 text-end font-medium">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id} className="border-b border-[var(--border-subtle)] last:border-0">
                        <td className="num px-4 py-2.5 text-[var(--ink-muted)]">{formatDate(e.date)}</td>
                        <td className="px-3 py-2.5">
                          <p>{e.category.name}</p>
                          <p className="text-[11px] text-[var(--ink-muted)]">{PAYMENT_MODE_LABELS[e.mode] ?? e.mode}{e.referenceNo ? ` · ${e.referenceNo}` : ""}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <p>{e.payee}</p>
                          <p className="text-[11px] text-[var(--ink-muted)]">{e.expenseNo} · {e.enteredByUser.name}</p>
                        </td>
                        <td className="num px-3 py-2.5 text-end font-medium">{formatPaise(e.amountPaise)}</td>
                        <td className="px-4 py-2.5 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            <ExpenseStatusBadge status={e.approvalStatus} />
                            {e.approvalStatus === "PENDING" && can(user.role, "expense:approve") ? (
                              <div className="flex gap-1">
                                <form action={async (fd) => { await approveExpenseAction(fd); }}>
                                  <input type="hidden" name="expenseId" value={e.id} />
                                  <input type="hidden" name="decision" value="APPROVED" />
                                  <Button type="submit" size="sm" variant="secondary">{t("approved")}</Button>
                                </form>
                                <form action={async (fd) => { await approveExpenseAction(fd); }}>
                                  <input type="hidden" name="expenseId" value={e.id} />
                                  <input type="hidden" name="decision" value="REJECTED" />
                                  <Button type="submit" size="sm" variant="ghost">{t("rejected")}</Button>
                                </form>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
