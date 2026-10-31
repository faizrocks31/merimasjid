import { PrismaClient } from "@prisma/client";
import { setTelegramConfig, setEmailConfig, getTelegramSetupInstructions, sendNotification } from "./notifications";

const prisma = new PrismaClient();

// Initialize notification configs from env
export function initNotifications() {
  // Telegram (FREE)
  if (process.env.TELEGRAM_BOT_TOKEN) {
    setTelegramConfig({
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      defaultChatId: process.env.TELEGRAM_CHANNEL_ID,
    });
    console.log("✅ Telegram notifications enabled");
  } else {
    console.log("⚠️  Telegram not configured - add TELEGRAM_BOT_TOKEN to .env");
    console.log(getTelegramSetupInstructions());
  }

  // Email (optional)
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    setEmailConfig({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT ?? "587"),
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      from: process.env.EMAIL_FROM ?? "Masjid Collection <noreply@masjid.org>",
    });
    console.log("✅ Email notifications enabled");
  }

  // WhatsApp (optional - needs verified WABA)
  if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
    // setWhatsAppConfig({...});
    console.log("⚠️  WhatsApp configured but requires Meta Business Verification");
  }
}

// ============================================
// HELPER: Link member's Telegram account
// ============================================

/**
 * Call this when a member messages the bot for the first time
 * or when they click a deep link: https://t.me/yourbot?start=member_<memberId>
 */
export async function linkMemberTelegram(memberId: string, telegramChatId: string) {
  // Verify this chat_id isn't already linked to another member
  const existing = await prisma.member.findFirst({
    where: { telegramChatId },
    select: { id: true, fullName: true },
  });

  if (existing && existing.id !== memberId) {
    throw new Error(`Telegram chat ${telegramChatId} already linked to ${existing.fullName}`);
  }

  const member = await prisma.member.update({
    where: { id: memberId },
    data: { telegramChatId },
    select: { id: true, fullName: true, telegramChatId: true },
  });

  console.log(`✅ Linked Telegram for ${member.fullName}: ${member.telegramChatId}`);
  return member;
}

/**
 * Get all members with linked Telegram for broadcasting
 */
export async function getMembersWithTelegram(masjidId: string) {
  return prisma.member.findMany({
    where: {
      masjidId,
      status: "ACTIVE",
      telegramChatId: { not: null },
    },
    select: { id: true, memberNo: true, fullName: true, telegramChatId: true },
  });
}

/**
 * Broadcast to all members with linked Telegram
 */
export async function broadcastToMembers(
  masjidId: string,
  title: string,
  body: string,
  template = "broadcast"
) {
  const members = await getMembersWithTelegram(masjidId);
  const results = [];

  for (const member of members) {
    if (member.telegramChatId) {
      const result = await sendNotification({
        masjidId,
        memberId: member.id,
        title,
        body,
        template,
        channels: ["TELEGRAM", "IN_APP"],
      });
      results.push({ member: member.fullName, ...result[0] });
    }
  }

  return results;
}

// Run init on import (server-side only)
if (typeof window === "undefined") {
  initNotifications();
}

export { prisma };