-- 009_rekey_progress_cursor.sql
-- Adds resumable cursor + progress bookkeeping to tenant_rekey_jobs.

ALTER TABLE tenant_rekey_jobs
  ADD COLUMN IF NOT EXISTS cursor_evaluation_id UUID NULL,
  ADD COLUMN IF NOT EXISTS cursor_step_seq INT NULL,
  ADD COLUMN IF NOT EXISTS rewrapped_steps BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_steps_estimate BIGINT NULL,
  ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_rekey_jobs_status ON tenant_rekey_jobs (tenant_id, status);
