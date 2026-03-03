# Runbook: Tenant Key Recovery

**Objective:** To restore cryptographic operations for a tenant in the event of a catastrophic key loss or compromise where the primary keys are unrecoverable from the database.

**Trigger:**
-   **Security Incident:** Confirmed compromise of a tenant's active encryption key.
-   **Data Corruption:** The `TenantKeyring` table or its key material has been irrecoverably corrupted.

---

### Pre-Recovery Checklist
1.  [ ] **Declare Incident:** An official incident is declared, and the incident response team is activated.
2.  [ ] **Isolate Tenant (if necessary):** Temporarily disable application access for the affected tenant to prevent further data corruption.
3.  [ ] **Secure Key-Management-Service (KMS) Access:** Ensure only authorized personnel have access to the underlying KMS where key backups are stored.

---

### Recovery Procedure

#### Step 1: Restore Key from KMS Backup
1.  Identify the last known-good key ID for the tenant from database backups or logs.
2.  Access the secure KMS or hardware security module (HSM) where master keys are backed up.
3.  Following the KMS's specific procedures, restore the tenant's key material.
4.  Manually re-insert the restored key into the `TenantKeyring` table in the database, ensuring it is marked as `ACTIVE`.

#### Step 2: Full Data Rekey (if key was compromised)
*If the key was compromised, all data encrypted with it must be considered compromised.* A full rekey is mandatory.
1.  Follow the **Key Rotation Runbook** immediately to generate a new key and kick off a rekey job.
2.  This will re-encrypt all of the tenant's data using a new, secure key, invalidating the compromised key.

#### Step 3: Data Integrity Audit
1.  Once the key is restored and (if necessary) the data is re-keyed, run a data integrity audit.
2.  This involves custom scripts to check for data corruption by attempting to decrypt and validate a sample of the tenant's data.
3.  Compare application-level checksums or hashes, if available, against pre-incident values.

#### Step 4: Post-Mortem
1.  Once the tenant is fully operational, conduct a post-mortem analysis to determine the root cause of the key loss or compromise.
2.  Implement preventative measures to avoid recurrence.

---

### Post-Recovery
-   **Re-enable Tenant Access:** Once the key is restored and data integrity is verified, re-enable application access.
-   **Communicate with Tenant:** Provide a transparent (but security-conscious) summary of the event and the restorative actions taken.
