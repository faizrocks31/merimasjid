"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updatePreferencesAction, type PreferencesState } from "@/modules/portal/actions";
import { Badge, Button } from "@/components/ui";

type Labels = Record<string, string>;

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Tokyo",
  "Asia/Riyadh",
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "UTC",
];

function Notice({ state, saved }: { state: PreferencesState; saved: string }) {
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

export function PreferencesForm({
  labels,
  member,
  env,
}: {
  labels: Labels;
  member: {
    notifyTelegram: boolean | number;
    notifyInApp: boolean | number;
    notifyEmail: boolean | number;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    timezone: string;
    telegramChatId: string | null;
  };
  env: {
    botUsername: string | null;
    hasBotToken: boolean;
    telegramAllowed: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<PreferencesState, FormData>(
    updatePreferencesAction,
    undefined
  );

  const { botUsername, hasBotToken, telegramAllowed } = env;
  const telegramUsable = hasBotToken && telegramAllowed;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        formAction(new FormData(e.currentTarget));
      }}
      className="space-y-4 p-5"
    >
      <div className="space-y-4">
        {/* Telegram */}
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{labels.receiveTelegram}</p>
              <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                {member.telegramChatId
                  ? `${labels.telegramLinked}`
                  : hasBotToken && botUsername
                    ? labels.linkTelegramHint.replace("{botName}", botUsername)
                    : labels.botNotConfigured}
              </p>
            </div>
            {member.telegramChatId ? (
              <Badge tone="success">{labels.telegramLinked}</Badge>
            ) : (
              <Badge tone="neutral">{labels.telegramNotLinked}</Badge>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="notifyTelegram"
                defaultChecked={Boolean(member.notifyTelegram)}
                disabled={pending || !telegramUsable}
                className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
              <span className="text-sm">{member.notifyTelegram ? labels.notificationsEnabled : labels.notificationsDisabled}</span>
            </label>
            {!telegramUsable && (
              <span className="text-[11px] text-[var(--ink-muted)]">
                {hasBotToken ? "(Telegram is disabled for this Masjid)" : "(Requires TELEGRAM_BOT_TOKEN in .env)"}
              </span>
            )}
          </div>
        </div>

        {/* In-App */}
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{labels.receiveInApp}</p>
              <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">{labels.inAppNotificationsDesc}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="notifyInApp"
                defaultChecked={Boolean(member.notifyInApp)}
                disabled={pending}
                className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
              <span className="text-sm">{member.notifyInApp ? labels.notificationsEnabled : labels.notificationsDisabled}</span>
            </label>
          </div>
        </div>

        {/* Email */}
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{labels.receiveEmail}</p>
              <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">{labels.emailNotificationsDesc}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="notifyEmail"
                defaultChecked={Boolean(member.notifyEmail)}
                disabled={pending}
                className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
              <span className="text-sm">{member.notifyEmail ? labels.notificationsEnabled : labels.notificationsDisabled}</span>
            </label>
          </div>
        </div>

        {/* Quiet hours */}
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <p className="text-sm font-medium">{labels.quietHours}</p>
          <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">{labels.quietHoursHint}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="quietHoursStart" className="mb-1.5 block text-[11px] font-medium text-[var(--ink-muted)]">
                {labels.quietHoursStart}
              </label>
              <input
                id="quietHoursStart"
                name="quietHoursStart"
                type="time"
                defaultValue={member.quietHoursStart ?? ""}
                disabled={pending}
                className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5 text-base text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
            </div>
            <div>
              <label htmlFor="quietHoursEnd" className="mb-1.5 block text-[11px] font-medium text-[var(--ink-muted)]">
                {labels.quietHoursEnd}
              </label>
              <input
                id="quietHoursEnd"
                name="quietHoursEnd"
                type="time"
                defaultValue={member.quietHoursEnd ?? ""}
                disabled={pending}
                className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5 text-base text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
            </div>
            <div>
              <label htmlFor="timezone" className="mb-1.5 block text-[11px] font-medium text-[var(--ink-muted)]">
                {labels.timezone}
              </label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={member.timezone}
                disabled={pending}
                className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2.5 text-base text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <Notice state={state} saved={labels.preferencesSaved} />

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" /> {pending ? labels.loading : labels.savePreferences}
        </Button>
      </div>
    </form>
  );
}
