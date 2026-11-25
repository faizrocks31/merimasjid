"use client";

import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { HandCoins, Calendar, X, AlertCircle, CheckCircle, Edit, ChevronDown, ChevronUp, Filter, Save } from "lucide-react";
import { formatPaise, parseRupeesToPaise, formatPaisePlain, paiseToWords } from "@/lib/money";
import { cn } from "@/lib/cn";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Textarea,
  PillButton,
  Badge,
} from "@/components/ui";

interface CollectionDefinitionOption {
  id: string;
  name: string;
}

interface JummaCollectionRecord {
  id: string;
  collectionDate: string;
  createdAt: string;
  totalAmountPaise: number;
  participantCount: number;
  notes: string | null;
  collectionDefinition: CollectionDefinitionOption;
  recordedByUser: { id: string; name: string };
  updatedByUser: { id: string; name: string } | null;
  corrections: JummaCorrectionRecord[];
}

interface JummaCorrectionRecord {
  id: string;
  previousAmountPaise: number;
  newAmountPaise: number;
  reason: string;
  createdAt: string;
  correctedByUser: { id: string; name: string };
}

interface FilterState {
  collectionDefinitionId?: string;
  fromDate?: string;
  toDate?: string;
}

type SortOption = "latest" | "date";

interface JummaDashboardClientProps {
  labels: Record<string, string>;
  masjidName: string;
  collectionDefinitions: CollectionDefinitionOption[];
  jummaCollections: JummaCollectionRecord[];
  totalAmountPaise: number;
  initialFilter: FilterState;
  initialSort: SortOption;
}

function isFriday(dateString: string): boolean {
  const date = new Date(dateString + "T00:00:00.000Z");
  return date.getUTCDay() === 5;
}

function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString + "T00:00:00.000Z");
  return format(date, "dd MMM yyyy");
}

function generateIdempotencyKey(): string {
  return `jumma-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function JummaDashboardClient({
  labels,
  masjidName,
  collectionDefinitions,
  jummaCollections,
  totalAmountPaise,
  initialFilter,
  initialSort,
}: JummaDashboardClientProps) {
  const [filter, setFilter] = useState<FilterState>(initialFilter);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);

  // Helper to update URL params and trigger server-side refetch
  const updateUrlParam = (key: string, value: string | undefined) => {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    // Only navigate if URL actually changed
    const newUrl = url.pathname + url.search;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.location.href = newUrl;
    }
  };

  const handleFilterChange = (newFilter: FilterState) => {
    setFilter(newFilter);
    // Update URL params for server-side filtering
    const url = new URL(window.location.href);
    url.searchParams.delete("fromDate");
    url.searchParams.delete("toDate");
    url.searchParams.delete("collectionDefinitionId");
    if (newFilter.fromDate) url.searchParams.set("fromDate", newFilter.fromDate);
    if (newFilter.toDate) url.searchParams.set("toDate", newFilter.toDate);
    if (newFilter.collectionDefinitionId) url.searchParams.set("collectionDefinitionId", newFilter.collectionDefinitionId);
    const newUrl = url.pathname + url.search;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.location.href = newUrl;
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    updateUrlParam("sort", newSort === "date" ? undefined : newSort);
  };

  // Record new modal state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordCollectionDefinitionId, setRecordCollectionDefinitionId] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [recordAmount, setRecordAmount] = useState("");
  const [recordNotes, setRecordNotes] = useState("");
  const [recordError, setRecordError] = useState("");
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [recordIdempotencyKey] = useState(generateIdempotencyKey);

  // Correction modal state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctingJumma, setCorrectingJumma] = useState<JummaCollectionRecord | null>(null);
  const [correctionAmount, setCorrectionAmount] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionError, setCorrectionError] = useState("");
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionIdempotencyKey] = useState(generateIdempotencyKey);

  // Expand/collapse state for correction history
  const [expandedCorrections, setExpandedCorrections] = useState<Record<string, boolean>>({});

  // Update record date to default to next Friday
  useEffect(() => {
    if (!recordDate) {
      const today = new Date();
      const day = today.getDay();
      const daysUntilFriday = (5 - day + 7) % 7 || 7;
      const nextFriday = new Date(today);
      nextFriday.setDate(today.getDate() + daysUntilFriday);
      setRecordDate(nextFriday.toISOString().split("T")[0]);
    }
  }, []);

  // Validate record form
  const isRecordValid = recordCollectionDefinitionId && recordDate && isFriday(recordDate) && recordAmount && parseRupeesToPaise(recordAmount)! > 0;

  const handleRecordSubmit = async () => {
    if (!isRecordValid) return;
    setRecordError("");
    setRecordSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("collectionDefinitionId", recordCollectionDefinitionId);
      formData.set("collectionDate", recordDate);
      formData.set("totalAmountPaise", String(parseRupeesToPaise(recordAmount)!));
      formData.set("notes", recordNotes);
      formData.set("idempotencyKey", recordIdempotencyKey);

      const response = await fetch("/api/jumma/record", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!result.ok) {
        setRecordError(result.error);
        setRecordSubmitting(false);
        return;
      }

      // Success - reload page
      window.location.reload();
    } catch {
      setRecordError(labels.errorGeneric || "Could not record Jumma collection.");
      setRecordSubmitting(false);
    }
  };

  const openCorrectionModal = (jumma: JummaCollectionRecord) => {
    setCorrectingJumma(jumma);
    setCorrectionAmount(formatPaisePlain(jumma.totalAmountPaise));
    setCorrectionReason("");
    setCorrectionError("");
    setShowCorrectionModal(true);
  };

  const handleCorrectionSubmit = async () => {
    if (!correctingJumma) return;
    const amountPaise = parseRupeesToPaise(correctionAmount);
    if (!amountPaise || amountPaise <= 0) {
      setCorrectionError("Amount must be positive.");
      return;
    }
    if (amountPaise === correctingJumma.totalAmountPaise) {
      setCorrectionError("New amount is the same as current amount.");
      return;
    }
    if (!correctionReason.trim()) {
      setCorrectionError("Reason is required.");
      return;
    }

    setCorrectionSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("jummaCollectionId", correctingJumma.id);
      formData.set("newAmountPaise", String(amountPaise));
      formData.set("reason", correctionReason);
      formData.set("idempotencyKey", correctionIdempotencyKey);

      const response = await fetch("/api/jumma/correct", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!result.ok) {
        setCorrectionError(result.error);
        setCorrectionSubmitting(false);
        return;
      }

      window.location.reload();
    } catch {
      setCorrectionError(labels.errorGeneric || "Could not correct Jumma collection.");
      setCorrectionSubmitting(false);
    }
  };

  const toggleCorrectionHistory = (jummaId: string) => {
    setExpandedCorrections((prev) => ({ ...prev, [jummaId]: !prev[jummaId] }));
  };

  // Filtered and sorted collections
  const filteredCollections = useMemo(() => {
    let result = jummaCollections.filter((jc) => {
      if (filter.collectionDefinitionId && jc.collectionDefinition.id !== filter.collectionDefinitionId) return false;
      if (filter.fromDate && jc.collectionDate < filter.fromDate) return false;
      if (filter.toDate && jc.collectionDate > filter.toDate) return false;
      return true;
    });

    // Sort by selected option
    if (sortBy === "latest") {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      result = [...result].sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime());
    }

    return result;
  }, [jummaCollections, filter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header with total and actions */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--ink-primary)]">{labels.total}</h2>
          <p className="num text-2xl font-bold text-[var(--brand-primary)]">{formatPaise(totalAmountPaise)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Desktop inline filter bar */}
          <div className="hidden lg:flex lg:items-center lg:gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="filterDefinitionDesktop" className="text-sm font-medium text-[var(--ink-primary)]">{labels.filterByDefinition}</label>
              <select
                id="filterDefinitionDesktop"
                value={filter.collectionDefinitionId || ""}
                onChange={(e) => handleFilterChange({ ...filter, collectionDefinitionId: e.target.value || undefined })}
                className="w-48 rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-10 pl-4 pr-10 text-sm text-[var(--ink-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
              >
                <option value="">{labels.all}</option>
                {collectionDefinitions.map((def) => (
                  <option key={def.id} value={def.id}>{def.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <label htmlFor="filterFromDesktop" className="text-sm font-medium text-[var(--ink-primary)]">{labels.from}</label>
              <Input
                id="filterFromDesktop"
                type="date"
                value={filter.fromDate || ""}
                onChange={(e) => handleFilterChange({ ...filter, fromDate: e.target.value || undefined })}
                className="w-40 rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-10 pl-3 pr-3 text-sm text-[var(--ink-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
              <label htmlFor="filterToDesktop" className="text-sm font-medium text-[var(--ink-primary)]">{labels.to}</label>
              <Input
                id="filterToDesktop"
                type="date"
                value={filter.toDate || ""}
                onChange={(e) => handleFilterChange({ ...filter, toDate: e.target.value || undefined })}
                className="w-40 rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-10 pl-3 pr-3 text-sm text-[var(--ink-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
            </div>
            <div className="flex items-center gap-1">
              <label htmlFor="sortByDesktop" className="text-sm font-medium text-[var(--ink-primary)]">{labels.sortBy}</label>
              <select
                id="sortByDesktop"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="w-40 rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-10 pl-4 pr-10 text-sm text-[var(--ink-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
              >
                <option value="latest">{labels.sortLatest}</option>
                <option value="date">{labels.sortDate}</option>
              </select>
            </div>
            <Button variant="secondary" size="sm" onClick={() => {
                  setFilter({});
                  setSortBy("date");
                  const url = new URL(window.location.href);
                  url.searchParams.delete("fromDate");
                  url.searchParams.delete("toDate");
                  url.searchParams.delete("collectionDefinitionId");
                  url.searchParams.delete("sort");
                  window.location.href = url.pathname;
                }}>
                  {labels.clear}
                </Button>
          </div>

          {/* Mobile filter button - opens bottom sheet */}
          <Button variant="secondary" onClick={() => setShowFilterSheet(true)} className="lg:hidden">
            <Filter className="h-4 w-4 mr-2" />
            {labels.filter}
          </Button>

          <PillButton onClick={() => setShowRecordModal(true)} disabled={!collectionDefinitions.length}>
            <HandCoins className="h-4 w-4" />
            {labels.recordNew}
          </PillButton>
        </div>
      </div>

      {/* Filter Sheet */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilterSheet(false)} aria-hidden="true" />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-[var(--radius-card)] bg-[var(--surface-card)] shadow-xl animate-slide-up" style={{ maxHeight: "calc(100vh - env(safe-area-inset-bottom))" }}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-tile)] bg-[var(--surface-card)] px-4 py-3">
              <h3 className="font-manrope font-semibold text-[var(--ink-primary)]">{labels.filter}</h3>
              <button onClick={() => setShowFilterSheet(false)} className="p-2 rounded-lg text-[var(--ink-muted-new)] hover:bg-[var(--surface-field)]" aria-label="Close">
                <ChevronDown className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--ink-primary)] mb-2">{labels.filterByDefinition}</label>
                <select
                  value={filter.collectionDefinitionId || ""}
                  onChange={(e) => handleFilterChange({ ...filter, collectionDefinitionId: e.target.value || undefined })}
                  className="w-full rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11 pl-4 pr-10 text-base text-[var(--ink-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
                >
                  <option value="">{labels.all}</option>
                  {collectionDefinitions.map((def) => (
                    <option key={def.id} value={def.id}>{def.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={labels.from} htmlFor="filterFrom">
                  <Input
                    id="filterFrom"
                    type="date"
                    value={filter.fromDate || ""}
                    onChange={(e) => handleFilterChange({ ...filter, fromDate: e.target.value || undefined })}
                    className="rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11"
                  />
                </Field>
                <Field label={labels.to} htmlFor="filterTo">
                  <Input
                    id="filterTo"
                    type="date"
                    value={filter.toDate || ""}
                    onChange={(e) => handleFilterChange({ ...filter, toDate: e.target.value || undefined })}
                    className="rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11"
                  />
                </Field>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ink-primary)] mb-2">{labels.sortBy}</label>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  className="w-full rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11 pl-4 pr-10 text-base text-[var(--ink-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
                >
                  <option value="latest">{labels.sortLatest}</option>
                  <option value="date">{labels.sortDate}</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => {
                  setFilter({});
                  setSortBy("date");
                  const url = new URL(window.location.href);
                  url.searchParams.delete("fromDate");
                  url.searchParams.delete("toDate");
                  url.searchParams.delete("collectionDefinitionId");
                  url.searchParams.delete("sort");
                  window.location.href = url.pathname;
                }}>
                  {labels.clear}
                </Button>
                <Button className="flex-1" onClick={() => setShowFilterSheet(false)}>
                  {labels.apply}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collections List */}
      <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
        <CardHeader className="pb-3">
          <p className="text-[12px] font-manrope font-extrabold uppercase tracking-[0.08em] text-[var(--ink-muted-new)]">
            {labels.dateRange}: {filter.fromDate ? formatDateDisplay(filter.fromDate) : "All"} — {filter.toDate ? formatDateDisplay(filter.toDate) : "All"}
            {filter.collectionDefinitionId && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[var(--brand-soft)] text-[var(--brand-primary)]">
                {collectionDefinitions.find(d => d.id === filter.collectionDefinitionId)?.name}
              </span>
            )}
          </p>
        </CardHeader>
        <CardBody className="pt-0">
          {filteredCollections.length === 0 ? (
            <div className="text-center py-12 text-[var(--ink-muted-new)]">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">{labels.noRecords}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCollections.map((jc) => (
                <div key={jc.id} className="rounded-lg border border-[var(--border-tile)] bg-[var(--surface-field)] p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 text-[var(--ink-primary)]">
                        <Calendar className="h-5 w-5 text-[var(--ink-muted-new)]" />
                        <span className="font-medium">{formatDateDisplay(jc.collectionDate)}</span>
                        <Badge tone="brand" className="text-[11px]">{labels.fridayLabel}</Badge>
                      </div>
                      <div className="text-sm text-[var(--ink-muted-new)]">
                        {jc.collectionDefinition.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-right">
                        <p className="num font-semibold text-[var(--ink-primary)]">{formatPaise(jc.totalAmountPaise)}</p>
                        <p className="text-[11px] text-[var(--ink-muted-new)]">({labels.recordedBy}: {jc.recordedByUser.name})</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openCorrectionModal(jc)}
                        className="h-9 px-3"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {labels.correct}
                      </Button>
                    </div>
                  </div>

                  {/* Correction History */}
                  {jc.corrections.length > 0 && (
                    <div className="mt-4 border-t border-[var(--border-tile)] pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-[var(--ink-primary)]">{labels.corrections} ({jc.corrections.length})</h4>
                        <button
                          onClick={() => toggleCorrectionHistory(jc.id)}
                          className="text-sm text-[var(--ink-muted-new)] hover:text-[var(--ink-primary)]"
                        >
                          {expandedCorrections[jc.id] ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
                        </button>
                      </div>
                      {expandedCorrections[jc.id] && (
                        <div className="space-y-2 ml-4">
                          {jc.corrections.map((corr) => (
                            <div key={corr.id} className="rounded p-2 bg-[var(--surface-card)] text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-[var(--ink-muted-new)]">{format(new Date(corr.createdAt), "dd MMM yyyy HH:mm")}</span>
                                <span className="font-medium">{corr.correctedByUser.name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[var(--danger)] line-through">{formatPaise(corr.previousAmountPaise)}</span>
                                <span className="text-[var(--brand-primary)] font-medium">{formatPaise(corr.newAmountPaise)}</span>
                                <span className="text-[var(--ink-muted-new)]">({labels.reason}: {corr.reason})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Record New Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRecordModal(false)} aria-hidden="true" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-[var(--radius-card)] bg-[var(--surface-card)] shadow-xl">
            <div className="sticky top-0 rounded-t-[var(--radius-card)] border-b border-[var(--border-tile)] bg-[var(--surface-card)] px-4 py-3">
              <h3 className="font-manrope font-semibold text-[var(--ink-primary)]">{labels.recordNew}</h3>
            </div>
            <div className="p-4 space-y-4">
              <Field label={labels.date} htmlFor="recordDate">
                <Input
                  id="recordDate"
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  required
                  className="rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11"
                  min={new Date().toISOString().split("T")[0]}
                />
              </Field>
              <Field label={labels.selectDefinition} htmlFor="recordCollectionDefinitionId">
                <select
                  id="recordCollectionDefinitionId"
                  value={recordCollectionDefinitionId}
                  onChange={(e) => setRecordCollectionDefinitionId(e.target.value)}
                  required
                  className="w-full rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11 pl-4 pr-10 text-base text-[var(--ink-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
                >
                  <option value="">{labels.selectDefinition}</option>
                  {collectionDefinitions.map((def) => (
                    <option key={def.id} value={def.id}>{def.name}</option>
                  ))}
                </select>
              </Field>
              {!isFriday(recordDate) && recordDate && (
                <p className="text-sm text-[var(--danger)] flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {labels.mustBeFriday}
                </p>
              )}
              <Field label={labels.amount} htmlFor="recordAmount">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted-new)]">₹</span>
                  <Input
                    id="recordAmount"
                    type="text"
                    inputMode="decimal"
                    value={recordAmount}
                    onChange={(e) => {
                      // Only allow digits and one decimal
                      let val = e.target.value.replace(/[^0-9.]/g, "");
                      const parts = val.split(".");
                      if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
                      if (parts[1] && parts[1].length > 2) val = parts[0] + "." + parts[1].slice(0, 2);
                      setRecordAmount(val);
                    }}
                    placeholder="0.00"
                    className="rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11 pl-8"
                    required
                  />
                </div>
              </Field>
              <Field label={`${labels.notes} (${labels.optional})`} htmlFor="recordNotes">
                <Textarea
                  id="recordNotes"
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  maxLength={1000}
                  className="rounded-lg border-[var(--border-tile)] bg-[var(--surface-card)]"
                  rows={3}
                />
              </Field>
              {recordError && (
                <p className="text-sm text-[var(--danger)] flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {recordError}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowRecordModal(false)} disabled={recordSubmitting}>
                  {labels.cancel}
                </Button>
                <PillButton className="flex-1" onClick={handleRecordSubmit} disabled={!isRecordValid || recordSubmitting} loading={recordSubmitting}>
                  <Save className="h-4 w-4" />
                  {labels.save}
                </PillButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {showCorrectionModal && correctingJumma && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCorrectionModal(false)} aria-hidden="true" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-[var(--radius-card)] bg-[var(--surface-card)] shadow-xl">
            <div className="sticky top-0 rounded-t-[var(--radius-card)] border-b border-[var(--border-tile)] bg-[var(--surface-card)] px-4 py-3">
              <h3 className="font-manrope font-semibold text-[var(--ink-primary)]">{labels.correct}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded-lg border border-[var(--border-tile)] bg-[var(--surface-field)] p-3">
                <p className="text-sm text-[var(--ink-muted-new)]">Current Amount</p>
                <p className="num font-bold text-[var(--ink-primary)] text-lg">{formatPaise(correctingJumma.totalAmountPaise)}</p>
                <p className="text-xs text-[var(--ink-muted-new)] mt-1">{labels.date}: {formatDateDisplay(correctingJumma.collectionDate)}</p>
              </div>
              <Field label={labels.amount} htmlFor="correctionAmount">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted-new)]">₹</span>
                  <Input
                    id="correctionAmount"
                    type="text"
                    inputMode="decimal"
                    value={correctionAmount}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9.]/g, "");
                      const parts = val.split(".");
                      if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
                      if (parts[1] && parts[1].length > 2) val = parts[0] + "." + parts[1].slice(0, 2);
                      setCorrectionAmount(val);
                    }}
                    placeholder="0.00"
                    className="rounded-[var(--radius-pill)] border-[var(--border-tile)] bg-[var(--surface-card)] h-11 pl-8"
                    required
                  />
                </div>
              </Field>
              <Field label={labels.reason} htmlFor="correctionReason">
                <Textarea
                  id="correctionReason"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  maxLength={500}
                  className="rounded-lg border-[var(--border-tile)] bg-[var(--surface-card)]"
                  rows={3}
                  required
                />
              </Field>
              {correctionError && (
                <p className="text-sm text-[var(--danger)] flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {correctionError}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCorrectionModal(false)} disabled={correctionSubmitting}>
                  {labels.cancel}
                </Button>
                <PillButton className="flex-1" onClick={handleCorrectionSubmit} disabled={!correctionReason.trim() || correctionSubmitting} loading={correctionSubmitting}>
                  <Save className="h-4 w-4" />
                  {labels.correctNow}
                </PillButton>
              </div>
            </div>
          </div>
        </div>
      )}

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