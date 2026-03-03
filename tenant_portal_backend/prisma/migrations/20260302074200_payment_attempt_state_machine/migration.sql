DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentAttemptStatus') THEN
    CREATE TYPE "PaymentAttemptStatus" AS ENUM ('SCHEDULED', 'ATTEMPTING', 'SUCCEEDED', 'FAILED', 'NEEDS_AUTH');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "PaymentAttempt" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "autopayEnrollmentId" INTEGER NOT NULL,
  "invoiceId" INTEGER NOT NULL,
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'SCHEDULED',
  "failureReason" TEXT,
  "externalAttemptId" TEXT,
  "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attemptedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAttempt_unique_schedule"
  ON "PaymentAttempt"("autopayEnrollmentId", "invoiceId", "scheduledFor");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_status_scheduled_idx"
  ON "PaymentAttempt"("status", "scheduledFor");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentAttempt_autopayEnrollment_fkey') THEN
    ALTER TABLE "PaymentAttempt"
      ADD CONSTRAINT "PaymentAttempt_autopayEnrollment_fkey"
      FOREIGN KEY ("autopayEnrollmentId") REFERENCES "AutopayEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentAttempt_invoice_fkey') THEN
    ALTER TABLE "PaymentAttempt"
      ADD CONSTRAINT "PaymentAttempt_invoice_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
