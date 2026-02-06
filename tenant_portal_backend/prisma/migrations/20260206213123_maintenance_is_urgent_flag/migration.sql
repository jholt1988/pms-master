-- Add MaintenanceRequest.isUrgentFlag
ALTER TABLE "MaintenanceRequest"
  ADD COLUMN IF NOT EXISTS "isUrgentFlag" BOOLEAN;

CREATE INDEX IF NOT EXISTS "MaintenanceRequest_isUrgentFlag_idx" ON "MaintenanceRequest"("isUrgentFlag");
