"use client";

import { useActionState, useMemo, useTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Edit, Trash2, X, MessageCircle } from "lucide-react";
import {
  createCategoryAction,
  createExpenseCategoryAction,
  updateCategoryAction,
  updateExpenseCategoryAction,
  updateNotificationSettingsAction,
  sendAnnouncementAction,
  updateSettingsAction,
  updatePrayerTimesAction,
  type SettingsState,
} from "@/modules/settings/actions";
import { getFormFields } from "@/lib/validation";
import { Badge, Button, Card, CardHeader, CardTitle } from "@/components/ui";
import { SimpleForm } from "@/components/forms/auto-form";
import { AnalogTimePicker } from "@/components/forms/AnalogTimePicker";
import { CategoryEventsPanel, type CollectionEventItem, type MemberOption, type AssignmentItem } from "./collection-event-forms";

type Labels = Record<string, string>;

const MONTHS = [
  ["1", "January"], ["2", "February"], ["3", "March"], ["4", "April"],
  ["5", "May"], ["6", "June"], ["7", "July"], ["8", "August"],
  ["9", "September"], ["10", "October"], ["11", "November"], ["12", "December"],
];

function Notice({ state, saved }: { state: SettingsState; saved: string }) {
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
        {state.message ? saved.replace("{count}", state.message) : saved} ✓
      </p>
    );
  }
  return null;
}

/**
 * The category list is rendered by the server component, so a successful
 * write has to pull fresh data back down. `revalidatePath` on the server
 * invalidates the route cache but does not re-render an already-mounted
 * client tree, so the page is reloaded to show the new row.
 *
 * `redirectTo` is used by the standalone edit pages, which should return to
 * the settings list instead of reloading in place.
 */
function useReloadOnSuccess(state: SettingsState, redirectTo?: string) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      if (redirectTo) router.push(redirectTo);
      else window.location.reload();
    }
  }, [state, redirectTo, router]);
}

export function MasjidSettingsForm({
  labels,
  masjid,
}: {
  labels: Labels;
  masjid: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    receiptPrefix: string;
    financialYearStartMonth: number;
    receiptFooter: string | null;
    // Prayer times
    fajrTime: string | null;
    sunriseTime: string | null;
    dhuhrTime: string | null;
    asrTime: string | null;
    maghribTime: string | null;
    ishaTime: string | null;
    jummahTime: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateSettingsAction, undefined);
  const [, startTransition] = useTransition();

  const fields = useMemo(
    () => getFormFields("settings").map((f) => {
      const mapped = { ...f, label: labels[f.name] ?? f.label };
      if (mapped.name === "financialYearStartMonth") {
        mapped.options = MONTHS.map(([value, label]) => ({ value, label }));
        mapped.defaultValue = String(masjid.financialYearStartMonth);
      }
      // Set default values from masjid
      switch (mapped.name) {
        case "name": mapped.defaultValue = masjid.name; break;
        case "address": mapped.defaultValue = masjid.address ?? ""; break;
        case "phone": mapped.defaultValue = masjid.phone ?? ""; break;
        case "email": mapped.defaultValue = masjid.email ?? ""; break;
        case "receiptPrefix": mapped.defaultValue = masjid.receiptPrefix; break;
        case "receiptFooter": mapped.defaultValue = masjid.receiptFooter ?? ""; break;
        case "fajrTime": mapped.defaultValue = masjid.fajrTime ?? ""; break;
        case "sunriseTime": mapped.defaultValue = masjid.sunriseTime ?? ""; break;
        case "dhuhrTime": mapped.defaultValue = masjid.dhuhrTime ?? ""; break;
        case "asrTime": mapped.defaultValue = masjid.asrTime ?? ""; break;
        case "maghribTime": mapped.defaultValue = masjid.maghribTime ?? ""; break;
        case "ishaTime": mapped.defaultValue = masjid.ishaTime ?? ""; break;
        case "jummahTime": mapped.defaultValue = masjid.jummahTime ?? ""; break;
      }
      return mapped;
    }),
    [labels, masjid]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // receiptPrefix should be uppercase
    const prefix = String(formData.get("receiptPrefix") ?? "").toUpperCase();
    formData.set("receiptPrefix", prefix);
    startTransition(() => formAction(formData));
  };

  const prayerTimeFields = [
    "fajrTime", "sunriseTime", "dhuhrTime", "asrTime", "maghribTime", "ishaTime", "jummahTime"
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SimpleForm fields={fields.filter(f => !prayerTimeFields.includes(f.name))} values={{}} disabled={pending} fieldsOnly={true} uncontrolled={true} />
      </div>

      <Notice state={state} saved={labels.settingsSaved} />

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" /> {pending ? labels.loading : labels.save}
        </Button>
      </div>
      <p className="text-[11px] text-[var(--ink-muted)]">
        Changing the receipt prefix does not renumber existing receipts; numbering continues from the next free number.
      </p>
    </form>
  );
}

/**
 * Prayer Times Form - Separate tab for namaz/prayer timings
 */
export function PrayerTimesForm({
  labels,
  masjid,
  prayerTimesUpdatedAt,
}: {
  labels: Labels;
  masjid: {
    fajrTime: string | null;
    sunriseTime: string | null;
    dhuhrTime: string | null;
    asrTime: string | null;
    maghribTime: string | null;
    ishaTime: string | null;
    jummahTime: string | null;
  };
  prayerTimesUpdatedAt?: Date | string | null;
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updatePrayerTimesAction, undefined);
  const [, startTransition] = useTransition();
  const [localTimes, setLocalTimes] = useState({
    fajrTime: masjid.fajrTime ?? "",
    sunriseTime: masjid.sunriseTime ?? "",
    dhuhrTime: masjid.dhuhrTime ?? "",
    asrTime: masjid.asrTime ?? "",
    maghribTime: masjid.maghribTime ?? "",
    ishaTime: masjid.ishaTime ?? "",
    jummahTime: masjid.jummahTime ?? "",
  });

  // Sync local state with masjid prop changes
  useEffect(() => {
    setLocalTimes({
      fajrTime: masjid.fajrTime ?? "",
      sunriseTime: masjid.sunriseTime ?? "",
      dhuhrTime: masjid.dhuhrTime ?? "",
      asrTime: masjid.asrTime ?? "",
      maghribTime: masjid.maghribTime ?? "",
      ishaTime: masjid.ishaTime ?? "",
      jummahTime: masjid.jummahTime ?? "",
    });
  }, [masjid]);

  const handleTimeChange = (field: string, value: string) => {
    setLocalTimes((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(localTimes).forEach(([key, value]) => {
      formData.set(key, value);
    });
    startTransition(() => formAction(formData));
  };

  // Format last updated date
  const formattedLastUpdated = useMemo(() => {
    if (!prayerTimesUpdatedAt) return null;
    const date = new Date(prayerTimesUpdatedAt);
    return date.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, [prayerTimesUpdatedAt]);

  const prayerTimeFields = [
    { key: "fajrTime", label: labels.fajrTime },
    { key: "sunriseTime", label: labels.sunriseTime },
    { key: "dhuhrTime", label: labels.dhuhrTime },
    { key: "asrTime", label: labels.asrTime },
    { key: "maghribTime", label: labels.maghribTime },
    { key: "ishaTime", label: labels.ishaTime },
    { key: "jummahTime", label: labels.jummahTime },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-medium text-[var(--ink)] mb-3">{labels.prayerTimes}</h3>
        <p className="text-[11px] text-[var(--ink-muted)] mb-4">{labels.prayerTimeFormat}</p>

        {formattedLastUpdated && (
          <p className="text-[11px] text-[var(--ink-muted)] mb-4">
            {labels.prayerTimesLastUpdated.replace("{date}", formattedLastUpdated.split(",")[0]).replace("{time}", formattedLastUpdated.split(",")[1]?.trim() || "")}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {prayerTimeFields.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-[var(--ink-muted)] mb-1">{label}</label>
              <AnalogTimePicker
                value={localTimes[key as keyof typeof localTimes] || ""}
                onChange={(val) => handleTimeChange(key, val)}
                label={label}
                disabled={pending}
                format="12h"
                labels={{
                  selectTime: labels.selectTime,
                  hour: labels.hour,
                  minute: labels.minute,
                  am: labels.am,
                  pm: labels.pm,
                  done: labels.done,
                  cancel: labels.cancelPicker,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <Notice state={state} saved={labels.prayerTimesSaved} />

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" /> {pending ? labels.loading : labels.save}
        </Button>
      </div>
    </form>
  );
}

interface EditingCategory {
  id: string;
  name: string;
  code: string;
  restrictedPurpose: boolean;
  reportingGroup: string | null;
}

export function ContributionCategoryForm({
  labels,
  editingCategory,
  onCancel,
  redirectTo,
}: {
  labels: Labels;
  editingCategory?: EditingCategory;
  onCancel?: () => void;
  redirectTo?: string;
}) {
  const isEditing = !!editingCategory;
  const action = isEditing ? updateCategoryAction : createCategoryAction;
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(action, undefined);
  const [, startTransition] = useTransition();
  useReloadOnSuccess(state, redirectTo);

  const fields = useMemo(
    () => getFormFields("category").map((f) => {
      const mapped = { ...f, label: labels[f.name] ?? f.label };
      if (f.name === "name") mapped.placeholder = "e.g. Ramadan Fund";
      if (f.name === "code") mapped.placeholder = "RAMADAN";
      // The code is the category's identity — it can be updated but must remain unique.
      // We don't disable it anymore; server-side validation ensures uniqueness.
      if (isEditing && f.name === "code") {
        mapped.defaultValue = editingCategory.code;
      }
      if (isEditing && f.name === "name") {
        mapped.defaultValue = editingCategory.name;
      }
      if (isEditing && f.name === "restrictedPurpose") {
        mapped.defaultValue = editingCategory.restrictedPurpose;
      }
      if (isEditing && f.name === "reportingGroup") {
        mapped.defaultValue = editingCategory.reportingGroup ?? "";
      }
      return mapped;
    }),
    [labels, isEditing, editingCategory]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // code should be uppercase
    const code = String(formData.get("code") ?? "").toUpperCase();
    formData.set("code", code);
    if (isEditing) {
      formData.set("categoryId", editingCategory.id);
    }
    startTransition(() => formAction(formData));
  };

  return (
    <form action={formAction} method="post" className="space-y-3 p-5">
      {isEditing && (
        <input type="hidden" name="categoryId" value={editingCategory.id} />
      )}
      {/* The key forces a remount when the edited category changes: SimpleForm
          renders uncontrolled inputs, whose `defaultValue` is only applied on
          mount, so reusing the DOM would keep showing the previous values. */}
      <SimpleForm
        key={isEditing ? editingCategory.id : "new"}
        fields={fields}
        values={{}}
        disabled={pending}
        fieldsOnly={true}
        uncontrolled={true}
      />
      <Notice state={state} saved={labels.saved} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant={isEditing ? "primary" : "secondary"} disabled={pending} className="flex-1">
          {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {pending ? labels.loading : isEditing ? labels.update : labels.save}
        </Button>
        {isEditing && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="flex-1">
            <X className="h-4 w-4" /> {labels.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}

interface EditingExpenseCategory {
  id: string;
  name: string;
  active: boolean;
}

export function ExpenseCategoryForm({
  labels,
  editingCategory,
  onCancel,
  redirectTo,
}: {
  labels: Labels;
  editingCategory?: EditingExpenseCategory;
  onCancel?: () => void;
  redirectTo?: string;
}) {
  const isEditing = !!editingCategory;
  const action = isEditing ? updateExpenseCategoryAction : createExpenseCategoryAction;
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(action, undefined);
  const [, startTransition] = useTransition();
  useReloadOnSuccess(state, redirectTo);

  const fields = useMemo(
    () => getFormFields("expenseCategory").map((f) => ({
      ...f,
      label: labels[f.name] ?? f.label,
      placeholder: f.name === "name" ? "e.g. Electricity" : f.placeholder,
      defaultValue: isEditing && f.name === "name" ? editingCategory.name :
                    isEditing && f.name === "active" ? editingCategory.active : f.defaultValue,
    })),
    [labels, isEditing, editingCategory]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (isEditing) {
      formData.set("categoryId", editingCategory.id);
    }
    startTransition(() => formAction(formData));
  };

  return (
    <form action={formAction} method="post" className="space-y-3 p-5">
      {isEditing && (
        <input type="hidden" name="categoryId" value={editingCategory.id} />
      )}
      <SimpleForm
        key={isEditing ? editingCategory.id : "new"}
        fields={fields}
        values={{}}
        disabled={pending}
        fieldsOnly={true}
        uncontrolled={true}
      />
      <Notice state={state} saved={labels.saved} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant={isEditing ? "primary" : "secondary"} disabled={pending} className="flex-1">
          {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {pending ? labels.loading : isEditing ? labels.update : labels.save}
        </Button>
        {isEditing && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="flex-1">
            <X className="h-4 w-4" /> {labels.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}

interface CategoryListItem {
  id: string;
  name: string;
  meta?: string;
  restricted?: boolean;
  active: boolean;
  code?: string;
  reportingGroup?: string | null;
  restrictedPurpose?: boolean;
  description?: string | null;
  defaultAmountPaise?: number | null;
  frequency?: string | null;
  collectionMode?: string | null;
  defaultDueDay?: number | null;
  defaultGraceDays?: number | null;
}

interface CategoryListProps {
  items: CategoryListItem[];
  labels: Labels;
  onEdit: (item: CategoryListItem) => void;
  onDelete: (item: CategoryListItem) => void;
  /** Rendered under a row — used for the per-category collection events. */
  renderChildren?: (item: CategoryListItem) => React.ReactNode;
}

export function CategoryList({ items, labels, onEdit, onDelete, renderChildren }: CategoryListProps) {
  if (items.length === 0) return <p className="px-5 py-6 text-xs text-[var(--ink-muted)]">—</p>;
  return (
    <ul className="divide-y divide-[var(--border-subtle)]">
      {items.map((item) => (
        <li key={item.id} className="px-5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.name}</p>
              {item.meta ? <p className="num text-[11px] text-[var(--ink-muted)]">{item.meta}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {item.restricted ? <Badge tone="gold">Restricted</Badge> : null}
              {item.active === false ? <Badge tone="neutral">Inactive</Badge> : null}
              {item.frequency ? <Badge tone="brand">{labels[item.frequency.toLowerCase()] ?? item.frequency}</Badge> : null}
              {item.collectionMode ? (
                <Badge tone="neutral">
                  {labels[item.collectionMode.toLowerCase()] ?? item.collectionMode}
                </Badge>
              ) : null}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(item)}
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
          {renderChildren ? renderChildren(item) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Contribution Categories Panel - handles list, add form toggle, edit navigation
 * and per-category collection events
 */
export function ContributionCategoriesPanel({
  items,
  labels,
  onDelete,
  events = [],
  members = [],
  assignments = [],
}: {
  items: CategoryListItem[];
  labels: Labels;
  onDelete: (item: CategoryListItem) => void;
  events?: CollectionEventItem[];
  members?: MemberOption[];
  assignments?: AssignmentItem[];
}) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleEdit = (item: CategoryListItem) => {
    router.push(`/settings/categories/${item.id}/edit`);
  };
  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Add Form - shown when toggled */}
      {showAddForm && (
        <Card>
          <ContributionCategoryForm
            labels={labels}
            onCancel={handleCancelAdd}
          />
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{labels.category}</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{showAddForm ? labels.cancel : labels.addCategory}</span>
          </Button>
        </CardHeader>
        <CategoryList
          items={items}
          labels={labels}
          onEdit={handleEdit}
          onDelete={onDelete}
          renderChildren={(item) => (
            <CategoryEventsPanel
              labels={labels}
              category={item}
              events={events}
              members={members}
              assignments={assignments}
              collectionMode={item.collectionMode ?? null}
            />
          )}
        />
      </Card>
    </div>
  );
}

/**
 * Expense Categories Panel - handles list, add form toggle, edit navigation
 */
export function ExpenseCategoriesPanel({
  items,
  labels,
  onDelete,
}: {
  items: CategoryListItem[];
  labels: Labels;
  onDelete: (item: CategoryListItem) => void;
}) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleEdit = (item: CategoryListItem) => {
    router.push(`/settings/expense-categories/${item.id}/edit`);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      {/* List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{labels.expenseCategories}</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{showAddForm ? labels.cancel : labels.addExpenseCategory}</span>
          </Button>
        </CardHeader>
        <CategoryList
          items={items}
          labels={labels}
          onEdit={handleEdit}
          onDelete={onDelete}
        />
      </Card>

      {/* Add Form - shown when toggled */}
      {showAddForm && (
        <Card>
          <ExpenseCategoryForm
            labels={labels}
            onCancel={handleCancelAdd}
          />
        </Card>
      )}
    </div>
  );
}

export function NotificationSettingsForm({
  labels,
  settings,
  env,
}: {
  labels: Labels;
  settings: {
    telegramEnabled: boolean;
    emailEnabled: boolean;
    inAppEnabled: boolean;
  };
  env: {
    botUsername: string | null;
    hasBotToken: boolean;
    hasChannelId: boolean;
    hasSmtp: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateNotificationSettingsAction,
    undefined
  );
  const [announcementState, announcementFormAction, announcementPending] = useActionState<SettingsState, FormData>(
    sendAnnouncementAction,
    undefined
  );
  const [, startTransition] = useTransition();

  const { botUsername, hasBotToken, hasChannelId, hasSmtp } = env;

  return (
    <div className="space-y-4 p-5">
      <form onSubmit={(e) => { e.preventDefault(); startTransition(() => formAction(new FormData(e.currentTarget))); }} className="space-y-4">
      <div className="space-y-4">
        {/* Telegram */}
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{labels.telegramNotifications}</p>
              <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">{labels.telegramNotificationsDesc}</p>
            </div>
            {hasBotToken && botUsername ? (
              <span className="text-[11px] text-[var(--success)] flex items-center gap-1">
                ✓ {labels.botConnected.replace("{botName}", botUsername)}
              </span>
            ) : (
              <span className="text-[11px] text-[var(--danger)]">{labels.botNotConfigured}</span>
            )}
          </div>
          {hasBotToken && hasChannelId && (
            <p className="text-[11px] text-[var(--success)] mt-2 flex items-center gap-1">
              ✓ {labels.channelConfigured}
            </p>
          )}
          {hasBotToken && !hasChannelId && (
            <p className="text-[11px] text-[var(--warning)] mt-2 flex items-center gap-1">
              ⚠ {labels.channelNotConfigured}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="telegramEnabled"
                defaultChecked={settings.telegramEnabled}
                disabled={pending || !hasBotToken}
                className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
              <span className="text-sm">{settings.telegramEnabled ? labels.notificationsEnabled : labels.notificationsDisabled}</span>
            </label>
            {!hasBotToken && (
              <span className="text-[11px] text-[var(--ink-muted)]">(Requires TELEGRAM_BOT_TOKEN in .env)</span>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{labels.emailNotifications}</p>
              <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">{labels.emailNotificationsDesc}</p>
            </div>
            {hasSmtp ? (
              <span className="text-[11px] text-[var(--success)]">✓ {labels.smtpConfigured}</span>
            ) : (
              <span className="text-[11px] text-[var(--danger)]">{labels.smtpNotConfigured}</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="emailEnabled"
                defaultChecked={settings.emailEnabled}
                disabled={pending || !hasSmtp}
                className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
              <span className="text-sm">{settings.emailEnabled ? labels.notificationsEnabled : labels.notificationsDisabled}</span>
            </label>
            {!hasSmtp && (
              <span className="text-[11px] text-[var(--ink-muted)]">(Requires SMTP config in .env)</span>
            )}
          </div>
        </div>

        {/* In-App */}
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{labels.inAppNotifications}</p>
              <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">{labels.inAppNotificationsDesc}</p>
            </div>
            <span className="text-[11px] text-[var(--success)]">✓ Always active</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="inAppEnabled"
                defaultChecked={settings.inAppEnabled}
                disabled={pending}
                className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
              <span className="text-sm">{settings.inAppEnabled ? labels.notificationsEnabled : labels.notificationsDisabled}</span>
            </label>
            <span className="text-[11px] text-[var(--ink-muted)]">(Recommended: always ON for audit trail)</span>
          </div>
        </div>
      </div>

      <Notice state={state} saved={labels.notificationSettingsSaved} />

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" /> {pending ? labels.loading : labels.saveNotificationSettings}
        </Button>
      </div>
      </form>

      {/* Announcement Form */}
      <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
        <h3 className="text-sm font-semibold text-[var(--ink)]">{labels.sendAnnouncement}</h3>
        <p className="mt-1 text-[11px] text-[var(--ink-muted)]">{labels.announcementDescription}</p>
        <form action={announcementFormAction} className="mt-4 space-y-3">
          <div>
            <label htmlFor="announcementTitle" className="mb-1 block text-sm font-medium">{labels.announcementTitle}</label>
            <input
              id="announcementTitle"
              name="announcementTitle"
              type="text"
              maxLength={120}
              required
              placeholder={labels.announcementTitlePlaceholder}
              disabled={announcementPending}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
          </div>
          <div>
            <label htmlFor="announcementBody" className="mb-1 block text-sm font-medium">{labels.announcementBody}</label>
            <textarea
              id="announcementBody"
              name="announcementBody"
              rows={4}
              maxLength={2000}
              required
              placeholder={labels.announcementBodyPlaceholder}
              disabled={announcementPending}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="sendToTelegram"
              disabled={announcementPending || !hasBotToken || !hasChannelId}
              className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)]"
            />
            <span>{labels.sendToTelegramChannel}</span>
          </label>
          <Notice state={announcementState} saved={labels.saved} />
          <div className="flex justify-end">
            <Button type="submit" disabled={announcementPending}>
              <MessageCircle className="h-4 w-4" /> {announcementPending ? labels.loading : labels.sendAnnouncement}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}