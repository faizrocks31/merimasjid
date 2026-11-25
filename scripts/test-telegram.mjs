/**
 * Test Telegram bot connectivity.
 * Requires TELEGRAM_BOT_TOKEN in .env
 * Run: node scripts/test-telegram.mjs
 */
import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

if (!token) {
  console.log("❌ TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

console.log("🔍 Testing Telegram bot...");

// Test 1: Get bot info
try {
  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = await res.json();
  if (data.ok) {
    console.log(`✅ Bot: @${data.result.username} (${data.result.first_name})`);
  } else {
    console.log("❌ Invalid token:", data.description);
    process.exit(1);
  }
} catch (e) {
  console.log("❌ Network error:", e);
  process.exit(1);
}

// Test 2: Send test message
const testChatId = channelId;
if (!testChatId) {
  console.log("\n⚠️  Set TELEGRAM_CHANNEL_ID in .env");
  console.log("   Get your chat ID: message @userinfobot on Telegram");
  process.exit(0);
}

console.log(`\n📤 Sending test message to ${testChatId}...`);
const text = `🕌 <b>Masjid Collection</b>\n\n✅ Telegram notifications are working!\n\n<i>Test message sent at ${new Date().toLocaleString("en-IN")}</i>`;

try {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: testChatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json();
  if (data.ok) {
    console.log("✅ Test message sent successfully!");
    console.log("   Message ID:", data.result.message_id);
  } else {
    console.log("❌ Failed:", data.description);
  }
} catch (e) {
  console.log("❌ Error:", e);
}