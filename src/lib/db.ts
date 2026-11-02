import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { initNotifications } from "@/lib/notifications-init";

/**
 * PostgreSQL connection.
 *
 * The connection string comes from DATABASE_URL and is never hardcoded or
 * logged. A missing value is a hard error on purpose: silently falling back to
 * a local file would point the app at the wrong database.
 *
 * Backups are taken with `pg_dump` (see scripts/backup.mjs) — the database is
 * no longer a single file that can be copied while the server is running.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !url.trim()) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at your PostgreSQL server.",
    );
  }
  if (url.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL still points at a SQLite file. Set it to a postgresql:// connection string.",
    );
  }
  return url;
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: connectionString() });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

// Initialize notifications on server startup
if (typeof window === "undefined") {
  initNotifications();
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
