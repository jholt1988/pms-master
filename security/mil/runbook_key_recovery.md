# Runbook: Key Recovery

**Owner:** Security Team
**Last Updated:** 2026-03-02

## Overview

This runbook covers the scenarios and procedures for recovering from failures during the tenant key lifecycle, primarily focusing on the `TENANT_REKEY` process.

## Scenarios

### 1. Rekey Job is Stalled

-   **Detection:** A `RUNNING` rekey job has a `last_heartbeat` older than `MIL_REKEY_STALL_SECONDS` (default: 5 minutes). This can be monitored via the status endpoint: `GET /mil/tenant/:tenant_id/rekey/status`.
-   **Automatic Recovery:** The MIL worker will automatically detect the stall and re-enqueue the `TENANT_REKEY` job. The `last_error` field on the job will be updated with a note about the recovery.
-   **Manual Intervention:** If automatic recovery fails repeatedly, investigate the worker logs for underlying issues (e.g., database connectivity, permissions).

### 2. Rekey Job has FAILED

-   **Detection:** A rekey job's status is `FAILED`. This occurs after `MIL_REKEY_MAX_RECOVERIES` (default: 5) has been exceeded.
-   **Automatic Recovery:** The system is designed for self-healing. When a job fails, a new `TENANT_REKEY` job is automatically created and enqueued. This new job will pick up where the last one left off, using the same target key to ensure consistency. The tenant remains in `REKEYING_MAINTENANCE` mode throughout this process.
-   **Manual Intervention:** If a rekey job fails *repeatedly* across multiple automatic reschedules, this indicates a persistent underlying problem that automated recovery cannot solve.
    1.  **Investigate:** Check worker logs and database state for the root cause.
    2.  **Escalate:** Contact the on-call engineer if the cause is not immediately apparent.
    3.  **Do Not Manually Delete Keys:** The system is designed to handle key lineage. Manual deletion can lead to orphaned data that is permanently unrecoverable.

### 3. "Crypto-Delete" (Data Destruction)

This is a **destructive** action and should not be considered a "recovery" path.

-   **Purpose:** To render a tenant's encrypted data permanently unrecoverable in response to a formal data deletion request (e.g., GDPR Right to be Forgotten).
-   **Action:** The `crypto_delete` endpoint is called for a specific tenant.
-   **Mechanism:** This action destroys the tenant's Key Encryption Keys (KEKs). Without the KEKs, the Data Encryption Keys (DEKs) used to encrypt the actual payloads cannot be unwrapped.
-   **Result:** Encrypted payloads become useless noise. The hashes and metadata remain for continuity, but the sensitive data is gone forever.
-   **Irreversibility:** This action is **permanent and cannot be undone.**

## Key Environment Variables
-   `MIL_REKEY_MAX_RECOVERIES`: Controls how many times the system will try to auto-recover a stalled job before marking it as failed (default: 5).
-   `MIL_JOB_LEASE_SECONDS`: The lock timeout on a job to prevent multiple workers from processing it simultaneously (default: 60).
