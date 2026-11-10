const databaseUrl = (
  globalThis as typeof globalThis & {
    process?: { env?: { DATABASE_URL?: string } };
  }
).process?.env?.DATABASE_URL;

export default {
  schema: "tenant_portal_backend/prisma/property-os.schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
};
