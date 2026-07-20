import { defineConfig } from "prisma/config";

/**
 * Prisma CLI + Prisma Client configuration
 *
 * Sets the schema and migration paths for Prisma tooling.
 * The database `url` is NOT defined here — it comes from the
 * `DATABASE_URL` environment variable at runtime, exactly as
 * the Prisma docs recommend for multi-environment projects:
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
});
