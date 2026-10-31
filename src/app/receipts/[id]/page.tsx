import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/i18n";
import { can } from "@/lib/permissions";
import { ROLES } from "@/lib/constants";
import { ReceiptSheet } from "@/components/receipts/receipt-sheet";
import { ReceiptActions } from "./receipt-actions";
import { ReversePayment } from "./reverse-payment";
import { AutoPrint } from "./auto-print";
import { requireReceipt } from "@/modules/receipts/load";
import { buildReceiptView } from "@/modules/receipts/view";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duplicate?: string; issued?: string; print?: string }>;
}) {
  const user = await requireUser();
  const { t } = await getDictionary();
  const { id } = await params;
  const sp = await searchParams;

  const payment = await requireReceipt(id);
  const duplicate = sp.duplicate === "1";

  const view = buildReceiptView(payment, {
    duplicate,
    footerText: t("thankYou"),
    taxNote: t("taxNote"),
  });

  const isStaff = user.role !== ROLES.MEMBER;
  const whatsappText = [
    `${view.masjid.name} — ${t("receipt")} ${view.receiptNo}`,
    `${t("receivedFrom")}: ${view.donorName}`,
    `${t("amount")}: ${view.amountText}`,
    `${t("date")}: ${view.paymentDate}`,
    view.purposes.map((p) => `${p.name}: ${p.amountText}`).join("\n"),
    `${t("thankYou")}`,
  ].join("\n");

  return (
    <>
      {sp.print === "1" ? <AutoPrint /> : null}
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("receipt")}</h1>
          <p className="num mt-0.5 text-sm text-[var(--ink-muted)]">{view.receiptNo} · {view.amountText}</p>
        </div>
        <ReceiptActions
          paymentId={payment.id}
          receiptNo={view.receiptNo}
          donorName={view.donorName}
          amountText={view.amountText}
          whatsappText={whatsappText}
          canReprint={can(user.role, "receipt:reprint")}
          isDuplicateCopy={duplicate}
          labels={{
            print: t("print"),
            downloadPdf: t("downloadPdf"),
            shareWhatsApp: t("shareWhatsApp"),
            reprint: t("reprint"),
            duplicate: t("duplicate"),
          }}
        />
      </div>

      {sp.issued === "1" && !duplicate ? (
        <p className="no-print mb-4 rounded-lg border border-[#cfe6da] bg-[var(--success-soft)] px-3 py-2 text-xs font-medium text-[var(--success)]">
          {t("saved")} · {t("receipt")} {view.receiptNo}
        </p>
      ) : null}

      {duplicate ? (
        <p className="no-print mb-4 rounded-lg border border-[#e6d9b4] bg-[var(--gold-soft)] px-3 py-2 text-xs font-medium text-[var(--gold)]">
          {t("duplicate")} — {t("receiptNo")} {view.receiptNo}
        </p>
      ) : null}

      <ReceiptSheet view={view} taxNote={t("taxNote")} />

      {isStaff && can(user.role, "payment:reverse") && view.status !== "REVERSED" ? (
        <div className="no-print mt-6 flex justify-end">
          <ReversePayment
            paymentId={payment.id}
            receiptNo={view.receiptNo}
            amountText={view.amountText}
            labels={{
              reverse: t("reverse"),
              reversePayment: t("reversePayment"),
              reverseReason: t("reverseReason"),
              required: t("required"),
              cancel: t("cancel"),
              loading: t("loading"),
              errorGeneric: t("errorGeneric"),
            }}
          />
        </div>
      ) : null}

      {isStaff ? (
        <div className="no-print mt-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">{t("auditLog")}</h2>
          <ul className="space-y-1 text-[11px] text-[var(--ink-muted)]">
            {payment.receiptEvents.map((e) => (
              <li key={e.id}>
                <span className="font-medium text-[var(--ink)]">{e.eventType}</span> · {new Date(e.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                {e.reason ? ` · ${e.reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
