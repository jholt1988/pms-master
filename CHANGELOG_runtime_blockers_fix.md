# Runtime blocker fixes (inspections/payments/messaging)

Date: 2026-02-04

## Goal
Unblock the most common “looks built but breaks at runtime” issues by making the UI resilient to inconsistent API envelopes and adding back-compat endpoints.

## Changes

### 1) Inspections list: envelope compatibility
**Backend**: `tenant_portal_backend/src/inspection/inspection.controller.ts`
- `GET /api/inspections` now returns both shapes:
  - existing `{ inspections, total, page, limit, totalPages }`
  - plus `data` and `items` aliases pointing to `inspections`
  - plus `meta` summary

**Frontend**
- `tenant_portal_app/src/domains/tenant/features/inspection/InspectionPage.tsx`
- `tenant_portal_app/src/InspectionManagementPage.tsx`

Both pages now accept any of:
- `data.data`
- `data.inspections`
- `data.items`

### 2) Payments history endpoint alias
**Backend**: `tenant_portal_backend/src/payments/payments.controller.ts`
- Added `GET /payments/history` as a back-compat alias for `GET /payments`.

### 3) Messaging bulk resources bug
**Frontend**: `tenant_portal_app/src/domains/shared/features/messaging/MessagingPage.tsx`
- Fixed `fetchBulkResources()` to treat `apiFetch()` as JSON (not a raw `Response`).
- Removes `.ok` / `.json()` calls that would throw.

## Commit
- `8502b9c` Fix runtime blockers: inspections envelope, payments history alias, messaging bulk fetch

## Next
- Contract normalization sprint: pick a single response envelope and remove aliases once all clients are updated.
