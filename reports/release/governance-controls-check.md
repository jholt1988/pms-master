# Governance Controls Check (Goal C.1)

Date: 2026-03-15  
Scope: Permit/gating controls for PMS release readiness

## Checks performed
1. Reviewed governance target controls from:
   - `clawdbot_remote/governance/Prod-Readiness-Checklist-v1.0.md` (A1/A2/A3)
   - `reports/RELEASE_GO_NO_GO_MERGED.md` governance gate section
2. Reviewed implemented approval/gating flow in backend:
   - `tenant_portal_backend/src/chatbot/ops/approval-runner.ts`
   - `tenant_portal_backend/src/chatbot/shared/approval-schemas.ts`
   - `tenant_portal_backend/prisma/schema.prisma` (`ApprovalTask` model)
3. Assessed control coverage against checklist requirements: permit authority, explicit approval state, and high-risk external gating.

## Evidence
- Governance gate requirements listed but unchecked:
  - `reports/RELEASE_GO_NO_GO_MERGED.md:64-73`
  - `reports/RELEASE_GO_NO_GO_MERGED.md:65` (explicit approved permit)
- Approval task state gating exists for chatbot action runner:
  - manager/admin only: `tenant_portal_backend/src/chatbot/ops/approval-runner.ts:8`
  - execution only from pending: `.../approval-runner.ts:34`
  - decision writes APPROVED/REJECTED: `.../approval-runner.ts:40`
  - terminal execution statuses EXECUTED/FAILED: `.../approval-runner.ts:102,111`
- Approval schema/state machine exists:
  - status enum and actions: `tenant_portal_backend/src/chatbot/shared/approval-schemas.ts:63,70,84`
  - DB model for ApprovalTask lifecycle: `tenant_portal_backend/prisma/schema.prisma:2417-2469`

## Control verdicts
| Control | Verdict | Classification | Notes |
|---|---|---|---|
| Non-dry-run requires explicit permit (A1) | **FAIL** | **Not implemented (system-wide)** | ApprovalTask exists for specific chatbot flows, but no global non-dry-run permit gate was found across mutation surfaces. |
| High-risk external non-dry-run requires stricter state (A2 / Project-Red style gate) | **FAIL** | **Not implemented** | No evidence of risk-tier + external-target gate equivalent to Project-Red. |
| Permit is sole authority for execution (A3) | **PARTIAL** | **Partially implemented** | `ApprovalTask` enforces pending->approved execution for chatbot actions, but not sole authority platform-wide. |
| Canonical permit mode/status re-validation at execution boundary | **PARTIAL** | **Cannot verify fully** | Runner validates state before execution, but no broader permit contract for other services/controllers. |

## Pass/Fail/Risk summary
- Overall: **FAIL (High risk)**
- Rationale: Governance checklist requires permit/gating controls as release-critical; implementation is narrow (chatbot approval path only), not platform-wide.

## Blockers
- **P0**: No platform-wide permit gate that blocks non-approved/non-dry-run external mutations.
- **P1**: No explicit high-risk external action gate (Project-Red equivalent) demonstrated.
- **P1**: Governance checklist items remain unchecked in release gate doc (`RELEASE_GO_NO_GO_MERGED.md:64-73`).

## Recommended actions
1. Implement centralized mutation permit middleware/policy so all high-impact write paths require approved permit context.
2. Add risk classification (`low/med/high`) + target classification (`internal/external`) and enforce stricter state for high-risk external actions.
3. Add execution-time re-validation (status+mode+scope+expiry) for permits in every worker/controller execution boundary.
4. Add release evidence checklist completion links (tests/logs/traces) for each governance control before GO decision.
