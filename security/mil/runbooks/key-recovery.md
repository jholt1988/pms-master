# Property Management Suite (PMS) Security Runbook: Tenant Key Recovery

**Owner:** Security Team  
**Last Updated:** 2026-03-12

## Objective
Recover tenant cryptographic operations after catastrophic key loss or compromise when primary key material is unrecoverable from application storage.

## Trigger
- **Security Incident:** Confirmed compromise of an active tenant encryption key.
- **Data Corruption:** `TenantKeyring` key material is irrecoverably corrupted.

---

## Pre-Recovery Checklist
1. [ ] Declare incident and activate incident response.
2. [ ] Isolate affected tenant access if needed.
3. [ ] Restrict KMS/HSM access to authorized recovery operators only.

---

## Recovery Procedure

### Step 1: Restore Key Material from Backup
1. Identify last known-good tenant key ID from backups/logs.
2. Access secure KMS/HSM backup location.
3. Restore key material per KMS/HSM operating procedure.
4. Reinsert restored key in `TenantKeyring` and mark status `ACTIVE`.

### Step 2: Perform Full Rekey (If Key Was Compromised)
If compromise occurred, treat all data encrypted under that key as compromised.
1. Execute key rotation immediately via the **Tenant Key Rotation** runbook.
2. Confirm re-encryption / key re-wrap completion under a new secure key lineage.

### Step 3: Run Data Integrity Audit
1. Execute integrity checks after restore/rekey completion.
2. Validate by decrypting and verifying representative tenant data samples.
3. Compare hashes/checksums against known-good references where available.

### Step 4: Post-Incident Review
1. Conduct root-cause analysis once tenant operations are stable.
2. Implement preventive controls and update relevant runbooks/policies.

---

## Post-Recovery Actions
- **Re-enable tenant access** after integrity and security checks pass.
- **Tenant communication:** Provide a transparent, security-conscious summary of impact and remediation.
- **Evidence retention:** Store timeline, actions, and approver records for audit/compliance.
