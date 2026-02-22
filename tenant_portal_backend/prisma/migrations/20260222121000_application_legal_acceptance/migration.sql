-- Add legal acceptance fields for rental applications
ALTER TABLE "RentalApplication"
  ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "termsVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "privacyVersion" TEXT;

-- Add legal acceptance fields for lead applications
ALTER TABLE "LeadApplication"
  ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "termsVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "privacyVersion" TEXT;
