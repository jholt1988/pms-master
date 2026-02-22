-- Align org schema + enforce Property.organizationId + add Property.updatedAt

-- Ensure UUID generator exists on fresh Postgres (CI/local)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "OrgRole" AS ENUM ('OWNER','ADMIN','MEMBER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Organization" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserOrganization" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
  CONSTRAINT "UserOrganization_pkey" PRIMARY KEY ("id")
);

-- FKs
DO $$ BEGIN
  ALTER TABLE "UserOrganization"
    ADD CONSTRAINT "UserOrganization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "UserOrganization"
    ADD CONSTRAINT "UserOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Uniques/indexes
DO $$ BEGIN
  CREATE UNIQUE INDEX "UserOrganization_userId_organizationId_key" ON "UserOrganization"("userId","organizationId");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "UserOrganization_organizationId_idx" ON "UserOrganization"("organizationId");
CREATE INDEX IF NOT EXISTS "UserOrganization_userId_idx" ON "UserOrganization"("userId");

-- Property.organizationId + updatedAt
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "organizationId" UUID;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Ensure there is a default org for existing rows, then backfill any nulls.
INSERT INTO "Organization" ("id","name","createdAt","updatedAt")
VALUES ('11111111-1111-4111-8111-111111111111','Default Organization',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "Property" SET "organizationId"='11111111-1111-4111-8111-111111111111' WHERE "organizationId" IS NULL;
UPDATE "Property" SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP);

ALTER TABLE "Property" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Property" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Property" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
  ALTER TABLE "Property"
    ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "Property_organizationId_idx" ON "Property"("organizationId");
