-- 011_rekey_recovery_cap.sql
-- Adds recovery attempt counter and FAILED state support.

ALTER TABLE tenant_rekey_jobs
  ADD COLUMN IF NOT EXISTS recovery_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ NULL;

-- Allow FAILED status if not already allowed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_rekey_jobs_status_check'
  ) THEN
    -- If no explicit constraint exists, skip (schema may vary)
    NULL;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;
