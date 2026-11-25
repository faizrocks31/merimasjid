import { chromium, FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const ADMIN_EMAIL = "localadmin@gmail.com";
const ADMIN_PASSWORD = "admin123";

// Generate unique manual event name once per test run (not per retry).
// The "name" validation rule strips digits (letters-only filter), so the
// suffix has to be made of letters only.
const RANDOM_LETTERS = "abcdefghijklmnopqrstuvwxyz";
function randomLetters(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += RANDOM_LETTERS[Math.floor(Math.random() * RANDOM_LETTERS.length)];
  }
  return out;
}
const MANUAL_EVENT_NAME = `Manual Event Test ${randomLetters(8)}`;
const EVENT_NAME_FILE = path.resolve("e2e/manual-event-name.txt");

async function globalSetup(config: FullConfig) {
  // Save the event name for tests to read
  fs.writeFileSync(EVENT_NAME_FILE, MANUAL_EVENT_NAME);

  // Login and save auth state
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/login`);

  // Wait for form to be ready
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.waitForSelector('input[name="password"]', { timeout: 10000 });
  await page.waitForSelector('button[type="submit"]', { timeout: 10000 });

  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for navigation - the login action redirects via window.location.href
  try {
    await page.waitForURL('**/dashboard', { timeout: 60000 });
  } catch {
    // Fallback: wait for any navigation and check cookie
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  }

  // Verify session cookie exists
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'masjid_session');
  if (!sessionCookie) {
    throw new Error('Session cookie not found after login');
  }

  await page.context().storageState({ path: "e2e/auth-state.json" });
  await browser.close();
  console.log("Global setup complete - auth state saved");
}

export default globalSetup;