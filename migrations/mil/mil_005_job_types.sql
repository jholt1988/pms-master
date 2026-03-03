-- 005_job_types.sql
-- Introduces typed jobs for unified governance execution.

ALTER TABLE mil_jobs
  ADD COLUMN IF NOT EXISTS job_type TEXT NOT NULL DEFAULT 'EVALUATE_TARGET';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mil_jobs_job_type_check') THEN
    ALTER TABLE mil_jobs DROP CONSTRAINT mil_jobs_job_type_check;
  END IF;
EXCEPTION WHEN undefined_object THEN
END $$;

ALTER TABLE mil_jobs
  ADD CONSTRAINT mil_jobs_job_type_check
  CHECK (job_type IN ('EVALUATE_TARGET','TENANT_REKEY','VERIFY_RANGE'));

CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON mil_jobs (job_type, status);
