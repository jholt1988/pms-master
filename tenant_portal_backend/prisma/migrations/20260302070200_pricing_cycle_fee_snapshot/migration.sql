DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrgPlanCycleStatus') THEN
    CREATE TYPE "OrgPlanCycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "FeeScheduleVersion" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "versionLabel" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "feeConfig" JSONB NOT NULL,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "OrgPlanCycle" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "OrgPlanCycleStatus" NOT NULL DEFAULT 'DRAFT',
  "activeFeeScheduleId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PricingSnapshot" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "planCycleId" UUID NOT NULL,
  "feeScheduleVersionId" UUID NOT NULL,
  "snapshotType" TEXT NOT NULL DEFAULT 'BILLING_PREVIEW',
  "inputPayload" JSONB,
  "computedFees" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeeScheduleVersion_org_version_unique"
  ON "FeeScheduleVersion"("organizationId", "versionLabel");

CREATE INDEX IF NOT EXISTS "FeeScheduleVersion_org_effective_idx"
  ON "FeeScheduleVersion"("organizationId", "effectiveAt");

CREATE INDEX IF NOT EXISTS "OrgPlanCycle_org_status_idx"
  ON "OrgPlanCycle"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "PricingSnapshot_org_created_idx"
  ON "PricingSnapshot"("organizationId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeeScheduleVersion_organization_fkey') THEN
    ALTER TABLE "FeeScheduleVersion"
      ADD CONSTRAINT "FeeScheduleVersion_organization_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeeScheduleVersion_createdBy_fkey') THEN
    ALTER TABLE "FeeScheduleVersion"
      ADD CONSTRAINT "FeeScheduleVersion_createdBy_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrgPlanCycle_organization_fkey') THEN
    ALTER TABLE "OrgPlanCycle"
      ADD CONSTRAINT "OrgPlanCycle_organization_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrgPlanCycle_activeFeeSchedule_fkey') THEN
    ALTER TABLE "OrgPlanCycle"
      ADD CONSTRAINT "OrgPlanCycle_activeFeeSchedule_fkey"
      FOREIGN KEY ("activeFeeScheduleId") REFERENCES "FeeScheduleVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PricingSnapshot_organization_fkey') THEN
    ALTER TABLE "PricingSnapshot"
      ADD CONSTRAINT "PricingSnapshot_organization_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PricingSnapshot_planCycle_fkey') THEN
    ALTER TABLE "PricingSnapshot"
      ADD CONSTRAINT "PricingSnapshot_planCycle_fkey"
      FOREIGN KEY ("planCycleId") REFERENCES "OrgPlanCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PricingSnapshot_feeScheduleVersion_fkey') THEN
    ALTER TABLE "PricingSnapshot"
      ADD CONSTRAINT "PricingSnapshot_feeScheduleVersion_fkey"
      FOREIGN KEY ("feeScheduleVersionId") REFERENCES "FeeScheduleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
