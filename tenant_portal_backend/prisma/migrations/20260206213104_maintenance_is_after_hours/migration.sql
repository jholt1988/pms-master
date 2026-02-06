-- Add MaintenanceRequest.isAfterHours
ALTER TABLE "MaintenanceRequest"
  ADD COLUMN IF NOT EXISTS "isAfterHours" BOOLEAN;

CREATE INDEX IF NOT EXISTS "MaintenanceRequest_isAfterHours_idx" ON "MaintenanceRequest"("isAfterHours");
