# X-1 API Envelope Normalization Report

## Scope
Implemented a shared frontend utility to normalize list-style API envelopes and refactored targeted pages to use it.

Supported envelopes:
- `[]`
- `{ data: [] }`
- `{ items: [] }`

Also allowed endpoint-specific list keys where already used in app behavior (e.g. `requests`, `messages`) while retaining existing fallback behavior.

## New Shared Utility
Created:
- `tenant_portal_app/src/utils/normalizeApiList.ts`

API:
- `normalizeApiList<T>(payload: unknown, keys?: string[]): T[]`

Behavior:
1. Returns payload directly when it is an array.
2. If payload is an object, checks provided keys in order and returns first array found.
3. Returns `[]` otherwise.

Default keys:
- `['data', 'items']`

## Refactored Files
Updated list normalization logic in:

- `tenant_portal_app/src/PropertyManagementPage.tsx`
- `tenant_portal_app/src/LeaseManagementPage.tsx`
- `tenant_portal_app/src/LeaseManagementPageModern.tsx`
- `tenant_portal_app/src/MaintenanceManagementPage.tsx`
- `tenant_portal_app/src/MaintenanceDashboardModern.tsx`
- `tenant_portal_app/src/MessagingPage.tsx`
- `tenant_portal_app/src/domains/shared/features/messaging/MessagingPage.tsx`
- `tenant_portal_app/src/domains/tenant/features/maintenance/MaintenancePage.tsx`

## Notes on Stability / Behavior Preservation
- Existing ad-hoc `Array.isArray(...) ? ... : ...` envelope handling was replaced with the shared utility.
- Existing endpoint-specific envelope keys were preserved via explicit key order where needed:
  - Maintenance lists: `['requests', 'data', 'items']`
  - Conversation message lists: `['messages', 'data', 'items']`
- No intentional feature/UX behavior changes beyond making list parsing consistent and resilient.

## Build Verification
Executed:
- `npm run build` in `tenant_portal_app`

Result:
- ✅ Build succeeded (Vite production build completed)
- Non-blocking output included an existing circular chunk warning (`vendor -> react-vendor -> vendor`).
