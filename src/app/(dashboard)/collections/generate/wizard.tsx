"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Wand2,
  Check,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Users,
  Layers,
  Settings,
  AlertCircle,
  Search,
} from "lucide-react";
import { Button, Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { generateDuesForCategoryAction } from "@/modules/collections/actions";
import { cn } from "@/lib/cn";

type CollectionDefinition = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  frequency: string | null;
  amountType: string | null;
  defaultAmountPaise: number | null;
  donorEligibility: string | null;
  memberAssignment: string | null;
  dueGeneration: string | null;
  settlementPolicy: string | null;
  defaultDueDay?: number | null;
  defaultGraceDays?: number | null;
  baseCategory?: { name: string; code: string } | null;
  subcategory?: { name: string; code: string } | null;
};

export function DueGenerationWizard({
  labels,
  masjidId,
  collectionDefinitions,
}: {
  labels: Record<string, string>;
  masjidId: string;
  collectionDefinitions: CollectionDefinition[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Wizard State
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [generationMode, setGenerationMode] = useState("ADMIN");
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [memberAssignmentMode, setMemberAssignmentMode] = useState("ALL_ELIGIBLE");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Result state
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedCategory = collectionDefinitions.find((c) => c.id === selectedCategoryId);

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleGenerate = () => {
    setActionError(null);
    const formData = new FormData();
    formData.set("categoryId", selectedCategoryId);
    formData.set("startDate", fromDate);
    formData.set("endDate", toDate);
    formData.set("forceRegenerate", "true");

    startTransition(async () => {
      try {
        const res = await generateDuesForCategoryAction(undefined, formData);
        if (res?.ok) {
          setResult({
            created: res.created ?? 0,
            skipped: res.skipped ?? 0,
            errors: res.errors ?? [],
          });
          setStep(5); // Stay on step 5 to show success/result
        } else {
          setActionError(res?.error || labels.errorGeneric || "Failed to generate dues");
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Unexpected error");
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Stepper Header */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border-tile)] bg-[var(--surface-card)] p-4 shadow-sm">
        {[
          { num: 1, title: labels.category },
          { num: 2, title: labels.generationMode },
          { num: 3, title: labels.dateRange },
          { num: 4, title: labels.selectMembers },
          { num: 5, title: labels.review },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                step === s.num
                  ? "bg-[var(--brand-primary)] text-white"
                  : step > s.num
                  ? "bg-[var(--success)] text-white"
                  : "bg-[var(--surface-field)] text-[var(--ink-muted-new)]"
              )}
            >
              {step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span
              className={cn(
                "hidden md:inline text-xs font-medium",
                step === s.num ? "text-[var(--brand-primary)]" : "text-[var(--ink-muted-new)]"
              )}
            >
              {s.title}
            </span>
            {s.num < 5 && <div className="hidden lg:block h-px w-8 bg-[var(--border-tile)] mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Category */}
      {step === 1 && (
        <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
          <CardHeader>
            <CardTitle>{labels.selectCategory}</CardTitle>
            <p className="text-sm text-[var(--ink-muted-new)]">{labels.selectCategoryDesc}</p>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            {collectionDefinitions.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--ink-muted-new)]">
                {labels.noCategories}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {collectionDefinitions.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setGenerationMode(cat.dueGeneration || "ADMIN");
                      setMemberAssignmentMode(cat.memberAssignment || "ALL_ELIGIBLE");
                    }}
                    className={cn(
                      "flex flex-col text-left rounded-xl border-2 p-4 transition-all",
                      selectedCategoryId === cat.id
                        ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] shadow-[0_0_0_2px_var(--brand-soft)]"
                        : "border-[var(--border-tile)] bg-[var(--surface-card)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-soft)]"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-[var(--ink-primary)]">{cat.name}</span>
                      <Badge tone="neutral">{cat.frequency || "ONETIME"}</Badge>
                    </div>
                    <p className="text-xs text-[var(--ink-muted-new)] mb-2">
                      {cat.baseCategory?.name} {cat.subcategory ? `· ${cat.subcategory.name}` : ""}
                    </p>
                    {cat.defaultAmountPaise && (
                      <p className="text-xs font-medium text-[var(--brand-primary)]">
                        Default: ₹{(cat.defaultAmountPaise / 100).toLocaleString("en-IN")}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-[var(--border-tile)]">
              <Button
                type="button"
                onClick={handleNext}
                disabled={!selectedCategoryId}
                className="gap-2"
              >
                {labels.next} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 2: Generation Mode */}
      {step === 2 && (
        <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
          <CardHeader>
            <CardTitle>{labels.generationMode}</CardTitle>
            <p className="text-sm text-[var(--ink-muted-new)]">{labels.generationModeDesc}</p>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  value: "ADMIN",
                  title: labels.adminMode,
                  desc: labels.adminModeDesc,
                },
                {
                  value: "AUTOMATIC",
                  title: labels.automaticMode,
                  desc: labels.automaticModeDesc,
                },
              ].map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setGenerationMode(mode.value)}
                  className={cn(
                    "flex flex-col text-left rounded-xl border-2 p-4 transition-all",
                    generationMode === mode.value
                      ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] shadow-[0_0_0_2px_var(--brand-soft)]"
                      : "border-[var(--border-tile)] bg-[var(--surface-card)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-soft)]"
                  )}
                >
                  <span className="font-semibold text-[var(--ink-primary)] mb-1">{mode.title}</span>
                  <p className="text-xs text-[var(--ink-muted-new)]">{mode.desc}</p>
                  {selectedCategory?.dueGeneration === mode.value && (
                    <span className="mt-3 inline-block">
                      <Badge tone="success">{labels.currentMode}</Badge>
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-[var(--border-tile)]">
              <Button type="button" variant="secondary" onClick={handlePrev} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> {labels.back}
              </Button>
              <Button type="button" onClick={handleNext} className="gap-2">
                {labels.next} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 3: Date Range */}
      {step === 3 && (
        <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
          <CardHeader>
            <CardTitle>{labels.dateRange}</CardTitle>
            <p className="text-sm text-[var(--ink-muted-new)]">{labels.dateRangeDesc}</p>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--ink-primary)] mb-1">
                  {labels.fromDate}
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[var(--border-tile)] bg-[var(--surface-card)] px-3 text-base text-[var(--ink-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ink-primary)] mb-1">
                  {labels.toDate}
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[var(--border-tile)] bg-[var(--surface-card)] px-3 text-base text-[var(--ink-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[var(--border-tile)]">
              <Button type="button" variant="secondary" onClick={handlePrev} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> {labels.back}
              </Button>
              <Button type="button" onClick={handleNext} className="gap-2">
                {labels.next} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 4: Member Selection */}
      {step === 4 && (
        <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
          <CardHeader>
            <CardTitle>{labels.selectMembers}</CardTitle>
            <p className="text-sm text-[var(--ink-muted-new)]">{labels.selectMembersDesc}</p>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setMemberAssignmentMode("ALL_ELIGIBLE")}
                className={cn(
                  "flex-1 rounded-xl border-2 p-3 text-sm font-medium transition-all",
                  memberAssignmentMode === "ALL_ELIGIBLE"
                    ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)] shadow-[0_0_0_2px_var(--brand-soft)]"
                    : "border-[var(--border-tile)] bg-[var(--surface-card)] text-[var(--ink-primary)]"
                )}
              >
                {labels.allEligible}
              </button>
              <button
                type="button"
                onClick={() => setMemberAssignmentMode("SELECTED")}
                className={cn(
                  "flex-1 rounded-xl border-2 p-3 text-sm font-medium transition-all",
                  memberAssignmentMode === "SELECTED"
                    ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)] shadow-[0_0_0_2px_var(--brand-soft)]"
                    : "border-[var(--border-tile)] bg-[var(--surface-card)] text-[var(--ink-primary)]"
                )}
              >
                {labels.selectedMembers}
              </button>
            </div>

            {memberAssignmentMode === "SELECTED" && (
              <div className="rounded-xl border border-[var(--border-tile)] p-4 space-y-3 bg-[var(--surface-field)]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted-new)]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={labels.searchMembers}
                    className="w-full rounded-lg border border-[var(--border-tile)] bg-[var(--surface-card)] pl-9 pr-3 py-2 text-sm text-[var(--ink-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                  />
                </div>
                <p className="text-xs text-[var(--ink-muted-new)]">
                  {selectedMemberIds.length} {labels.memberCount}
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-[var(--border-tile)]">
              <Button type="button" variant="secondary" onClick={handlePrev} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> {labels.back}
              </Button>
              <Button type="button" onClick={handleNext} className="gap-2">
                {labels.review} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 5: Review & Generate */}
      {step === 5 && (
        <Card className="rounded-[var(--radius-card)] border-[var(--border-tile)] bg-[var(--surface-card)]">
          <CardHeader>
            <CardTitle>{labels.review}</CardTitle>
            <p className="text-sm text-[var(--ink-muted-new)]">{labels.reviewDesc}</p>
          </CardHeader>
          <CardBody className="space-y-5 pt-0">
            {result ? (
              <div className="rounded-xl border border-[#cfe6da] bg-[var(--success-soft)] p-5 space-y-3 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success)] text-white">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-[var(--success)]">{labels.success}</h3>
                <div className="flex justify-center gap-6 text-sm">
                  <div>
                    <p className="font-bold text-lg text-[var(--ink-primary)]">{result.created}</p>
                    <p className="text-xs text-[var(--ink-muted-new)]">{labels.duesGenerated}</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-[var(--ink-primary)]">{result.skipped}</p>
                    <p className="text-xs text-[var(--ink-muted-new)]">{labels.skipped}</p>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="text-left bg-white p-3 rounded-lg border border-[var(--danger-soft)] text-xs text-[var(--danger)]">
                    <p className="font-semibold mb-1">{labels.errors}:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="pt-3">
                  <Button onClick={() => router.push("/settings?tab=collections")}>
                    {labels.done}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-[var(--border-tile)] bg-[var(--surface-field)] p-4 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-[var(--border-tile)] pb-2">
                    <span className="text-[var(--ink-muted-new)]">{labels.categoryLabel}</span>
                    <span className="font-semibold text-[var(--ink-primary)]">{selectedCategory?.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-tile)] pb-2">
                    <span className="text-[var(--ink-muted-new)]">{labels.modeLabel}</span>
                    <span className="font-semibold text-[var(--ink-primary)]">{generationMode}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-tile)] pb-2">
                    <span className="text-[var(--ink-muted-new)]">{labels.dateRangeLabel}</span>
                    <span className="font-semibold text-[var(--ink-primary)]">
                      {fromDate} to {toDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--ink-muted-new)]">{labels.membersLabel}</span>
                    <span className="font-semibold text-[var(--ink-primary)]">
                      {memberAssignmentMode === "ALL_ELIGIBLE" ? labels.allEligible : `${selectedMemberIds.length} ${labels.memberCount}`}
                    </span>
                  </div>
                </div>

                {actionError && (
                  <p role="alert" className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">
                    {actionError}
                  </p>
                )}

                <div className="flex justify-between pt-4 border-t border-[var(--border-tile)]">
                  <Button type="button" variant="secondary" onClick={handlePrev} disabled={isPending} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> {labels.back}
                  </Button>
                  <Button type="button" onClick={handleGenerate} disabled={isPending} className="gap-2">
                    <Wand2 className="h-4 w-4" /> {isPending ? labels.generating : labels.generate}
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}