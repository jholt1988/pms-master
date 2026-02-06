-- Add MaintenanceRequest.severityDerived
ALTER TABLE "MaintenanceRequest"
  ADD COLUMN IF NOT EXISTS "severityDerived" "SeverityLevel";

CREATE INDEX IF NOT EXISTS "MaintenanceRequest_severityDerived_idx" ON "MaintenanceRequest"("severityDerived");
