-- Add structured action inputs + measurements to inspection checklist items

-- Create enums
DO $$ BEGIN
  CREATE TYPE "InspectionIssueType" AS ENUM ('INVESTIGATE', 'REPAIR', 'REPLACE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MeasurementUnit" AS ENUM ('COUNT', 'LINEAR_FT', 'SQFT', 'INCH', 'FOOT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SeverityLevel" AS ENUM ('LOW', 'MED', 'HIGH', 'EMERGENCY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add columns
ALTER TABLE "InspectionChecklistItem"
  ADD COLUMN IF NOT EXISTS "issueType" "InspectionIssueType",
  ADD COLUMN IF NOT EXISTS "severity" "SeverityLevel",
  ADD COLUMN IF NOT EXISTS "measurementValue" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "measurementUnit" "MeasurementUnit",
  ADD COLUMN IF NOT EXISTS "measurementNotes" TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS "InspectionChecklistItem_issueType_idx" ON "InspectionChecklistItem"("issueType");
CREATE INDEX IF NOT EXISTS "InspectionChecklistItem_severity_idx" ON "InspectionChecklistItem"("severity");
