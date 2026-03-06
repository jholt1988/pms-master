# P1-1 Admin/PM Create Maintenance Request

## Summary
Implemented PM/Admin maintenance request creation from `MaintenanceManagementPage` via a modal, including optional context fields (property, unit, lease, due date), wired to `POST /api/maintenance`, with immediate list insertion after successful create.

## Files changed
1. `tenant_portal_app/src/MaintenanceManagementPage.tsx`
   - Added **New Request** action for PM/Admin.
   - Added modal form with fields:
     - title (required)
     - description (required)
     - priority (required)
     - property (optional)
     - unit (optional, scoped by selected property)
     - lease (optional, scoped by selected unit when selected)
     - due date (optional)
   - Added context loading for properties/leases.
   - Wired create submit to `POST /maintenance`.
   - On success, prepends created ticket to list immediately (no full-page refresh needed).

2. `tenant_portal_backend/src/maintenance/dto/create-maintenance-request.dto.ts`
   - Added optional fields accepted by API:
     - `leaseId?: string` (UUID)
     - `dueDate?: string` (ISO date string)

3. `tenant_portal_backend/src/maintenance/maintenance.service.ts`
   - Extended create flow for non-tenant roles to accept optional `leaseId` context.
   - Added role-safe/organization-safe validation for lease context:
     - lease exists
     - lease belongs to caller org (when org context exists)
     - `leaseId` consistency with provided `unitId`/`propertyId`
     - auto-derive `unitId`/`propertyId` from lease when omitted
   - Added optional explicit due date support:
     - if `dueDate` provided, uses it for `dueAt`
     - otherwise keeps SLA-derived `dueAt`

## Validation
- Backend compile check passed:
  - `cd tenant_portal_backend && npx tsc -p tsconfig.json` ✅
- Frontend global type-check has pre-existing unrelated errors in other files (`App.tsx`, `PaymentsPage.tsx`), but no new errors were introduced by this change set in maintenance files.

## Notes
- Existing controller role safeguards remain intact (tenant context derivation, owner property guard, org-scope enforcement).
- Implementation is backward compatible for existing tenant create flows.
