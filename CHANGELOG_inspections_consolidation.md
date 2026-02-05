# Inspections API consolidation (blessed v2 + legacy v1)

Date: 2026-02-05

## Goal
Remove the high-risk “two competing inspections APIs” problem by blessing a single `/api/inspections` surface and moving the older controller out of the way—without breaking the frontend’s `/api/*` base.

## What changed

### Blessed API (v2)
File: `tenant_portal_backend/src/inspection/inspection.controller.ts`
- Controller path corrected to `@Controller('inspections')` so, with the global prefix, it serves under **`/api/inspections`**.
- Added `AuthGuard('jwt')` + `RolesGuard` and role gates:
  - list/detail: PM + Tenant
  - create/update/complete/delete: PM
  - estimate generation: PM
- Fixed request user id usage: `req.user.userId` (aligns with `JwtStrategy.validate`).
- Keeps the envelope compatibility we added earlier (`data/items/meta` aliases) while we normalize contracts.

### Legacy API (v1)
File: `tenant_portal_backend/src/inspections/inspections.controller.ts`
- Moved from `@Controller('inspections')` to `@Controller('inspections-legacy')`.
- This means it now serves under **`/api/inspections-legacy`**.

## Why
- Frontend `apiFetch()` defaults to base `/api`, so stable “one blessed surface” prevents empty lists and route collisions.
- Reduces integration risk for MVP.

## Commit
- `b8f1237` Consolidate inspections API: bless /api/inspections, move legacy to /api/inspections-legacy

## Follow-up
- Add explicit deprecation note in docs and remove the legacy module once confirmed unused.
