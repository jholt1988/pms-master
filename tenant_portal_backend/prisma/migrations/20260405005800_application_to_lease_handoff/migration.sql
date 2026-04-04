-- Link approved rental applications to created leases
ALTER TABLE "RentalApplication"
  ADD COLUMN IF NOT EXISTS "convertedLeaseId" UUID;

CREATE INDEX IF NOT EXISTS "RentalApplication_convertedLeaseId_idx"
  ON "RentalApplication"("convertedLeaseId");

DO $$ BEGIN
  ALTER TABLE "RentalApplication"
    ADD CONSTRAINT "RentalApplication_convertedLeaseId_fkey"
    FOREIGN KEY ("convertedLeaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
