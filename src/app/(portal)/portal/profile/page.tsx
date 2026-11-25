import { Phone, MapPin, UserRound, CalendarDays, Mail, Bell, Settings } from "lucide-react";
import { getDictionary } from "@/i18n";
import { formatDate } from "@/lib/dates";
import { Badge, Card, CardBody, CardHeader, CardTitle, PageHeader } from "@/components/ui";
import { MemberStatusBadge } from "@/components/status-badges";
import { requirePortalMember } from "@/modules/portal/queries";
import { prisma } from "@/lib/db";
import { PreferencesForm } from "./preferences-form";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const { user, member } = await requirePortalMember();
  const { t } = await getDictionary();

  // The masjid's global toggle decides whether Telegram is even available to
  // this member; the member's own preference is a further opt-in on top.
  const masjidSettings = await prisma.masjidNotificationSettings.findUnique({
    where: { masjidId: member.masjidId },
  });
  const telegramAllowed = masjidSettings?.telegramEnabled ?? true;

  let botUsername: string | null = null;
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
      const data = await res.json();
      if (data.ok) botUsername = data.result.username;
    } catch {}
  }

  const labels: Record<string, string> = {
    receiveTelegram: t("receiveTelegram"),
    receiveInApp: t("receiveInApp"),
    receiveEmail: t("receiveEmail"),
    quietHours: t("quietHours"),
    quietHoursStart: t("quietHoursStart"),
    quietHoursEnd: t("quietHoursEnd"),
    quietHoursHint: t("quietHoursHint"),
    timezone: t("timezone"),
    savePreferences: t("savePreferences"),
    preferencesSaved: t("preferencesSaved"),
    loading: t("loading"),
    notificationsEnabled: t("notificationsEnabled"),
    notificationsDisabled: t("notificationsDisabled"),
    inAppNotificationsDesc: t("inAppNotificationsDesc"),
    emailNotificationsDesc: t("emailNotificationsDesc"),
    botNotConfigured: t("botNotConfigured"),
    telegramLinked: t("telegramLinked"),
    telegramNotLinked: t("telegramNotLinked"),
    linkTelegramHint: t("linkTelegramHint"),
  };

  return (
    <>
      <PageHeader title={t("profile")} description={member.memberNo} />

      <Card>
        <CardHeader>
          <CardTitle>{t("memberProfile")}</CardTitle>
          <MemberStatusBadge status={member.status} />
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Item icon={<UserRound className="h-4 w-4" />} label={t("name")} value={member.fullName} />
          <Item icon={<UserRound className="h-4 w-4" />} label={t("memberNo")} value={member.memberNo} mono />
          <Item icon={<Phone className="h-4 w-4" />} label={t("phone")} value={member.phone ?? "—"} mono />
          <Item icon={<Mail className="h-4 w-4" />} label={t("email")} value={user.email} />
          <Item icon={<CalendarDays className="h-4 w-4" />} label={t("startDate")} value={formatDate(member.joinDate)} mono />
          <Item icon={<MapPin className="h-4 w-4" />} label={t("address")} value={member.address ?? "—"} />
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("notificationPreferences")}</CardTitle>
          <Bell className="h-4 w-4 text-[var(--ink-muted)]" />
        </CardHeader>
        <PreferencesForm
          labels={labels}
          member={{
            notifyTelegram: member.notifyTelegram,
            notifyInApp: member.notifyInApp,
            notifyEmail: member.notifyEmail,
            quietHoursStart: member.quietHoursStart,
            quietHoursEnd: member.quietHoursEnd,
            timezone: member.timezone,
            telegramChatId: member.telegramChatId,
          }}
          env={{
            botUsername,
            hasBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
            telegramAllowed,
          }}
        />
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
          <Settings className="h-4 w-4 text-[var(--ink-muted)]" />
        </CardHeader>
        <CardBody className="space-y-2 text-xs text-[var(--ink-muted)]">
          <p>{t("masjidName")}: <span className="text-[var(--ink)]">{member.masjid.name}</span></p>
          <p>{t("phone")}: <span className="num text-[var(--ink)]">{member.masjid.phone ?? "—"}</span></p>
          <p>{t("email")}: <span className="text-[var(--ink)]">{member.masjid.email ?? "—"}</span></p>
          <p className="pt-2">{t("taxNote")}</p>
          <Badge tone="brand">{t("portalAccount")}</Badge>
        </CardBody>
      </Card>
    </>
  );
}

function Item({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-[var(--ink-muted)]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{label}</p>
        <p className={`whitespace-pre-line ${mono ? "num" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
