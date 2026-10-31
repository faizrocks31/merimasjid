/**
 * Notification Channel Decision Logic
 * Determines which channels to use based on masjid settings + member preferences
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type NotificationChannel = "TELEGRAM" | "EMAIL" | "IN_APP";

export interface ChannelDecision {
  channels: NotificationChannel[];
  reason: string;
  skipped: string[];
}

/**
 * Checks if current time falls within member's quiet hours
 */
function isInQuietHours(
  quietHoursStart: string | null | undefined,
  quietHoursEnd: string | null | undefined,
  timezone: string = "Asia/Kolkata"
): boolean {
  if (!quietHoursStart || !quietHoursEnd) return false;

  const now = new Date();
  const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const currentHour = localTime.getHours();

  const startHour = parseInt(quietHoursStart.split(":")[0], 10);
  const endHour = parseInt(quietHoursEnd.split(":")[0], 10);

  if (isNaN(startHour) || isNaN(endHour)) return false;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startHour > endHour) {
    return currentHour >= startHour || currentHour < endHour;
  }
  // Same-day quiet hours (e.g., 13:00 to 15:00)
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Decides which notification channels to use for a member
 */
export async function decideChannels(
  masjidId: string,
  memberId: string,
  template: string
): Promise<ChannelDecision> {
  const [masjidSettings, member] = await Promise.all([
    prisma.masjidNotificationSettings.findUnique({ where: { masjidId } }),
    prisma.member.findUnique({
      where: { id: memberId },
      select: {
        notifyTelegram: true,
        notifyInApp: true,
        notifyEmail: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        timezone: true,
        telegramChatId: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  const channels: NotificationChannel[] = [];
  const reasons: string[] = [];
  const skipped: string[] = [];

  // 1. IN_APP — always enabled (audit trail)
  // Check masjid setting first, but default to true for safety
  const inAppEnabled = masjidSettings?.inAppEnabled ?? true;
  if (inAppEnabled) {
    channels.push("IN_APP");
    reasons.push("in_app: enabled (audit trail)");
  } else {
    skipped.push("in_app: masjid disabled");
  }

  // 2. Quiet hours check (applies to push channels: TELEGRAM, EMAIL)
  const inQuietHours = member
    ? isInQuietHours(member.quietHoursStart, member.quietHoursEnd, member.timezone)
    : false;

  if (inQuietHours) {
    skipped.push("push channels: quiet hours active");
  }

  // 3. TELEGRAM
  const telegramMasjidEnabled = masjidSettings?.telegramEnabled ?? true;
  const telegramMemberEnabled = member?.notifyTelegram ?? true;
  const hasTelegramToken = !!process.env.TELEGRAM_BOT_TOKEN;
  const hasTelegramChatId = !!member?.telegramChatId;

  if (telegramMasjidEnabled && telegramMemberEnabled && hasTelegramToken && hasTelegramChatId && !inQuietHours) {
    channels.push("TELEGRAM");
    reasons.push("telegram: masjid+member enabled, chat linked, not quiet hours");
  } else {
    const why: string[] = [];
    if (!telegramMasjidEnabled) why.push("masjid disabled");
    if (!telegramMemberEnabled) why.push("member disabled");
    if (!hasTelegramToken) why.push("bot token missing");
    if (!hasTelegramChatId) why.push("chat not linked");
    if (inQuietHours) why.push("quiet hours");
    skipped.push(`telegram: skipped (${why.join(", ") || "unknown"})`);
  }

  // 4. EMAIL
  const emailMasjidEnabled = masjidSettings?.emailEnabled ?? false;
  const emailMemberEnabled = member?.notifyEmail ?? false;
  const hasEmailConfig = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
  const hasEmail = !!member?.user?.email;

  if (emailMasjidEnabled && emailMemberEnabled && hasEmailConfig && hasEmail && !inQuietHours) {
    channels.push("EMAIL");
    reasons.push("email: masjid+member enabled, SMTP configured, email exists");
  } else {
    const why: string[] = [];
    if (!emailMasjidEnabled) why.push("masjid disabled");
    if (!emailMemberEnabled) why.push("member disabled");
    if (!hasEmailConfig) why.push("SMTP not configured");
    if (!hasEmail) why.push("no email on record");
    if (inQuietHours) why.push("quiet hours");
    skipped.push(`email: skipped (${why.join(", ") || "unknown"})`);
  }

  return {
    channels: channels.length > 0 ? channels : ["IN_APP"], // Fallback to IN_APP
    reason: reasons.join(" | "),
    skipped,
  };
}

/**
 * Gets effective channels for a broadcast (channel-based, not member-specific)
 * Used for announcements sent to Telegram channel
 */
export async function decideBroadcastChannels(
  masjidId: string,
  template: string
): Promise<ChannelDecision> {
  const masjidSettings = await prisma.masjidNotificationSettings.findUnique({
    where: { masjidId },
  });

  const channels: NotificationChannel[] = [];
  const reasons: string[] = [];
  const skipped: string[] = [];

  // IN_APP for all members (handled separately in broadcast logic)
  if (masjidSettings?.inAppEnabled ?? true) {
    channels.push("IN_APP");
    reasons.push("in_app: enabled");
  }

  // TELEGRAM channel broadcast
  const hasTelegramToken = !!process.env.TELEGRAM_BOT_TOKEN;
  const hasChannelId = !!process.env.TELEGRAM_CHANNEL_ID;

  if ((masjidSettings?.telegramEnabled ?? true) && hasTelegramToken && hasChannelId) {
    channels.push("TELEGRAM");
    reasons.push("telegram: channel broadcast enabled");
  } else {
    const why: string[] = [];
    if (!(masjidSettings?.telegramEnabled ?? true)) why.push("masjid disabled");
    if (!hasTelegramToken) why.push("bot token missing");
    if (!hasChannelId) why.push("channel ID not configured");
    skipped.push(`telegram: skipped (${why.join(", ") || "unknown"})`);
  }

  return { channels, reason: reasons.join(" | "), skipped };
}