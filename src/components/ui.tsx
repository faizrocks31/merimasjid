"use client";

import type { ReactNode, HTMLAttributes, LabelHTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { X, Minus, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { formatPaise, formatPaisePlain } from "@/lib/money";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-[0_1px_2px_rgba(20,32,26,0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold tracking-wide text-[var(--ink)]", className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type ButtonSize = "sm" | "md";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--brand)] text-white hover:bg-[var(--brand-deep)] border-transparent",
  secondary: "bg-white text-[var(--ink)] border-[var(--border-subtle)] hover:bg-[var(--surface)]",
  ghost: "bg-transparent text-[var(--ink-muted)] border-transparent hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]",
  danger: "bg-[var(--danger)] text-white border-transparent hover:opacity-90",
  gold: "bg-[var(--gold-soft)] text-[var(--gold)] border-[#e6d9b4] hover:bg-[#f1e4c6]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-[var(--ink-muted)]", className)} {...props} />;
}

const fieldBase =
  "w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 py-2.5 text-base text-[var(--ink)] placeholder:text-[#9aa69f] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24", className)} {...props} />;
}

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="mt-1 text-[11px] text-[var(--ink-muted)]">{hint}</p> : null}
      {error ? <p className="mt-1 text-[11px] font-medium text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "brand" | "gold" | "trial" | "grace";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-[#f1f0ea] text-[var(--ink-muted)] border-[#e2e0d6]",
  success: "bg-[var(--success-soft)] text-[var(--success)] border-[#cfe6da]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-[#efdcb8]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-[#f0cfcf]",
  brand: "bg-[var(--brand-soft)] text-[var(--brand-deep)] border-[#cfe0d5]",
  gold: "bg-[var(--gold-soft)] text-[var(--gold)] border-[#e6d9b4]",
  trial: "bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7]",
  grace: "bg-[#fff8e1] text-[#f57f17] border-[#ffe082]",
};

export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-medium text-[var(--ink)]">{title}</p>
      {description ? <p className="max-w-sm text-xs text-[var(--ink-muted)]">{description}</p> : null}
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">{title}</h1>
        {description ? <p className="mt-1 text-base text-[var(--ink-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: BadgeTone }) {
  const accent: Record<BadgeTone, string> = {
    neutral: "border-t-[var(--ink-muted)]",
    success: "border-t-[var(--success)]",
    warning: "border-t-[var(--warning)]",
    danger: "border-t-[var(--danger)]",
    brand: "border-t-[var(--brand)]",
    gold: "border-t-[var(--gold)]",
    trial: "border-t-[var(--success)]",
    grace: "border-t-[var(--warning)]",
  };
  return (
    <Card className={cn("border-t-2", accent[tone])}>
      <div className="px-4 py-3.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">{label}</p>
        <p className="num mt-1.5 text-xl font-semibold text-[var(--ink)]">{value}</p>
        {sub ? <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">{sub}</p> : null}
      </div>
    </Card>
  );
}

/* ============================================
   NEW COMPONENTS FOR RECEIVE PAYMENT REDESIGN
   ============================================ */

// Segmented Control (Member | Walk-in donor)
interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SegmentedControl({ options, value, onChange, className, disabled }: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--surface-field)] p-1",
        className,
      )}
      role="radiogroup"
      aria-disabled={disabled}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => !disabled && onChange(option.value)}
          disabled={disabled}
          className={cn(
            "relative z-10 flex items-center gap-1.5 rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium transition-all duration-150",
            value === option.value
              ? "bg-[var(--brand-primary)] text-white shadow-sm"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Amount Input - Large display that is a real input
interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  variant?: "hero" | "default"; // hero: used on colored cards, default: used on white cards
  allowDecimals?: boolean; // if false, only allow whole numbers
}

export function AmountInput({ value, onChange, onBlur, placeholder = "0.00", disabled, error, className, variant = "default", allowDecimals = true }: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState(value);

  // Format on blur with Indian grouping
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[₹,\s]/g, "");
    if (raw && !isNaN(Number(raw))) {
      const num = Number(raw);
      if (allowDecimals) {
        const formatted = num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setDisplayValue(formatted);
        onChange(formatted);
      } else {
        // Whole numbers only - no decimals
        const formatted = num.toLocaleString("en-IN");
        setDisplayValue(formatted);
        onChange(formatted);
      }
    }
    onBlur?.();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (allowDecimals) {
      // Allow only digits and one decimal point
      let val = e.target.value.replace(/[^0-9.]/g, "");
      const parts = val.split(".");
      if (parts.length > 2) {
        val = parts[0] + "." + parts.slice(1).join("");
      }
      if (parts[1] && parts[1].length > 2) {
        val = parts[0] + "." + parts[1].slice(0, 2);
      }
      // Strip leading zeros
      if (parts[0]) {
        parts[0] = parts[0].replace(/^0+/, "") || "0";
        val = parts.join(".");
      }
      setDisplayValue(val);
      onChange(val);
    } else {
      // Whole numbers only - strip non-digits
      let val = e.target.value.replace(/[^0-9]/g, "");
      // Strip leading zeros
      val = val.replace(/^0+/, "") || "0";
      setDisplayValue(val);
      onChange(val);
    }
  };

  // Show raw value on focus for editing
  const handleFocus = () => {
    setDisplayValue(value);
  };

  const isHero = variant === "hero";

  return (
    <div className={cn("relative", className)}>
      <label className="sr-only">Amount in Rupees</label>
      <span className={cn(
        "absolute left-4 top-1/2 -translate-y-1/2 font-manrope font-semibold",
        isHero ? "text-white" : "text-[var(--gold-accent)]"
      )} aria-hidden="true">₹</span>
      <input
        type="text"
        inputMode={allowDecimals ? "decimal" : "numeric"}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full border-0 outline-none text-right pr-4 pl-10 font-manrope font-extrabold",
          "focus:ring-0 disabled:opacity-50",
          "[&::placeholder]:text-[var(--ink-muted-new)]",
          isHero
            ? "bg-transparent text-white placeholder:text-white/60 text-[48px]" // smaller, white text for hero card
            : "bg-transparent text-[var(--ink-primary)] placeholder:text-[var(--ink-muted-new)] text-[72px]",
        )}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? "amount-error" : undefined}
      />
      {error && <p id="amount-error" className="mt-1 text-sm text-[var(--danger)]" role="alert">{error}</p>}
    </div>
  );
}

// Quick Amount Chips
interface QuickAmountChipsProps {
  amounts: number[]; // in paise
  selectedAmount: number; // in paise
  onSelect: (amount: number) => void;
  className?: string;
  disabled?: boolean;
}

export function QuickAmountChips({ amounts, selectedAmount, onSelect, className, disabled }: QuickAmountChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="group" aria-label="Quick amounts">
      {amounts.map((amount) => (
        <button
          key={amount}
          type="button"
          onClick={() => !disabled && onSelect(amount)}
          disabled={disabled}
          className={cn(
            "rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap",
            selectedAmount === amount
              ? "bg-[var(--gold-accent)] text-[var(--gold-text)] shadow-sm"
              : "bg-[var(--surface-card)] border border-[var(--border-tile)] text-[var(--ink-primary)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-soft)]",
          )}
        >
          {formatPaisePlain(amount)}
        </button>
      ))}
    </div>
  );
}

// Payment Mode Tiles (radio group)
interface PaymentModeTileProps {
  value: "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER";
  selected: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  labels: { cash: string; upi: string; bankTransfer: string; other: string };
}

const modeIcons = {
  CASH: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2" />
      <path d="M2 12h20" />
      <path d="M10 16h.01" />
      <path d="M14 16h.01" />
      <path d="M18 16h.01" />
    </svg>
  ),
  UPI: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M6 9h12" />
      <path d="M6 14h8" />
      <path d="M16 9v5" />
    </svg>
  ),
  BANK_TRANSFER: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 7V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" />
      <path d="M6 9h16" />
      <path d="M12 12v9" />
      <path d="M8 21h8" />
      <path d="M3 21h18" />
    </svg>
  ),
  OTHER: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  ),
};

const modeLabels = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank",
  OTHER: "Cheque",
};

export function PaymentModeTiles({ value, selected, onChange, disabled, className, labels }: PaymentModeTileProps) {
  const modes: Array<"CASH" | "UPI" | "BANK_TRANSFER" | "OTHER"> = ["CASH", "UPI", "BANK_TRANSFER", "OTHER"];

  return (
    <div className={cn("grid grid-cols-4 gap-2", className)} role="radiogroup" aria-label="Payment mode">
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={selected === mode}
          onClick={() => !disabled && onChange(mode)}
          disabled={disabled}
          className={cn(
            "relative flex flex-col items-center gap-2 rounded-[var(--radius-tile)] border-2 p-4 py-5 transition-all duration-150",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2",
            selected === mode
              ? "border-[var(--brand-primary)] bg-[var(--brand-soft)]"
              : "border-[var(--border-tile)] bg-[var(--surface-card)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-soft)]",
          )}
        >
          <span className={cn("text-[var(--ink-primary)]", selected === mode && "text-[var(--brand-primary)]")}>
            {modeIcons[mode]}
          </span>
          <span className={cn(
            "text-sm font-medium",
            selected === mode ? "text-[var(--brand-primary)]" : "text-[var(--ink-muted-new)]"
          )}>
            {labels[mode.toLowerCase() as keyof typeof labels] || modeLabels[mode]}
          </span>
        </button>
      ))}
    </div>
  );
}

// Purpose/Allocation Chips
interface AllocationChipProps {
  id: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function AllocationChip({ id, label, selected, onClick, disabled, className }: AllocationChipProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      className={cn(
        "rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap",
        selected
          ? "bg-[var(--brand-primary)] text-white shadow-sm"
          : "bg-[var(--surface-field)] text-[var(--ink-primary)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-primary)]",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {label}
    </button>
  );
}

// Receipt Preview Card - matches the new PDF/print design (A5 landscape, Mint Green)
interface ReceiptPreviewProps {
  masjidName: string;
  masjidAddress?: string | null;
  masjidPhone?: string | null;
  donorName: string;
  memberNo?: string;
  categoryName: string;
  mode: string;
  date: string;
  amountPaise: number;
  amountWords: string;
  receiptNumber: string;
  isPreview: boolean;
  className?: string;
}

export function ReceiptPreview({
  masjidName,
  masjidAddress,
  masjidPhone,
  donorName,
  memberNo,
  categoryName,
  mode,
  date,
  amountPaise,
  amountWords,
  receiptNumber,
  isPreview,
  className,
}: ReceiptPreviewProps) {
  const formattedAmount = formatPaise(amountPaise);
  const amountDigits = formattedAmount.replace("₹", "").replace(/,/g, "").trim();

  // Payment mode in Hindi
  const modeMap: Record<string, string> = {
    CASH: "कैश",
    UPI: "यूपीआई",
    BANK_TRANSFER: "बैंक ट्रांसफर",
    OTHER: "अन्य",
  };
  const paymentMode = modeMap[mode] || mode;

  return (
    <div className="relative w-full overflow-x-auto no-print" style={{ maxWidth: '100%' }}>
      <div
        className={cn(
          "print-sheet relative rounded-[24px] border-2 border-[var(--brand-primary)] bg-[var(--receipt-cream)] p-5",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label="Receipt preview"
        style={{
          maxWidth: '100%',
          width: '100%',
          aspectRatio: '210 / 148.5',
          boxSizing: 'border-box',
          flexShrink: 0,
          minWidth: 0,
        }}
      >
      {/* Watermark */}
      <div className="watermark absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-[20px]">
        <svg viewBox="0 0 100 100" fill="#E3F3EA" width="60%" height="60%" style={{opacity: 0.08}}>
          <path d="M50 4 L60 35 L95 35 L68 55 L78 90 L50 70 L22 90 L32 55 L5 35 L40 35 Z" />
        </svg>
      </div>

      {/* Double border */}
      <div className="double-border-outer absolute inset-0 border border-[var(--brand-primary)] rounded-[22px] pointer-events-none" />
      <div className="double-border-inner absolute inset-[3px] border border-[var(--gold-accent)] rounded-[20px] pointer-events-none" />

      {/* Header band */}
      <div className="header-band relative -mx-5 mb-5 px-5 py-4 rounded-t-[22px] bg-[var(--brand-hero)] border-b-2 border-[var(--brand-primary)]">
        <div className="corner-icon absolute top-1/2 -translate-y-1/2 left-5 text-[var(--gold-accent)]">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12c0 3.74 2.17 6.95 5.2 8.6L12 22l4.8-1.4C19.83 18.95 22 15.74 22 12S17.52 2 12 2zm0 2c3.53 0 6.43 2.61 6.92 6H21.17C20.63 5.02 15.84 2 12 2zm7 13.78C17.2 15.3 14.26 16 12 16c-2.26 0-5.2-.7-7.17-2.22L12 4.4l7.17 11.38z"/></svg>
        </div>
        <div className="corner-icon absolute top-1/2 -translate-y-1/2 right-5 text-[var(--gold-accent)]">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12c0 3.74 2.17 6.95 5.2 8.6L12 22l4.8-1.4C19.83 18.95 22 15.74 22 12S17.52 2 12 2zm0 2c3.53 0 6.43 2.61 6.92 6H21.17C20.63 5.02 15.84 2 12 2zm7 13.78C17.2 15.3 14.26 16 12 16c-2.26 0-5.2-.7-7.17-2.22L12 4.4l7.17 11.38z"/></svg>
        </div>
        <h1 className="text-white font-poppins font-bold text-[24px] text-center leading-[1.2]">
          {masjidName}
        </h1>
        {(masjidAddress || masjidPhone) && (
          <div className="mt-1 font-poppins font-medium text-[10px] uppercase tracking-[0.1em] text-[var(--gold-accent)] text-center">
            {masjidAddress}{masjidAddress && masjidPhone ? "  |  " : ""}{masjidPhone}
          </div>
        )}
      </div>

      {/* Ribbon */}
      <div className="ribbon flex justify-center mb-4">
        <span className="inline-block px-6 py-2 rounded-full bg-[var(--gold-accent)] text-black font-poppins font-bold text-[14px] tracking-[0.05em] whitespace-nowrap">
          रसीद
        </span>
      </div>

      {/* Fields */}
      <div className="fields flex flex-col gap-3">
        <div className="field-row flex flex-col sm:flex-row gap-2">
          <div className="field flex flex-1 items-baseline gap-2">
            <span className="field-badge w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-poppins font-bold text-[10px]">1</span>
            <div className="field-content flex-1">
              <label className="field-label block font-poppins font-bold text-[13px] text-[var(--brand-primary)] mb-0.5">रसीद संख्या</label>
              <div className="field-value-line border-b-2 border-dotted border-[var(--brand-primary)] min-h-[24px] flex items-end">
                <span className="field-value font-poppins font-medium text-[12px] text-[var(--ink-primary)]">{isPreview ? "Auto-generated" : receiptNumber}</span>
              </div>
            </div>
          </div>
          <div className="field flex flex-1 items-baseline gap-2">
            <span className="field-badge w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-poppins font-bold text-[10px]">2</span>
            <div className="field-content flex-1">
              <label className="field-label block font-poppins font-bold text-[13px] text-[var(--brand-primary)] mb-0.5">दिनांक</label>
              <div className="field-value-line border-b-2 border-dotted border-[var(--brand-primary)] min-h-[24px] flex items-end">
                <span className="field-value font-poppins font-medium text-[12px] text-[var(--ink-primary)]">{date}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="field-row flex flex-col sm:flex-row gap-2">
          <div className="field flex flex-1 items-baseline gap-2">
            <span className="field-badge w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-poppins font-bold text-[10px]">3</span>
            <div className="field-content flex-1">
              <label className="field-label block font-poppins font-bold text-[13px] text-[var(--brand-primary)] mb-0.5">मोहतरम जनाब</label>
              <div className="field-value-line border-b-2 border-dotted border-[var(--brand-primary)] min-h-[24px] flex items-end">
                <span className="field-value field-value-strong font-poppins font-semibold text-[12px] text-[var(--ink-primary)]">
                  {memberNo ? `${memberNo} — ${donorName || "—"}` : `__________ — ${donorName || "—"}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="field-row flex flex-col sm:flex-row gap-2">
          <div className="field flex flex-1 items-baseline gap-2">
            <span className="field-badge w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-poppins font-bold text-[10px]">4</span>
            <div className="field-content flex-1">
              <label className="field-label block font-poppins font-bold text-[13px] text-[var(--brand-primary)] mb-0.5">रुपये शब्दों में</label>
              <div className="field-value-line border-b-2 border-dotted border-[var(--brand-primary)] min-h-[24px] flex items-end">
                <span className="field-value field-value-text font-poppins font-normal text-[12px] text-[var(--ink-primary)]">{amountWords}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="field-row flex flex-col sm:flex-row gap-2">
          <div className="field flex flex-1 items-baseline gap-2">
            <span className="field-badge w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-poppins font-bold text-[10px]">5</span>
            <div className="field-content flex-1">
              <label className="field-label block font-poppins font-bold text-[13px] text-[var(--brand-primary)] mb-0.5">आवंटन श्रेणी</label>
              <div className="field-value-line border-b-2 border-dotted border-[var(--brand-primary)] min-h-[24px] flex items-end">
                <span className="field-value field-value-strong font-poppins font-semibold text-[12px] text-[var(--ink-primary)]">{categoryName || "—"}</span>
              </div>
            </div>
          </div>
          <div className="field flex flex-1 items-baseline gap-2">
            <span className="field-badge w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-poppins font-bold text-[10px]">6</span>
            <div className="field-content flex-1">
              <label className="field-label block font-poppins font-bold text-[13px] text-[var(--brand-primary)] mb-0.5">भुगतान का तरीका</label>
              <div className="payment-modes flex flex-wrap gap-2 mt-1">
                {["CASH", "UPI", "BANK_TRANSFER", "OTHER"].map((m) => (
                  <label key={m} className="payment-mode-item flex items-center gap-1">
                    <input type="checkbox" disabled checked={mode === m} className="w-3 h-3 accent-[var(--brand-primary)]" />
                    <span className="font-poppins text-[11px] text-[var(--ink-primary)]">{modeMap[m] || m}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Amount & Receiver */}
      <div className="amount-receiver flex flex-col sm:flex-row gap-3 mt-4">
        <div className="amount-box flex-1 relative border-2 border-[var(--brand-primary)] rounded-[12px] bg-white p-4 min-h-[80px] flex flex-col items-center justify-center">
          <div className="absolute inset-[2px] border border-[var(--gold-accent)] rounded-[8px] pointer-events-none" />
          <p className="amount-label font-poppins font-semibold text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted-new)] mb-1">प्राप्त राशि</p>
          <p className="amount-value font-poppins font-bold text-[22px] text-[var(--gold-accent)]">रु. {amountDigits}/-</p>
          <p className="amount-words font-poppins font-normal text-[11px] text-[var(--ink-primary)] mt-1 text-center leading-[1.4]">{amountWords}</p>
        </div>
        <div className="receiver-box flex-1 flex flex-col items-end justify-center text-right">
          <p className="receiver-name font-poppins text-[11px] text-[var(--ink-primary)]">प्राप्तकर्ता: <strong>Collector</strong></p>
          <div className="signature-line w-full border-t border-[var(--ink-muted)] pt-1.5 mt-1">
            <p className="signature-text font-poppins font-medium text-[10px] text-[var(--ink-muted)]">अधिकृत हस्ताक्षर</p>
          </div>
        </div>
      </div>

      {/* Footer band */}
      <div className="footer-band mx-[-20px] mt-4 -ml-5 -mr-5 -mb-5 px-5 py-3 rounded-b-[22px] bg-[var(--brand-hero)] border-t-2 border-[var(--brand-primary)]">
        <p className="text-white text-center font-poppins text-[10px] leading-[1.6]">धन्यवाद! आपका योगदान सराहनीय है।</p>
      </div>
    </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-[var(--ink-muted-new)]">{label}</span>
      <span className="num text-sm font-medium text-[var(--ink-primary)] text-end min-w-[60%] truncate">{value}</span>
    </div>
  );
}

// Custom Numeric Keypad (mobile only)
interface KeypadProps {
  value: string;
  onChange: (value: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

export function Keypad({ value, onChange, onBackspace, disabled }: KeypadProps) {
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "⌫"],
  ];

  return (
    <div
      className="grid grid-cols-3 gap-2 p-2 lg:hidden"
      role="application"
      aria-label="Numeric keypad"
    >
      {keys.map((row, rowIndex) =>
        row.map((key, colIndex) => (
          <button
            key={`${rowIndex}-${colIndex}`}
            type="button"
            onClick={() => {
              if (key === "⌫") {
                onBackspace();
              } else if (!disabled) {
                onChange(key);
              }
            }}
            disabled={disabled}
            className={cn(
              "flex h-[60px] items-center justify-center rounded-[var(--radius-tile)] border border-[var(--border-tile)] bg-[var(--surface-card)] text-[var(--ink-primary)] font-manrope font-medium text-xl",
              "active:bg-[var(--brand-soft)] active:border-[var(--brand-primary)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              key === "⌫" && "text-[var(--ink-muted-new)]",
            )}
            aria-label={key === "⌫" ? "Backspace" : key}
          >
            {key === "⌫" ? (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <path d="M18 9l-6 6M12 9l6 6" />
              </svg>
            ) : (
              key
            )}
          </button>
        ))
      )}
    </div>
  );
}

// Pill Button (full width, 58px tall)
interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: ReactNode;
}

export function PillButton({ loading, children, disabled, className, ...props }: PillButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        "w-full h-[58px] rounded-[var(--radius-pill)] bg-[var(--brand-primary)] text-white font-manrope font-semibold text-base",
        "flex items-center justify-center gap-2 transition-all duration-150",
        "hover:bg-[var(--brand-hero)] active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      {loading ? (
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z">
            <animateTransform attributeName="transform" type="rotate" dur="1s" from="0 12 12" to="360 12 12" repeatCount="indefinite" />
          </path>
        </svg>
      ) : null}
      {children}
    </button>
  );
}

// Bottom Sheet (mobile)
interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="bottom-sheet-title">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 rounded-t-[var(--radius-card)] bg-[var(--surface-card)] shadow-xl",
          "animate-slide-up",
          className,
        )}
        style={{ maxHeight: "calc(100vh - env(safe-area-inset-bottom))" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-tile)] bg-[var(--surface-card)] px-4 py-3">
          <h2 id="bottom-sheet-title" className="font-manrope font-semibold text-[var(--ink-primary)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--ink-muted-new)] hover:bg-[var(--surface-field)]"
            aria-label="Close"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] overflow-y-auto">
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
