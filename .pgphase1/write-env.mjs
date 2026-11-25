/**
 * One-off helper: writes the Phase 1 `.env` for the local isolated
 * PostgreSQL cluster.
 *
 * Every credential is generated or read from disk inside this process. No
 * secret is passed on the command line and none is printed.
 *
 *   node .pgphase1/write-env.mjs
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const pgPassword = readFileSync(join(root, ".pgphase1", "initpw.txt"), "utf8").trim();

function newSecret() {
  return randomBytes(24).toString("base64url") + "aA1";
}

// Preserve the existing AUTH_SECRET if there is one.
let authSecret = "";
try {
  const line = readFileSync(join(root, ".env"), "utf8")
    .split("\n")
    .find((l) => l.startsWith("AUTH_SECRET="));
  if (line) {
    authSecret = line.slice("AUTH_SECRET=".length).replace(/^"|"$/g, "");
  }
} catch {
  /* no .env yet */
}
if (!authSecret) authSecret = randomBytes(48).toString("base64url");

const content = `# ============================================
# DATABASE (PostgreSQL 18)
# ============================================
# The password lives only in this file (git-ignored) and is never printed,
# logged, or committed. Do not put a real credential in .env.example.
DATABASE_URL="postgresql://masjid_app:${pgPassword}@127.0.0.1:55432/masjid_collection"

# Required to run the automated test suite. Must point at a dedicated
# database whose name contains "test" - the test bootstrap refuses to run
# against anything else.
TEST_DATABASE_URL="postgresql://masjid_app:${pgPassword}@127.0.0.1:55432/masjid_collection_test"

# ============================================
# SEED - the two administrator accounts
# ============================================
# \`npm run seed\` creates exactly two accounts: a Super Admin and a Local
# Masjid Admin bound to one test masjid. The passwords have NO defaults and
# are never printed. Set them before running the seed.
SEED_SUPER_ADMIN_EMAIL="platform-admin@example.invalid"
SEED_SUPER_ADMIN_PASSWORD="${newSecret()}"
SEED_SUPER_ADMIN_NAME="Platform Super Admin"

SEED_LOCAL_ADMIN_EMAIL="masjid-admin@example.invalid"
SEED_LOCAL_ADMIN_PASSWORD="${newSecret()}"
SEED_LOCAL_ADMIN_NAME="Masjid Admin"

# The single test masjid both accounts are attached to.
SEED_TEST_MASJID_NAME="Test Masjid"
SEED_TEST_MASJID_SLUG="test-masjid"
SEED_TEST_MASJID_RECEIPT_PREFIX="TSTM"
SEED_TEST_MASJID_ADDRESS=""

# ============================================
# APP
# ============================================
# Signing key for the session cookie. Must be at least 32 characters.
AUTH_SECRET="${authSecret}"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ============================================
# TELEGRAM BOT (FREE - PRIMARY NOTIFICATION CHANNEL)
# ============================================
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHANNEL_ID=""
`;

writeFileSync(join(root, ".env"), content, "utf8");

const keys = content
  .split("\n")
  .filter((l) => /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=/.test(l))
  .map((l) => l.split("=")[0].trim());

console.log("Wrote .env with keys: " + keys.join(", "));
