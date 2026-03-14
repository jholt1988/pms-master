# Security Policy Controls Check (Goal C.3)

Date: 2026-03-15  
Scope: Secret handling policy and schema/contract policy controls

## Checks performed
1. Reviewed required security policy gates:
   - `reports/RELEASE_GO_NO_GO_MERGED.md:67,71-73`
2. Checked repo for secret handling hygiene:
   - key material in repository root
   - `.gitignore` and env template posture
3. Reviewed schema/validation controls in backend:
   - DTO/class-validator and zod schema use
   - Prisma schema constraints for critical records
4. Reviewed security baseline warnings from production-readiness audit document.

## Evidence
- Release gate explicitly requires secret handling and schema controls:
  - `reports/RELEASE_GO_NO_GO_MERGED.md:67,71-73`
- **Critical secret exposure in repository**:
  - plaintext private key committed: `docusign_private_key.pem:1` (`-----BEGIN PRIVATE KEY-----`)
  - corresponding public key present: `docusign_public_key.pem:1`
- Secret file exclusion is incomplete for key artifacts:
  - `.gitignore` covers `.env*` and ops env files, but no explicit `*.pem` exclusion (`.gitignore:1-52`)
- Example env promotes secret placeholders (good baseline):
  - `ops/.env.prod.example:1-20`
- Schema and input validation controls exist in parts:
  - Approval action payload schemas: `tenant_portal_backend/src/chatbot/shared/approval-schemas.ts:63-91`
  - Tool schemas include typed inputs (incl optional idempotency key): `tenant_portal_backend/src/chatbot/shared/tool-schemas.ts:105`
  - DTO validators broadly used in controllers/services (class-validator imports across modules)
  - Prisma unique constraints for event dedupe records: `tenant_portal_backend/prisma/schema.prisma:909-923,1564-1573`
- Security baseline document flags unresolved high-risk items:
  - not production ready: `docs/implementation/production-readiness-audit.md:6`
  - no input validation / authorization gaps in audit scope: `.../production-readiness-audit.md:20,57`

## Control verdicts
| Control | Verdict | Classification | Notes |
|---|---|---|---|
| Secret handling policy (no plaintext secrets in repo/payloads) | **FAIL** | **Not implemented (repo hygiene)** | Private key material is committed in-repo; this is a direct policy violation and immediate security risk. |
| Schema/contract validation for requests/events | **PARTIAL PASS** | **Partially implemented** | DTO/zod coverage exists in many modules; no single canonical release-enforced schema gate across all mutation/event boundaries found. |
| Notion/schema contract checks | **NOT APPLICABLE (current evidence set)** | **Not applicable** | Notion automation/schema verification artifacts from the governance checklist are not present in this PMS repo scope. |
| Secret scanning / preventative controls in CI | **CANNOT VERIFY** | **Cannot verify** | No direct CI secret-scan evidence inspected in this pass. |

## Pass/Fail/Risk summary
- Overall: **FAIL (Critical risk)**
- Rationale: Active plaintext private key in repository is an immediate blocker regardless of partial schema validation progress.

## Blockers
- **P0**: Private key checked into repository (`docusign_private_key.pem:1`).
- **P1**: No evidence of mandatory secret-scanning gate preventing key material commits.
- **P1**: Schema policy enforcement appears fragmented; no unified canonical contract gate at release boundary.

## Recommended actions
1. **Immediate incident response:** rotate the exposed DocuSign keypair, revoke old credentials, and audit usage logs.
2. Remove key material from repository history and add guardrails:
   - add `*.pem`, `*.key`, and credential patterns to `.gitignore`
   - enable pre-commit + CI secret scanning (e.g., gitleaks/trufflehog)
3. Add release-blocking policy checks:
   - secret scan must pass
   - schema contract checks must pass for critical request/event interfaces
4. Consolidate schema governance with explicit canonical contracts for critical APIs/events and enforce in CI.
