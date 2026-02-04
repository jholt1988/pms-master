# Runtime blocker fixes (round 2)

Date: 2026-02-04

## Goal
Remove remaining high-friction runtime blockers and obvious “unfinished” artifacts that undermine trust.

## Changes

### Tenant dashboard quick actions
File: `tenant_portal_app/src/domains/tenant/features/dashboard/TenantDashboard.tsx`
- Fixed messages link: `/messages` → `/messaging`
- Removed documents quick action (documents page is PM-only today; avoids 404/unauthorized).

### Removed debug UI artifacts
Files:
- `tenant_portal_app/src/LeaseManagementPageModern.tsx`
- `tenant_portal_app/src/MaintenanceManagementPage.tsx`

- Removed `Debug: ... loaded` lines from production UI.

## Commit
- `a70fa34` Fix tenant dashboard links; remove debug UI artifacts
