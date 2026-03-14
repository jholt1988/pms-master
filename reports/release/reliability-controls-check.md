# Reliability Controls Check (Goal C.2)

Date: 2026-03-15  
Scope: Idempotency, replay protection, locking/concurrency, and audit reliability controls

## Checks performed
1. Reviewed release governance expectations:
   - `reports/RELEASE_GO_NO_GO_MERGED.md:67-70`
2. Reviewed reliability findings baseline:
   - `docs/implementation/production-readiness-audit.md` (NOT PRODUCTION READY + reliability/security gaps)
3. Inspected implemented services for concrete guardrails:
   - Stripe webhook path (`tenant_portal_backend/src/payments/stripe.service.ts` + Prisma schema)
   - E-sign webhook path (`tenant_portal_backend/src/esignature/esignature.service.ts`)
   - Approval execution state machine (`tenant_portal_backend/src/chatbot/ops/approval-runner.ts`)
   - Audit sink behavior (`tenant_portal_backend/src/shared/audit-log.service.ts`)

## Evidence
- Release gate requires idempotency/replay/locking/audit:
  - `reports/RELEASE_GO_NO_GO_MERGED.md:67-70`
- Existing global audit doc flags major reliability risks:
  - not production ready: `docs/implementation/production-readiness-audit.md:6`
  - no transactional guarantees: `.../production-readiness-audit.md:19`
  - no DB transactions: `.../production-readiness-audit.md:28,45`
  - no dead letter queue: `.../production-readiness-audit.md:54`
- Stripe webhook replay/idempotency controls implemented:
  - webhook secret required: `tenant_portal_backend/src/payments/stripe.service.ts:304-305`
  - dedupe by eventId: `.../stripe.service.ts:321-324`
  - durable event log insert: `.../stripe.service.ts:382`
  - schema unique constraint for eventId: `tenant_portal_backend/prisma/schema.prisma:1564-1573`
  - ledger dedupe by sourceEventId unique: `.../schema.prisma:909-923`
- E-sign webhook replay/signature gaps:
  - signature validation TODO: `tenant_portal_backend/src/esignature/esignature.service.ts:927`
  - webhook processing present but no replay key/TTL check seen in handler: `.../esignature.service.ts:914-1004`
- Approval state-machine guard exists for one flow:
  - only pending executes: `tenant_portal_backend/src/chatbot/ops/approval-runner.ts:34`
- Audit service is log-only (no durable append-only DB sink yet):
  - `tenant_portal_backend/src/shared/audit-log.service.ts:21-22`

## Control verdicts
| Control | Verdict | Classification | Notes |
|---|---|---|---|
| Idempotency (webhook/event) | **PARTIAL PASS** | **Partially implemented** | Strong for Stripe (`eventId` + DB unique). Not generalized across all event ingress paths. |
| Replay protection | **PARTIAL FAIL** | **Partially implemented / Not implemented** | Stripe has replay guard; e-signature webhook lacks signature+replay protection and explicitly marks TODO. |
| Concurrency locking | **FAIL** | **Cannot verify / Not implemented** | No explicit distributed locking/composite lock strategy found for critical multi-worker flows in reviewed paths. |
| State machine discipline | **PARTIAL PASS** | **Partially implemented** | ApprovalTask enforces pending gate; coverage not universal across all mutable workflows. |
| Audit reliability | **PARTIAL FAIL** | **Partially implemented** | Structured logs exist, but dedicated durable append-only audit persistence is pending. |

## Pass/Fail/Risk summary
- Overall: **FAIL (High risk)**
- Rationale: Some controls are good in isolated paths (Stripe), but release-critical guardrails are inconsistent and missing in other ingress flows.

## Blockers
- **P0**: E-sign webhook lacks signature validation and replay-hardening (`esignature.service.ts:927`).
- **P1**: No verified platform-wide locking strategy for concurrency-sensitive operations.
- **P1**: Audit trail is not durably persisted by default (`audit-log.service.ts:21-22`).
- **P1**: Reliability baseline document still marks system not production ready (`production-readiness-audit.md:6`).

## Recommended actions
1. Add signature verification + replay-key dedupe for e-sign/webhook ingress (match Stripe pattern: unique event IDs + durable record + reject duplicate).
2. Introduce explicit distributed locking for concurrency-sensitive workflows (scheduler/webhook workers/job runners).
3. Promote audit sink from log-only to append-only database/event-store persistence with retention/immutability policy.
4. Add reliability control tests (duplicate webhook, retry storms, concurrent workers) and link evidence in release gate.
