-- Sync missing AI-related columns that were hotfixed directly in DB
-- Ensures migration history matches runtime schema expectations.

ALTER TABLE "InspectionChecklistPhoto"
ADD COLUMN IF NOT EXISTS "aiAnalysis" TEXT;

ALTER TABLE "RentalApplication"
ADD COLUMN IF NOT EXISTS "ai_recommendation" TEXT,
ADD COLUMN IF NOT EXISTS "ai_summary" TEXT,
ADD COLUMN IF NOT EXISTS "ai_reviewed_at" TIMESTAMP(3);
