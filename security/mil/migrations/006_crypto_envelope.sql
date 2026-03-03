-- 006_crypto_envelope.sql
-- No schema changes required for envelope crypto (we already have nonce + dek_wrapped + cipher + enc_version).
-- This migration is a marker for versioning and (optionally) ensures enc_version default is >= 2 for new rows.

ALTER TABLE model_lineage_steps
  ALTER COLUMN enc_version SET DEFAULT 2;
