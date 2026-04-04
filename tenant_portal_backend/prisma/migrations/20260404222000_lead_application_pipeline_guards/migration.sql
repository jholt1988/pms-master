-- Lead application pipeline hardening + stale follow-up support

ALTER TABLE "LeadApplication"
  ADD COLUMN IF NOT EXISTS "decisionReasonCode" "ApplicationDecisionReasonCode",
  ADD COLUMN IF NOT EXISTS "decisionNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "followUpDueAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "LeadApplication_status_followUpDueAt_idx"
  ON "LeadApplication"("status", "followUpDueAt");