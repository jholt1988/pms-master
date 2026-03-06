# P2 Inspection Approval Workflow Report

## Summary
Implemented tenant move-in/out inspection request + PM/Admin approval gate with start authorization.

### Delivered Requirements
1. **Tenant can submit move-in/out inspection requests** ✅
2. **PM/Admin can approve/deny request** ✅
3. **Tenant can only start inspection when approved** ✅

---

## API Contracts

### 1) POST `/api/inspections/requests`
Create tenant inspection request (MOVE_IN/MOVE_OUT only).

- **Roles:** `TENANT`
- **Body:**
```json
{
  "type": "MOVE_IN" | "MOVE_OUT",
  "notes": "optional"
}
```
- **Behavior:**
  - Requires active lease for requesting tenant.
  - Enforces org scope (`orgId`) and lease/unit/property alignment.
  - Rejects duplicate active requests (PENDING/APPROVED/STARTED) for same tenant+lease+type.

### 2) PATCH `/api/inspections/requests/:id/decision`
Approve/deny tenant request.

- **Roles:** `PROPERTY_MANAGER`, `ADMIN`
- **Body:**
```json
{
  "decision": "APPROVED" | "DENIED",
  "notes": "optional"
}
```
- **Behavior:**
  - Only pending requests can be decided.
  - Stores decision metadata (`decidedAt`, `decidedById`, `decisionNotes`).
  - Enforces org scope.

### 3) POST `/api/inspections/start`
Tenant starts inspection from approved request.

- **Roles:** `TENANT`
- **Body:**
```json
{
  "requestId": 123
}
```
- **Behavior:**
  - Request must belong to tenant + org scope and be `APPROVED`.
  - If a matching inspection exists (`SCHEDULED`/`IN_PROGRESS`), transitions to `IN_PROGRESS`.
  - Otherwise creates new `UnitInspection` in `IN_PROGRESS` state from request lease/unit/property/type.
  - Marks request as `STARTED` with `startedAt` and `startedInspectionId`.

### 4) GET `/api/inspections/requests` (supporting UI endpoint)
- **Roles:** `TENANT`, `PROPERTY_MANAGER`, `ADMIN`
- **Behavior:**
  - Tenants: only own requests.
  - PM/Admin: org-scoped list.

---

## Data Model / Migration

### Added enum
- `InspectionRequestStatus`: `PENDING`, `APPROVED`, `DENIED`, `STARTED`

### Added model
- `InspectionRequest` with fields:
  - tenant/property/unit/lease linkage
  - type, status
  - notes + decision notes
  - decision audit fields
  - start linkage (`startedInspectionId`, `startedAt`)

### File
- `tenant_portal_backend/prisma/migrations/20260306040500_inspection_request_approval_workflow/migration.sql`

---

## Frontend Changes

### Tenant UI
- `tenant_portal_app/src/domains/tenant/features/inspection/TenantInspectionsListPage.tsx`
  - Added request submission form for MOVE_IN/MOVE_OUT.
  - Added request status visibility (latest status).

- `tenant_portal_app/src/domains/tenant/features/inspection/TenantInspectionDetailPage.tsx`
  - Added approval/start gate behavior:
    - Start button shown only when request is approved and inspection is `SCHEDULED`.
    - Checklist editing disabled unless inspection is `IN_PROGRESS`.
  - Added approval status panel.

### PM/Admin UI
- `tenant_portal_app/src/InspectionManagementPage.tsx`
  - Added pending request queue.
  - Added Approve / Deny actions that call decision endpoint.

---

## Backend Files Changed

- `tenant_portal_backend/prisma/schema.prisma`
- `tenant_portal_backend/prisma/migrations/20260306040500_inspection_request_approval_workflow/migration.sql`
- `tenant_portal_backend/src/inspection/dto/simple-inspection.dto.ts`
- `tenant_portal_backend/src/inspection/inspection.controller.ts`
- `tenant_portal_backend/src/inspection/inspection.service.ts`
- `tenant_portal_backend/src/inspection/inspection.request-workflow.spec.ts`

## Frontend Files Changed

- `tenant_portal_app/src/domains/tenant/features/inspection/TenantInspectionsListPage.tsx`
- `tenant_portal_app/src/domains/tenant/features/inspection/TenantInspectionDetailPage.tsx`
- `tenant_portal_app/src/InspectionManagementPage.tsx`

---

## Validation Output

### Prisma generate
```bash
corepack pnpm --filter tenant_portal_backend exec prisma generate
# ✔ Generated Prisma Client (v6.19.2)
```

### Backend build
```bash
corepack pnpm --filter tenant_portal_backend build
# tsc completed successfully
```

### Backend tests (new workflow tests)
```bash
corepack pnpm --filter tenant_portal_backend test -- inspection.request-workflow.spec.ts --runInBand
# PASS src/inspection/inspection.request-workflow.spec.ts
# 4 passed, 0 failed
```

### Frontend build
```bash
corepack pnpm --filter tenant_portal_app build
# vite build completed successfully
```

---

## Notes
- Kept migration scope minimal with a dedicated `InspectionRequest` model and enum.
- Reused existing `UnitInspection` table for actual inspection lifecycle.
- Enforced role + org + lease/unit alignment checks in service layer.
