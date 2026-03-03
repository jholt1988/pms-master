# Runbook: Tenant Key Rotation

**Objective:** To securely rotate the master encryption key for a specific tenant, ensuring all their sensitive data is re-encrypted with the new key without downtime.

**Trigger:**
-   **Scheduled:** As per security policy (e.g., every 90 days).
-   **On-demand:** In response to a potential, non-critical security event.

---

### Pre-Rotation Checklist
1.  [ ] **Confirm System Health:** Ensure all relevant services (backend, MIL worker, database) are operational.
2.  [ ] **Verify Monitoring:** Check that monitoring and alerting for the re-keying job are active.
3.  [ ] **Notify Stakeholders:** Inform the operations team about the scheduled rotation.

---

### Rotation Procedure

#### Step 1: Generate New Key
1.  Access the MIL service administrative endpoint or CLI tool.
2.  Execute the `generate-new-key` command for the target `tenantId`.
    ```bash
    # Example CLI command
    mil-cli tenants keys create --tenant-id "tenant-abc-123"
    ```
3.  **Expected Outcome:** A new key is generated in the `TenantKeyring` table for the tenant and marked as `PENDING`. The existing key remains `ACTIVE`.

#### Step 2: Initiate Rekey Job
1.  Execute the `start-rekey-job` command for the target `tenantId`.
    ```bash
    # Example CLI command
    mil-cli tenants rekey start --tenant-id "tenant-abc-123"
    ```
2.  **Expected Outcome:** A new `RekeyJob` is created in the database. The MIL worker will claim this job and begin re-encrypting all data associated with the tenant.

#### Step 3: Monitor Rekey Job
1.  Use the monitoring dashboard or MIL CLI to track the job's progress.
    ```bash
    # Example CLI command
    mil-cli tenants rekey status --job-id "job-xyz-789"
    ```
2.  **Metrics to watch:**
    -   `items_rekeyed` (should be increasing)
    -   `last_error` (should be null)
    -   `status` (should be `IN_PROGRESS`)

#### Step 4: Finalize Rotation
1.  Once the rekey job completes successfully, the MIL worker will automatically perform the final key swap.
2.  **Expected Outcome:**
    -   The new key's status is set to `ACTIVE`.
    -   The old key's status is set to `ARCHIVED`.
    -   All new encryption operations for the tenant will use the new key.

---

### Rollback Procedure
-   If the rekey job fails repeatedly, investigate the `last_error` field.
-   The system is designed to be resilient. The old key remains `ACTIVE` until the job is fully complete, so read/write operations will not fail during the process.
-   To abort a failing job, use the `cancel-rekey-job` command. The new key will be deleted, and the old key will remain active.
