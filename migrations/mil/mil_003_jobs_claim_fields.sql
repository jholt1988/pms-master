-- 003_jobs_claim_fields.sql
-- Adds operational fields for safe job claiming and retries.
ALTER TABLE mil_jobs
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS claim_token UUID NULL,
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON mil_jobs (status, created_at);
