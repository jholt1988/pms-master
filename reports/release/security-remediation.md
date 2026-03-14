# Security Remediation Playbook (P0 Hotfix)

Date: 2026-03-15  
Status: **OPEN**  
Release impact: **BLOCKING (NO-GO remains)**

## Objective
Contain and remediate confirmed repository secret exposure without destructive git operations in this lane.

## Confirmed trigger
- `docusign_private_key.pem` committed in plaintext (`-----BEGIN PRIVATE KEY-----` header).
- Tracked env files contain secret values (`ops/.env.*`, `tenant_portal_backend/.env.inspection`).

---

## Immediate response plan (0-4 hours)

### 1) Contain
**Owner:** Security Lead + Repo Admin  
**Actions:**
1. Freeze release and restrict access to impacted credentials.
2. Stop using exposed credentials immediately where possible.
3. Open incident ticket with timestamped evidence links.

**Evidence required:**
- Incident ticket ID
- Timestamp of release freeze decision
- Link to this inventory report

### 2) Rotate/Revoke credentials (manual external actions)
**Owner:** Integration Owner (DocuSign), Platform/Ops, Backend owner

#### 2a. DocuSign keypair (MANDATORY)
- Revoke/delete exposed integration keypair in DocuSign admin portal.
- Generate new private/public keypair.
- Register new public key in DocuSign app/integration.
- Update runtime secret store with new private key (do **not** commit).

**Evidence required:**
- Admin screenshot/audit log showing old key revoked
- New key fingerprint (not key body) recorded
- Successful JWT auth test against new key from secure runtime

#### 2b. Application/env credentials
Rotate all exposed or potentially reused values:
- `JWT_SECRET` (all environments if shared derivation uncertain)
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`

**Evidence required:**
- Secret manager version change IDs
- App deployment IDs consuming new secret versions
- Validation logs confirming old credentials rejected (where applicable)

> Note: Rotation completion cannot be auto-claimed by this agent. External platform access is required.

### 3) Remove exposed secrets from active repo state (non-history rewrite in this lane)
**Owner:** Repo Maintainer

```bash
cd /root/.openclaw/workspace/pms-master

# remove live secret files from tracked state
# (history rewrite intentionally excluded in this lane)
git rm --cached docusign_private_key.pem || true

# optionally remove local copy after secure backup/migration to secret manager
# rm docusign_private_key.pem

# ensure placeholders only for env files or move to *.example variants
# (edit manually to remove real values)
```

**Evidence required:**
- Commit showing secret files removed or sanitized
- PR diff proving no plaintext secrets remain in tracked files

### 4) Add guardrails to prevent reintroduction
**Owner:** DevEx/Platform

- Add deny patterns to `.gitignore`:
  - `*.pem`
  - `*.key`
  - `.env`
  - `.env.*` (except explicit `*.example` policy)
- Enforce secret scanning in pre-commit and CI (details in `security-preventive-controls.md`).

**Evidence required:**
- Merged PR with guardrail configs
- CI run URL showing secret scan pass

---

## Closure checklist (must all be true)
- [ ] Incident ticket created and severity approved by Security Lead.
- [ ] Exposed DocuSign key revoked; replacement key active.
- [ ] `JWT_SECRET`, `STRIPE_WEBHOOK_SECRET`, and `OPENAI_API_KEY` rotated (or formally risk-accepted with expiry plan).
- [ ] `docusign_private_key.pem` removed from tracked repository state.
- [ ] Tracked env files no longer contain live secret values.
- [ ] Pre-commit secret scan enabled and enforced.
- [ ] CI secret scan job required for protected branches.
- [ ] Post-rotation validation logs attached.
- [ ] Security lead sign-off recorded in release dossier.

---

## Draft incident/remediation note (for release dossier)

**Title:** Incident Note — Source-Control Secret Exposure (P0)

On 2026-03-15, plaintext credential material was confirmed in the PMS repository, including a private key file (`docusign_private_key.pem`) and secret-bearing tracked env files. This represents a policy violation and potential credential compromise risk. Release was held at NO-GO pending full remediation.

Immediate containment actions were initiated: release freeze, credential rotation/revocation workflow, and repository cleanup to remove/sanitize tracked secret material. Preventive controls (pre-commit and CI secret scanning, ignore policies, and branch protections) are being enforced to prevent recurrence.

**Current status:** Open until all rotation, validation, and control evidence is attached and signed off by Security Lead.

---

## Out-of-scope in this lane
- Git history rewrite/purge is intentionally **not executed here** due task constraints. If required by policy, perform as a separately approved operation with repository admins and downstream clone invalidation plan.
