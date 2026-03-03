-- 001_init.sql (PostgreSQL)
CREATE TABLE IF NOT EXISTS tenant_crypto_state (
  tenant_id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('ACTIVE','REKEY_REQUIRED','REKEY_OVERDUE','REKEYING_MAINTENANCE','CRYPTO_DELETED')),
  kms_key_id TEXT NOT NULL,
  key_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rekey_deadline TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_chain_head (
  tenant_id TEXT PRIMARY KEY,
  head_hash TEXT NOT NULL DEFAULT 'GENESIS',
  sequence_no BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS model_lineage_events (
  tenant_id TEXT NOT NULL,
  evaluation_id UUID NOT NULL,
  sequence_no BIGINT NOT NULL,
  chain_id TEXT NOT NULL DEFAULT 'propertyos-lineage-v1',
  prev_hash TEXT NOT NULL,
  record_hash TEXT NOT NULL,
  trace_root_hash TEXT NOT NULL,
  trace_steps INT NOT NULL,
  inputs_digest TEXT NOT NULL,
  outputs_digest TEXT NOT NULL,
  audit_digest TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, sequence_no),
  UNIQUE (tenant_id, evaluation_id),
  UNIQUE (tenant_id, record_hash)
);

CREATE TABLE IF NOT EXISTS model_lineage_steps (
  tenant_id TEXT NOT NULL,
  evaluation_id UUID NOT NULL,
  step_seq INT NOT NULL,
  step_type TEXT NOT NULL,
  chain_id TEXT NOT NULL DEFAULT 'propertyos-lineage-v1',
  payload_digest TEXT NOT NULL,
  payload_ciphertext BYTEA NOT NULL,
  tenant_kms_key_id TEXT NOT NULL,
  dek_wrapped BYTEA NOT NULL,
  nonce BYTEA NOT NULL,
  cipher TEXT NOT NULL,
  enc_version INT NOT NULL DEFAULT 1,
  prev_step_hash TEXT NOT NULL,
  step_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, evaluation_id, step_seq),
  UNIQUE (tenant_id, evaluation_id, step_hash)
);

CREATE TABLE IF NOT EXISTS mil_jobs (
  job_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  evaluation_id UUID NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','BLOCKED')),
  mode TEXT NOT NULL CHECK (mode IN ('sync_http','async_job')),
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_lineage_events_eval ON model_lineage_events (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_lineage_steps_eval ON model_lineage_steps (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_jobs_eval ON mil_jobs (evaluation_id);

CREATE TABLE IF NOT EXISTS mil_attestation_keys (
  kid TEXT PRIMARY KEY,
  alg TEXT NOT NULL CHECK (alg IN ('Ed25519')),
  public_key_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at TIMESTAMPTZ NULL
);
