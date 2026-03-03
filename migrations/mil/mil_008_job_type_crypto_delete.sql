-- 008_job_type_crypto_delete.sql
-- Extends job_type enum to include TENANT_CRYPTO_DELETE (optional; API can also invoke directly).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mil_jobs_job_type_check') THEN
    ALTER TABLE mil_jobs DROP CONSTRAINT mil_jobs_job_type_check;
  END IF;
EXCEPTION WHEN undefined_object THEN
END $$;

ALTER TABLE mil_jobs
  ADD CONSTRAINT mil_jobs_job_type_check
  CHECK (job_type IN ('EVALUATE_TARGET','TENANT_REKEY','VERIFY_RANGE','TENANT_CRYPTO_DELETE'));
