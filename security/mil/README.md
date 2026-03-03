# MIL Service v1.0.0 (Dual-mode: sync_http + async_job)

Included:
- OpenAPI YAML: `openapi/mil_openapi_v1.yaml`
- Postgres migrations: `migrations/*.sql`
- TypeScript Fastify skeleton: `src/`
- Worker skeleton: `src/workers/worker.ts`

Env:
- DATABASE_URL
- MIL_ATTESTATION_PRIVATE_KEY_BASE64 (dev signing; replace with HSM/KMS in prod)
- MIL_ATTESTATION_KID (e.g., platform-attest-dev)
- PORT (default 8080)


## Migrations
- 001_init.sql
- 002_tenant_rekey_jobs.sql
- 003_jobs_claim_fields.sql

## Worker
- Set `MIL_WORKER_POLL_MS` (default 1000ms)
- Build then run: `npm run build` and `npm run worker`

- 004_worker_hardening.sql (retry scheduling, lease locking, DLQ)

## Worker hardening (new)
- Retries with exponential backoff + jitter (bounded)
- Lease-based locking via locked_until + reaper
- DLQ quarantine when attempts exceed limit

Env knobs:
- MIL_JOB_MAX_ATTEMPTS (default 8)
- MIL_JOB_LEASE_SECONDS (default 60)
- MIL_JOB_BACKOFF_BASE_MS (default 1000)
- MIL_JOB_BACKOFF_MAX_MS (default 300000)
- MIL_JOB_BACKOFF_JITTER_PCT (default 0.2)
- MIL_JOB_REAPER_MS (default 5000)


## Job Types (v5)
- EVALUATE_TARGET
- TENANT_REKEY
- VERIFY_RANGE
Worker dispatches based on job_type.


## Envelope crypto (v6)
- Set `MIL_MASTER_KEK_BASE64` (base64, >=32 bytes; first 32 used)
- Optional `MIL_DEFAULT_KMS_KEY_ID` (default: kek://default/v1)
Payloads are now encrypted with per-payload DEKs, wrapped by a tenant-scoped KEK derived via HKDF.


## Rekey + Crypto-delete (v7)
- New table: tenant_kek_versions (tenant-scoped KEKs encrypted at rest)
- Crypto-delete: wipes tenant KEK material -> payloads unrecoverable, hash continuity intact
- Rekey (maintenance window): rewraps DEKs for all steps from old key id to new key id (no payload re-encryption)

Env:
- MIL_MASTER_KEK_BASE64 (required)
- MIL_DEFAULT_KMS_KEY_ID (optional)
- MIL_REKEY_BATCH (default 500)
- MIL_REKEY_NEW_KMS_KEY_ID_PREFIX (default kek://tenant)

- 009_rekey_progress_cursor.sql (rekey progress cursor + heartbeat)

## Rekey progress cursor (v8)
- Rekey is resumable via (cursor_evaluation_id, cursor_step_seq)
- `rewrapped_steps` increments; `last_heartbeat` updated each batch
- Worker processes one batch per run; re-enqueue TENANT_REKEY to continue.


## Rekey status endpoint (v9)
- GET /mil/tenant/:tenant_id/rekey/status
- Returns progress, cursor, heartbeat health, and percent_complete (if total_steps_estimate set)
- Flags stalled if RUNNING and heartbeat > 5 minutes old


## Auto stall recovery (v10)
- Worker periodically scans tenant_rekey_jobs RUNNING with stale heartbeat and re-enqueues TENANT_REKEY
- Env: MIL_REKEY_STALL_SECONDS (default 300), MIL_REKEY_RECOVERY_MS (default 15000)
- Writes note into tenant_rekey_jobs.last_error


## Recovery cap (v11)
- Env: MIL_REKEY_MAX_RECOVERIES (default 5)
- If exceeded, tenant_rekey_jobs marked FAILED and tenant unfrozen


## Auto-reschedule on FAILED (v12)
- When a RUNNING rekey exceeds MIL_REKEY_MAX_RECOVERIES, job is marked FAILED and a fresh READY rekey job is created.
- New job consolidates from source_kms_key_ids (old + any prior new) into a fresh key id.
- Tenant is paused (REKEYING_MAINTENANCE) and TENANT_REKEY executor is enqueued automatically.


## Stability mode for auto-reschedule (v13)
- Auto-scheduled rekey reuses existing new_kms_key_id if present.
- Prevents key proliferation and preserves deterministic target key version.
