"use client";

import { formatPaisePlain } from "@/lib/money";
import { paiseToHindiWords, formatIndianNumber } from "@/lib/hindi-number-words";

interface ReceiptTemplateProps {
  masjidName: string;
  masjidAddress?: string;
  masjidPhone?: string;
  receiptNo: string;
  date: string; // formatted date like "24 Oct 2026"
  donorName: string;
  memberNo?: string; // Member number for registered members (walk-in donors have no memberNo)
  amountPaise: number;
  amountWords: string; // Hindi words from paiseToHindiWords
  categoryName: string;
  paymentMode: "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER";
  collector: string;
  footerText: string; // "जज़ाकल्लाह ख़ैर। अल्लाह आपके माल में बरकत दे।"
  isDuplicate?: boolean;
  isCancelled?: boolean;
  className?: string;
}

export function ReceiptTemplate({
  masjidName,
  masjidAddress,
  masjidPhone,
  receiptNo,
  date,
  donorName,
  memberNo,
  amountPaise,
  amountWords,
  categoryName,
  paymentMode,
  collector,
  footerText,
  isDuplicate = false,
  isCancelled = false,
  className,
}: ReceiptTemplateProps) {
  const formattedAmount = formatPaisePlain(amountPaise);
  const formattedAmountIndian = formatIndianNumber(Math.floor(amountPaise / 100));

  return (
    <article
      className={`print-sheet relative mx-auto w-full max-w-[210mm] rounded-[24px] border-2 border-[var(--brand-primary)] bg-[var(--receipt-cream)] p-5 sm:p-8 shadow-sm ${className || ""}`}
      aria-label={`Receipt ${receiptNo}`}
    >
      {/* Watermark star */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-[22px]">
        <svg className="w-[60%] h-[60%] opacity-[0.08]" viewBox="0 0 100 100" fill="#E3F3EA">
          <path d="M50 4 L60 35 L95 35 L68 55 L78 90 L50 70 L22 90 L32 55 L5 35 L40 35 Z" />
        </svg>
      </div>

      {/* Duplicate / Cancelled watermark */}
      {(isDuplicate || isCancelled) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-[22px]">
          <span className="-rotate-[18deg] text-5xl sm:text-6xl font-bold uppercase tracking-[0.2em] text-black/[0.045]">
            {isCancelled ? "रद्द" : "नकल"}
          </span>
        </div>
      )}

      {/* Outer double border */}
      <div className="absolute inset-0 border border-[var(--brand-primary)] rounded-[22px] pointer-events-none" />
      <div className="absolute inset-[3px] border border-[var(--gold-accent)] rounded-[20px] pointer-events-none" />

      {/* Header band */}
      <div className="relative mx-[-20px] mb-6 rounded-t-[22px] bg-[var(--brand-hero)] px-5 py-5 sm:mx-[-24px] sm:mb-8 sm:px-8 sm:py-6 border-b-2 border-[var(--brand-primary)]">
        {/* Crescent and star icons on corners */}
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--gold-accent)]">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 3.74 2.17 6.95 5.2 8.6L12 22l4.8-1.4C19.83 18.95 22 15.74 22 12S17.52 2 12 2zm0 2c3.53 0 6.43 2.61 6.92 6H21.17C20.63 5.02 15.84 2 12 2zm7 13.78C17.2 15.3 14.26 16 12 16c-2.26 0-5.2-.7-7.17-2.22L12 4.4l7.17 11.38z"/>
          </svg>
        </div>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--gold-accent)]">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 3.74 2.17 6.95 5.2 8.6L12 22l4.8-1.4C19.83 18.95 22 15.74 22 12S17.52 2 12 2zm0 2c3.53 0 6.43 2.61 6.92 6H21.17C20.63 5.02 15.84 2 12 2zm7 13.78C17.2 15.3 14.26 16 12 16c-2.26 0-5.2-.7-7.17-2.22L12 4.4l7.17 11.38z"/>
          </svg>
        </div>

        <p className="text-white font-manrope font-bold text-[28px] sm:text-[38px] text-center leading-tight">
          {masjidName}
        </p>
        {(masjidAddress || masjidPhone) && (
          <p className="mt-2 text-[11px] sm:text-[12px] font-manrope font-medium uppercase tracking-[0.1em] text-[var(--gold-accent)] text-center">
            {(masjidAddress ? masjidAddress : "") + (masjidAddress && masjidPhone ? "  |  " : "") + (masjidPhone ? masjidPhone : "")}
          </p>
        )}
      </div>

      {/* Gold ribbon "रसीद" */}
      <div className="flex justify-center mb-6">
        <div className="rounded-[999px] bg-[var(--gold-accent)] px-6 py-1.5 sm:px-8 sm:py-2">
          <span className="text-black font-manrope font-bold text-[16px] sm:text-[19px] tracking-wide">रसीद</span>
        </div>
      </div>

      {/* Fields with dotted lines and numbered badges */}
      <div className="space-y-4">
        {/* Row 1: रसीद संख्या | दिनांक */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-baseline gap-3">
            <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-manrope font-bold text-[11px]">1</span>
            <div className="flex-1">
              <label className="block text-[13px] sm:text-[15px] font-bold text-[var(--brand-primary)]">रसीद संख्या</label>
              <div className="mt-1 border-b-2 border-dotted border-[var(--brand-primary)] min-h-[28px] flex items-end">
                <span className="font-manrope font-medium text-[13px] sm:text-[14px] text-[var(--ink-primary)]">{receiptNo}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-baseline gap-3">
            <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-manrope font-bold text-[11px]">2</span>
            <div className="flex-1">
              <label className="block text-[13px] sm:text-[15px] font-bold text-[var(--brand-primary)]">दिनांक</label>
              <div className="mt-1 border-b-2 border-dotted border-[var(--brand-primary)] min-h-[28px] flex items-end">
                <span className="font-manrope font-medium text-[13px] sm:text-[14px] text-[var(--ink-primary)]">{date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: (1) मोहतरम जनाब */}
        <div className="flex items-baseline gap-3">
          <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-manrope font-bold text-[11px]">3</span>
          <div className="flex-1">
            <label className="block text-[13px] sm:text-[15px] font-bold text-[var(--brand-primary)]">मोहतरम जनाब</label>
            <div className="mt-1 border-b-2 border-dotted border-[var(--brand-primary)] min-h-[28px] flex items-end">
              <span className="font-manrope font-semibold text-[14px] sm:text-[15px] text-[var(--ink-primary)]">
                {memberNo ? `${memberNo} — ${donorName}` : `__________ — ${donorName}`}
              </span>
            </div>
          </div>
        </div>

        {/* Row 3: (2) रुपये शब्दों में */}
        <div className="flex items-baseline gap-3">
          <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-manrope font-bold text-[11px]">4</span>
          <div className="flex-1">
            <label className="block text-[13px] sm:text-[15px] font-bold text-[var(--brand-primary)]">रुपये शब्दों में</label>
            <div className="mt-1 border-b-2 border-dotted border-[var(--brand-primary)] min-h-[28px] flex items-end">
              <span className="font-manrope text-[13px] sm:text-[14px] text-[var(--ink-primary)]">{amountWords}</span>
            </div>
          </div>
        </div>

        {/* Row 4: (3) आवंटन श्रेणी | (4) भुगतान का तरीका */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-baseline gap-3">
            <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-manrope font-bold text-[11px]">5</span>
            <div className="flex-1">
              <label className="block text-[13px] sm:text-[15px] font-bold text-[var(--brand-primary)]">आवंटन श्रेणी</label>
              <div className="mt-1 border-b-2 border-dotted border-[var(--brand-primary)] min-h-[28px] flex items-end">
                <span className="font-manrope font-medium text-[13px] sm:text-[14px] text-[var(--ink-primary)]">{categoryName}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-baseline gap-3">
            <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-manrope font-bold text-[11px]">6</span>
            <div className="flex-1">
              <label className="block text-[13px] sm:text-[15px] font-bold text-[var(--brand-primary)]">भुगतान का तरीका</label>
              <div className="mt-1 flex items-center gap-3">
                {["Cash", "UPI", "Bank Transfer", "Other"].map((mode) => (
                  <label key={mode} className="flex items-center gap-1.5 cursor-default">
                    <input
                      type="checkbox"
                      checked={paymentMode === mode.toUpperCase().replace(" ", "_")}
                      disabled
                      className="w-4 h-4 rounded border-[var(--brand-primary)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                    />
                    <span className="text-[12px] sm:text-[13px] text-[var(--ink-primary)]">{mode === "Bank Transfer" ? "बैंक ट्रांसफर" : mode === "Cash" ? "कैश" : mode}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Amount box and receiver section */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        {/* Left: Amount received box */}
        <div className="flex-1 relative rounded-lg border-2 border-[var(--brand-primary)] bg-[var(--surface-card)] p-4 sm:p-5 min-h-[80px] sm:min-h-[90px]">
          {/* Gold inner border */}
          <div className="absolute inset-[2px] border border-[var(--gold-accent)] rounded-[8px] pointer-events-none" />

          <div className="relative z-10 text-center">
            <p className="text-[11px] sm:text-[12px] font-manrope font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted-new)]">प्राप्त राशि</p>
            <p className="mt-1 num font-manrope font-bold text-[24px] sm:text-[28px] text-[var(--gold-accent)]">
              रु. {formattedAmountIndian}/-
            </p>
          </div>
        </div>

        {/* Right: Receiver / Collector */}
        <div className="flex-1 flex flex-col items-start sm:items-end justify-center gap-2 text-right">
          <div className="w-full sm:w-auto">
            <p className="text-[12px] sm:text-[13px] font-medium text-[var(--ink-primary)]">
              प्राप्तकर्ता: <span className="font-manrope font-semibold">{collector}</span>
            </p>
          </div>
          <div className="w-full sm:w-auto border-t border-[var(--ink-muted-new)] pt-2">
            <p className="text-[11px] sm:text-[12px] font-manrope font-medium text-[var(--ink-muted-new)]">अधिकृत हस्ताक्षर</p>
          </div>
        </div>
      </div>

      {/* Footer band */}
      <div className="mt-6 mx-[-20px] mb-[-20px] rounded-b-[22px] bg-[var(--brand-hero)] px-5 py-4 sm:mx-[-24px] sm:mb-[-24px] sm:px-8 sm:py-5 border-t-2 border-[var(--brand-primary)]">
        <p className="text-white text-center text-[11px] sm:text-[12.5px] font-manrope leading-relaxed">
          {footerText}
        </p>
      </div>
    </article>
  );
}