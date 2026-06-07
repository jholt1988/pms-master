# Phase 1 Platform Foundation

Date: 2026-06-04

Status: implementation started.

## Scope

Phase 1 establishes the shared platform contracts and primitives needed before broad workflow porting:

- API response and error envelope standard.
- Event envelope standard.
- Idempotency primitive.
- Workflow execution foundation.
- Approval task foundation and first operator UI.
- Audit log use for high-risk decisions.
- OpenAPI-generated frontend client.
- Critical smoke tests.

## Implemented In This Slice

| Deliverable | Status | Implementation |
| --- | --- | --- |
| Contract-first API package | Done | `packages/api-contracts` defines API envelopes, event envelopes, decision records, approval tasks, and idempotency contracts. |
| API error envelope | Done | `GlobalExceptionFilter` now returns canonical `data`, `meta`, and `errors` while preserving legacy error fields during migration. |
| Success envelope helper | Done | `tenant_portal_backend/src/common/api-envelope.ts`. Controllers can adopt this incrementally. |
| Event envelope standard | Done | `tenant_portal_backend/src/common/events/event-envelope.ts` plus `/api/foundation/event-envelope/example`. |
| Idempotency primitive | Done | `IdempotencyService` with reserve/complete/fail contract and `/api/foundation/idempotency/reserve` smoke endpoint. |
| Workflow engine v1 | Existing, retained | `WorkflowEngineService` already persists workflow executions and steps. |
| ApprovalTask model | Existing, retained | Prisma `ApprovalTask` model and `PolicyApprovalService`. |
| ApprovalTask UI | Done | Next.js operator app has an Approvals tab reading `/api/policy/approval-tasks/pending`; approve/reject buttons remain disabled until execution contracts are hardened. |
| Typed API client | Done | OpenAPI generation and `operator_app/src/lib/api/generated/schema.ts`. |
| Critical smoke tests | Done | `pnpm --filter tenant_portal_backend test:foundation` and `test:contracts:operator`. |
| Persistent idempotency | Done | `IdempotencyRecord` Prisma model and PostgreSQL-backed `IdempotencyService`. |
| Opt-in success envelope interceptor | Done | `@UseApiEnvelope()` plus `SuccessEnvelopeInterceptor` wraps migrated routes only. |
| DecisionRecord model | Done | `DecisionRecord` Prisma model and `/api/decisions` read/create routes. |
| Event-envelope audit logging | Done | `AuditLogService.recordEnvelope` accepts canonical event envelope metadata. |
| Seed verification | Done | `pnpm --filter tenant_portal_backend seed:verify:phase1`; requires reachable seeded DB. |
| CI aggregate command | Done | Root `pnpm ci:phase1`; requires reachable DB and `SMOKE_JWT` for golden-path smoke. |

## Migration Rules

- New or migrated endpoints should return `{ data, meta, errors }`.
- Existing endpoints can keep legacy success shapes until migrated, but errors now include the canonical envelope.
- Any state-changing financial, legal, compliance, document, approval, or integration action must include an idempotency key or a domain-specific idempotency guard before production enablement.
- Approval task execution must stay behind workflow/domain contracts; UI can show tasks before enabling approve/reject execution in Next.js.
- Event producers should use `createEventEnvelope` before publishing or recording domain events.

## Remaining Phase 1 Backlog

1. Add migrated success envelopes to the next batch of P0 route controllers.
2. Add domain-level `DecisionRecord` creation to command-center recommendation flows.
3. Wire persistent idempotency into high-risk payment, document, approval, and integration write routes.
4. Run `pnpm ci:phase1` in a seeded CI/staging environment with database access and `SMOKE_JWT`.
