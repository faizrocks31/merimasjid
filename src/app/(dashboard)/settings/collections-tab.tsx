"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Edit, Trash2, X, Users, Wand2, Calendar, Target, Zap, Layers } from "lucide-react";
import {
  generateDuesForCategoryAction,
  generateAllDuesAction,
  assignMembersToCategoryAction,
  previewDuesGenerationAction,
  type CollectionState,
} from "@/modules/collections/actions";
import {
  createCollectionDefinitionAction,
  updateCollectionDefinitionAction,
  deleteCollectionDefinitionAction,
} from "@/modules/settings/actions";
import { getFormFields } from "@/lib/validation";
import { Badge, Button, Card, CardHeader, CardTitle } from "@/components/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { SimpleForm } from "@/components/forms/auto-form";
import { CategoryEventsPanel, type CollectionEventItem, type MemberOption } from "./collection-event-forms";
import { COLLECTION_FREQUENCY, DUE_GENERATION, MEMBER_ASSIGNMENT, SETTLEMENT_POLICY } from "@/lib/constants";

type Labels = Record<string, string>;

interface CollectionDefinitionItem {
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  active: boolean;
  showInPaymentReceived: boolean;
  frequency: string | null;
  amountType: string | null;
  defaultAmountPaise: number | null;
  donorEligibility: string | null;
  memberAssignment: string | null;
  dueGeneration: string | null;
  settlementPolicy: string | null;
  baseCategoryName: string;
  subcategoryName: string;
  meta: string;
}

interface CollectionDefinitionsTabProps {
  labels: Labels;
  items: CollectionDefinitionItem[];
  baseCategories: { id: string; name: string; code: string }[];
  subcategories: { id: string; name: string; code: string }[];
  onDelete: (item: any) => void;
}

interface EventsTabProps {
  labels: Labels;
  collectionEventItems: CollectionEventItem[];
  memberOptions: MemberOption[];
  assignmentItems: Array<{
    id: string;
    eventId: string;
    memberId: string;
    memberName: string;
    memberNo: string;
    expectedAmountPaise: number;
    status: string;
  }>;
  collectionDefinitionItems: Array<{
    id: string;
    name: string;
    frequency?: string | null;
    collectionMode?: string | null | undefined;
    defaultAmountPaise?: number | null;
  }>;
}

interface AssignmentsTabProps {
  labels: Labels;
  collectionDefinitionItems: Array<{
    id: string;
    name: string;
    memberAssignment: string | null;
    frequency: string | null;
    defaultAmountPaise: number | null;
    dueGeneration: string | null;
  }>;
  memberOptions: MemberOption[];
  collectionEventItems: CollectionEventItem[];
  assignmentItems: Array<{
    id: string;
    eventId: string;
    memberId: string;
    memberName: string;
    memberNo: string;
    expectedAmountPaise: number;
    status: string;
  }>;
}

function Notice({ state, saved }: { state: CollectionState; saved: string }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-lg border border-[#f0cfcf] bg-[var(--danger-soft)] px-3 py-2 text-[11px] font-medium text-[var(--danger)]">
        {state.error}
      </p>
    );
  }
  if (state?.ok) {
    return (
      <p className="rounded-lg border border-[#cfe6da] bg-[var(--success-soft)] px-3 py-2 text-[11px] font-medium text-[var(--success)]">
        {state.message ? state.message : saved} ✓
      </p>
    );
  }
  return null;
}

function useReloadOnSuccess(state: CollectionState) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) window.location.reload();
  }, [state, router]);
}

// ----- Collection Definitions Tab -----
export function CollectionDefinitionsTab({
  labels,
  items,
  baseCategories,
  subcategories,
  onDelete,
}: CollectionDefinitionsTabProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<CollectionDefinitionItem | null>(null);
  const [formState, setFormState] = useState<CollectionState>(undefined);
  const [isPending, startTransition] = useTransition();

  const frequencyLabels: Record<string, string> = {
    WEEKLY: labels.weekly ?? "Weekly",
    MONTHLY: labels.monthly ?? "Monthly",
    QUARTERLY: labels.quarterly ?? "Quarterly",
    SEMI_ANNUAL: labels.semiAnnual ?? "Semi-Annual",
    ANNUAL: labels.annual ?? "Annual",
    EVENT_BASED: labels.eventBased ?? "Event-Based",
    ONE_TIME: labels.oneTime ?? "One-Time",
  };

  const amountTypeLabels: Record<string, string> = {
    FIXED: labels.fixedAmount ?? "Fixed Amount",
    VARIABLE: labels.variableAmount ?? "Variable Amount",
  };

  const donorEligibilityLabels: Record<string, string> = {
    MEMBERS_ONLY: labels.membersOnly ?? "Members Only",
    WALKIN_ONLY: labels.walkinOnly ?? "Walk-in Only",
    BOTH: labels.both ?? "Both Members & Walk-ins",
  };

  const memberAssignmentLabels: Record<string, string> = {
    ALL_ELIGIBLE: labels.allEligible ?? "All Eligible Members",
    SELECTED: labels.selectedMembers ?? "Selected Members",
  };

  const dueGenerationLabels: Record<string, string> = {
    ADMIN: labels.adminGenerated ?? "Admin Generated",
    AUTOMATIC: labels.automaticGenerated ?? "Automatic",
  };

  const settlementPolicyLabels: Record<string, string> = {
    OLDEST_FIRST: labels.oldestFirst ?? "Oldest First (FIFO)",
    ANY_PENDING_PERIOD: labels.anyPendingPeriod ?? "Any Pending Period",
  };

  const baseCategoryLabels: Record<string, string> = {
    ZAKAT: labels.zakat ?? "Zakat",
    SADAQAH: labels.sadaqah ?? "Sadaqah",
    INFAQ: labels.infaq ?? "Infaq",
    CHANDA: labels.chanda ?? "Chanda",
    FUNDRAISING: labels.fundraising ?? "Fundraising",
    COMMUNITY_EVENT: labels.communityEvent ?? "Community Event",
    GENERAL_DONATION: labels.generalDonation ?? "General Donation",
  };

  const subcategoryLabels: Record<string, string> = {
    ZAKAT_FITR: labels.zakatFitr ?? "Zakat al-Fitr",
    ZAKAT_MAAL: labels.zakatMaal ?? "Zakat al-Maal",
    GENERAL: labels.general ?? "General",
    FIDYAH: labels.fidyah ?? "Fidyah",
    KAFFARAH: labels.kaffarah ?? "Kaffarah",
    CONSTRUCTION: labels.construction ?? "Construction",
    MAINTENANCE: labels.maintenance ?? "Maintenance",
    OPERATIONS: labels.operations ?? "Operations",
    MONTHLY: labels.monthlySub ?? "Monthly",
    ANNUAL: labels.annualSub ?? "Annual",
    CAMPAIGN: labels.campaign ?? "Campaign",
    PROJECT: labels.project ?? "Project",
    EMERGENCY: labels.emergency ?? "Emergency",
    EID: labels.eid ?? "Eid",
    MILAD: labels.milad ?? "Milad un-Nabi",
    ISRA_MIRAJ: labels.israMiraj ?? "Isra wal Miraj",
    SHAB_E_QADR: labels.shabEQadr ?? "Shab-e-Qadr",
    RAMADAN: labels.ramadan ?? "Ramadan",
    JUMMA: labels.jumma ?? "Jumma",
    UNRESTRICTED: labels.unrestricted ?? "Unrestricted",
  };

  const handleEdit = (item: CollectionDefinitionItem) => {
    setEditingDefinition(item);
    setShowAddForm(true);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setEditingDefinition(null);
  };

  const isEditing = !!editingDefinition;

  // We need to get baseCategoryId from the item
  const editingBaseCategoryId = isEditing && editingDefinition
    ? items.find(i => i.id === editingDefinition.id)?.meta.split(" · ")[0]
    : "";

  const validSubcategories = useMemo(
    () => subcategories.filter((sc) => {
      const validCombos: Record<string, string[]> = {
        ZAKAT: ["ZAKAT_FITR", "ZAKAT_MAAL"],
        SADAQAH: ["GENERAL", "FIDYAH", "KAFFARAH"],
        INFAQ: ["CONSTRUCTION", "MAINTENANCE", "OPERATIONS"],
        CHANDA: ["MONTHLY", "ANNUAL"],
        FUNDRAISING: ["CAMPAIGN", "PROJECT", "EMERGENCY"],
        COMMUNITY_EVENT: ["EID", "MILAD", "ISRA_MIRAJ", "SHAB_E_QADR", "RAMADAN", "JUMMA"],
        GENERAL_DONATION: ["UNRESTRICTED"],
      };
      const baseCode = editingBaseCategoryId;
      if (!baseCode) return true; // Show all if no base category selected
      return validCombos[baseCode]?.includes(sc.code) ?? false;
    }),
    [subcategories, editingBaseCategoryId]
  );

  const fields = useMemo(
    () => [
      { name: "name", label: labels.name, type: "text" as const, required: true, placeholder: "e.g. Monthly Chanda" },
      { name: "description", label: labels.description, type: "textarea" as const, required: false, placeholder: labels.descriptionHint ?? "" },
      {
        name: "baseCategoryId",
        label: labels.baseCategory ?? "Base Category",
        type: "select" as const,
        required: true,
        options: baseCategories.map((bc) => ({
          value: bc.id,
          label: baseCategoryLabels[bc.code] || bc.name,
        })),
        defaultValue: isEditing && editingDefinition ? editingDefinition.meta.split(" · ")[0] : undefined,
      },
      {
        name: "subcategoryId",
        label: labels.subcategory ?? "Subcategory",
        type: "select" as const,
        required: true,
        options: validSubcategories.map((sc) => ({
          value: sc.id,
          label: subcategoryLabels[sc.code] || sc.name,
        })),
        defaultValue: isEditing && editingDefinition ? editingDefinition.meta.split(" · ")[1] : undefined,
      },
      { name: "active", label: labels.active, type: "checkbox" as const, required: false, defaultValue: isEditing ? editingDefinition?.active : true },
      { name: "showInPaymentReceived", label: labels.showInPaymentReceived ?? "Show in Payment Received", type: "checkbox" as const, required: false, defaultValue: isEditing ? editingDefinition?.showInPaymentReceived : true },
      {
        name: "frequency",
        label: labels.frequency,
        type: "select" as const,
        required: true,
        options: Object.entries(frequencyLabels).map(([value, label]) => ({ value, label })),
        defaultValue: isEditing ? editingDefinition?.frequency : undefined,
      },
      {
        name: "amountType",
        label: labels.amountType ?? "Amount Type",
        type: "select" as const,
        required: true,
        options: Object.entries(amountTypeLabels).map(([value, label]) => ({ value, label })),
        defaultValue: isEditing ? editingDefinition?.amountType : undefined,
      },
      {
        name: "defaultAmountPaise",
        label: labels.defaultAmount ?? "Default Amount (Paise)",
        type: "number" as const,
        required: false,
        min: 1,
        placeholder: "e.g. 50000 for ₹500",
        defaultValue: isEditing && editingDefinition?.defaultAmountPaise ? String(editingDefinition.defaultAmountPaise) : undefined,
      },
      {
        name: "donorEligibility",
        label: labels.donorEligibility ?? "Donor Eligibility",
        type: "select" as const,
        required: true,
        options: Object.entries(donorEligibilityLabels).map(([value, label]) => ({ value, label })),
        defaultValue: isEditing ? editingDefinition?.donorEligibility : undefined,
      },
      {
        name: "memberAssignment",
        label: labels.memberAssignment ?? "Member Assignment",
        type: "select" as const,
        required: true,
        options: Object.entries(memberAssignmentLabels).map(([value, label]) => ({ value, label })),
        defaultValue: isEditing ? editingDefinition?.memberAssignment : undefined,
      },
      {
        name: "dueGeneration",
        label: labels.dueGeneration ?? "Due Generation",
        type: "select" as const,
        required: true,
        options: Object.entries(dueGenerationLabels).map(([value, label]) => ({ value, label })),
        defaultValue: isEditing ? editingDefinition?.dueGeneration : undefined,
      },
      {
        name: "settlementPolicy",
        label: labels.settlementPolicy ?? "Settlement Policy",
        type: "select" as const,
        required: true,
        options: Object.entries(settlementPolicyLabels).map(([value, label]) => ({ value, label })),
        defaultValue: isEditing ? editingDefinition?.settlementPolicy : undefined,
      },
    ],
    [
      labels,
      isEditing,
      editingDefinition,
      baseCategories,
      validSubcategories,
      frequencyLabels,
      amountTypeLabels,
      donorEligibilityLabels,
      memberAssignmentLabels,
      dueGenerationLabels,
      settlementPolicyLabels,
      baseCategoryLabels,
      subcategoryLabels,
    ]
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (isEditing) {
      formData.set("definitionId", editingDefinition!.id);
    }
    const action = isEditing ? updateCollectionDefinitionAction : createCollectionDefinitionAction;
    startTransition(async () => {
      const result = await action(undefined, formData);
      setFormState(result);
    });
  };

  return (
    <div className="space-y-4">
      {/* Add/Edit Form */}
      {(showAddForm || isEditing) && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-3 p-5">
            {isEditing && <input type="hidden" name="definitionId" value={editingDefinition!.id} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <SimpleForm
                key={isEditing ? editingDefinition!.id : "new"}
                fields={fields.slice(0, 6)}
                values={{}}
                disabled={formState?.ok === true}
                fieldsOnly={true}
                uncontrolled={true}
              />
              <SimpleForm
                fields={fields.slice(6)}
                values={{}}
                disabled={formState?.ok === true}
                fieldsOnly={true}
                uncontrolled={true}
              />
            </div>
            <Notice state={formState} saved={labels.saved} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant={isEditing ? "primary" : "secondary"} disabled={formState?.ok === true || isPending} className="flex-1">
                {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isPending ? labels.loading : formState?.ok === true ? labels.loading : isEditing ? labels.update : labels.save}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={handleCancelAdd} className="flex-1">
                <X className="h-4 w-4" /> {labels.cancel}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{labels.collectionDefinitions ?? "Collection Definitions"}</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditingDefinition(null);
              setShowAddForm(!showAddForm);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{showAddForm ? labels.cancel : labels.addCollectionDefinition ?? "Add Collection Definition"}</span>
          </Button>
        </CardHeader>
        <ul className="divide-y divide-[var(--border-subtle)]">
          {items.length === 0 && (
            <li className="px-5 py-6 text-xs text-[var(--ink-muted)]">—</li>
          )}
          {items.map((item) => (
            <li key={item.id} className="px-5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.name}</p>
                  <p className="num text-[11px] text-[var(--ink-muted)]">
                    {item.meta}
                    {item.code && ` · ${item.code}`}
                    {item.donorEligibility && ` · ${donorEligibilityLabels[item.donorEligibility] ?? item.donorEligibility}`}
                    {item.memberAssignment && ` · ${memberAssignmentLabels[item.memberAssignment] ?? item.memberAssignment}`}
                    {item.dueGeneration && ` · ${dueGenerationLabels[item.dueGeneration] ?? item.dueGeneration}`}
                    {item.settlementPolicy && ` · ${settlementPolicyLabels[item.settlementPolicy] ?? item.settlementPolicy}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {item.active === false ? <Badge tone="neutral">{labels.inactive}</Badge> : <Badge tone="success">{labels.active}</Badge>}
                  {item.showInPaymentReceived ? (
                    <Badge tone="brand">{labels.showInPaymentReceived ?? "Visible"}</Badge>
                  ) : (
                    <Badge tone="neutral">{labels.hiddenInPaymentReceived ?? "Hidden"}</Badge>
                  )}
                  {item.frequency && (
                    <Badge tone="neutral">
                      {frequencyLabels[item.frequency] ?? item.frequency}
                    </Badge>
                  )}
                  {item.amountType && (
                    <Badge tone="neutral">
                      {amountTypeLabels[item.amountType] ?? item.amountType}
                    </Badge>
                  )}
                  {item.defaultAmountPaise && (
                    <Badge tone="neutral">
                      ₹{(item.defaultAmountPaise / 100).toFixed(2)}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(item)}
                      className="h-8 w-8 p-0"
                      aria-label={labels.edit ?? "Edit"}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(item)}
                      className="h-8 w-8 p-0 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      aria-label={labels.delete ?? "Delete"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ----- Events Tab -----
export function EventsTab({
  labels,
  collectionEventItems,
  memberOptions,
  assignmentItems,
  collectionDefinitionItems,
}: EventsTabProps) {
  return (
    <div className="space-y-4">
      {collectionDefinitionItems.map((cat) => (
        <CategoryEventsPanel
          key={cat.id}
          labels={labels}
          category={cat}
          events={collectionEventItems.filter((e) => e.categoryId === cat.id)}
          members={memberOptions}
          assignments={assignmentItems}
          collectionMode={cat.collectionMode}
        />
      ))}
    </div>
  );
}

// ----- Assignments Tab -----
export function AssignmentsTab({
  labels,
  collectionDefinitionItems,
  memberOptions,
  collectionEventItems,
  assignmentItems,
}: AssignmentsTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [formState, setFormState] = useState<CollectionState>(undefined);
  const [, startTransition] = useTransition();
  useReloadOnSuccess(formState);

  // 5-step dues generation wizard state
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardData, setWizardData] = useState<{
    categoryId: string;
    startDate: string;
    endDate: string;
    memberIds: string[];
    previewResult?: any;
  }>({ categoryId: "", startDate: "", endDate: "", memberIds: [] });
  const [wizardPending, setWizardPending] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const selectedCategory = collectionDefinitionItems.find(c => c.id === selectedCategoryId);
  const categoryEvents = selectedCategory
    ? collectionEventItems.filter(e => e.categoryId === selectedCategory.id)
    : [];

  const isSelectedMode = selectedCategory?.memberAssignment === MEMBER_ASSIGNMENT.SELECTED;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await assignMembersToCategoryAction(undefined, formData);
      setFormState(result);
    });
  };

  return (
    <div className="space-y-4">
      {/* Category Selector */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{labels.memberAssignments ?? "Member Assignments"}</CardTitle>
        </CardHeader>
        <div className="p-4">
          <label className="block text-sm font-medium text-[var(--ink-muted)] mb-2">{labels.selectCategory}</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 py-2.5 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
          >
            <option value="">{labels.selectCategoryPlaceholder ?? "— Select a category —"}</option>
            {collectionDefinitionItems.filter(c => c.memberAssignment === MEMBER_ASSIGNMENT.SELECTED).map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {selectedCategory && isSelectedMode && (
        <>
          {/* Event Selector */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{labels.selectEvent}</CardTitle>
            </CardHeader>
            <div className="p-4">
              {categoryEvents.length === 0 ? (
                <p className="text-[11px] text-[var(--ink-muted)]">{labels.noEventsForCategory}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border border-[var(--border-subtle)] p-3">
                      <p className="text-sm font-medium">{event.name}</p>
                      <p className="num text-[11px] text-[var(--ink-muted)]">
                        {labels.eventStartDate}: {new Date(event.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        {event.endDate ? ` · ${new Date(event.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                        · {labels.eventDueDate}: {new Date(event.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        {event.expectedAmountPaise ? ` · ₹${(event.expectedAmountPaise / 100).toLocaleString("en-IN")}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Member Assignment Matrix */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{labels.assignMembersToCategory ?? "Assign Members to Category"}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <input type="hidden" name="categoryId" value={selectedCategory.id} />

              <div>
                <label className="block text-sm font-medium text-[var(--ink-muted)] mb-2">
                  {labels.expectedAmountPerMember}
                </label>
                <input
                  name="expectedAmountPaise"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={selectedCategory.defaultAmountPaise ? String(selectedCategory.defaultAmountPaise / 100) : ""}
                  className="num w-full sm:w-48 rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 py-2.5 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--ink-muted)] mb-2">
                  {labels.selectMembers}
                </label>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border-subtle)]">
                  {memberOptions.length === 0 ? (
                    <p className="px-3 py-3 text-[11px] text-[var(--ink-muted)]">{labels.noActiveMembers}</p>
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {memberOptions.map((m) => {
                        // Check if already assigned to any event in this category
                        const assignedEvents = categoryEvents.filter(e =>
                          assignmentItems.some(a => a.eventId === e.id && a.memberId === m.id)
                        );
                        const isAssigned = assignedEvents.length > 0;

                        return (
                          <li key={m.id}>
                            <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-[var(--surface)]">
                              <input
                                type="checkbox"
                                name="memberIds"
                                value={m.id}
                                checked={isAssigned}
                                className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)]"
                              />
                              <span className="min-w-0 flex-1 truncate text-sm">{m.fullName}</span>
                              <span className="num shrink-0 text-[11px] text-[var(--ink-muted)]">{m.memberNo}</span>
                              {isAssigned && (
                                <Badge tone="success" className="text-[10px]">{labels.assigned}</Badge>
                              )}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <Notice state={formState} saved={labels.saved} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="primary" disabled={formState?.ok === true} className="flex-1">
                  <Users className="h-4 w-4" /> {formState?.ok === true ? labels.loading : labels.assignMembersToCategory ?? "Assign Members"}
                </Button>
              </div>
            </form>
          </Card>

          {/* 5-Step Due Generation Wizard */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{labels.generateDues ?? "Generate Dues Periods"}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge tone={selectedCategory.dueGeneration === DUE_GENERATION.AUTOMATIC ? "success" : "neutral"}>
                  {selectedCategory.dueGeneration === DUE_GENERATION.AUTOMATIC ? labels.automaticGenerated : labels.adminGenerated}
                </Badge>
                {wizardStep > 1 && wizardStep < 6 && (
                  <span className="text-xs text-[var(--ink-muted)]">
                    {labels.wizardStep} {wizardStep} {labels.wizardOf} 5
                  </span>
                )}
              </div>
            </CardHeader>
            <div className="p-4">
              {wizardStep === 1 && (
                <WizardStep1
                  labels={labels}
                  collectionDefinitionItems={collectionDefinitionItems}
                  wizardData={wizardData}
                  setWizardData={setWizardData}
                  setWizardStep={setWizardStep}
                  wizardPending={wizardPending}
                  setWizardError={setWizardError}
                  wizardError={wizardError}
                />
              )}
              {wizardStep === 2 && (
                <WizardStep2
                  labels={labels}
                  collectionDefinitionItems={collectionDefinitionItems}
                  wizardData={wizardData}
                  setWizardData={setWizardData}
                  setWizardStep={setWizardStep}
                  wizardPending={wizardPending}
                  setWizardError={setWizardError}
                  wizardError={wizardError}
                />
              )}
              {wizardStep === 3 && (
                <WizardStep3
                  labels={labels}
                  memberOptions={memberOptions}
                  wizardData={wizardData}
                  setWizardData={setWizardData}
                  setWizardStep={setWizardStep}
                  wizardPending={wizardPending}
                  setWizardError={setWizardError}
                  wizardError={wizardError}
                />
              )}
              {wizardStep === 4 && (
                <WizardStep4
                  labels={labels}
                  collectionDefinitionItems={collectionDefinitionItems}
                  memberOptions={memberOptions}
                  wizardData={wizardData}
                  setWizardData={setWizardData}
                  setWizardStep={setWizardStep}
                  wizardPending={wizardPending}
                  setWizardError={setWizardError}
                  wizardError={wizardError}
                />
              )}
              {wizardStep === 5 && (
                <WizardStep5
                  labels={labels}
                  wizardData={wizardData}
                  setWizardData={setWizardData}
                  setWizardStep={setWizardStep}
                />
              )}
            </div>
          </Card>
        </>
      )}

      {selectedCategory && !isSelectedMode && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{labels.assignmentsInfo}</CardTitle>
          </CardHeader>
          <div className="p-4 text-[11px] text-[var(--ink-muted)]">
            {selectedCategory.memberAssignment === MEMBER_ASSIGNMENT.ALL_ELIGIBLE && (
              <p>{labels.allEligibleModeInfo ?? "This category uses 'All Eligible Members' mode. Dues are automatically generated for all active members. Use the 'Generate Dues' section below."}</p>
            )}
          </div>
        </Card>
      )}

      {/* Bulk Generate All Dues */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{labels.generateAllDues ?? "Generate All Automatic Dues"}</CardTitle>
          <Zap className="h-5 w-5 text-[var(--warning)]" />
        </CardHeader>
        <div className="p-4">
          <p className="text-[11px] text-[var(--ink-muted)] mb-4">
            {labels.generateAllDuesDesc ?? "Generates dues periods for all categories with 'Automatic' due generation mode for the next 30 days."}
          </p>
          <form
            onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const result = await generateAllDuesAction(undefined, new FormData());
              setFormState(result);
            }}
          >
            <Button type="submit" size="sm" variant="primary" className="flex-1">
              <Zap className="h-4 w-4" /> {labels.generateAllDuesAction ?? "Generate All Dues Now"}
            </Button>
          </form>
          <Notice state={formState} saved={labels.saved} />
        </div>
      </Card>
    </div>
  );
}

// ----- Main Collections Tab -----
export function CollectionsTab({
  labels,
  collectionDefinitionItems,
  baseCategories,
  subcategories,
  collectionEventItems,
  memberOptions,
  assignmentItems,
  onDeleteCollectionDefinition,
}: {
  labels: Labels;
  collectionDefinitionItems: CollectionDefinitionsTabProps["items"];
  baseCategories: CollectionDefinitionsTabProps["baseCategories"];
  subcategories: CollectionDefinitionsTabProps["subcategories"];
  collectionEventItems: CollectionEventItem[];
  memberOptions: MemberOption[];
  assignmentItems: AssignmentsTabProps["assignmentItems"];
  onDeleteCollectionDefinition: (item: any) => void;
}) {
  return (
    <Tabs defaultValue="categories" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="categories">
          <Layers className="h-4 w-4 mr-1.5" />
          {labels.collectionDefinitions ?? "Categories"}
        </TabsTrigger>
        <TabsTrigger value="events">
          <Calendar className="h-4 w-4 mr-1.5" />
          {labels.collectionEvents ?? "Events"}
        </TabsTrigger>
        <TabsTrigger value="assignments">
          <Users className="h-4 w-4 mr-1.5" />
          {labels.assignments ?? "Assignments"}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="categories" className="mt-5">
        <CollectionDefinitionsTab
          labels={labels}
          items={collectionDefinitionItems}
          baseCategories={baseCategories}
          subcategories={subcategories}
          onDelete={onDeleteCollectionDefinition}
        />
      </TabsContent>

      <TabsContent value="events" className="mt-5">
        <EventsTab
          labels={labels}
          collectionEventItems={collectionEventItems}
          memberOptions={memberOptions}
          assignmentItems={assignmentItems}
          collectionDefinitionItems={collectionDefinitionItems}
        />
      </TabsContent>

      <TabsContent value="assignments" className="mt-5">
        <AssignmentsTab
          labels={labels}
          collectionDefinitionItems={collectionDefinitionItems}
          memberOptions={memberOptions}
          collectionEventItems={collectionEventItems}
          assignmentItems={assignmentItems}
        />
      </TabsContent>
    </Tabs>
  );
}

// ----- Wizard Step Components -----
function WizardStep1({
  labels,
  collectionDefinitionItems,
  wizardData,
  setWizardData,
  setWizardStep,
  wizardPending,
  setWizardError,
  wizardError,
}: {
  labels: Labels;
  collectionDefinitionItems: any[];
  wizardData: any;
  setWizardData: React.Dispatch<React.SetStateAction<any>>;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
  wizardPending: boolean;
  setWizardError: React.Dispatch<React.SetStateAction<string | null>>;
  wizardError: string | null;
}) {
  const handleNext = () => {
    if (!wizardData.categoryId) {
      setWizardError(labels.selectCategoryError || "Please select a category");
      return;
    }
    setWizardError(null);
    setWizardStep(2);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--ink-muted)]">{labels.selectCategoryDesc}</p>
      <div>
        <label className="block text-sm font-medium text-[var(--ink-muted)] mb-2">{labels.selectCategory}</label>
        <select
          value={wizardData.categoryId}
          onChange={(e) => setWizardData({ ...wizardData, categoryId: e.target.value })}
          className="w-full sm:w-64 rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 py-2.5 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
          disabled={wizardPending}
        >
          <option value="">{labels.selectCategoryPlaceholder ?? "— Select a category —"}</option>
          {collectionDefinitionItems.filter(c => c.active && c.defaultAmountPaise && c.defaultAmountPaise > 0).map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      {wizardError && <p className="text-[var(--danger)] text-sm">{wizardError}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="primary" onClick={handleNext} disabled={wizardPending}>
          {labels.next}
        </Button>
      </div>
    </div>
  );
}

function WizardStep2({
  labels,
  collectionDefinitionItems,
  wizardData,
  setWizardData,
  setWizardStep,
  wizardPending,
  setWizardError,
  wizardError,
}: {
  labels: Labels;
  collectionDefinitionItems: any[];
  wizardData: any;
  setWizardData: React.Dispatch<React.SetStateAction<any>>;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
  wizardPending: boolean;
  setWizardError: React.Dispatch<React.SetStateAction<string | null>>;
  wizardError: string | null;
}) {
  const category = collectionDefinitionItems.find(c => c.id === wizardData.categoryId);
  const isSelectedMode = category?.memberAssignment === "SELECTED";

  const handleNext = async () => {
    setWizardError(null);
    try {
      const preview = await previewDuesGenerationAction(
        wizardData.categoryId,
        wizardData.startDate,
        wizardData.endDate,
        isSelectedMode ? wizardData.memberIds : undefined
      );
      if (preview.error) {
        setWizardError(preview.error);
        return;
      }
      setWizardData({ ...wizardData, previewResult: preview });
      setWizardStep(3);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : "Preview failed");
    }
  };

  const handleBack = () => setWizardStep(1);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--ink-muted)]">{labels.generationModeDesc}</p>
      <div>
        <label className="block text-sm font-medium text-[var(--ink-muted)] mb-2">{labels.generationMode}</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="generationMode"
              value="admin"
              checked={wizardData.generationMode !== "automatic"}
              onChange={() => setWizardData({ ...wizardData, generationMode: "admin" })}
              disabled={wizardPending}
            />
            <span>{labels.adminMode}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="generationMode"
              value="automatic"
              checked={wizardData.generationMode === "automatic"}
              onChange={() => setWizardData({ ...wizardData, generationMode: "automatic" })}
              disabled={wizardPending}
            />
            <span>{labels.automaticMode}</span>
          </label>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--ink-muted)] mb-1">{labels.wizardGenerateFromDate}</label>
          <input
            type="date"
            value={wizardData.startDate}
            onChange={(e) => setWizardData({ ...wizardData, startDate: e.target.value })}
            required
            className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 text-base focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
            disabled={wizardPending}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--ink-muted)] mb-1">{labels.wizardGenerateToDate}</label>
          <input
            type="date"
            value={wizardData.endDate}
            onChange={(e) => setWizardData({ ...wizardData, endDate: e.target.value })}
            required
            className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 text-base focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
            disabled={wizardPending}
          />
        </div>
      </div>
      {wizardError && <p className="text-[var(--danger)] text-sm">{wizardError}</p>}
      <div className="flex justify-between gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={handleBack} disabled={wizardPending}>
          {labels.back}
        </Button>
        <Button type="button" size="sm" variant="primary" onClick={handleNext} disabled={wizardPending || !wizardData.startDate || !wizardData.endDate}>
          {labels.next}
        </Button>
      </div>
    </div>
  );
}

function WizardStep3({
  labels,
  memberOptions,
  wizardData,
  setWizardData,
  setWizardStep,
  wizardPending,
  setWizardError,
  wizardError,
}: {
  labels: Labels;
  memberOptions: any[];
  wizardData: any;
  setWizardData: React.Dispatch<React.SetStateAction<any>>;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
  wizardPending: boolean;
  setWizardError: React.Dispatch<React.SetStateAction<string | null>>;
  wizardError: string | null;
}) {
  const handleNext = () => {
    setWizardError(null);
    setWizardStep(4);
  };

  const handleBack = () => setWizardStep(2);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--ink-muted)]">{labels.selectMembersDesc}</p>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border-subtle)]">
        {memberOptions.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-[var(--ink-muted)]">{labels.noActiveMembers}</p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {memberOptions.map((m: any) => {
              const isSelected = wizardData.memberIds?.includes(m.id);
              return (
                <li key={m.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-[var(--surface)]">
                    <input
                      type="checkbox"
                      name="memberIds"
                      value={m.id}
                      checked={isSelected}
                      onChange={(e) => {
                        const newIds = e.target.checked
                          ? [...(wizardData.memberIds || []), m.id]
                          : (wizardData.memberIds || []).filter((id: string) => id !== m.id);
                        setWizardData({ ...wizardData, memberIds: newIds });
                      }}
                      className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)]"
                      disabled={wizardPending}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{m.fullName}</span>
                    <span className="num shrink-0 text-[11px] text-[var(--ink-muted)]">{m.memberNo}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-sm text-[var(--ink-muted)]">
        {wizardData.memberIds?.length || 0} {labels.memberCount}
      </p>
      {wizardError && <p className="text-[var(--danger)] text-sm">{wizardError}</p>}
      <div className="flex justify-between gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={handleBack} disabled={wizardPending}>
          {labels.back}
        </Button>
        <Button type="button" size="sm" variant="primary" onClick={handleNext} disabled={wizardPending || !wizardData.memberIds?.length}>
          {labels.next}
        </Button>
      </div>
    </div>
  );
}

function WizardStep4({
  labels,
  collectionDefinitionItems,
  memberOptions,
  wizardData,
  setWizardData,
  setWizardStep,
  wizardPending,
  setWizardError,
  wizardError,
}: {
  labels: Labels;
  collectionDefinitionItems: any[];
  memberOptions: any[];
  wizardData: any;
  setWizardData: React.Dispatch<React.SetStateAction<any>>;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
  wizardPending: boolean;
  setWizardError: React.Dispatch<React.SetStateAction<string | null>>;
  wizardError: string | null;
}) {
  const category = collectionDefinitionItems.find(c => c.id === wizardData.categoryId);

  const handleNext = async () => {
    setWizardError(null);
    // Note: we can't set wizardPending from here, we just proceed
    try {
      const formData = new FormData();
      formData.set("categoryId", wizardData.categoryId);
      formData.set("startDate", wizardData.startDate);
      formData.set("endDate", wizardData.endDate);
      formData.set("memberIds", JSON.stringify(wizardData.memberIds || []));
      formData.set("forceRegenerate", "true");
      const result = await generateDuesForCategoryAction(undefined, formData);
      if (result?.error && result.created === 0) {
        setWizardError(result.error);
        return;
      }
      setWizardData({ ...wizardData, result });
      setWizardStep(5);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : "Generation failed");
    }
  };

  const handleBack = () => setWizardStep(3);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--ink-muted)]">{labels.reviewDesc}</p>
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-[var(--ink-muted)]">{labels.categoryLabel}</span>
          <span className="font-medium">{category?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--ink-muted)]">{labels.modeLabel}</span>
          <span className="font-medium">{wizardData.generationMode === "automatic" ? labels.automaticGenerated : labels.adminGenerated}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--ink-muted)]">{labels.dateRangeLabel}</span>
          <span className="font-medium">{wizardData.startDate} → {wizardData.endDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--ink-muted)]">{labels.membersLabel}</span>
          <span className="font-medium">
            {wizardData.memberIds?.length === memberOptions?.length ? labels.allEligible : `${wizardData.memberIds?.length || 0} ${labels.memberCount}`}
          </span>
        </div>
        <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2">
          <span className="text-[var(--ink-muted)]">{labels.summary}</span>
          <span className="font-medium">
            {wizardData.previewResult?.totalPeriods || 0} {labels.wizardDuesGenerated} ({wizardData.previewResult?.totalMembers || 0} {labels.membersLabel.toLowerCase()})
          </span>
        </div>
      </div>
      {wizardError && <p className="text-[var(--danger)] text-sm">{wizardError}</p>}
      <div className="flex justify-between gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={handleBack} disabled={wizardPending}>
          {labels.back}
        </Button>
        <Button type="button" size="sm" variant="primary" onClick={handleNext} disabled={wizardPending}>
          {wizardPending ? labels.generating : labels.generateDuesAction}
        </Button>
      </div>
    </div>
  );
}

function WizardStep5({
  labels,
  wizardData,
  setWizardData,
  setWizardStep,
}: {
  labels: Labels;
  wizardData: any;
  setWizardData: React.Dispatch<React.SetStateAction<any>>;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const handleDone = () => {
    setWizardStep(1);
    setWizardData({ categoryId: "", startDate: "", endDate: "", memberIds: [] });
  };

  const result = wizardData.result;

  return (
    <div className="space-y-4 text-center">
      <div className="text-6xl text-[var(--success)] mb-4">✓</div>
      <h3 className="text-lg font-semibold">{labels.wizardSuccess}</h3>
      <p className="text-[var(--ink-muted)]">
        {result?.created || 0} {labels.wizardDuesGenerated}, {result?.skipped || 0} {labels.skipped}
      </p>
      {result?.errors?.length && (
        <div className="text-sm text-[var(--danger)] mt-2">
          {result.errors.join(", ")}
        </div>
      )}
      <div className="flex justify-center">
        <Button type="button" size="sm" variant="primary" onClick={handleDone} className="w-48">
          {labels.wizardDone}
        </Button>
      </div>
    </div>
  );
}