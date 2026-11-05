"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { HandCoins, Check, Search, X, User, ChevronUp, ReceiptText, Plus, ArrowRight, Minus, AlertCircle, Info } from "lucide-react";
import { getFormFields } from "@/lib/validation";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Textarea,
  SegmentedControl,
  AmountInput,
  QuickAmountChips,
  PaymentModeTiles,
  AllocationChip,
  ReceiptPreview,
  PillButton,
  BottomSheet,
} from "@/components/ui";
import { formatPaise, parseRupeesToPaise, formatPaisePlain, paiseToWords } from "@/lib/money";
import { formatDate, todayInput } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { newIdempotencyKey } from "./collection-form-helpers";

type Labels = Record<string, string>;

type MemberOption = { id: string; memberNo: string; fullName: string; phone: string | null };
type CategoryOption = { id: string; name: string; code: string; restrictedPurpose: boolean; defaultAmountPaise: number | null };
type PeriodOption = {
  id: string;
  memberId: string | null;
  planId: string;
  categoryId: string;
  categoryName: string;
  periodStart: string;
  periodEnd: string | null;
  dueDate: string;
  expectedPaise: number;
  allocatedPaise: number;
  outstandingPaise: number;
};

type PeriodOrEventOption = PeriodOption & {
  type?: "collectionEvent" | "duesPeriod";
  name?: string;
  applicableMonth?: number | null;
  applicableYear?: number | null;
};

// FIFO allocation preview item
type FIFOPreviewItem = {
  id: string;
  label: string;
  dueDate: string;
  outstanding: number;
  allocated: number;
  remaining: number;
  type: "duesPeriod" | "collectionEventAssignment";
};

function MemberSearch({
  members,
  value,
  onChange,
  label,
  placeholder,
  disabled,
}: {
  members: MemberOption[];
  value: string;
  onChange: (memberId: string) => void;
  label: string;
  placeholder: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          m.fullName.toLowerCase().includes(search.toLowerCase()) ||
          m.memberNo.toLowerCase().includes(search.toLowerCase()) ||
          (m.phone?.toLowerCase().includes(search.toLowerCase()) ?? false),
      ),
    [members, search],
  );

  const selectedMember = members.find((m) => m.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (member: MemberOption) => {
    onChange(member.id);
    setSearch("");
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setShowDropdown(true);
    if (!e.target.value) {
      onChange("");
    }
  };

  const displayValue = selectedMember
    ? `${selectedMember.memberNo} · ${selectedMember.fullName}${selectedMember.phone ? ` · ${selectedMember.phone}` : ""}`
    : "";

  return (
    <Field label={label} htmlFor="member-search">
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted-new)]" aria-hidden="true" />
          <input
            ref={inputRef}
            id="member-search"
            type="text"
            value={displayValue || search}
            onChange={handleInputChange}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder}
            disabled={disabled || !!value}
            className={cn(
              "w-full rounded-[var(--radius-pill)] border border-[var(--border-tile)] bg-[var(--surface-card)] pl-10 pr-10 py-2.5 text-base text-[var(--ink-primary)] placeholder:text-[#9aa69f] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface-field)] disabled:cursor-not-allowed h-11",
            )}
            autoComplete="off"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSearch("");
                setShowDropdown(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted-new)] hover:text-[var(--danger)]"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {showDropdown && (!value || search) && (
          <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[var(--border-tile)] bg-[var(--surface-card)] shadow-lg">
            {filteredMembers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-[var(--ink-muted-new)]">{label === "Search member" ? "No members found" : "No matching members"}</div>
            ) : (
              filteredMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m)}
                  className={cn(
                    "w-full px-3 py-2 text-start text-sm hover:bg-[var(--brand-soft)]",
                    value === m.id ? "bg-[var(--brand-soft)] text-[var(--brand-primary)]" : "text-[var(--ink-primary)]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[var(--ink-muted-new)]" />
                    <div>
                      <p className="font-medium">{m.fullName}</p>
                      <p className="text-[11px] text-[var(--ink-muted-new)]">
                        {m.memberNo}{m.phone ? ` · ${m.phone}` : ""}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

export function CollectionForm({
  labels,
  masjidName,
  masjidAddress,
  masjidPhone,
  members,
  categories,
  periods,
  initialMemberId,
  quickAmounts,
}: {
  labels: Labels;
  masjidName: string;
  masjidAddress?: string | null;
  masjidPhone?: string | null;
  members: MemberOption[];
  categories: CategoryOption[];
  periods: PeriodOrEventOption[];
  initialMemberId?: string;
  quickAmounts: number[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showReceiptSheet, setShowReceiptSheet] = useState(false);

  const [memberId, setMemberId] = useState(initialMemberId ?? "");
  const [walkIn, setWalkIn] = useState("");
  const [donorMode, setDonorMode] = useState<"member" | "walkin">(initialMemberId ? "member" : "member");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"CASH" | "UPI" | "BANK_TRANSFER" | "OTHER">("CASH");
  const [paymentDate, setPaymentDate] = useState(todayInput());
  const [notes, setNotes] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);

  // Split periods into collection events and dues periods
  const collectionEvents = useMemo(
    () => periods.filter((p) => p.type === "collectionEvent"),
    [periods]
  );
  const duesPeriods = useMemo(
    () => periods.filter((p) => p.type === "duesPeriod"),
    [periods]
  );

  const member = members.find((m) => m.id === memberId);
  const amountPaise = parseRupeesToPaise(amount) ?? 0;

  // Walk-in allowed category codes
  const WALKIN_ALLOWED_CODES = ["SHAB_E_QADR", "MILAD", "GENERAL", "GENERAL_DONATION"];

  // FIFO categories (dues-based allocation)
  const FIFO_CATEGORIES = ["MONTHLY", "MILAD", "SHAB_E_QADR", "DEATH", "ANNUAL"];

  // Filter categories based on donor mode
  const availableCategories = useMemo(() => {
    if (donorMode === "walkin") {
      return categories.filter((c) => WALKIN_ALLOWED_CODES.includes(c.code));
    }
    return categories;
  }, [categories, donorMode]);

  // Selected category
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  // For walk-in Milad/Shab-e-Qadr, show available events
  const availableEventsForCategory = useMemo(() => {
    if (!selectedCategoryId || !["MILAD", "SHAB_E_QADR"].includes(selectedCategory?.code || "")) {
      return [];
    }
    return collectionEvents
      .filter((e) => e.categoryId === selectedCategoryId && e.outstandingPaise > 0)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [collectionEvents, selectedCategoryId, selectedCategory?.code]);

  // Build FIFO preview for member payments in FIFO categories
  const fifoPreview = useMemo((): FIFOPreviewItem[] => {
    if (!memberId || !selectedCategoryId || !selectedCategory || !FIFO_CATEGORIES.includes(selectedCategory.code)) {
      return [];
    }

    const preview: FIFOPreviewItem[] = [];

    // Get outstanding dues periods for this member+category
    const memberDuesPeriods = duesPeriods
      .filter((p) => p.memberId === memberId && p.categoryId === selectedCategoryId && p.outstandingPaise > 0)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    for (const period of memberDuesPeriods) {
      preview.push({
        id: period.id,
        label: `${formatDate(period.periodStart)} (${period.categoryName})`,
        dueDate: period.dueDate,
        outstanding: period.outstandingPaise,
        allocated: 0, // Will be calculated below
        remaining: period.outstandingPaise,
        type: "duesPeriod",
      });
    }

    // Get outstanding collection event assignments for this member+category
    const memberAssignments = collectionEvents
      .filter((e) => e.categoryId === selectedCategoryId && e.outstandingPaise > 0)
      .flatMap((event) => {
        // Check if member has assignment for this event
        const assignment = periods.find(
          (p) => p.type === "collectionEvent" && p.id === event.id && p.memberId === memberId
        );
        if (assignment && assignment.outstandingPaise > 0) {
          return [{
            id: assignment.id,
            label: `${event.name}${event.applicableMonth && event.applicableYear ? ` (${event.applicableMonth}/${event.applicableYear})` : ""}`,
            dueDate: event.dueDate,
            outstanding: assignment.outstandingPaise,
            allocated: 0,
            remaining: assignment.outstandingPaise,
            type: "collectionEventAssignment" as const,
          }];
        }
        return [];
      });

    // Combine and sort by due date
    const allItems = [...preview, ...memberAssignments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Calculate FIFO allocation preview
    let remainingAmount = amountPaise;
    return allItems.map((item) => {
      const allocated = Math.min(remainingAmount, item.outstanding);
      remainingAmount -= allocated;
      return {
        ...item,
        allocated,
        remaining: item.outstanding - allocated,
      };
    });
  }, [memberId, selectedCategoryId, selectedCategory, duesPeriods, collectionEvents, periods, amountPaise]);

  // Total outstanding for selected category
  const totalOutstanding = useMemo(() => {
    return fifoPreview.reduce((sum, item) => sum + item.outstanding, 0);
  }, [fifoPreview]);

  // Total allocated in preview
  const totalAllocatedPreview = useMemo(() => {
    return fifoPreview.reduce((sum, item) => sum + item.allocated, 0);
  }, [fifoPreview]);

  // Remaining after FIFO allocation
  const remainingAfterFIFO = useMemo(() => {
    return amountPaise - totalAllocatedPreview;
  }, [amountPaise, totalAllocatedPreview]);

  // Unallocated amount (for non-FIFO categories)
  const unallocatedAmount = useMemo(() => {
    if (fifoPreview.length > 0) return remainingAfterFIFO;
    return amountPaise;
  }, [fifoPreview.length, remainingAfterFIFO]);

  // Quick amount selection
  const handleQuickAmount = (paise: number) => {
    setAmount(formatPaisePlain(paise));
  };

  // Amount words for receipt preview
  const amountWords = amountPaise > 0 ? paiseToWords(amountPaise) : "";

  // Current selected category name for receipt preview
  const selectedCategoryName = selectedCategory?.name || "";

  // Validate form
  const isFormValid = useMemo(() => {
    if (amountPaise <= 0) return false;
    if (donorMode === "member" && !memberId) return false;
    if (donorMode === "walkin" && !walkIn.trim()) return false;
    if (!selectedCategoryId) return false;
    // For walk-in Milad/Shab-e-Qadr, event must be selected
    if (donorMode === "walkin" && selectedCategory && ["MILAD", "SHAB_E_QADR"].includes(selectedCategory.code) && !selectedEventId) {
      return false;
    }
    // Non-cash modes need reference
    if (mode !== "CASH" && !referenceNo.trim()) return false;
    return true;
  }, [amountPaise, donorMode, memberId, walkIn, selectedCategoryId, selectedCategory?.code, selectedEventId, mode, referenceNo]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (amountPaise <= 0) {
      setError(labels.amount + ": " + labels.required);
      return;
    }
    if (donorMode === "member" && !memberId) {
      setError(labels.chooseMember);
      return;
    }
    if (donorMode === "walkin" && !walkIn.trim()) {
      setError(labels.walkInDonor + ": " + labels.required);
      return;
    }
    if (!selectedCategoryId) {
      setError(labels.chooseCategory);
      return;
    }
    if (donorMode === "walkin" && selectedCategory && ["MILAD", "SHAB_E_QADR"].includes(selectedCategory.code) && !selectedEventId) {
      setError("Please select a collection event for this category.");
      return;
    }
    if (mode !== "CASH" && !referenceNo.trim()) {
      setError(labels.txnRefCheque + ": " + labels.required);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("memberId", memberId);
      formData.set("walkInName", walkIn);
      formData.set("categoryId", selectedCategoryId);
      formData.set("paymentDate", paymentDate);
      formData.set("amountPaise", String(amountPaise));
      formData.set("mode", mode);
      formData.set("referenceNo", referenceNo);
      formData.set("notes", notes);
      formData.set("idempotencyKey", idempotencyKey);
      // For backward compatibility, include collectionEventId if selected
      if (selectedEventId) {
        formData.set("collectionEventId", selectedEventId);
      }
      // Empty allocations - server will calculate FIFO
      formData.set("allocations", JSON.stringify([]));

      const response = await fetch("/api/payments/create", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!result.ok) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Show receipt preview sheet before navigating
      setShowReceiptSheet(true);
      // Navigate after a short delay to show the sheet
      setTimeout(() => {
        router.push(`/receipts/${result.paymentId}?issued=1${result.duplicate ? "&duplicate=1" : ""}`);
      }, 1500);
    } catch {
      setError(labels.errorGeneric);
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const displayDate = paymentDate ? formatDate(paymentDate) : labels.date;

  // Build field metadata from registry
  const fields = useMemo(
    () => getFormFields("payment").map((f) => {
      const mapped = { ...f, label: labels[f.name] ?? f.label };
      if (mapped.name === "memberId") {
        mapped.type = "search";
      }
      if (mapped.name === "walkInName") {
        mapped.type = "text";
      }
      if (mapped.name === "allocations") {
        mapped.type = "hidden";
        mapped.synthetic = true;
      }
      if (mapped.name === "mode") {
        mapped.options = [
          { value: "CASH", label: labels.cash ?? "Cash" },
          { value: "UPI", label: labels.upi ?? "UPI" },
          { value: "BANK_TRANSFER", label: labels.bankTransfer ?? "Bank Transfer" },
          { value: "OTHER", label: labels.other ?? "Cheque" },
        ];
      }
      if (mapped.name === "amountPaise") {
        mapped.type = "decimal";
        mapped.format = "money";
        mapped.label = `${labels.amount ?? "Amount"} (₹)`;
      }
      if (mapped.name === "paymentDate") {
        mapped.type = "date";
        mapped.defaultValue = todayInput();
      }
      if (mapped.name === "notes") {
        mapped.type = "textarea";
      }
      if (mapped.name === "idempotencyKey") {
        mapped.type = "hidden";
        mapped.defaultValue = idempotencyKey;
      }
      if (mapped.name === "referenceNo") {
        mapped.disabledWhen = [{ field: "mode", value: "CASH" }];
      }
      return mapped;
    }),
    [labels, idempotencyKey]
  );

  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

  return (
    <form onSubmit={submit} className={cn("space-y-5", isMobile ? "lg:hidden" : "lg:grid lg:grid-cols-[1fr_380px] lg:gap-5")}>
      {/* Left Column - Flexible */}
      <div className={cn("space-y-5", isMobile ? "" : "lg:col-span-1")}>
        {/* Card 1: WHO IS GIVING? */}
        <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
          <CardHeader className="pb-3">
            <p className="text-[12px] font-manrope font-extrabold uppercase tracking-[0.08em] text-[var(--ink-muted-new)]">
              {labels.receivedFrom}
            </p>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <SegmentedControl
              options={[
                { value: "member", label: labels.chooseMember },
                { value: "walkin", label: labels.walkInDonor },
              ]}
              value={donorMode}
              onChange={(v) => {
                if (v === "member") {
                  setDonorMode("member");
                  setWalkIn("");
                  setSelectedCategoryId("");
                  setSelectedEventId("");
                } else {
                  setDonorMode("walkin");
                  setMemberId("");
                  setSelectedCategoryId("");
                  setSelectedEventId("");
                }
              }}
            />
            {donorMode === "member" ? (
              <MemberSearch
                members={members}
                value={memberId}
                onChange={(id) => {
                  setMemberId(id);
                  setWalkIn("");
                  setSelectedCategoryId("");
                  setSelectedEventId("");
                }}
                label={labels.chooseMember}
                placeholder={labels.searchMember || "Search member..."}
              />
            ) : (
              <Field label={labels.walkInDonor} htmlFor="walkIn">
                <Input
                  id="walkIn"
                  value={walkIn}
                  onChange={(e) => setWalkIn(e.target.value)}
                  placeholder={labels.anonymousDonor}
                  className="rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11"
                />
              </Field>
            )}
          </CardBody>
        </Card>

        {/* Card 2: Hero Amount Card */}
        <Card className="rounded-[var(--radius-card)] border-0 bg-[var(--brand-hero)] p-7 text-white">
          <div className="mb-4">
            <p className="text-[12px] font-manrope font-extrabold uppercase tracking-[0.08em] text-[var(--gold-accent)]">
              {labels.amount} (₹)
            </p>
            <AmountInput
              value={amount}
              onChange={setAmount}
              onBlur={() => {}}
              placeholder="0"
              disabled={isSubmitting}
              variant="hero"
              allowDecimals={false}
            />
          </div>
          <QuickAmountChips
            amounts={quickAmounts}
            selectedAmount={amountPaise}
            onSelect={handleQuickAmount}
            disabled={isSubmitting}
          />
        </Card>

        {/* Card 3: CATEGORY + PAYMENT MODE + DATE + NOTES */}
        <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
          <CardBody className="space-y-5 pt-0">
            {/* CATEGORY SELECTOR */}
            <div>
              <p className="mb-3 text-[12px] font-manrope font-extrabold uppercase tracking-[0.08em] text-[var(--ink-muted-new)]">
                {labels.purpose}
              </p>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setSelectedEventId("");
                    }}
                    className={cn(
                      "flex-1 min-w-[140px] rounded-[var(--radius-pill)] border-2 px-4 py-2.5 text-sm font-medium text-[var(--ink-primary)] transition-all",
                      selectedCategoryId === cat.id
                        ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)] shadow-[0_0_0_2px_var(--brand-soft)]"
                        : "border-[var(--border-tile)] bg-[var(--surface-card)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-soft)]"
                    )}
                    disabled={isSubmitting}
                  >
                    {cat.name}
                    {cat.restrictedPurpose && <span className="ml-1.5 text-[10px]">🔒</span>}
                  </button>
                ))}
                {availableCategories.length === 0 && (
                  <div className="text-sm text-[var(--ink-muted-new)] w-full py-2">
                    {donorMode === "walkin"
                      ? "Walk-in donors can only contribute to: Shab-e-Qadr, Milad-un-Nabi, General Donation"
                      : "No categories available"}
                  </div>
                )}
              </div>
            </div>

            {/* EVENT SELECTOR (for walk-in Milad/Shab-e-Qadr) */}
            {donorMode === "walkin" && selectedCategory && ["MILAD", "SHAB_E_QADR"].includes(selectedCategory.code) && (
              <div>
                <p className="mb-3 text-[12px] font-manrope font-extrabold uppercase tracking-[0.08em] text-[var(--ink-muted-new)]">
                  {labels.purpose} Event
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableEventsForCategory.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEventId(event.id)}
                      className={cn(
                        "flex-1 min-w-[140px] rounded-[var(--radius-pill)] border-2 px-4 py-2.5 text-sm font-medium text-[var(--ink-primary)] transition-all text-left",
                        selectedEventId === event.id
                          ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)] shadow-[0_0_0_2px_var(--brand-soft)]"
                          : "border-[var(--border-tile)] bg-[var(--surface-card)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-soft)]"
                      )}
                      disabled={isSubmitting}
                    >
                      <div className="font-medium">{event.name}</div>
                      <div className="text-[11px] text-[var(--ink-muted-new)]">
                        Outstanding: {formatPaise(event.outstandingPaise)}
                      </div>
                    </button>
                  ))}
                  {availableEventsForCategory.length === 0 && (
                    <div className="text-sm text-[var(--ink-muted-new)] w-full py-2">
                      No open collection events for this category.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FIFO ALLOCATION PREVIEW (for member payments in FIFO categories) */}
            {memberId && selectedCategory && FIFO_CATEGORIES.includes(selectedCategory.code) && fifoPreview.length > 0 && (
              <div className="space-y-3">
                <p className="text-[12px] font-manrope font-extrabold uppercase tracking-[0.08em] text-[var(--ink-muted-new)]">
                  {labels.purpose} - FIFO Allocation Preview (Informational)
                </p>
                <div className="rounded-lg border border-[var(--border-tile)] bg-[var(--surface-field)] p-3">
                  <div className="flex items-center gap-2 text-[11px] text-[var(--ink-muted-new)] mb-2">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>Allocations are calculated automatically (oldest dues first). This preview is informational only.</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {fifoPreview.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between text-sm p-2 rounded bg-[var(--surface-card)]">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.label}</p>
                          <p className="text-[11px] text-[var(--ink-muted-new)]">
                            Due: {formatDate(item.dueDate)} · Outstanding: {formatPaise(item.outstanding)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-right ml-4">
                          <div className="text-[var(--brand-primary)] font-medium">{formatPaise(item.allocated)}</div>
                          <ArrowRight className="h-4 w-4 text-[var(--ink-muted-new)]" />
                          <div className="text-[var(--ink-muted-new)]">{formatPaise(item.remaining)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-[var(--border-tile)] pt-2 mt-2 text-sm">
                    <span className="text-[var(--ink-muted-new)]">Total Outstanding</span>
                    <span className="font-semibold text-[var(--ink-primary)]">{formatPaise(totalOutstanding)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--ink-muted-new)]">Will Be Allocated</span>
                    <span className="font-semibold text-[var(--brand-primary)]">{formatPaise(totalAllocatedPreview)}</span>
                  </div>
                  {remainingAfterFIFO > 0 && (
                    <div className="flex items-center justify-between border-t border-[var(--danger-soft)] pt-2 mt-2 text-sm text-[var(--danger)]">
                      <span>Excess (Cannot Allocate)</span>
                      <span className="font-semibold">{formatPaise(remainingAfterFIFO)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PAYMENT MODE */}
            <div>
              <p className="mb-3 text-[12px] font-manrope font-extrabold uppercase tracking-[0.08em] text-[var(--ink-muted-new)]">
                {labels.mode}
              </p>
              <PaymentModeTiles
                value={mode}
                selected={mode}
                onChange={(v) => {
                  setMode(v as "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER");
                  if (v === "CASH") setReferenceNo("");
                }}
                disabled={isSubmitting}
                labels={{
                  cash: labels.cash,
                  upi: labels.upi,
                  bankTransfer: labels.bankTransfer,
                  other: labels.other,
                }}
              />
              {/* Txn ref / Cheque no. field */}
              {mode !== "CASH" && (
                <div className="mt-4">
                  <Field label={labels.txnRefCheque} htmlFor="referenceNo">
                    <Input
                      id="referenceNo"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder={mode === "OTHER" ? "Cheque number" : "Transaction reference"}
                      className="rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11"
                      required={mode === "UPI" || mode === "BANK_TRANSFER" || mode === "OTHER"}
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* DATE */}
            <div>
              <Field label={labels.date} htmlFor="paymentDate">
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11"
                />
              </Field>
            </div>

            {/* NOTES */}
            <div>
              <Field label={`${labels.notes} (${labels.optional})`} htmlFor="notes">
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  className="rounded-lg border-[var(--border-tile)] bg-[var(--surface-card)]"
                  rows={3}
                />
              </Field>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Right Column - Sticky Receipt Preview (Desktop only) */}
      <div className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          {/* Receipt Preview Card */}
          <ReceiptPreview
            masjidName={masjidName}
            masjidAddress={masjidAddress}
            masjidPhone={masjidPhone}
            donorName={member?.fullName || walkIn || labels.anonymousDonor || "Anonymous Donor"}
            categoryName={selectedCategoryName || ""}
            mode={mode}
            date={displayDate}
            amountPaise={amountPaise}
            amountWords={amountWords}
            receiptNumber={idempotencyKey.slice(0, 8).toUpperCase()}
            isPreview={true}
          />

          {/* Summary Card */}
          <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
            <CardBody className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[var(--ink-muted-new)]">{labels.total}</span>
                <span className="num text-lg font-semibold text-[var(--ink-primary)]">{formatPaise(amountPaise)}</span>
              </div>

              {fifoPreview.length > 0 ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-[var(--ink-muted-new)]">{labels.allocated} (FIFO)</span>
                    <span className="num text-sm text-[var(--brand-primary)]">{formatPaise(totalAllocatedPreview)}</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-[var(--border-tile)] pt-2">
                    <span className="text-sm text-[var(--ink-muted-new)]">Remaining Outstanding</span>
                    <span className={cn("num text-sm font-medium", remainingAfterFIFO > 0 ? "text-[var(--danger)]" : "text-[var(--ink-primary)]")}>
                      {formatPaise(Math.max(totalOutstanding - totalAllocatedPreview, 0))}
                    </span>
                  </div>
                  {remainingAfterFIFO > 0 && (
                    <div className="flex items-baseline justify-between text-sm text-[var(--danger)]">
                      <span>Excess Amount</span>
                      <span className="font-medium">{formatPaise(remainingAfterFIFO)}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-[var(--ink-muted-new)]">{labels.allocated}</span>
                    <span className="num text-sm text-[var(--ink-primary)]">{formatPaise(unallocatedAmount)}</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-[var(--border-tile)] pt-2">
                    <span className="text-sm text-[var(--ink-muted-new)]">{labels.unallocated}</span>
                    <span className={cn("num text-sm font-medium", unallocatedAmount < 0 ? "text-[var(--danger)]" : "text-[var(--ink-primary)]")}>
                      {formatPaise(Math.abs(unallocatedAmount))}
                    </span>
                  </div>
                </>
              )}

              {member && (
                <div className="rounded-lg bg-[var(--brand-soft)] p-2.5 text-[11px] text-[var(--brand-primary)]">
                  <span className="num font-medium">{member.memberNo}</span> · {member.fullName}
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-[11px] font-medium text-[var(--danger)]">
                  {error}
                </p>
              )}

              <PillButton type="submit" loading={isSubmitting} disabled={!isFormValid || isSubmitting}>
                <HandCoins className="h-4 w-4" />
                {labels.confirmPayment}
              </PillButton>

              <p className="flex items-start gap-1.5 text-[10px] text-[var(--ink-muted-new)]">
                <Check className="mt-0.5 h-3 w-3 shrink-0" />
                {labels.idempotencyNote}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Mobile-only: Bottom bar with confirm button and details trigger */}
      {isMobile && (
        <div className="sticky bottom-0 z-20 border-t border-[var(--border-tile)] bg-[var(--surface-card)]/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="px-4 py-3 space-y-3">
            {/* Compact summary */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--ink-muted-new)]">{labels.total}</span>
              <span className="num font-semibold text-[var(--ink-primary)]">{formatPaise(amountPaise)}</span>
            </div>

            {/* Details button */}
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-between"
              onClick={() => setShowDetailsSheet(true)}
            >
              <span>{labels.details}</span>
              <ChevronUp className="h-4 w-4" />
            </Button>

            {/* Confirm button */}
            <PillButton type="submit" loading={isSubmitting} disabled={!isFormValid || isSubmitting}>
              <HandCoins className="h-4 w-4" />
              {labels.confirmPayment}
            </PillButton>

            <p className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--ink-muted-new)]">
              <Check className="mt-0.5 h-3 w-3 shrink-0" />
              {labels.idempotencyNote}
            </p>
          </div>
        </div>
      )}

      {/* Details Bottom Sheet (Mobile) */}
      <BottomSheet
        open={showDetailsSheet}
        onClose={() => setShowDetailsSheet(false)}
        title={labels.details}
      >
        <div className="space-y-5">
          {/* Category Selection */}
          <div>
            <h3 className="font-manrope font-semibold text-[var(--ink-primary)] mb-3">{labels.purpose}</h3>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setSelectedEventId("");
                    setShowDetailsSheet(false);
                  }}
                  className={cn(
                    "rounded-[var(--radius-pill)] border-2 px-4 py-2.5 text-sm font-medium text-[var(--ink-primary)] transition-all",
                    selectedCategoryId === cat.id
                      ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)] shadow-[0_0_0_2px_var(--brand-soft)]"
                      : "border-[var(--border-tile)] bg-[var(--surface-card)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-soft)]"
                  )}
                  disabled={isSubmitting}
                >
                  {cat.name}
                  {cat.restrictedPurpose && <span className="ml-1.5 text-[10px]">🔒</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Event Selection (for walk-in Milad/Shab-e-Qadr) */}
          {donorMode === "walkin" && selectedCategory && ["MILAD", "SHAB_E_QADR"].includes(selectedCategory.code) && (
            <div>
              <h3 className="font-manrope font-semibold text-[var(--ink-primary)] mb-3">Collection Event</h3>
              <div className="flex flex-wrap gap-2">
                {availableEventsForCategory.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setShowDetailsSheet(false);
                    }}
                    className={cn(
                      "rounded-[var(--radius-pill)] border-2 px-4 py-2.5 text-sm font-medium text-[var(--ink-primary)] transition-all text-left min-w-[200px]",
                      selectedEventId === event.id
                        ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)] shadow-[0_0_0_2px_var(--brand-soft)]"
                        : "border-[var(--border-tile)] bg-[var(--surface-card)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-soft)]"
                    )}
                    disabled={isSubmitting}
                  >
                    <div className="font-medium">{event.name}</div>
                    <div className="text-[11px] text-[var(--ink-muted-new)]">
                      Outstanding: {formatPaise(event.outstandingPaise)}
                    </div>
                  </button>
                ))}
                {availableEventsForCategory.length === 0 && (
                  <div className="text-sm text-[var(--ink-muted-new)] w-full py-2">
                    No open collection events for this category.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FIFO Preview in Sheet */}
          {memberId && selectedCategory && FIFO_CATEGORIES.includes(selectedCategory.code) && fifoPreview.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-manrope font-semibold text-[var(--ink-primary)]">FIFO Allocation Preview</h3>
              <div className="rounded-lg border border-[var(--border-tile)] bg-[var(--surface-field)] p-3 text-sm">
                <div className="flex items-center gap-2 text-[11px] text-[var(--ink-muted-new)] mb-2">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>Automatic oldest-first allocation. Informational only.</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {fifoPreview.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded bg-[var(--surface-card)]">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.label}</p>
                        <p className="text-[11px] text-[var(--ink-muted-new)]">
                          Due: {formatDate(item.dueDate)} · Outstanding: {formatPaise(item.outstanding)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-right ml-4">
                        <div className="text-[var(--brand-primary)] font-medium">{formatPaise(item.allocated)}</div>
                        <ArrowRight className="h-4 w-4 text-[var(--ink-muted-new)]" />
                        <div className="text-[var(--ink-muted-new)]">{formatPaise(item.remaining)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-[var(--border-tile)] pt-2 mt-2 text-sm">
                  <span className="text-[var(--ink-muted-new)]">Total Outstanding</span>
                  <span className="font-semibold text-[var(--ink-primary)]">{formatPaise(totalOutstanding)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--ink-muted-new)]">Will Be Allocated</span>
                  <span className="font-semibold text-[var(--brand-primary)]">{formatPaise(totalAllocatedPreview)}</span>
                </div>
              </div>
            </div>
          )}

          {/* DATE */}
          <Field label={labels.date} htmlFor="paymentDate-mobile">
            <Input
              id="paymentDate-mobile"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11"
            />
          </Field>

          {/* NOTES */}
          <Field label={`${labels.notes} (${labels.optional})`} htmlFor="notes-mobile">
            <Textarea
              id="notes-mobile"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              className="rounded-lg border-[var(--border-tile)] bg-[var(--surface-card)]"
              rows={3}
            />
          </Field>

          {/* Receipt Preview in Sheet */}
          <ReceiptPreview
            masjidName={masjidName}
            masjidAddress={masjidAddress}
            masjidPhone={masjidPhone}
            donorName={member?.fullName || walkIn || labels.anonymousDonor || "Anonymous Donor"}
            categoryName={selectedCategoryName || ""}
            mode={mode}
            date={displayDate}
            amountPaise={amountPaise}
            amountWords={amountWords}
            receiptNumber={idempotencyKey.slice(0, 8).toUpperCase()}
            isPreview={true}
          />

          {/* Summary */}
          <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
            <CardBody className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[var(--ink-muted-new)]">{labels.total}</span>
                <span className="num text-lg font-semibold text-[var(--ink-primary)]">{formatPaise(amountPaise)}</span>
              </div>
              {fifoPreview.length > 0 ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-[var(--ink-muted-new)]">{labels.allocated} (FIFO)</span>
                    <span className="num text-sm text-[var(--brand-primary)]">{formatPaise(totalAllocatedPreview)}</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-[var(--border-tile)] pt-2">
                    <span className="text-sm text-[var(--ink-muted-new)]">Remaining Outstanding</span>
                    <span className={cn("num text-sm font-medium", remainingAfterFIFO > 0 ? "text-[var(--danger)]" : "text-[var(--ink-primary)]")}>
                      {formatPaise(Math.max(totalOutstanding - totalAllocatedPreview, 0))}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-[var(--ink-muted-new)]">{labels.allocated}</span>
                    <span className="num text-sm text-[var(--ink-primary)]">{formatPaise(unallocatedAmount)}</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-[var(--border-tile)] pt-2">
                    <span className="text-sm text-[var(--ink-muted-new)]">{labels.unallocated}</span>
                    <span className={cn("num text-sm font-medium", unallocatedAmount < 0 ? "text-[var(--danger)]" : "text-[var(--ink-primary)]")}>
                      {formatPaise(Math.abs(unallocatedAmount))}
                    </span>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </BottomSheet>

      {/* Receipt Confirmation Sheet (Mobile) */}
      <BottomSheet
        open={showReceiptSheet}
        onClose={() => {
          setShowReceiptSheet(false);
          if (!error) {
            router.push(`/receipts/${idempotencyKey}?issued=1`);
          }
        }}
        title={labels.receipt || "Receipt"}
      >
        <div className="space-y-5">
          <ReceiptPreview
            masjidName={masjidName}
            masjidAddress={masjidAddress}
            masjidPhone={masjidPhone}
            donorName={member?.fullName || walkIn || labels.anonymousDonor || "Anonymous Donor"}
            categoryName={selectedCategoryName || ""}
            mode={mode}
            date={displayDate}
            amountPaise={amountPaise}
            amountWords={amountWords}
            receiptNumber={idempotencyKey.slice(0, 8).toUpperCase()}
            isPreview={false}
          />

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => router.push(`/receipts/${idempotencyKey}?issued=1&print=1`)}>
              <ReceiptText className="h-4 w-4" />
              {labels.print}
            </Button>
            <Button className="flex-1" onClick={() => { /* Share logic */ }}>
              {labels.share}
            </Button>
          </div>

          <PillButton
            type="button"
            onClick={() => {
              setShowReceiptSheet(false);
              router.push("/collections/new");
            }}
          >
            {labels.confirmPayment.replace("Confirm and issue receipt", "New Payment").replace("पुष्टि करें और रसीद जारी करें", "नया भुगतान")}
          </PillButton>
        </div>
      </BottomSheet>
    </form>
  );
}