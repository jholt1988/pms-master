import { defineConfig } from "prisma/config";
import { PrismaConfig } from "prisma";

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
export default defineConfig( {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: 'postgres://33bf66322d170080bed542f7b64934a810a78eadaf82a76edf474b0ccf6cde0f:sk_0hg08oPtjwj-NAiEg8qlJ@db.prisma.io:5432/postgres?sslmode=require',

    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL
  }
}) satisfies PrismaConfig;
function defineConfig(arg0: { schema: string; migrations: { path: string; }; datasource: { url: string; shadowDatabaseUrl: string | undefined; }; }): PrismaConfig {
  return arg0;
}

