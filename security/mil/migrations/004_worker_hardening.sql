-- 004_worker_hardening.sql
-- Adds retry scheduling + lease locking + DLQ quarantine.

ALTER TABLE mil_jobs
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS dlq_reason TEXT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mil_jobs_status_check') THEN
    ALTER TABLE mil_jobs DROP CONSTRAINT mil_jobs_status_check;
  END IF;
EXCEPTION WHEN undefined_object THEN
END $$;

ALTER TABLE mil_jobs
  ADD CONSTRAINT mil_jobs_status_check
  CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','BLOCKED','DEAD'));

CREATE TABLE IF NOT EXISTS mil_jobs_dlq (
  dlq_id UUID PRIMARY KEY,
  job_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  evaluation_id UUID NOT NULL,
  target_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  request_id TEXT NOT NULL,
  attempts INT NOT NULL,
  last_error TEXT NULL,
  dlq_reason TEXT NOT NULL,
  quarantined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_next_attempt ON mil_jobs (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_jobs_locked_until ON mil_jobs (status, locked_until);
