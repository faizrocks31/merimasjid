"use client";

import { useActionState, useMemo, useTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Edit, Trash2, X, MessageCircle } from "lucide-react";
import {
  createExpenseCategoryAction,
  updateExpenseCategoryAction,
  createCollectionDefinitionAction,
  updateCollectionDefinitionAction,
  deleteCollectionDefinitionAction,
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
        <li key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--surface)]">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            {item.meta && <p className="text-[11px] text-[var(--ink-muted)] truncate">{item.meta}</p>}
            {item.description && <p className="text-[11px] text-[var(--ink-muted)] truncate">{item.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {item.restrictedPurpose && (
              <Badge tone="warning" className="text-[10px]">{labels.restrictedPurpose}</Badge>
            )}
            <Badge tone={item.active ? "success" : "neutral"} className="text-[10px]">
              {item.active ? labels.active : labels.inactive}
            </Badge>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(item)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(item)} className="text-[var(--danger)]">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface CollectionDefinitionListItem {
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
                  saveTime: labels.saveTime,
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

/**
 * Collection Definition Form - Create/Edit collection definitions (Phase 2A)
 */
interface EditingCollectionDefinition {
  id: string;
  name: string;
  description?: string | null;
  baseCategoryId: string;
  subcategoryId: string;
  active: boolean;
  showInPaymentReceived: boolean;
  frequency: string;
  amountType: string;
  defaultAmountPaise?: number | null;
  donorEligibility: string;
  memberAssignment: string;
  dueGeneration: string;
  settlementPolicy: string;
}

export function CollectionDefinitionForm({
  labels,
  baseCategories,
  subcategories,
  editingDefinition,
  onCancel,
  redirectTo,
}: {
  labels: Labels;
  baseCategories: { id: string; name: string; code: string }[];
  subcategories: { id: string; name: string; code: string }[];
  editingDefinition?: EditingCollectionDefinition;
  onCancel?: () => void;
  redirectTo?: string;
}) {
  const isEditing = !!editingDefinition;
  const action = isEditing ? updateCollectionDefinitionAction : createCollectionDefinitionAction;
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(action, undefined);
  const [, startTransition] = useTransition();
  useReloadOnSuccess(state, redirectTo);

  // Filter valid subcategories based on selected baseCategory
  const [selectedBaseCategoryId, setSelectedBaseCategoryId] = useState(
    isEditing ? editingDefinition.baseCategoryId : ""
  );

  const validSubcategories = useMemo(
    () => subcategories.filter((sc) => {
      // Valid combinations from the system taxonomy
      const validCombos: Record<string, string[]> = {
        ZAKAT: ["ZAKAT_FITR", "ZAKAT_MAAL"],
        SADAQAH: ["GENERAL", "FIDYAH", "KAFFARAH"],
        INFAQ: ["CONSTRUCTION", "MAINTENANCE", "OPERATIONS"],
        CHANDA: ["MONTHLY", "ANNUAL"],
        FUNDRAISING: ["CAMPAIGN", "PROJECT", "EMERGENCY"],
        COMMUNITY_EVENT: ["EID", "MILAD", "ISRA_MIRAJ", "SHAB_E_QADR", "RAMADAN", "JUMMA"],
        GENERAL_DONATION: ["UNRESTRICTED"],
      };
      return validCombos[selectedBaseCategoryId]?.includes(sc.code) ?? false;
    }),
    [subcategories, selectedBaseCategoryId]
  );

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
    MONTHLY: labels.monthly ?? "Monthly",
    ANNUAL: labels.annual ?? "Annual",
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (isEditing) {
      formData.set("definitionId", editingDefinition.id);
    }
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-5">
      {isEditing && (
        <input type="hidden" name="definitionId" value={editingDefinition.id} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <SimpleForm
          key={isEditing ? editingDefinition.id : "new"}
          fields={[
            { name: "name", label: labels.name, type: "text", required: true, placeholder: "e.g. Monthly Chanda" },
            { name: "description", label: labels.description, type: "textarea", required: false, placeholder: labels.descriptionHint ?? "" },
            {
              name: "baseCategoryId",
              label: labels.baseCategory ?? "Base Category",
              type: "select",
              required: true,
              options: baseCategories.map((bc) => ({
                value: bc.id,
                label: baseCategoryLabels[bc.code] || bc.name,
              })),
              defaultValue: selectedBaseCategoryId || undefined,
            },
            {
              name: "subcategoryId",
              label: labels.subcategory ?? "Subcategory",
              type: "select",
              required: true,
              options: validSubcategories.map((sc) => ({
                value: sc.id,
                label: subcategoryLabels[sc.code] || sc.name,
              })),
              defaultValue: isEditing ? editingDefinition.subcategoryId : undefined,
            },
            { name: "active", label: labels.active, type: "checkbox", required: false, defaultValue: isEditing ? editingDefinition.active : true },
            { name: "showInPaymentReceived", label: labels.showInPaymentReceived ?? "Show in Payment Received", type: "checkbox", required: false, defaultValue: isEditing ? editingDefinition.showInPaymentReceived : true },
          ]}
          values={{}}
          disabled={pending}
          fieldsOnly={true}
          uncontrolled={true}
        />
        <SimpleForm
          fields={[
            {
              name: "frequency",
              label: labels.frequency,
              type: "select",
              required: true,
              options: Object.entries(frequencyLabels).map(([value, label]) => ({ value, label })),
              defaultValue: isEditing ? editingDefinition.frequency : undefined,
            },
            {
              name: "amountType",
              label: labels.amountType ?? "Amount Type",
              type: "select",
              required: true,
              options: Object.entries(amountTypeLabels).map(([value, label]) => ({ value, label })),
              defaultValue: isEditing ? editingDefinition.amountType : undefined,
            },
            {
              name: "defaultAmountPaise",
              label: labels.defaultAmount ?? "Default Amount (Paise)",
              type: "number",
              required: false,
              min: 1,
              placeholder: "e.g. 50000 for ₹500",
              defaultValue: isEditing && editingDefinition.defaultAmountPaise ? String(editingDefinition.defaultAmountPaise) : undefined,
            },
            {
              name: "donorEligibility",
              label: labels.donorEligibility ?? "Donor Eligibility",
              type: "select",
              required: true,
              options: Object.entries(donorEligibilityLabels).map(([value, label]) => ({ value, label })),
              defaultValue: isEditing ? editingDefinition.donorEligibility : undefined,
            },
            {
              name: "memberAssignment",
              label: labels.memberAssignment ?? "Member Assignment",
              type: "select",
              required: true,
              options: Object.entries(memberAssignmentLabels).map(([value, label]) => ({ value, label })),
              defaultValue: isEditing ? editingDefinition.memberAssignment : undefined,
            },
            {
              name: "dueGeneration",
              label: labels.dueGeneration ?? "Due Generation",
              type: "select",
              required: true,
              options: Object.entries(dueGenerationLabels).map(([value, label]) => ({ value, label })),
              defaultValue: isEditing ? editingDefinition.dueGeneration : undefined,
            },
            {
              name: "settlementPolicy",
              label: labels.settlementPolicy ?? "Settlement Policy",
              type: "select",
              required: true,
              options: Object.entries(settlementPolicyLabels).map(([value, label]) => ({ value, label })),
              defaultValue: isEditing ? editingDefinition.settlementPolicy : undefined,
            },
          ]}
          values={{}}
          disabled={pending}
          fieldsOnly={true}
          uncontrolled={true}
        />
      </div>
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

/**
 * Collection Definitions Panel - handles list, add form toggle, edit navigation
 */
interface CollectionDefinitionsPanelProps {
  items: CollectionDefinitionListItem[];
  labels: Labels;
  baseCategories: { id: string; name: string; code: string }[];
  subcategories: { id: string; name: string; code: string }[];
  onDelete: (item: CollectionDefinitionListItem) => void;
}

export function CollectionDefinitionsPanel({
  items,
  labels,
  baseCategories,
  subcategories,
  onDelete,
}: CollectionDefinitionsPanelProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);

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

  const handleEdit = (item: CollectionDefinitionListItem) => {
    router.push(`/settings/collection-definitions/${item.id}/edit`);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Add Form - shown when toggled */}
      {showAddForm && (
        <Card>
          <CollectionDefinitionForm
            labels={labels}
            baseCategories={baseCategories}
            subcategories={subcategories}
            onCancel={handleCancelAdd}
          />
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
            onClick={() => setShowAddForm(!showAddForm)}
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
                    {item.donorEligibility && ` · ${labels[item.donorEligibility.toLowerCase()] ?? item.donorEligibility}`}
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