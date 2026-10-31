"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { HandCoins, Check, Search, X, User, ChevronUp, ReceiptText, Plus } from "lucide-react";
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

type Allocation = { key: string; duesPeriodId?: string; collectionEventId?: string; categoryId: string; amount: string };

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
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [selectedPurposeIds, setSelectedPurposeIds] = useState<string[]>([]);
  const [showPurposeSelector, setShowPurposeSelector] = useState(false);
  const addAllocationButtonRef = useRef<HTMLButtonElement>(null);

  // A stable key per form session blocks accidental double submissions.
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

  // For collection events, show all (not member-filtered)
  const availableEvents = collectionEvents;
  // For dues periods, filter by member
  const memberPeriods = useMemo(
    () => (memberId ? duesPeriods.filter((p) => p.memberId === memberId) : []),
    [duesPeriods, memberId],
  );

  const member = members.find((m) => m.id === memberId);
  const amountPaise = parseRupeesToPaise(amount) ?? 0;
  const allocatedPaise = allocations.reduce((sum, a) => sum + (parseRupeesToPaise(a.amount) ?? 0), 0);
  const remaining = amountPaise - allocatedPaise;

  // Build purpose options from categories + collection events + dues periods
  const purposeOptions = useMemo(() => {
    const opts: { id: string; label: string; categoryId: string; type: "category" | "event" | "period"; eventId?: string; periodId?: string }[] = [];

    // Add categories
    categories.forEach((c) => {
      opts.push({ id: c.id, label: c.name, categoryId: c.id, type: "category" });
    });

    // Add collection events
    availableEvents
      .filter((e) => e.outstandingPaise > 0)
      .forEach((e) => {
        opts.push({
          id: `event-${e.id}`,
          label: `${e.name}${e.applicableMonth && e.applicableYear ? ` (${e.applicableMonth}/${e.applicableYear})` : ""}`,
          categoryId: e.categoryId,
          type: "event",
          eventId: e.id,
        });
      });

    // Add dues periods (member-specific)
    if (memberId) {
      memberPeriods
        .filter((p) => p.outstandingPaise > 0)
        .forEach((p) => {
          opts.push({
            id: `period-${p.id}`,
            label: `${formatDate(p.periodStart)} (${formatPaise(p.outstandingPaise)})`,
            categoryId: p.categoryId,
            type: "period",
            periodId: p.id,
          });
        });
    }

    return opts;
  }, [categories, availableEvents, memberPeriods, memberId]);

  function addAllocation(purpose: typeof purposeOptions[0]) {
    setAllocations((prev) => [
      ...prev,
      {
        key: `a${Date.now()}-${Math.random().toString(36).slice(2)}`,
        duesPeriodId: purpose.type === "period" ? purpose.periodId : "",
        collectionEventId: purpose.type === "event" ? purpose.eventId : "",
        categoryId: purpose.categoryId,
        amount: "",
      },
    ]);
    setSelectedPurposeIds((prev) => [...prev, purpose.id]);
    setShowPurposeSelector(false);
  }

  function removeAllocation(key: string) {
    const alloc = allocations.find((a) => a.key === key);
    if (alloc) {
      const purposeId = alloc.duesPeriodId
        ? `period-${alloc.duesPeriodId}`
        : alloc.collectionEventId
        ? `event-${alloc.collectionEventId}`
        : alloc.categoryId;
      setSelectedPurposeIds((prev) => prev.filter((id) => id !== purposeId));
    }
    setAllocations((prev) => prev.filter((a) => a.key !== key));
  }

  function updateAllocation(key: string, patch: Partial<Allocation>) {
    setAllocations((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  }

  // Quick amount selection
  const handleQuickAmount = (paise: number) => {
    setAmount(formatPaisePlain(paise));
  };

  // Keypad handlers removed - native keyboard used instead

  // Amount words for receipt preview
  const amountWords = amountPaise > 0 ? paiseToWords(amountPaise) : "";

  // Current selected category name for receipt preview
  const selectedCategoryName = allocations.length > 0
    ? categories.find((c) => c.id === allocations[0].categoryId)?.name
    : purposeOptions.length > 0
    ? purposeOptions[0].label
    : "";

  // Validate form
  const isFormValid = useMemo(() => {
    if (amountPaise <= 0) return false;
    if (donorMode === "member" && !memberId) return false;
    if (donorMode === "walkin" && !walkIn.trim()) return false;
    if (allocatedPaise > amountPaise) return false;
    if (allocations.length === 0) return false;
    // Check all allocations have positive amounts
    if (allocations.some((a) => (parseRupeesToPaise(a.amount) ?? 0) <= 0)) return false;
    // Non-cash modes need reference
    if (mode !== "CASH" && !referenceNo.trim()) return false;
    return true;
  }, [amountPaise, donorMode, memberId, walkIn, allocatedPaise, allocations, mode, referenceNo]);

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
    if (allocatedPaise > amountPaise) {
      setError(`${labels.allocated} > ${labels.amount}`);
      return;
    }

    const payload = allocations
      .filter((a) => a.categoryId)
      .map((a) => ({
        duesPeriodId: a.duesPeriodId || "",
        collectionEventId: a.collectionEventId || "",
        categoryId: a.categoryId,
        amountPaise: parseRupeesToPaise(a.amount) ?? 0,
        purposeNote: "",
      }))
      .filter((a) => a.amountPaise > 0);

    if (payload.length === 0) {
      if (!memberId) {
        setError(labels.addAllocation || labels.chooseCategory);
      } else {
        setError(labels.chooseCategory);
      }
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
      formData.set("paymentDate", paymentDate);
      formData.set("amountPaise", String(amountPaise));
      formData.set("mode", mode);
      formData.set("referenceNo", referenceNo);
      formData.set("notes", notes);
      formData.set("idempotencyKey", idempotencyKey);
      formData.set("allocations", JSON.stringify(payload));

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

  // Compute popover position for desktop
  const popoverStyle = useMemo(() => {
    if (!addAllocationButtonRef.current) return {};
    const rect = addAllocationButtonRef.current.getBoundingClientRect();
    return {
      left: `${rect.left}px`,
      top: `${rect.bottom + 8}px`, // 8px gap
    };
  }, [showPurposeSelector]); // Recompute when shown

  // const optionsFor = (name: string) => fields.find((f) => f.name === name)?.options ?? [];

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
                  // Don't auto-select first member - let user search/choose
                } else {
                  setDonorMode("walkin");
                  setMemberId("");
                }
                setAllocations([]);
                setSelectedPurposeIds([]);
              }}
            />
            {donorMode === "member" ? (
              <MemberSearch
                members={members}
                value={memberId}
                onChange={(id) => {
                  setMemberId(id);
                  setWalkIn("");
                  setAllocations([]);
                  setSelectedPurposeIds([]);
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

        {/* Card 3: PAYMENT MODE + PURPOSE + DATE + NOTES */}
        <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
          <CardBody className="space-y-5 pt-0">
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

            {/* PURPOSE - Allocation Chips */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-manrope font-extrabold uppercase tracking-[0.08em] text-[var(--ink-muted-new)]">
                  {labels.purpose}
                </p>
                <button
                  ref={addAllocationButtonRef}
                  type="button"
                  onClick={() => setShowPurposeSelector(true)}
                  disabled={allocations.length > 0}
                  className="flex items-center gap-1.5 rounded-[var(--radius-pill)] border-2 border-dashed border-[var(--border-tile)] bg-transparent px-3 py-1.5 text-sm font-medium text-[var(--ink-muted-new)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {labels.addAllocation}
                </button>
              </div>

              {allocations.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted-new)]">{labels.chooseCategory}</p>
              ) : (
                <div className="space-y-3">
                  {allocations.map((alloc) => {
                    const category = categories.find((c) => c.id === alloc.categoryId);
                    const purposeLabel = category?.name || alloc.categoryId;
                    const isFullyAllocated = alloc.duesPeriodId || alloc.collectionEventId;

                    return (
                      <div key={alloc.key} className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--border-tile)] p-3 bg-[var(--surface-field)]">
                        <AllocationChip
                          id={`purpose-${alloc.key}`}
                          label={purposeLabel}
                          selected={true}
                          onClick={() => {}}
                          disabled={true}
                        />
                        <div className="w-32 flex-1 min-w-[120px]">
                          <label className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--ink-muted-new)]">{labels.amount}</label>
                          <Input
                            value={alloc.amount}
                            onChange={(e) => updateAllocation(alloc.key, { amount: e.target.value })}
                            inputMode="decimal"
                            className="rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11 text-base font-medium text-right"
                            placeholder="0.00"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAllocation(alloc.key)}
                          aria-label={labels.cancel}
                          className="h-9 w-9 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Purpose Selector - Desktop Popover & Mobile Bottom Sheet */}
              {showPurposeSelector && (
                <>
                  {/* Desktop: Popover near button */}
                  <div className="hidden lg:block fixed inset-0 z-50" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-transparent" onClick={() => setShowPurposeSelector(false)} />
                    {Object.keys(popoverStyle).length > 0 && (
                      <div className="fixed z-50" style={popoverStyle}>
                        <div className="w-72 max-h-60 overflow-y-auto rounded-lg border border-[var(--border-tile)] bg-[var(--surface-card)] shadow-xl animate-slide-down">
                          <div className="p-2">
                            <div className="flex flex-wrap gap-2">
                              {purposeOptions
                                .filter((p) => !selectedPurposeIds.includes(p.id))
                                .map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => addAllocation(p)}
                                    className="rounded-[var(--radius-pill)] border border-[var(--border-tile)] bg-[var(--surface-card)] px-4 py-2 text-sm font-medium text-[var(--ink-primary)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-soft)] w-full text-left"
                                  >
                                    {p.label}
                                  </button>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile: Bottom Sheet */}
                  <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowPurposeSelector(false)} />
                    <div className="relative w-full rounded-t-[var(--radius-card)] bg-[var(--surface-card)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl animate-slide-up">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-manrope font-semibold text-[var(--ink-primary)]">{labels.purpose}</h3>
                        <button onClick={() => setShowPurposeSelector(false)} className="p-2 text-[var(--ink-muted-new)]" aria-label="Close">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                        {purposeOptions
                          .filter((p) => !selectedPurposeIds.includes(p.id))
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => addAllocation(p)}
                              className="rounded-[var(--radius-pill)] border border-[var(--border-tile)] bg-[var(--surface-card)] px-4 py-2 text-sm font-medium text-[var(--ink-primary)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-soft)]"
                            >
                              {p.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </>
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

      {/* Right Column - Sticky Receipt Preview */}
      <div className={cn("space-y-4", isMobile ? "lg:hidden" : "hidden lg:block")}>
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
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[var(--ink-muted-new)]">{labels.allocated}</span>
                <span className="num text-sm text-[var(--ink-primary)]">{formatPaise(allocatedPaise)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-[var(--border-tile)] pt-2">
                <span className="text-sm text-[var(--ink-muted-new)]">{labels.unallocated}</span>
                <span className={cn("num text-sm font-medium", remaining < 0 ? "text-[var(--danger)]" : "text-[var(--ink-primary)]")}>
                  {formatPaise(Math.abs(remaining))}
                </span>
              </div>

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
          {/* Purpose/Allocations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-manrope font-semibold text-[var(--ink-primary)]">{labels.purpose}</h3>
              <button
                type="button"
                onClick={() => setShowPurposeSelector(true)}
                className="flex items-center gap-1.5 rounded-[var(--radius-pill)] border-2 border-dashed border-[var(--border-tile)] bg-transparent px-3 py-1.5 text-sm font-medium text-[var(--ink-muted-new)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-soft)]"
              >
                <Plus className="h-3.5 w-3.5" />
                {labels.addAllocation}
              </button>
            </div>

            {allocations.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted-new)]">{labels.chooseCategory}</p>
            ) : (
              <div className="space-y-3">
                {allocations.map((alloc) => {
                  const category = categories.find((c) => c.id === alloc.categoryId);
                  const purposeLabel = category?.name || alloc.categoryId;

                  return (
                    <div key={alloc.key} className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--border-tile)] p-3 bg-[var(--surface-field)]">
                      <AllocationChip
                        id={`purpose-${alloc.key}`}
                        label={purposeLabel}
                        selected={true}
                        onClick={() => {}}
                        disabled={true}
                      />
                      <div className="w-32 flex-1 min-w-[120px]">
                        <label className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--ink-muted-new)]">{labels.amount}</label>
                        <Input
                          value={alloc.amount}
                          onChange={(e) => updateAllocation(alloc.key, { amount: e.target.value })}
                          inputMode="decimal"
                          className="rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11 text-base font-medium text-right"
                          placeholder="0.00"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAllocation(alloc.key)}
                        aria-label={labels.cancel}
                        className="h-9 w-9 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date */}
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

          {/* Notes */}
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
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[var(--ink-muted-new)]">{labels.allocated}</span>
                <span className="num text-sm text-[var(--ink-primary)]">{formatPaise(allocatedPaise)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-[var(--border-tile)] pt-2">
                <span className="text-sm text-[var(--ink-muted-new)]">{labels.unallocated}</span>
                <span className={cn("num text-sm font-medium", remaining < 0 ? "text-[var(--danger)]" : "text-[var(--ink-primary)]")}>
                  {formatPaise(Math.abs(remaining))}
                </span>
              </div>
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