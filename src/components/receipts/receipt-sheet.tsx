"use client";

import type { ReceiptView } from "@/modules/receipts/view";

/** The receipt sheet. A5 Portrait (148mm x 210mm), Mint Green design. */
export function ReceiptSheet({ view, taxNote }: { view: ReceiptView; taxNote: string }) {
  const isCancelled = view.status === "REVERSED";
  const isDuplicate = view.isDuplicate;

  // Format amount digits (without ₹ symbol)
  const amountDigits = view.amountText?.replace("₹", "").replace(/,/g, "").trim() || "—";

  // Category/purpose
  const categoryName = view.purposes.map(p => p.name).join(", ") || "—";

  // Payment mode in Hindi
  const modeMap: Record<string, string> = {
    CASH: "कैश",
    UPI: "यूपीआई",
    BANK_TRANSFER: "बैंक ट्रांसफर",
    OTHER: "अन्य",
  };
  const paymentMode = modeMap[view.mode] || view.mode;

  // Collector
  const collector = view.collector || "—";

  // Footer text
  const footerText = view.footer || taxNote;

  return (
    <div className="relative w-full no-print" style={{ maxWidth: '100%' }}>
      <article
        className="print-sheet relative mx-auto rounded-[24px] border-2 border-[var(--brand-primary)] bg-[var(--receipt-cream)] p-[15mm_12mm] shadow-sm"
        aria-label={`Receipt ${view.receiptNo}`}
        style={{
          width: '148mm',
          height: '210mm',
          minWidth: '148mm',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
      {/* Watermark */}
      <div className="watermark absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-[20px]">
        <svg viewBox="0 0 100 100" fill="#E3F3EA" width="60%" height="60%" style={{opacity: 0.08}}>
          <path d="M50 4 L60 35 L95 35 L68 55 L78 90 L50 70 L22 90 L32 55 L5 35 L40 35 Z" />
        </svg>
      </div>

      {/* Status watermark (Duplicate/Cancelled) */}
      {(isDuplicate || isCancelled) && (
        <div className="status-watermark absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-[20px]">
          <span style={{
            transform: 'rotate(-18deg)',
            fontSize: '48px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'rgba(0, 0, 0, 0.045)',
            whiteSpace: 'nowrap',
          }}>
            {isCancelled ? "रद्द" : "नकल"}
          </span>
        </div>
      )}

      {/* Double border */}
      <div className="double-border-outer absolute inset-0 border border-[var(--brand-primary)] rounded-[22px] pointer-events-none" />
      <div className="double-border-inner absolute inset-[3px] border border-[var(--gold-accent)] rounded-[20px] pointer-events-none" />

      {/* Header band */}
      <div className="header-band relative -mx-[12px] mb-5 px-[12px] py-[16px] rounded-t-[22px] bg-[var(--brand-hero)] border-b-2 border-[var(--brand-primary)]">
        <div className="corner-icon absolute top-1/2 -translate-y-1/2 left-[12px] text-[var(--gold-accent)]">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M12 2C6.48 2 2 6.48 2 12c0 3.74 2.17 6.95 5.2 8.6L12 22l4.8-1.4C19.83 18.95 22 15.74 22 12S17.52 2 12 2zm0 2c3.53 0 6.43 2.61 6.92 6H21.17C20.63 5.02 15.84 2 12 2zm7 13.78C17.2 15.3 14.26 16 12 16c-2.26 0-5.2-.7-7.17-2.22L12 4.4l7.17 11.38z"/></svg>
        </div>
        <div className="corner-icon absolute top-1/2 -translate-y-1/2 right-[12px] text-[var(--gold-accent)]">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M12 2C6.48 2 2 6.48 2 12c0 3.74 2.17 6.95 5.2 8.6L12 22l4.8-1.4C19.83 18.95 22 15.74 22 12S17.52 2 12 2zm0 2c3.53 0 6.43 2.61 6.92 6H21.17C20.63 5.02 15.84 2 12 2zm7 13.78C17.2 15.3 14.26 16 12 16c-2.26 0-5.2-.7-7.17-2.22L12 4.4l7.17 11.38z"/></svg>
        </div>
        <h1 className="text-white font-poppins font-bold text-[38px] text-center leading-[1.2]">
          {view.masjid.name}
        </h1>
        {(view.masjid.address || view.masjid.phone) && (
          <div className="mt-2 font-poppins font-medium text-[12px] uppercase tracking-[0.1em] text-[var(--gold-accent)] text-center">
            {view.masjid.address}{view.masjid.address && view.masjid.phone ? "  |  " : ""}{view.masjid.phone}
          </div>
        )}

        {/* Receipt No (Left) and Date (Right) under header */}
        <div className="mt-4 flex justify-between items-center px-2">
          <div className="text-left">
            <label className="block font-poppins font-bold text-[13px] text-[var(--gold-accent)] uppercase tracking-[0.05em] mb-1">रसीद संख्या</label>
            <div className="font-poppins font-medium text-[16px] text-white">{view.receiptNo}</div>
          </div>
          <div className="text-right">
            <label className="block font-poppins font-bold text-[13px] text-[var(--gold-accent)] uppercase tracking-[0.05em] mb-1">दिनांक</label>
            <div className="font-poppins font-medium text-[16px] text-white">{view.paymentDate}</div>
          </div>
        </div>
      </div>

      {/* Ribbon */}
      <div className="ribbon flex justify-center mb-6">
        <span className="inline-block px-[32px] py-[8px] rounded-full bg-[var(--gold-accent)] text-black font-poppins font-bold text-[19px] tracking-[0.05em] whitespace-nowrap">
          रसीद
        </span>
      </div>

      {/* Fields - without numbered badges */}
      <div className="fields flex flex-col gap-4">
        <div className="field-row flex flex-col sm:flex-row gap-3">
          <div className="field flex flex-1 items-baseline gap-3">
            <div className="field-content flex-1">
              <label className="field-label block font-poppins font-bold text-[15px] text-[var(--brand-primary)] mb-1">मोहतरम जनाब</label>
              <div className="field-value-line border-b-2 border-dotted border-[var(--brand-primary)] min-h-[28px] flex items-end">
                <span className="field-value field-value-strong font-poppins font-semibold text-[14px] text-[var(--ink-primary)]">{view.donorName || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="field-row flex flex-col sm:flex-row gap-3">
          <div className="field flex flex-1 items-baseline gap-3">
            <div className="field-content flex-1">
              <label className="field-label block font-poppins font-bold text-[15px] text-[var(--brand-primary)] mb-1">रुपये शब्दों में</label>
              <div className="field-value-line border-b-2 border-dotted border-[var(--brand-primary)] min-h-[28px] flex items-end">
                <span className="field-value field-value-text font-poppins font-normal text-[14px] text-[var(--ink-primary)]">{view.amountWords}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="field-row flex flex-col sm:flex-row gap-3">
          <div className="field flex flex-1 items-baseline gap-3">
            <div className="field-content flex-1">
              <label className="field-label block font-poppins font-bold text-[15px] text-[var(--brand-primary)] mb-1">आवंटन श्रेणी</label>
              <div className="field-value-line border-b-2 border-dotted border-[var(--brand-primary)] min-h-[28px] flex items-end">
                <span className="field-value field-value-strong font-poppins font-semibold text-[14px] text-[var(--ink-primary)]">{categoryName}</span>
              </div>
            </div>
          </div>
          <div className="field flex flex-1 items-baseline gap-3">
            <div className="field-content flex-1">
              <label className="field-label block font-poppins font-bold text-[15px] text-[var(--brand-primary)] mb-1">भुगतान का तरीका</label>
              <div className="payment-modes flex flex-wrap gap-3 mt-1">
                {["CASH", "UPI", "BANK_TRANSFER", "OTHER"].map((mode) => (
                  <label key={mode} className="payment-mode-item flex items-center gap-2">
                    <input type="checkbox" disabled checked={view.mode === mode} className="w-4 h-4 accent-[var(--brand-primary)]" />
                    <span className="font-poppins text-[13px] text-[var(--ink-primary)]">{modeMap[mode] || mode}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Amount & Receiver */}
      <div className="amount-receiver flex flex-col sm:flex-row gap-4 mt-6">
        <div className="amount-box flex-1 relative border-2 border-[var(--brand-primary)] rounded-[12px] bg-white p-5 min-h-[90px] flex flex-col items-center justify-center">
          <div className="absolute inset-[2px] border border-[var(--gold-accent)] rounded-[8px] pointer-events-none" />
          <p className="amount-label font-poppins font-semibold text-[12px] uppercase tracking-[0.1em] text-[var(--ink-muted-new)] mb-1">प्राप्त राशि</p>
          <p className="amount-value font-poppins font-bold text-[28px] text-[var(--gold-accent)]">रु. {amountDigits}/-</p>
          <p className="amount-words font-poppins font-normal text-[13px] text-[var(--ink-primary)] mt-2 text-center leading-[1.4]">{view.amountWords}</p>
        </div>
        <div className="receiver-box flex-1 flex flex-col items-end justify-center text-right">
          <p className="receiver-name font-poppins text-[13px] text-[var(--ink-primary)]">प्राप्तकर्ता: <strong>{collector}</strong></p>
          <div className="signature-line w-full border-t border-[var(--ink-muted)] pt-2 mt-2">
            <p className="signature-text font-poppins font-medium text-[12px] text-[var(--ink-muted)]">अधिकृत हस्ताक्षर</p>
          </div>
        </div>
      </div>

      {/* Footer band */}
      <div className="footer-band mx-[-12px] mt-5 mb-[-12px] -ml-[12px] -mr-[12px] px-[12px] py-[14px] rounded-b-[22px] bg-[var(--brand-hero)] border-t-2 border-[var(--brand-primary)]">
        <p className="text-white text-center font-poppins text-[12.5px] leading-[1.6]">{footerText}</p>
      </div>
    </article>
    </div>
  );
}