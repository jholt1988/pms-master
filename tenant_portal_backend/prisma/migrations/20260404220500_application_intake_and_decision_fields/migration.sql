-- Rental application intake hardening + decision metadata

DO $$ BEGIN
  CREATE TYPE "ApplicationDecisionReasonCode" AS ENUM (
    'CREDIT_RISK',
    'INCOME_INSUFFICIENT',
    'IDENTITY_UNVERIFIED',
    'BACKGROUND_CHECK_FAILED',
    'INCOMPLETE_DOCUMENTATION',
    'POLICY_MISMATCH',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "RentalApplication"
  ADD COLUMN IF NOT EXISTS "authorizeCreditCheck" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "authorizeBackgroundCheck" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "authorizeEmploymentVerification" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ssCardUploaded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "proofOfIncomeUploaded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dlIdUploaded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "decisionReasonCode" "ApplicationDecisionReasonCode",
  ADD COLUMN IF NOT EXISTS "decisionNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "decisionedAt" TIMESTAMP(3);
