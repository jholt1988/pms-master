import definePrismaConfig from @prisma/cli-engine

const prisma = definePrismaConfig({
  schema: "tenant_portal_backend/prisma/property-os.schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

export default prisma