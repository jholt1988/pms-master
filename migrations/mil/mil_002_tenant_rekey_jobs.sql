-- 002_tenant_rekey_jobs.sql
CREATE TABLE IF NOT EXISTS tenant_rekey_jobs (
  job_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('KEY_AGE_THRESHOLD','CRYPTO_POLICY_UPDATE','SECURITY_INCIDENT_RESPONSE','TENANT_REQUESTED')),
  trigger_reason TEXT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NULL,
  status TEXT NOT NULL CHECK (status IN ('SCHEDULED','READY','RUNNING','COMPLETED','FAILED','ABORTED')),
  old_kms_key_id TEXT NULL,
  new_kms_key_id TEXT NULL,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL,
  result_summary JSONB NULL
);
CREATE INDEX IF NOT EXISTS idx_rekey_jobs_tenant ON tenant_rekey_jobs (tenant_id, status);
