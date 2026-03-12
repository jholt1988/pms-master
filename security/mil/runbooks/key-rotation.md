# Property Management Suite (PMS) Security Runbook: Tenant Key Rotation

**Owner:** Security Team  
**Last Updated:** 2026-03-12

## Objective
Securely rotate a tenant Key Encryption Key (KEK) and re-wrap all tenant Data Encryption Keys (DEKs) with no tenant-facing downtime.

## Trigger
- **Scheduled:** Quarterly rotation per security policy.
- **Ad-hoc:** Suspected or confirmed key compromise.

---

## Pre-Rotation Checklist
1. [ ] Confirm system health (backend, MIL worker, database).
2. [ ] Verify monitoring and alerting coverage for rekey jobs.
3. [ ] Notify operations and on-call stakeholders.

---

## Rotation Procedure

### Step 1: Initiate Rekey Job
1. Create a `TENANT_REKEY` job for the target tenant.
2. System generates a new `new_kms_key_id`.
3. Tenant enters `REKEYING_MAINTENANCE` mode to pause sensitive operations.

### Step 2: Monitor Progress
1. Track progress at: `GET /mil/tenant/:tenant_id/rekey/status`.
2. Verify:
   - `percent_complete` is advancing
   - `last_heartbeat` is current
   - `last_error` is empty or expected

### Step 3: Handle Failures and Stalls
1. If heartbeat age exceeds `MIL_REKEY_STALL_SECONDS` (default: 300s), worker attempts automatic recovery.
2. Auto-recovery attempts are capped by `MIL_REKEY_MAX_RECOVERIES` (default: 5).
3. If cap is exceeded, job status transitions to `FAILED`.

### Step 4: Automatic Reschedule on Failure
1. On permanent failure, system creates and enqueues a new `TENANT_REKEY` job.
2. New job targets the same `new_kms_key_id` to preserve deterministic lineage.

### Step 5: Completion
1. Once rekey finishes, tenant exits `REKEYING_MAINTENANCE` mode.
2. Previous KEK is marked superseded and retained for audit history.

---

## Rollback / Abort Guidance
- If failures recur, inspect worker logs and job metadata before intervention.
- To abort an in-flight failing job, use platform cancellation controls.
- Do **not** manually delete keys; manual deletion can create irreversible orphaned ciphertext.

---

## Key Environment Variables
- `MIL_REKEY_BATCH`: Keys processed per batch (default: 500).
- `MIL_REKEY_STALL_SECONDS`: Stall threshold in seconds (default: 300).
- `MIL_REKEY_MAX_RECOVERIES`: Max auto-recovery attempts (default: 5).
