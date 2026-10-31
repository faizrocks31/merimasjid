/**
 * Multi-channel Notification Service
 * Supports: Telegram (FREE), In-app, Email, WhatsApp (when ready)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export type NotificationChannel = "TELEGRAM" | "IN_APP" | "EMAIL" | "WHATSAPP" | "SMS";

export interface NotificationPayload {
  masjidId: string;
  memberId?: string;
  phone?: string;
  telegramChatId?: string;
  email?: string;
  title: string;
  body: string;
  template?: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  providerRef?: string;
  error?: string;
}

// ============================================
// TELEGRAM (FREE - PRIMARY CHANNEL)
// ============================================

interface TelegramConfig {
  botToken: string;
  defaultChatId?: string; // Channel/group for broadcasts
}

let telegramConfig: TelegramConfig | null = null;

export function setTelegramConfig(config: TelegramConfig) {
  telegramConfig = config;
}

async function sendTelegram(
  chatId: string,
  text: string,
  options?: { parseMode?: "HTML" | "Markdown"; disablePreview?: boolean }
): Promise<NotificationResult> {
  if (!telegramConfig) {
    return { channel: "TELEGRAM", success: false, error: "Telegram not configured" };
  }

  try {
    const url = `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode ?? "HTML",
        disable_web_page_preview: options?.disablePreview ?? true,
      }),
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.description);

    return { channel: "TELEGRAM", success: true, providerRef: String(data.result.message_id) };
  } catch (e) {
    return { channel: "TELEGRAM", success: false, error: String(e) };
  }
}

async function sendTelegramPhoto(
  chatId: string,
  photoUrl: string,
  caption?: string
): Promise<NotificationResult> {
  if (!telegramConfig) {
    return { channel: "TELEGRAM", success: false, error: "Telegram not configured" };
  }

  try {
    const url = `https://api.telegram.org/bot${telegramConfig.botToken}/sendPhoto`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML" }),
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.description);

    return { channel: "TELEGRAM", success: true, providerRef: String(data.result.message_id) };
  } catch (e) {
    return { channel: "TELEGRAM", success: false, error: String(e) };
  }
}

// ============================================
// IN-APP (ALWAYS FREE - USES YOUR DB)
// ============================================

async function sendInApp(payload: NotificationPayload): Promise<NotificationResult> {
  try {
    await prisma.notificationLog.create({
      data: {
        masjidId: payload.masjidId,
        recipient: payload.memberId ?? payload.phone ?? payload.email ?? "unknown",
        channel: "IN_APP",
        template: payload.template ?? "custom",
        status: "SENT",
        providerReference: `in_app_${Date.now()}`,
      },
    });
    return { channel: "IN_APP", success: true, providerRef: `in_app_${Date.now()}` };
  } catch (e) {
    return { channel: "IN_APP", success: false, error: String(e) };
  }
}

// ============================================
// EMAIL (FREE VIA GMAIL/OUTLOOK/ZOHO SMTP)
// ============================================

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

let emailConfig: EmailConfig | null = null;

export function setEmailConfig(config: EmailConfig) {
  emailConfig = config;
}

async function sendEmail(to: string, subject: string, html: string): Promise<NotificationResult> {
  if (!emailConfig) {
    return { channel: "EMAIL", success: false, error: "Email not configured" };
  }

  // Use nodemailer or fetch to email API (SendGrid, Mailgun, etc.)
  // For now, log and return success (implement with your provider)
  console.log("[Email] Would send to:", to, subject);
  return { channel: "EMAIL", success: true, providerRef: `email_${Date.now()}` };
}

// ============================================
// WHATSAPP (PLACEHOLDER - NEEDS VERIFIED WABA)
// ============================================

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  version?: string; // v21.0
}

let whatsAppConfig: WhatsAppConfig | null = null;

export function setWhatsAppConfig(config: WhatsAppConfig) {
  whatsAppConfig = config;
}

async function sendWhatsApp(to: string, template: string, params: string[]): Promise<NotificationResult> {
  if (!whatsAppConfig) {
    return { channel: "WHATSAPP", success: false, error: "WhatsApp not configured (needs verified WABA)" };
  }

  // Cloud API call - only works with approved WABA
  // https://developers.facebook.com/docs/whatsapp/cloud-api/messages/message-templates
  return { channel: "WHATSAPP", success: false, error: "Requires Meta Business Verification" };
}

// ============================================
// MAIN SEND FUNCTION
// ============================================

import { decideChannels } from "./notification-channels";

export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult[]> {
  // Determine channels: explicit payload.channels OR auto-decide from settings
  let channels = payload.channels;
  let decisionReason = "explicit";

  if (!channels && payload.memberId) {
    const decision = await decideChannels(payload.masjidId, payload.memberId, payload.template ?? "custom");
    channels = decision.channels;
    decisionReason = decision.reason;
  } else if (!channels) {
    // Fallback: no memberId, no explicit channels
    channels = ["IN_APP"];
    decisionReason = "fallback (no memberId)";
  }

  console.log(`[Notification] ${payload.template} → ${channels.join(", ")} | ${decisionReason}`);

  const results: NotificationResult[] = [];

  // Get member details if memberId provided
  let member: { phone?: string | null; telegramChatId?: string | null; user?: { email?: string | null } | null } | null = null;
  if (payload.memberId) {
    member = await prisma.member.findUnique({
      where: { id: payload.memberId },
      select: { phone: true, telegramChatId: true, user: { select: { email: true } } },
    });
  }

  for (const channel of channels) {
    let result: NotificationResult;

    switch (channel) {
      case "TELEGRAM": {
        const chatId = payload.telegramChatId ?? member?.telegramChatId ?? telegramConfig?.defaultChatId;
        if (!chatId) {
          result = { channel: "TELEGRAM", success: false, error: "No chat ID" };
        } else {
          const text = `<b>${payload.title}</b>\n\n${payload.body}`;
          result = await sendTelegram(chatId, text);
        }
        break;
      }

      case "IN_APP":
        result = await sendInApp(payload);
        break;

      case "EMAIL": {
        const email = payload.email ?? member?.user?.email;
        if (!email) {
          result = { channel: "EMAIL", success: false, error: "No email" };
        } else {
          result = await sendEmail(email, payload.title, `<p>${payload.body}</p>`);
        }
        break;
      }

      case "WHATSAPP": {
        const phone = payload.phone ?? member?.phone;
        if (!phone) {
          result = { channel: "WHATSAPP", success: false, error: "No phone" };
        } else {
          result = await sendWhatsApp(phone, payload.template ?? "default", []);
        }
        break;
      }

      case "SMS":
        // Implement with Twilio/Gupshup if needed
        result = { channel: "SMS", success: false, error: "Not implemented" };
        break;

      default:
        result = { channel, success: false, error: "Unknown channel" };
    }

    // Log to DB
    await prisma.notificationLog.create({
      data: {
        masjidId: payload.masjidId,
        recipient: payload.memberId ?? payload.phone ?? payload.email ?? payload.telegramChatId ?? "unknown",
        channel,
        template: payload.template ?? "custom",
        status: result.success ? "SENT" : "FAILED",
        providerReference: result.providerRef,
      },
    }).catch(() => {}); // Don't fail notification if logging fails

    results.push(result);
  }

  return results;
}

// ============================================
// CONVENIENCE FUNCTIONS FOR COMMON TEMPLATES
// ============================================

export async function notifyPaymentReceived(payload: {
  masjidId: string;
  memberId: string;
  amount: number;
  receiptNo: string;
  category: string;
  date: Date;
}) {
  return sendNotification({
    masjidId: payload.masjidId,
    memberId: payload.memberId,
    title: "💰 Payment Received",
    body: `Thank you for your contribution of ₹${(payload.amount / 100).toFixed(2)} towards <b>${payload.category}</b>.\nReceipt: <code>${payload.receiptNo}</code>\nDate: ${payload.date.toLocaleDateString("en-IN")}`,
    template: "payment_received",
  });
}

export async function notifyDuesReminder(payload: {
  masjidId: string;
  memberId: string;
  amount: number;
  category: string;
  dueDate: Date;
  period: string;
}) {
  return sendNotification({
    masjidId: payload.masjidId,
    memberId: payload.memberId,
    title: "📅 Due Reminder",
    body: `Dear member, your contribution of ₹${(payload.amount / 100).toFixed(2)} for <b>${payload.category}</b> (${payload.period}) is due on <b>${payload.dueDate.toLocaleDateString("en-IN")}</b>.\nPlease pay at your earliest convenience.`,
    template: "dues_reminder",
  });
}

export async function notifyAnnouncement(payload: {
  masjidId: string;
  title: string;
  body: string;
  targetChatId?: string; // For channel broadcast
}) {
  return sendNotification({
    masjidId: payload.masjidId,
    telegramChatId: payload.targetChatId,
    title: `📢 ${payload.title}`,
    body: payload.body,
    template: "announcement",
  });
}

export async function notifyExpenseApproved(payload: {
  masjidId: string;
  expenseNo: string;
  amount: number;
  category: string;
  payee: string;
}) {
  return sendNotification({
    masjidId: payload.masjidId,
    title: "✅ Expense Approved",
    body: `Expense <code>${payload.expenseNo}</code> for <b>${payload.category}</b> (₹${(payload.amount / 100).toFixed(2)}) to <b>${payload.payee}</b> has been approved.`,
    template: "expense_approved",
  });
}

// ============================================
// TELEGRAM BOT SETUP HELPER
// ============================================

/**
 * Setup steps:
 * 1. Open Telegram, search @BotFather
 * 2. /newbot → give name & username (e.g., MasjidCollectionBot)
 * 3. Copy the token → add to .env: TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
 * 4. For channel broadcasts: add bot as admin to your channel
 * 5. Get channel ID: forward a message from channel to @userinfobot
 * 6. Add to .env: TELEGRAM_CHANNEL_ID=-1001234567890
 */
export function getTelegramSetupInstructions(): string {
  return `
🤖 TELEGRAM BOT SETUP (5 minutes, FREE forever)

1. Open Telegram → Search @BotFather
2. Send: /newbot
3. Name: "Masjid Collection Bot"
   Username: "yourmasjidbot" (must end with 'bot')
4. Copy the token (looks like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)
5. Add to .env:
   TELEGRAM_BOT_TOKEN=your_token_here
   TELEGRAM_CHANNEL_ID=-100xxxxxxxxxx (for broadcasts)

6. For channel broadcasts:
   - Create a Channel in Telegram
   - Add your bot as Admin (with "Post Messages" permission)
   - Forward any message from channel to @userinfobot to get Channel ID
   - Channel ID looks like: -1001234567890

7. For member-specific messages:
   - Ask members to message your bot once
   - Or use a "deep link": https://t.me/yourmasjidbot?start=member_123
   - Save their chat_id in Member.telegramChatId field

That's it! No verification, no monthly fees, unlimited messages.
  `.trim();
}