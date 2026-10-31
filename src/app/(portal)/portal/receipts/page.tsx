import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { getDictionary } from "@/i18n";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { PAYMENT_MODE_LABELS } from "@/lib/constants";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { PaymentStatusBadge } from "@/components/status-badges";
import { portalSummary, requirePortalMember } from "@/modules/portal/queries";

export const dynamic = "force-dynamic";

export default async function PortalReceiptsPage() {
  const { user, member } = await requirePortalMember();
  const { t } = await getDictionary();
  const summary = await portalSummary(member.id, user.masjidId!);

  return (
    <>
      <PageHeader title={t("myReceipts")} description={member.memberNo} />

      <Card>
        {summary.payments.length === 0 ? (
          <EmptyState title={t("noData")} description={t("taxNote")} />
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {summary.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/receipts/${p.id}`} className="num text-sm font-medium text-[var(--brand)] hover:underline">
                      {p.receiptNo}
                    </Link>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                  <p className="num text-[11px] text-[var(--ink-muted)]">
                    {formatDate(p.paymentDate)} · {PAYMENT_MODE_LABELS[p.mode] ?? p.mode}
                    {p.allocations.length > 0 ? ` · ${p.allocations.map((a) => a.category.name).join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-sm font-semibold">{formatPaise(p.amountPaise)}</span>
                  <Link
                    href={`/api/receipts/${p.id}/pdf`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-[11px] text-[var(--ink)] hover:bg-[var(--surface)]"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Link>
                  <Link
                    href={`/receipts/${p.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-[11px] text-[var(--ink)] hover:bg-[var(--surface)]"
                  >
                    <FileText className="h-3.5 w-3.5" /> {t("receipt")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
