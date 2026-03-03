-- 012_rekey_source_keys.sql
-- Allows a rekey job to consolidate from multiple prior key ids into a fresh key id.

ALTER TABLE tenant_rekey_jobs
  ADD COLUMN IF NOT EXISTS source_kms_key_ids TEXT[] NULL;
