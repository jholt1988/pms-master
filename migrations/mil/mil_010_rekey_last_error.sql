-- 010_rekey_last_error.sql
-- Adds last_error field to tenant_rekey_jobs if missing (for auto-recover notes).

ALTER TABLE tenant_rekey_jobs
  ADD COLUMN IF NOT EXISTS last_error TEXT NULL;
