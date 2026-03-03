-- 007_tenant_keyring.sql
-- Tenant-scoped KEK registry that enables crypto-delete and re-key without breaking hash continuity.
-- The tenant KEK is stored encrypted at rest under a platform master key (MIL_MASTER_KEK_BASE64),
-- and is referenced by kms_key_id (acts as key version identifier).

CREATE TABLE IF NOT EXISTS tenant_kek_versions (
  tenant_id TEXT NOT NULL,
  kms_key_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','RETIRED','DELETED')),
  kek_ciphertext BYTEA NULL, -- null when DELETED
  kek_nonce BYTEA NULL,      -- null when DELETED
  kek_cipher TEXT NOT NULL DEFAULT 'AES-256-GCM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at TIMESTAMPTZ NULL,
  deleted_at TIMESTAMPTZ NULL,
  PRIMARY KEY (tenant_id, kms_key_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_kek_active ON tenant_kek_versions (tenant_id, status);
