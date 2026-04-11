-- Add optimistic locking version fields to models with state transitions
ALTER TABLE "Lease" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MaintenanceRequest" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RentalApplication" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
