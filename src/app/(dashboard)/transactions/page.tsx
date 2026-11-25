import Link from "next/link";
import { Search, Download } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Button, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { PaymentStatusBadge, VerificationBadge } from "@/components/status-badges";
import { PAYMENT_MODE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string; status?: string; from?: string; to?: string; page?: string }>;
}) {
  const user = await requireStaff();
  const { t } = await getDictionary();
  const p = await searchParams;
  const q = (p.q ?? "").trim();
  const page = Math.max(1, Number(p.page ?? 1) || 1);
  const pageSize = 30;

  const from = p.from ? new Date(`${p.from}T00:00:00+05:30`) : undefined;
  const to = p.to ? new Date(`${p.to}T23:59:59+05:30`) : undefined;

  const where = {
    masjidId: user.masjidId!,
    ...(p.mode ? { mode: p.mode } : {}),
    ...(p.status ? { status: p.status } : {}),
    ...(from || to ? { paymentDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(q
      ? {
          OR: [
            { receiptNo: { contains: q } },
            { donorNameSnapshot: { contains: q } },
            { referenceNo: { contains: q } },
            { donorMember: { memberNo: { contains: q } } },
          ],
        }
      : {}),
  };

  const [payments, total, totals] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { donorMember: { select: { id: true, memberNo: true, fullName: true } } },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { ...where, status: "SUCCESS" },
      _sum: { amountPaise: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const qs = (extra: Record<string, string>) =>
    new URLSearchParams({ ...(q ? { q } : {}), ...(p.mode ? { mode: p.mode } : {}), ...(p.status ? { status: p.status } : {}), ...(p.from ? { from: p.from } : {}), ...(p.to ? { to: p.to } : {}), ...extra }).toString();

  return (
    <>
      <PageHeader
        title={t("transactions")}
        description={`${total} ${t("transactions").toLowerCase()} · ${formatPaise(totals._sum.amountPaise ?? 0)}`}
        actions={
          <Link href={`/api/exports/transactions?${qs({})}`}>
            <Button variant="secondary" size="sm"><Download className="h-4 w-4" /> {t("exportCsv")}</Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <form className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-6" action="/transactions">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
            <Input name="q" defaultValue={q} placeholder={`${t("receiptNo")} / ${t("name")} / ${t("reference")}`} className="ps-9" aria-label={t("search")} />
          </div>
          <Select name="mode" defaultValue={p.mode ?? ""} aria-label={t("mode")}>
            <option value="">{t("mode")}: {t("viewAll")}</option>
            {Object.entries(PAYMENT_MODE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={p.status ?? ""} aria-label={t("status")}>
            <option value="">{t("status")}: {t("viewAll")}</option>
            <option value="SUCCESS">{t("success")}</option>
            <option value="REVERSED">{t("reversed")}</option>
          </Select>
          <Input type="date" name="from" defaultValue={p.from ?? ""} aria-label={t("reportRange")} />
          <div className="flex gap-2">
            <Input type="date" name="to" defaultValue={p.to ?? ""} aria-label={t("reportRange")} />
            <Button type="submit" variant="secondary">{t("search")}</Button>
          </div>
        </form>
      </Card>

      <Card>
        {payments.length === 0 ? (
          <EmptyState title={t("noResults")} description={t("transactions")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
                  <th className="px-4 py-2 text-start font-medium">{t("receiptNo")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("receivedFrom")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("date")}</th>
                  <th className="hidden px-3 py-2 text-start font-medium md:table-cell">{t("mode")}</th>
                  <th className="hidden px-3 py-2 text-start font-medium lg:table-cell">{t("verification")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("amount")}</th>
                  <th className="px-4 py-2 text-end font-medium">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pay) => (
                  <tr key={pay.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface)]">
                    <td className="px-4 py-2.5">
                      <Link href={`/receipts/${pay.id}`} className="num font-medium text-[var(--brand)] hover:underline">{pay.receiptNo}</Link>
                    </td>
                    <td className="px-3 py-2.5">
                      {pay.donorMember ? (
                        <Link href={`/members/${pay.donorMember.id}`} className="hover:underline">{pay.donorNameSnapshot}</Link>
                      ) : (
                        <span>{pay.donorNameSnapshot}</span>
                      )}
                      {pay.donorMember ? <p className="num text-[11px] text-[var(--ink-muted)]">{pay.donorMember.memberNo}</p> : null}
                    </td>
                    <td className="num px-3 py-2.5 text-[var(--ink-muted)]">{formatDate(pay.paymentDate)}</td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      {PAYMENT_MODE_LABELS[pay.mode] ?? pay.mode}
                      {pay.referenceNo ? <p className="num text-[11px] text-[var(--ink-muted)]">{pay.referenceNo}</p> : null}
                    </td>
                    <td className="hidden px-3 py-2.5 lg:table-cell"><VerificationBadge status={pay.verificationStatus} /></td>
                    <td className="num px-3 py-2.5 text-end font-medium">{formatPaise(pay.amountPaise)}</td>
                    <td className="px-4 py-2.5 text-end"><PaymentStatusBadge status={pay.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-xs text-[var(--ink-muted)]" aria-label="Pagination">
          <span>{page} / {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={`/transactions?${qs({ page: String(page - 1) })}`}><Button variant="secondary" size="sm">←</Button></Link> : null}
            {page < totalPages ? <Link href={`/transactions?${qs({ page: String(page + 1) })}`}><Button variant="secondary" size="sm">→</Button></Link> : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}
