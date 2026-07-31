import { defineConfig } from "prisma/config";
import { PrismaConfig } from "prisma";

/**
 * Prisma CLI + Prisma Client configuration
 *
 * Sets the schema and migration paths for Prisma tooling.
 * The database `url` comes from the `DATABASE_URL` environment
 * variable at runtime, as recommended by Prisma for multi-environment
 * projects:
 *
 *   https://www.prisma.io/docs/orm/reference/prisma-config-reference
 *
 * In local dev, `ops/.env.dev` supplies the URL and is passed to
 * Docker via `--env-file`.  In production, it is injected by the
 * hosting platform.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
}) satisfies PrismaConfig;
