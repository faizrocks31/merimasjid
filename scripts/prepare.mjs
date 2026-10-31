/**
 * Local bootstrap helper. Runs before `dev`, `start` and `setup`.
 *
 *  1. Creates .env from .env.example on a fresh checkout, with a generated
 *     AUTH_SECRET so the first run is secure rather than failing.
 *  2. Reports whether the required PostgreSQL environment variables are set.
 *
 * It never overwrites an existing .env and never invents a database password.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const root = process.cwd();
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");

if (!existsSync(envPath) && existsSync(examplePath)) {
  copyFileSync(examplePath, envPath);
  // Fill in a real signing key so the first run is secure rather than failing.
  const secret = randomBytes(48).toString("base64url");
  const text = readFileSync(envPath, "utf8").replace(
    /^AUTH_SECRET=.*$/m,
    `AUTH_SECRET="${secret}"`,
  );
  writeFileSync(envPath, text);
  console.log("Created .env from .env.example with a generated AUTH_SECRET.");
}

if (!existsSync(envPath)) {
  console.warn("No .env file found. Copy .env.example to .env and set AUTH_SECRET.");
} else {
  // Load .env into process.env for the check below (dotenv is not imported
  // here to keep this script dependency-free).
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }

  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    console.warn("DATABASE_URL is not set in .env — the app will not start.");
  } else if (!/^postgres(ql)?:\/\//i.test(url)) {
    console.warn(
      "DATABASE_URL is not a postgresql:// connection string. This project now requires PostgreSQL.",
    );
  }
}
