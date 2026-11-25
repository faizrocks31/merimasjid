import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI configuration (Prisma 7).
 *
 * The datasource URL is read from DATABASE_URL and must be a PostgreSQL
 * connection string. Credentials live in .env only — never in this file.
 *
 * SHADOW_DATABASE_URL is optional. When it is set, `prisma migrate dev` uses
 * that database to replay migrations and detect drift. When it is absent,
 * Prisma creates and drops a temporary shadow database, which requires the
 * configured role to hold the CREATEDB privilege.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
      : {}),
  },
  migrations: {
    path: "prisma/migrations",
    seed: 'tsx ./prisma/seed.ts',
  },
});