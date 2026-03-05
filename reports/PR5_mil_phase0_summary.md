# PR5 — MIL Phase 0 Wrapper/Audit Hardening Summary

## Scope completed
Executed hardening work in `tenant_portal_backend` for MIL Phase 0 wrapper + audit integration, feature-flag wiring, and crypto behavior validation.

## What was implemented

### 1) Feature flags wired (default-safe)
Added `MilFeatureFlagsService` (`src/mil/mil-feature-flags.service.ts`) with explicit booleans:
- `MIL_WRAPPER_ENABLED` (default: `false`)
- `MIL_ENCRYPT_AT_REST_ENABLED` (default: `false`)
- `MIL_AUDIT_PERSIST_ENABLED` (default: `false`)

Rationale: default-off avoids accidental rollout of policy/audit enforcement and DB-backed persistence in environments not fully prepared.

Also documented these in `.env.example`.

---

### 2) Hardened MIL wrapper/audit integration
Updated `src/mil/mil-security-audit-wrapper.service.ts`:

- Injected and used feature flags service.
- Added wrapper guardrails:
  - `assertAccess(...)` becomes no-op when `MIL_WRAPPER_ENABLED=false`.
  - `recordModelInvocation(...)` becomes no-op when wrapper disabled.
- Added explicit `encryptPayload(...)` / `decryptPayload(...)` wrapper methods:
  - Require `MIL_ENCRYPT_AT_REST_ENABLED=true`.
  - Enforce access policy before calling `MilService` crypto operations.
- Hardened audit path failure handling:
  - `auditLogService.record(...)` wrapped in try/catch.
  - DB-backed sinks (`milAuditEventService`, `securityEventsService`) run only when `MIL_AUDIT_PERSIST_ENABLED=true`.
  - Individual sink failures are logged as warnings and do not crash main flow.

This makes audit integration more resilient and prevents non-critical audit sink outages from breaking model calls.

---

### 3) Module wiring
Updated `src/mil/mil.module.ts`:
- Registered `MilFeatureFlagsService` in providers.
- Exported it for downstream DI use.

---

### 4) Encrypt/decrypt/tamper validation tests
Added `src/mil/crypto.service.spec.ts` with coverage for:
- Successful encrypt/decrypt roundtrip.
- Tampered ciphertext detection (decrypt failure).
- Tampered digest detection (`MIL payload digest mismatch`).
- Wrong key decrypt failure.

Added `src/mil/mil-security-audit-wrapper.service.spec.ts` with coverage for:
- Wrapper-disabled no-op behavior for access checks.
- Audit persistence flag behavior (audit log still runs, DB sinks skipped).
- Encrypt-at-rest flag enforcement for wrapper encrypt/decrypt methods.

## Validation run
From `tenant_portal_backend`:

1. Targeted tests
- Command:
  - `npm test -- src/mil/crypto.service.spec.ts src/mil/mil-security-audit-wrapper.service.spec.ts --runInBand`
- Result:
  - 2 test suites passed
  - 7 tests passed

2. TypeScript build
- Command:
  - `npm run build`
- Result:
  - Success (`tsc` completed)

## Files touched for PR5
- `tenant_portal_backend/src/mil/mil-feature-flags.service.ts` (new)
- `tenant_portal_backend/src/mil/mil-security-audit-wrapper.service.ts`
- `tenant_portal_backend/src/mil/mil.module.ts`
- `tenant_portal_backend/src/mil/crypto.service.spec.ts` (new)
- `tenant_portal_backend/src/mil/mil-security-audit-wrapper.service.spec.ts` (new)
- `tenant_portal_backend/.env.example`

## Notes for reviewer
- Repository has many unrelated in-flight changes; PR5 summary above is scoped to MIL phase-0 hardening tasks only.
- Feature flags default to `false` intentionally for safe phased rollout. Enabling sequence recommendation:
  1. `MIL_WRAPPER_ENABLED=true`
  2. `MIL_ENCRYPT_AT_REST_ENABLED=true`
  3. `MIL_AUDIT_PERSIST_ENABLED=true` after confirming schema + DB readiness
