-- Per-organization delinquency priority scoring overrides
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "delinquencyDaysWeight" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "delinquencyAmountWeight" DOUBLE PRECISION;