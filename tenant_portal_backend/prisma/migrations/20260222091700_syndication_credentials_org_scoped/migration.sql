/*
  Backfill strategy:
  - Duplicate existing global credentials for each organization.
  - Remove legacy rows without organizationId.
  - Enforce org-scoped uniqueness.
*/

-- Drop legacy unique constraint on channel to allow org-scoped duplicates
DROP INDEX IF EXISTS "SyndicationCredential_channel_key";

-- Ensure Organization exists (some DBs have it dropped earlier)
DO $$
BEGIN
  IF to_regclass('"Organization"') IS NULL THEN
    CREATE TABLE "Organization" (
      "id" UUID NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "Organization") THEN
    INSERT INTO "Organization" ("id","name","createdAt","updatedAt")
    VALUES ('11111111-1111-4111-8111-111111111111','Default Organization',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  END IF;
END $$;

-- Add organizationId column (nullable for backfill)
ALTER TABLE "SyndicationCredential" ADD COLUMN "organizationId" UUID;

-- Backfill: create org-scoped copies of existing credentials
INSERT INTO "SyndicationCredential" ("organizationId", "channel", "config", "createdAt", "updatedAt")
SELECT o."id", sc."channel", sc."config", sc."createdAt", sc."updatedAt"
FROM "SyndicationCredential" sc
CROSS JOIN "Organization" o
WHERE sc."organizationId" IS NULL;

-- Remove legacy global rows
DELETE FROM "SyndicationCredential" WHERE "organizationId" IS NULL;

-- Enforce non-null org scope
ALTER TABLE "SyndicationCredential" ALTER COLUMN "organizationId" SET NOT NULL;

-- Add FK and indexes
ALTER TABLE "SyndicationCredential"
  ADD CONSTRAINT "SyndicationCredential_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SyndicationCredential_organizationId_channel_key"
  ON "SyndicationCredential"("organizationId", "channel");

CREATE INDEX "SyndicationCredential_organizationId_idx"
  ON "SyndicationCredential"("organizationId");
