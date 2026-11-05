"use client";

import { useActionState, useMemo, useTransition, useEffect, useState } from "react";
import { Plus, Save, Edit, Trash2, X, Users, Wand2 } from "lucide-react";
import {
  createCollectionEventAction,
  updateCollectionEventAction,
  deleteCollectionEventAction,
  generateEventsFromCategoryAction,
  assignHouseholdsAction,
  removeHouseholdAssignmentAction,
  type CollectionState,
} from "@/modules/collections/actions";
import { getFormFields } from "@/lib/validation";
import { Badge, Button } from "@/components/ui";
import { SimpleForm } from "@/components/forms/auto-form";

type Labels = Record<string, string>;

const MONTHS = [
  ["1", "January"], ["2", "February"], ["3", "March"], ["4", "April"],
  ["5", "May"], ["6", "June"], ["7", "July"], ["8", "August"],
  ["9", "September"], ["10", "October"], ["11", "November"], ["12", "December"],
];

const EVENT_STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  SCHEDULED: "neutral",
  OPEN: "brand",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const ASSIGNMENT_STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  PENDING: "neutral",
  PARTIAL: "warning",
  PAID: "success",
  WAIVED: "danger",
};

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
        {saved} ✓
      </p>
    );
  }
  return null;
}

/** A successful write has to pull fresh rows back down — see useReloadOnSuccess. */
function useReloadOnSuccess(state: CollectionState) {
  useEffect(() => {
    if (state?.ok) window.location.reload();
  }, [state]);
}

export interface CollectionEventItem {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  startDate: string;
  endDate: string | null;
  dueDate: string;
  expectedAmountPaise: number | null;
  status: string;
  applicableMonth: number | null;
  applicableYear: number | null;
  notes: string | null;
}

export interface MemberOption {
  id: string;
  memberNo: string;
  fullName: string;
}

export interface AssignmentItem {
  id: string;
  eventId: string;
  memberId: string;
  memberName: string;
  memberNo: string;
  expectedAmountPaise: number;
  status: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ */
/* Event form — create / edit                                          */
/* ------------------------------------------------------------------ */

export function CollectionEventForm({
  labels,
  categoryId,
  categoryName,
  editingEvent,
  onCancel,
}: {
  labels: Labels;
  categoryId: string;
  categoryName: string;
  editingEvent?: CollectionEventItem;
  onCancel?: () => void;
}) {
  const isEditing = !!editingEvent;
  const action = isEditing ? updateCollectionEventAction : createCollectionEventAction;
  const [state, formAction, pending] = useActionState<CollectionState, FormData>(action, undefined);
  const [, startTransition] = useTransition();
  useReloadOnSuccess(state);

  const fields = useMemo(
    () =>
      getFormFields("collectionEvent").map((f) => {
        const mapped = { ...f, label: labels[f.name] ?? f.label };
        // The category is fixed by the panel the form lives in.
        if (f.name === "categoryId") {
          mapped.type = "hidden" as const;
          mapped.options = undefined;
        }
        if (f.name === "status") {
          mapped.options = ["SCHEDULED", "OPEN", "COMPLETED", "CANCELLED"].map((v) => ({
            value: v,
            label: labels[v.toLowerCase()] ?? v,
          }));
        }
        if (f.name === "applicableMonth") {
          mapped.options = MONTHS.map(([value, label]) => ({ value, label }));
        }
        if (f.name === "expectedAmountPaise") {
          mapped.label = labels.eventExpectedAmount ?? f.label;
          mapped.helpText = undefined;
        }
        // Give each date field a clear tag so it is obvious what it is for
        if (f.name === "startDate") {
          mapped.label = labels.eventStartDate ?? f.label;
          mapped.helpText = labels.eventStartDateHint;
        }
        if (f.name === "endDate") {
          mapped.label = labels.eventEndDate ?? f.label;
          mapped.helpText = labels.eventEndDateHint;
        }
        if (f.name === "dueDate") {
          mapped.label = labels.eventDueDate ?? f.label;
          mapped.helpText = labels.eventDueDateHint;
        }
        if (isEditing) {
          if (f.name === "name") mapped.defaultValue = editingEvent.name;
          if (f.name === "startDate") mapped.defaultValue = editingEvent.startDate.slice(0, 10);
          if (f.name === "endDate") mapped.defaultValue = editingEvent.endDate?.slice(0, 10) ?? "";
          if (f.name === "dueDate") mapped.defaultValue = editingEvent.dueDate.slice(0, 10);
          if (f.name === "status") mapped.defaultValue = editingEvent.status;
          if (f.name === "notes") mapped.defaultValue = editingEvent.notes ?? "";
          if (f.name === "applicableMonth")
            mapped.defaultValue = editingEvent.applicableMonth ? String(editingEvent.applicableMonth) : "";
          if (f.name === "applicableYear")
            mapped.defaultValue = editingEvent.applicableYear ? String(editingEvent.applicableYear) : "";
          if (f.name === "expectedAmountPaise")
            mapped.defaultValue = editingEvent.expectedAmountPaise
              ? String(editingEvent.expectedAmountPaise / 100)
              : "";
        }
        return mapped;
      }),
    [labels, isEditing, editingEvent]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("categoryId", categoryId);
    // The amount is entered in rupees; the server stores paise.
    const amount = String(formData.get("expectedAmountPaise") ?? "").trim();
    if (amount) {
      formData.set("expectedAmountPaise", String(Math.round(Number(amount) * 100)));
    } else {
      formData.delete("expectedAmountPaise");
    }
    if (isEditing) formData.set("eventId", editingEvent.id);
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      {isEditing && <input type="hidden" name="eventId" value={editingEvent.id} />}
      <input type="hidden" name="categoryId" value={categoryId} />
      <p className="text-[11px] text-[var(--ink-muted)]">
        {labels.category}: {categoryName}
      </p>
      <SimpleForm
        key={isEditing ? editingEvent.id : `new-${categoryId}`}
        fields={fields}
        values={{}}
        disabled={pending}
        fieldsOnly={true}
        uncontrolled={true}
      />
      <Notice state={state} saved={labels.saved ?? "Saved"} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={pending} className="flex-1">
          {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {pending ? labels.loading : isEditing ? labels.update : labels.save}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="flex-1">
            <X className="h-4 w-4" /> {labels.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Generate events from the category's scheduling rules                 */
/* ------------------------------------------------------------------ */

export function GenerateEventsForm({
  labels,
  categoryId,
  categoryName,
  onCancel,
}: {
  labels: Labels;
  categoryId: string;
  categoryName: string;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState<CollectionState, FormData>(
    generateEventsFromCategoryAction,
    undefined
  );
  const [, startTransition] = useTransition();
  useReloadOnSuccess(state);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("categoryId", categoryId);
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      <input type="hidden" name="categoryId" value={categoryId} />
      <p className="text-[11px] text-[var(--ink-muted)]">
        {labels.generateEventsHint} — {categoryName}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`gen-from-${categoryId}`} className="mb-1.5 block text-sm font-medium text-[var(--ink-muted)]">
            {labels.generateFromDate}
          </label>
          <input
            id={`gen-from-${categoryId}`}
            name="startDate"
            type="date"
            required
            className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 text-base focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
          />
        </div>
        <div>
          <label htmlFor={`gen-to-${categoryId}`} className="mb-1.5 block text-sm font-medium text-[var(--ink-muted)]">
            {labels.generateToDate}
          </label>
          <input
            id={`gen-to-${categoryId}`}
            name="endDate"
            type="date"
            required
            className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 text-base focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
          />
        </div>
      </div>
      <Notice state={state} saved={labels.eventsGenerated ?? "Events generated"} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={pending} className="flex-1">
          <Wand2 className="h-4 w-4" /> {labels.generateEventsAction ?? "Generate Events"}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="flex-1">
            <X className="h-4 w-4" /> {labels.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Household assignment                                                */
/* ------------------------------------------------------------------ */

export function AssignHouseholdsForm({
  labels,
  event,
  members,
  assignments,
  onCancel,
}: {
  labels: Labels;
  event: CollectionEventItem;
  members: MemberOption[];
  assignments: AssignmentItem[];
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState<CollectionState, FormData>(
    assignHouseholdsAction,
    undefined
  );
  const [, startTransition] = useTransition();
  useReloadOnSuccess(state);

  const alreadyAssigned = new Set(
    assignments.filter((a) => a.eventId === event.id).map((a) => a.memberId)
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const filtered = members.filter(
    (m) =>
      !alreadyAssigned.has(m.id) &&
      (query.trim() === "" ||
        m.fullName.toLowerCase().includes(query.toLowerCase()) ||
        m.memberNo.toLowerCase().includes(query.toLowerCase()))
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("eventId", event.id);
    formData.set("memberIds", JSON.stringify(selected));
    const amount = String(formData.get("expectedAmountPaise") ?? "").trim();
    formData.set("expectedAmountPaise", String(Math.round(Number(amount || 0) * 100)));
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      <input type="hidden" name="eventId" value={event.id} />
      <input type="hidden" name="memberIds" value={JSON.stringify(selected)} />
      <p className="text-[11px] text-[var(--ink-muted)]">
        {labels.assignHouseholdsHint} — {event.name}
      </p>

      <div>
        <label htmlFor={`member-search-${event.id}`} className="mb-1.5 block text-sm font-medium text-[var(--ink-muted)]">
          {labels.selectMembers}
        </label>
        <input
          id={`member-search-${event.id}`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.searchMember ?? "Search member..."}
          className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 text-base focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
        />
        <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-[var(--border-subtle)]">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-[var(--ink-muted)]">{labels.noResults}</p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((m) => (
                <li key={m.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-[var(--surface)]">
                    <input
                      type="checkbox"
                      checked={selected.includes(m.id)}
                      onChange={() => toggle(m.id)}
                      className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)]"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{m.fullName}</span>
                    <span className="num shrink-0 text-[11px] text-[var(--ink-muted)]">{m.memberNo}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
          {selected.length} {labels.selectMembers.toLowerCase()}
        </p>
      </div>

      <div>
        <label
          htmlFor={`assign-amount-${event.id}`}
          className="mb-1.5 block text-sm font-medium text-[var(--ink-muted)]"
        >
          {labels.expectedAmountPerHousehold}
        </label>
        <input
          id={`assign-amount-${event.id}`}
          name="expectedAmountPaise"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={
            event.expectedAmountPaise ? String(event.expectedAmountPaise / 100) : ""
          }
          className="num h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3.5 text-base focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
        />
      </div>

      <Notice state={state} saved={labels.saved ?? "Saved"} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={pending || selected.length === 0} className="flex-1">
          <Users className="h-4 w-4" /> {labels.assignHouseholds}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="flex-1">
            <X className="h-4 w-4" /> {labels.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Assignment rows with a remove button                                */
/* ------------------------------------------------------------------ */

function AssignmentRows({
  labels,
  eventId,
  assignments,
}: {
  labels: Labels;
  eventId: string;
  assignments: AssignmentItem[];
}) {
  const [, startTransition] = useTransition();

  const handleRemove = (memberId: string) => {
    if (!window.confirm(`${labels.removeAssignment}?`)) return;
    const formData = new FormData();
    formData.set("eventId", eventId);
    formData.set("memberId", memberId);
    startTransition(async () => {
      const result = await removeHouseholdAssignmentAction(undefined, formData);
      if (result?.ok) window.location.reload();
      else alert(result?.error ?? "Failed");
    });
  };

  const rows = assignments.filter((a) => a.eventId === eventId);
  if (rows.length === 0) return null;

  return (
    <ul className="mt-2 divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)]">
      {rows.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px]">{a.memberName}</p>
            <p className="num text-[11px] text-[var(--ink-muted)]">
              {a.memberNo} · {labels.assignmentExpected}: {formatPaise(a.expectedAmountPaise)}
            </p>
          </div>
          <Badge tone={ASSIGNMENT_STATUS_TONE[a.status] ?? "neutral"}>
            {labels[a.status.toLowerCase()] ?? a.status}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => handleRemove(a.memberId)}
            className="h-8 w-8 p-0 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
            aria-label={labels.removeAssignment ?? "Remove"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Per-category events panel                                           */
/* ------------------------------------------------------------------ */

export function CategoryEventsPanel({
  labels,
  category,
  events,
  members,
  assignments,
  collectionMode,
}: {
  labels: Labels;
  category: { id: string; name: string; frequency?: string | null; collectionMode?: string | null; defaultAmountPaise?: number | null };
  events: CollectionEventItem[];
  members: MemberOption[];
  assignments: AssignmentItem[];
  collectionMode: string | null;
}) {
  const [panel, setPanel] = useState<"none" | "add" | "generate">("none");
  const [editingEvent, setEditingEvent] = useState<CollectionEventItem | null>(null);
  const [assigningEvent, setAssigningEvent] = useState<CollectionEventItem | null>(null);

  const categoryEvents = events.filter((e) => e.categoryId === category.id);

  const handleDelete = (event: CollectionEventItem) => {
    if (!window.confirm(`${labels.confirmDeleteEvent ?? labels.confirmDelete} "${event.name}"?`)) return;
    const formData = new FormData();
    formData.set("eventId", event.id);
    startTransitionDelete(formData);
  };

  const [, startTransition] = useTransition();
  const startTransitionDelete = (formData: FormData) => {
    startTransition(async () => {
      const result = await deleteCollectionEventAction(undefined, formData);
      if (result?.ok) window.location.reload();
      else alert(result?.error ?? "Failed to delete event");
    });
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-[var(--ink-muted)]">
          {labels.collectionEvents} ({categoryEvents.length})
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setPanel(panel === "add" ? "none" : "add");
              setEditingEvent(null);
            }}
            className="h-8 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> {labels.addEvent}
          </Button>
          {category.frequency && category.frequency !== "EVENT_BASED" && category.frequency !== "OCCASIONAL" && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setPanel(panel === "generate" ? "none" : "generate");
                setEditingEvent(null);
              }}
              className="h-8 gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" /> {labels.generateEvents}
            </Button>
          )}
        </div>
      </div>

      {categoryEvents.length === 0 ? (
        <p className="px-1 py-2 text-[11px] text-[var(--ink-muted)]">{labels.noEvents}</p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {categoryEvents.map((e) => (
            <li key={e.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{e.name}</p>
                  <p className="num text-[11px] text-[var(--ink-muted)]">
                    {labels.eventStartDate}: {formatDate(e.startDate)}
                    {e.endDate ? ` · ${labels.eventEndDate}: ${formatDate(e.endDate)}` : ""} · {labels.eventDueDate}: {formatDate(e.dueDate)}
                    {e.expectedAmountPaise ? ` · ${formatPaise(e.expectedAmountPaise)}` : ""}
                  </p>
                </div>
                <Badge tone={EVENT_STATUS_TONE[e.status] ?? "neutral"}>
                  {labels[e.status.toLowerCase()] ?? e.status}
                </Badge>
                <div className="flex shrink-0 items-center gap-1">
                  {collectionMode === "HOUSEHOLD_WISE" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setAssigningEvent(assigningEvent?.id === e.id ? null : e)}
                      className="h-8 w-8 p-0"
                      aria-label={labels.assignHouseholds}
                      title={labels.assignHouseholds}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingEvent(editingEvent?.id === e.id ? null : e);
                      setPanel("none");
                    }}
                    className="h-8 w-8 p-0"
                    aria-label={labels.edit}
                    title={labels.edit}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(e)}
                    className="h-8 w-8 p-0 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                    aria-label={labels.delete}
                    title={labels.delete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {editingEvent?.id === e.id && (
                <div className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-white">
                  <CollectionEventForm
                    labels={labels}
                    categoryId={category.id}
                    categoryName={category.name}
                    editingEvent={e}
                    onCancel={() => setEditingEvent(null)}
                  />
                </div>
              )}

              {assigningEvent?.id === e.id && (
                <div className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-white">
                  <AssignHouseholdsForm
                    labels={labels}
                    event={e}
                    members={members}
                    assignments={assignments}
                    onCancel={() => setAssigningEvent(null)}
                  />
                  <div className="px-4 pb-4">
                    <p className="mb-1 text-[11px] font-medium text-[var(--ink-muted)]">
                      {labels.assignedHouseholds}
                    </p>
                    <AssignmentRows labels={labels} eventId={e.id} assignments={assignments} />
                  </div>
                </div>
              )}

              {assigningEvent?.id !== e.id && (
                <AssignmentRows labels={labels} eventId={e.id} assignments={assignments} />
              )}
            </li>
          ))}
        </ul>
      )}

      {panel === "add" && !editingEvent && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-white">
          <CollectionEventForm
            labels={labels}
            categoryId={category.id}
            categoryName={category.name}
            onCancel={() => setPanel("none")}
          />
        </div>
      )}

      {panel === "generate" && !editingEvent && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-white">
          <GenerateEventsForm
            labels={labels}
            categoryId={category.id}
            categoryName={category.name}
            onCancel={() => setPanel("none")}
          />
        </div>
      )}
    </div>
  );
}
