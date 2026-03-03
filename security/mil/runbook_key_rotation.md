# Runbook: Key Rotation

**Owner:** Security Team
**Last Updated:** 2026-03-02

## Overview

This runbook details the process for rotating a tenant's Key Encryption Key (KEK). This is a maintenance operation that re-wraps all of a tenant's Data Encryption Keys (DEKs) with a new KEK. The underlying data is not re-encrypted.

## Trigger

-   **Scheduled:** Performed quarterly as part of security best practices.
-   **Ad-hoc:** Required in response to a suspected or confirmed key compromise.

## Process

1.  **Initiate Rekey Job:**
    -   A `TENANT_REKEY` job is created for the target tenant.
    -   The system automatically generates a new `new_kms_key_id` for the tenant.
    -   The tenant's status is set to `REKEYING_MAINTENANCE` to pause sensitive operations.

2.  **Monitor Progress:**
    -   The rekeying process happens in batches, managed by the MIL worker.
    -   Progress can be monitored via the status endpoint: `GET /mil/tenant/:tenant_id/rekey/status`.
    -   Check the `percent_complete` and `last_heartbeat` to ensure the job is not stalled.

3.  **Handle Failures & Stalls:**
    -   The system has built-in stall recovery. If a job's heartbeat is older than `MIL_REKEY_STALL_SECONDS` (default: 5 minutes), the worker will attempt to re-enqueue the job.
    -   The number of recovery attempts is capped by `MIL_REKEY_MAX_RECOVERIES` (default: 5).
    -   If the recovery cap is exceeded, the job is marked `FAILED`.

4.  **Automatic Reschedule on Failure:**
    -   If a rekey job fails permanently, the system automatically creates a *new* `TENANT_REKEY` job to ensure the process completes.
    -   This new job will attempt to re-wrap all keys to the same `new_kms_key_id` that was generated in the first step, ensuring a deterministic outcome.

5.  **Completion:**
    -   Once the rekey job is complete, the tenant's status is cleared from `REKEYING_MAINTENANCE`.
    -   The old KEK version is marked as superseded but is retained for historical purposes.

## Environment Variables
-   `MIL_REKEY_BATCH`: Number of keys to process per batch (default: 500).
-   `MIL_REKEY_STALL_SECONDS`: Time before a job is considered stalled (default: 300).
-   `MIL_REKEY_MAX_RECOVERIES`: Max auto-recovery attempts (default: 5).
