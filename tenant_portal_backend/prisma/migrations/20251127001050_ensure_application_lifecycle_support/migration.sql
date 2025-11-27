-- Ensure all ApplicationStatus enum variants exist
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'SCREENING';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'BACKGROUND_CHECK';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'DOCUMENTS_REVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';

-- Create the lifecycle events table if it does not exist (idempotent for CI migrations)
CREATE TABLE IF NOT EXISTS "ApplicationLifecycleEvent" (
    "id" SERIAL PRIMARY KEY,
    "applicationId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus" NOT NULL,
    "performedById" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ApplicationLifecycleEvent_applicationId_idx"
    ON "ApplicationLifecycleEvent"("applicationId");

CREATE INDEX IF NOT EXISTS "ApplicationLifecycleEvent_createdAt_idx"
    ON "ApplicationLifecycleEvent"("createdAt");

-- Add foreign keys if they are missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ApplicationLifecycleEvent_applicationId_fkey'
  ) THEN
    ALTER TABLE "ApplicationLifecycleEvent"
      ADD CONSTRAINT "ApplicationLifecycleEvent_applicationId_fkey"
      FOREIGN KEY ("applicationId")
      REFERENCES "RentalApplication"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ApplicationLifecycleEvent_performedById_fkey'
  ) THEN
    ALTER TABLE "ApplicationLifecycleEvent"
      ADD CONSTRAINT "ApplicationLifecycleEvent_performedById_fkey"
      FOREIGN KEY ("performedById")
      REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

