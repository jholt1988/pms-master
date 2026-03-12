# Frontend ↔ Backend Route Contract Matrix (Core PMS Modules)

_Last updated: 2026-03-12 (WS2.1)_

## Scope
Core user paths requested for hardening:
- Dashboard
- Properties / Search
- Payments
- Maintenance
- Messaging
- Reporting

Status legend:
- **MATCH**: frontend endpoint contract and backend route align
- **PARTIAL**: endpoint exists but contract shape/usage is inconsistent or legacy
- **MISSING**: frontend call has no backend implementation

## Contract Matrix

| Module | Frontend route/page | Frontend API calls | Backend implementation path | Status | Remediation notes |
|---|---|---|---|---|---|
| Dashboard (PM) | `/dashboard` (`MainDashboard.tsx`) | `GET /dashboard/metrics` | `tenant_portal_backend/src/dashboard/dashboard.controller.ts` → `@Controller('dashboard')` + `@Get('metrics')` | MATCH | None required. |
| Dashboard (Tenant) | `/dashboard` (tenant shell -> `TenantDashboard.tsx`) | `GET /tenant/dashboard` | `tenant_portal_backend/src/dashboard/tenant-dashboard.controller.ts` → `@Controller('tenant')` + `@Get('dashboard')` | MATCH | None required. |
| Properties search | `/properties/search` | `GET /properties/search`, `GET/POST/DELETE /properties/saved-filters` | `tenant_portal_backend/src/property/property.controller.ts` | MATCH | None required. |
| Payments (tenant core) | `/payments` (`domains/tenant/features/payments/PaymentsPage.tsx`) | `GET /payments/invoices`, `GET /payments/payment-methods`, `GET /payments/history`, `POST /payments/stripe/checkout-session`, `DELETE /payments/payment-methods/:id` | `tenant_portal_backend/src/payments/payments.controller.ts` + `payment-methods.controller.ts` | MATCH | None required. |
| Maintenance (tenant) | `/maintenance` (`domains/tenant/features/maintenance/MaintenancePage.tsx`) | `GET /maintenance`, `POST /maintenance`, `POST /maintenance/:id/photos` | `tenant_portal_backend/src/maintenance/maintenance.controller.ts` | MATCH | None required. |
| Maintenance (PM/Owner) | `/maintenance-management` | `GET /maintenance`, `PATCH /maintenance/:id/status`, `POST /maintenance/:id/notes`, `GET /maintenance/diagnostics/data-quality`, `GET /maintenance/ai/features/:id` | `tenant_portal_backend/src/maintenance/maintenance.controller.ts` | MATCH | None required. |
| Messaging | `/messaging` (`domains/shared/features/messaging/MessagingPage.tsx`) | `GET /messaging/conversations`, `GET /messaging/conversations/:id/messages`, `POST /messaging/messages`, `POST /messaging/threads` | `tenant_portal_backend/src/messaging/messaging.controller.ts` | MATCH | **Fixed in WS2.1:** frontend now uses `/messaging/conversations/:id/messages` instead of relying on broader conversation payload. |
| Reporting | `/reporting` | `GET /reporting/{rent-roll|profit-loss|maintenance-analytics|vacancy-rate|payment-history|manual-payments-summary|manual-charges-summary}` | `tenant_portal_backend/src/reporting/reporting.controller.ts` | MATCH | None required. |
| Legacy payments page (not routed) | `src/PaymentsPage.tsx` (legacy) | `/payment-methods`, `/payment-methods/:id` | No matching `@Controller('payment-methods')` in backend | PARTIAL | Legacy file is currently not mounted in router. Keep out of active path or migrate to `/payments/payment-methods` if revived. |

## Highest-impact mismatches fixed in this workstream

1. **Messaging thread load endpoint clarified and aligned**
   - Updated frontend messaging page(s) to use `GET /messaging/conversations/:id/messages`.
   - This removes ambiguity and avoids relying on conversation envelope shape for message list rendering.

## Endpoint Drift Guard (added)

A lightweight contract check was added:
- Script: `scripts/check-core-route-contracts.js`
- NPM script: `pnpm contracts:core-routes`

What it checks:
- Core frontend calls are still present in the expected frontend files.
- Matching backend controller annotations for the same endpoints still exist.

Run:

```bash
pnpm contracts:core-routes
```

Suggested CI usage:
- Run this check on PRs touching `tenant_portal_app/src/**` or `tenant_portal_backend/src/**`.
