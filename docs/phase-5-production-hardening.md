# Phase 5: Production Hardening

Date: 2026-06-05

Scope: Kansas private beta launch for the decision-driven property management SaaS.

## Goals

- Prepare the platform for real customer data.
- Reduce security, privacy, compliance, and operational risk before paid private beta.
- Make production-readiness checks repeatable in CI and runbooks.

## Hardening Workstreams

| Workstream | Gate | Status |
| --- | --- | --- |
| Operator security headers | Next.js app emits CSP, frame, content-type, referrer, and permissions headers. | Started |
| MFA enforcement | Operator/admin roles require MFA before production access. | Started |
| PII handling | Define retention, redaction, export/delete, log-scrubbing, and support-access policy. | Started |
| Dependency vulnerability cleanup | `pnpm audit` policy and tracked exceptions. | Started |
| Load tests | Search, payments, work orders, command center, and operator workflow read models have baseline tests. | Started |
| Webhook replay/idempotency | Stripe, DocuSign, and QuickBooks webhook replay tests prove duplicate-safe processing. | Started |
| Backup/restore drill | Document and verify database restore against a non-production environment. | Started |
| Monitoring and alerts | Health, metrics, background jobs, webhook failures, queue lag, auth failures, and AI gateway errors are observable. | Started |
| Accessibility pass | Critical operator flows pass keyboard navigation, focus, labels, contrast, and error-state checks. | Started |

## Implemented Slice 1: Operator Security Headers

Files:

- `operator_app/next.config.ts`
- `operator_app/scripts/check-security-headers.mjs`
- `operator_app/package.json`

Headers:

- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

Verification:

```bash
pnpm --filter operator_app type-check
pnpm --filter operator_app build
pnpm --filter operator_app security:headers
```

`security:headers` expects the operator app to be running and checks `OPERATOR_APP_URL` or `http://127.0.0.1:3000` by default.

## Implemented Slice 2: Operator MFA Enforcement Gate

Files:

- `tenant_portal_backend/src/auth/auth.service.ts`
- `tenant_portal_backend/src/auth/auth.service.spec.ts`

Behavior:

- `AUTH_REQUIRE_OPERATOR_MFA=true` blocks `ADMIN` and `PROPERTY_MANAGER` login when MFA is not enrolled.
- The same flag blocks refresh-token rotation for existing operator sessions that do not have MFA enrolled.
- Tenant refresh/login behavior is unchanged by the operator MFA gate.
- Operators with MFA enabled must still pass the existing MFA code challenge before tokens are issued.

Verification:

```bash
pnpm --filter tenant_portal_backend build
pnpm --filter tenant_portal_backend exec jest --config jest.config.js --selectProjects unit --runTestsByPath src/auth/auth.service.spec.ts --runInBand --detectOpenHandles
```

## Implemented Slice 3: Webhook Replay And Idempotency Coverage

Files:

- `tenant_portal_backend/src/payments/stripe.service.spec.ts`
- `tenant_portal_backend/src/esignature/esignature-webhook-signature.spec.ts`
- `tenant_portal_backend/src/quickbooks/quickbooks-minimal.service.spec.ts`
- `tenant_portal_backend/src/quickbooks/quickbooks-webhook.controller.spec.ts`

Coverage:

- Stripe duplicate event IDs are reserved before side effects and replayed connected-account updates do not mutate organizations again.
- DocuSign duplicate provider events are deduped from envelope metadata before participant/document/notification side effects.
- QuickBooks webhook signatures are HMAC-verified when configured.
- QuickBooks duplicate event keys are acknowledged with `deduped: true`.
- QuickBooks controller preserves raw body signature validation and returns duplicate acknowledgements to avoid provider retry loops.

Verification:

```bash
pnpm --filter tenant_portal_backend exec jest --config jest.config.js --selectProjects unit --runTestsByPath src/payments/stripe.service.spec.ts src/esignature/esignature-webhook-signature.spec.ts src/quickbooks/quickbooks-minimal.service.spec.ts src/quickbooks/quickbooks-webhook.controller.spec.ts --runInBand
```

## Implemented Slice 4: Operator Accessibility Smoke Checks

Files:

- `operator_app/src/app/read-only-shell.tsx`
- `operator_app/scripts/check-accessibility-smoke.mjs`
- `operator_app/package.json`

Coverage:

- Operator navigation, backend token input, refresh control, and major workflow sections have explicit accessible landmarks or labels.
- Critical workflow controls in approvals, decision actions, applications, lease drafting, maintenance dispatch, inspection estimates, renewals, and owner statements have accessible names beyond placeholder text.
- Workflow focus state remains visible as text for screen-reader and keyboard users.
- Static smoke check fails fast when required accessibility markers are removed from the operator shell.

Verification:

```bash
pnpm --filter operator_app type-check
pnpm --filter operator_app build
pnpm --filter operator_app accessibility:smoke
```

## Implemented Slice 5: PII Audit Log Scrubbing

Files:

- `tenant_portal_backend/src/shared/pii-redaction.ts`
- `tenant_portal_backend/src/shared/audit-log.service.ts`
- `tenant_portal_backend/src/shared/audit-log.service.spec.ts`
- `docs/phase-5-pii-handling-policy.md`

Coverage:

- Audit metadata is redacted before both Nest logger output and encrypted audit-log persistence.
- Event-envelope audit records redact nested payload PII and replay-sensitive `idempotencyKey` values.
- Sensitive key names and common standalone values for email, phone, SSN, and bearer authorization headers are scrubbed recursively.
- Private beta PII policy defines log rules, support-access expectations, retention posture, and future AI/request logging hardening.

Verification:

```bash
pnpm --filter tenant_portal_backend exec jest --config jest.config.js --selectProjects unit --runTestsByPath src/shared/audit-log.service.spec.ts --runInBand
pnpm --filter tenant_portal_backend build
```

## Implemented Slice 6: Backup And Restore Drill Runbook

Files:

- `docs/phase-5-backup-restore-drill.md`
- `scripts/check-backup-restore-runbook.js`
- `package.json`

Coverage:

- Defines the private beta backup/restore production gate, initial RPO/RTO targets, and monthly drill cadence.
- Provides a managed snapshot path for hosted PostgreSQL providers.
- Provides a local Compose logical backup path using `pg_dump`, isolated restore database creation, and `pg_restore`.
- Includes non-destructive schema, migration, and core table verification queries.
- Defines backend restore smoke checks, RTO/RPO calculation, cleanup, and evidence template.
- Adds `pnpm ops:backup-restore:check` so CI can verify that required runbook sections and commands remain present.

Verification:

```bash
pnpm ops:backup-restore:check
```

## Implemented Slice 7: Dependency Audit Policy And Exceptions

Files:

- `docs/phase-5-dependency-audit-policy.md`
- `docs/security/dependency-audit-exceptions.json`
- `schemas/dependency-audit-exceptions.schema.json`
- `scripts/check-dependency-audit-exceptions.js`
- `package.json`

Coverage:

- Defines private beta dependency audit release gate, severity policy, review cadence, and evidence template.
- Adds required commands for production and full workspace scans.
- Adds a tracked exception registry for advisories that cannot be remediated immediately.
- Enforces exception fields, stable IDs, owners, affected workspaces, advisory IDs, expiry dates, and high/critical expiry windows.
- Adds `pnpm security:deps:exceptions` for CI-friendly validation and `pnpm security:deps:audit` for production dependency scanning.

Verification:

```bash
pnpm security:deps:exceptions
```

Note: `pnpm audit --json` was attempted locally during this slice but exceeded a two-minute command timeout. The policy now requires the production audit command to run in CI or another shell with sufficient timeout and release evidence capture.

## Implemented Slice 8: Monitoring Alert Coverage

Files:

- `ops/monitoring/alert-rules.yml`
- `docs/phase-5-monitoring-alerts.md`
- `scripts/check-monitoring-alerts.js`
- `package.json`

Coverage:

- Adds Phase 5 gate alerts for database health, Redis health, webhook endpoint failures, auth failure spikes, AI gateway 5xx failures, queue/worker failures, and event bus processing failures.
- Keeps existing broad alerts for HTTP error rate, latency, AI service errors, background job failures, and health checks.
- Documents metrics sources, production gate, incident runbooks, and verification commands.
- Adds `pnpm ops:monitoring:check` to verify required alert and runbook coverage.

Verification:

```bash
pnpm ops:monitoring:check
```

## Implemented Slice 9: Load Test Baseline Harness

Files:

- `scripts/phase5-load-baseline.mjs`
- `scripts/check-phase5-load-baseline.js`
- `docs/phase-5-load-test-baseline.md`
- `package.json`

Coverage:

- Adds a dependency-free Node load baseline harness for Phase 5 read models.
- Covers command-center snapshot, decision queue, daily briefing, workflow inventory, payment workbench, delinquency queue, and maintenance dispatch workbench.
- Requires `LOAD_TEST_JWT` or `SMOKE_JWT`, preserving auth for staging/local load tests.
- Supports configurable base URL, concurrency, iterations, p95 latency threshold, error-rate threshold, and JSON output path.
- Adds static coverage check to keep the required endpoint list and runbook in sync.

Verification:

```bash
pnpm load:phase5:check
```

Live baseline command requires a seeded API and operator JWT:

```bash
LOAD_TEST_BASE_URL="https://staging.example.com" LOAD_TEST_JWT="<operator-jwt>" pnpm load:phase5
```

## Next Recommended Slice

1. Add release evidence checklist that ties Phase 5 checks into a single private beta gate.
2. Add request/response logging redaction checks when HTTP logging middleware is introduced.
3. Capture first staging load-test evidence after seeded staging credentials are available.
