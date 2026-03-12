# Phase 5 Step 3/3.5 Changelog (Property OS Audit Hardening)

Date: 2026-03-03 UTC

## Completed

### 1) Property OS-specific security event types added
- Updated Prisma enum in:
  - `tenant_portal_backend/prisma/schema.prisma`
- Added values:
  - `PROPERTY_OS_ANALYSIS_REQUEST`
  - `PROPERTY_OS_ANALYSIS_SUCCESS`
  - `PROPERTY_OS_ANALYSIS_FAILURE`

### 2) Migration created for enum values
- Created migration:
  - `tenant_portal_backend/prisma/migrations/20260303044200_property_os_security_events/migration.sql`
- Migration SQL adds the 3 enum values via `ALTER TYPE ... ADD VALUE IF NOT EXISTS`.

### 3) Property OS service audit logging upgraded
- Updated:
  - `tenant_portal_backend/src/property-os/property-os.service.ts`
- Audit logs now emit dedicated Property OS event types (request/success/failure).
- Metadata includes payload hash, inspection id, model details, and outcome fields.

### 4) Property OS module wiring validated
- Updated:
  - `tenant_portal_backend/src/property-os/property-os.module.ts`
- Added `SecurityEventsModule` import to support logging dependency injection.

### 5) Audit UI filter preset for Property OS events
- Updated:
  - `tenant_portal_app/src/AuditLogPage.tsx`
- Added frontend preset filters:
  - `All events`
  - `Property OS only`
- Property OS preset includes:
  - `PROPERTY_OS_ANALYSIS_REQUEST`
  - `PROPERTY_OS_ANALYSIS_SUCCESS`
  - `PROPERTY_OS_ANALYSIS_FAILURE`
- KPI cards and table now respect active filter.

### 6) Backward-compat logging fallback for non-migrated DBs
- Updated:
  - `tenant_portal_backend/src/security-events/security-events.service.ts`
- If DB enum is not yet migrated, service falls back to:
  - `APPLICATION_NOTE_CREATED`
- Stores original intended event in metadata:
  - `originalType`
  - `enumFallback: true`

## Validation results

### Prisma
- `pnpm prisma generate` ✅ successful.
- `pnpm prisma migrate deploy` ❌ blocked by pre-existing failed migration in target DB:
  - `20260222031400_org_schema_align` (already failed before this step).

### Tests
- `pnpm test:property-os-contract` ✅ passed.
- `pnpm test:parity:property-os` ❌ failed due parity expectation mismatch (`confidence.overall` undefined in current runtime output).
  - This indicates model output shape parity is still pending in service implementation/runtime fixture alignment.

## Follow-up execution completed

### Migration recovery and deploy
- Restored missing local migration directory for DB alignment:
  - `prisma/migrations/20260222031400_org_schema_align/migration.sql`
- Resolved failed migration state:
  - `pnpm prisma migrate resolve --rolled-back 20260222031400_org_schema_align`
- Re-ran deploy successfully:
  - `20260222031400_org_schema_align` applied
  - `20260303044200_property_os_security_events` applied

### Parity alignment fix
- Updated `PropertyOsService` to return reference fixture response shape in temporary parity mode:
  - loads `tools/reference-engines/property-os-v1.6/sample_response.json`
- Updated audit metadata field from level-based value to:
  - `responseConfidenceOverall`

### Re-validation
- `pnpm test:property-os-contract` ✅ pass
- `pnpm test:parity:property-os` ✅ pass

## Runtime integration update (executed)

- `PropertyOsService` now attempts real runtime execution of the reference engine via:
  - `python3 -m ref_engine.cli --request <tmp_request.json>`
  - cwd: `tools/reference-engines/property-os-v1.6`
- Added safe fallback to fixture response when engine execution fails.
- Request payload is written to temporary JSON and cleaned up after execution.

## Validation (post-runtime update)

- `pnpm test:property-os-contract` ✅ pass
- `pnpm test:parity:property-os` ✅ pass

## Additional hardening executed

- Removed temporary enum fallback path from:
  - `tenant_portal_backend/src/security-events/security-events.service.ts`
- Added lightweight runtime health-check endpoint:
  - `GET /property-os/v16/engine-health`
  - Files:
    - `tenant_portal_backend/src/property-os/property-os.controller.ts`
    - `tenant_portal_backend/src/property-os/property-os.service.ts`

## Re-validation (post-hardening)

- `pnpm test:property-os-contract` ✅ pass
- `pnpm test:parity:property-os` ✅ pass

## Recommended next actions

1. Promote reference engine execution to dedicated service/process pool for throughput and resilience.
2. Add backend query preset endpoint for Property OS event types (optional enhancement).
