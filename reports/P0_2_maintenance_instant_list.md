# P0-2 — Tenant maintenance request appears immediately after submission

## Summary
Implemented tenant maintenance list behavior so newly submitted requests show up immediately in the UI (optimistic insert), then reconcile with backend canonical state via refetch. Also enforced newest-first sorting consistently.

## Files changed
1. `tenant_portal_app/src/domains/tenant/features/maintenance/MaintenancePage.tsx`
   - Added `sortMaintenanceRequestsNewestFirst` helper.
   - Applied newest-first sorting when loading requests from API.
   - Updated filtered list to use shared newest-first sorter.
   - Added optimistic insertion right after successful `POST /maintenance` response.
   - Added canonical refetch fallback (`fetchRequests({ keepCurrentLoadingState: true })`) after submit flow to reconcile server fields.
   - Kept refetch non-blocking for page loading state (no full spinner flash).

2. `tenant_portal_app/src/domains/tenant/features/maintenance/MaintenancePage.test.ts` (new)
   - Added minimal unit tests for newest-first sorting behavior, including invalid date handling.

## Backend endpoint verification
Confirmed existing backend endpoints in:
- `tenant_portal_backend/src/maintenance/maintenance.controller.ts`

Verified compatibility with frontend calls:
- `GET /maintenance`
- `POST /maintenance`
- `POST /maintenance/:id/photos`

These endpoints already exist and align with current tenant page submit/list flow.

## Validation performed
Command run:
- `npm run test:run -- src/domains/tenant/features/maintenance/MaintenancePage.test.ts` (in `tenant_portal_app/`)

Result:
- ✅ 1 test file passed
- ✅ 2 tests passed

## Notes
- Repository had unrelated pre-existing modified files in backend/payment areas; this task only changed the tenant maintenance page and added its test file.
