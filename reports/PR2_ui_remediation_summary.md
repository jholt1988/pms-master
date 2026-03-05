# PR2 UI Remediation Summary (P0/P1)

**Date:** 2026-03-05  
**Scope:** `tenant_portal_app` critical failure-state UX + inspection shell duplication

## What was fixed

## 1) P1 — Inspection shell duplication and heading duplication

### Before
- `/inspection-management` route was already mounted inside authenticated `AppShell` via `RoleBasedShell`.
- `InspectionManagementPage` wrapped content in `TabletPageShell`, and `TabletPageShell` itself wrapped children with another `AppShell`.
- Result: duplicated shell/navigation landmarks and duplicated heading patterns (audit finding).

### Changes
- **Removed nested shell mount** from `tenant_portal_app/src/components/ui/TabletPageShell.tsx`.
  - `TabletPageShell` now provides layout padding/header only.
- **Reduced heading duplication** in `tenant_portal_app/src/InspectionManagementPage.tsx`.
  - Inner `h1` changed to section-level `h2` (“Overview”), while page-level `h1` remains from `TabletPageShell pageTitle`.

### After (evidence)
- `TabletPageShell.tsx` no longer imports/renders `AppShell`.
- `InspectionManagementPage.tsx` still uses `pageTitle="Inspection Management"`, but content header is now `h2`.

---

## 2) P0 — Failure-state UX hardening for tenant critical routes

### Before
Multiple tenant pages used inconsistent/terse failure output (raw error text, minimal guidance, weak recovery context).

### Changes
Added shared degraded-mode component and applied to core tenant routes.

- **New shared component:**
  - `tenant_portal_app/src/components/ui/DegradedStateCard.tsx`
  - Exported from `tenant_portal_app/src/components/ui/index.ts`

- **Applied to routes/pages:**
  - `domains/tenant/features/dashboard/TenantDashboard.tsx`
  - `domains/tenant/features/maintenance/MaintenancePage.tsx`
  - `domains/tenant/features/payments/PaymentsPage.tsx`
  - `domains/tenant/features/lease/MyLeasePage.tsx`
  - `domains/tenant/features/inspection/TenantInspectionsListPage.tsx`

### UX pattern now standardized
Each degraded state now provides:
1. **What happened** (explicit failure title)
2. **What is affected** (page-specific failure message)
3. **What users can do now** (retry button + continue via dashboard/nav)
4. **Support fallback** (clear support/property-manager hint)

---

## Runtime validation

## Build validation (runtime-oriented)
- Ran: `npm run -s build` in `tenant_portal_app`
- **Result:** ✅ build succeeded (Vite production build completed)

## Type-check validation
- Ran: `npm run -s type-check`
- **Result:** ❌ fails due **pre-existing unrelated issues**:
  - `src/App.tsx(170,69): 'user' is possibly 'null'`
  - `src/PaymentsPage.tsx(114,62): Cannot find name 'NeedsAuthAttempt'`

## Additional syntax cleanup performed
- Fixed parse/type syntax issue in `tenant_portal_app/src/LeaseManagementPage.tsx` around `/properties` Promise typing so checks/build can proceed further.

---

## Open risks / follow-ups

1. **Type-check debt remains outside PR2 scope**
   - `App.tsx` nullability and root-level `PaymentsPage.tsx` symbol error still block clean TS pass.

2. **Degraded UX standardized on primary tenant flows only**
   - PM-side flows and remaining legacy routes should adopt the same error-card pattern for full consistency.

3. **No automated regression added in this pass**
   - Recommend route-level tests for failure-mode copy completeness + persistent heading/landmark expectations.

---

## Files touched (PR2)
- `tenant_portal_app/src/components/ui/DegradedStateCard.tsx` (new)
- `tenant_portal_app/src/components/ui/index.ts`
- `tenant_portal_app/src/components/ui/TabletPageShell.tsx`
- `tenant_portal_app/src/InspectionManagementPage.tsx`
- `tenant_portal_app/src/domains/tenant/features/dashboard/TenantDashboard.tsx`
- `tenant_portal_app/src/domains/tenant/features/maintenance/MaintenancePage.tsx`
- `tenant_portal_app/src/domains/tenant/features/payments/PaymentsPage.tsx`
- `tenant_portal_app/src/domains/tenant/features/lease/MyLeasePage.tsx`
- `tenant_portal_app/src/domains/tenant/features/inspection/TenantInspectionsListPage.tsx`
- `tenant_portal_app/src/LeaseManagementPage.tsx` (syntax fix)
