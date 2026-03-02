DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StripeOnboardingStatus') THEN
    CREATE TYPE "StripeOnboardingStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'IN_REVIEW', 'COMPLETED', 'RESTRICTED');
  END IF;
END$$;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "stripeConnectedAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeOnboardingStatus" "StripeOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripeCapabilities" JSONB,
  ADD COLUMN IF NOT EXISTS "stripeOnboardingCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stripeLastOnboardingCheckAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_stripeConnectedAccountId_key"
  ON "Organization"("stripeConnectedAccountId");
