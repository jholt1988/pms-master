-- Add MaintenanceRequest.severityScoreDerived (derived severity score for prioritization)
ALTER TABLE "MaintenanceRequest"
  ADD COLUMN IF NOT EXISTS "severityScoreDerived" INTEGER;

CREATE INDEX IF NOT EXISTS "MaintenanceRequest_severityScoreDerived_idx" ON "MaintenanceRequest"("severityScoreDerived");
