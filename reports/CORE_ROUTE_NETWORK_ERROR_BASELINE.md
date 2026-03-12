# Core Route Network Error Baseline (Clean Load)

_Last updated: 2026-03-12 (WS2.2)_

## Scope
Core routes audited:
- `/dashboard`
- `/properties/search`
- `/payments`
- `/maintenance`
- `/messaging`
- `/reporting`

## Method
Baseline produced from:
1. Frontend endpoint call audit on mounted core pages.
2. Backend controller route audit for endpoint existence/shape.
3. Added contract guard (`pnpm contracts:core-routes`) to keep this baseline stable.

> Note: this baseline captures **contract-level network risk** (missing/partial endpoint drift), which is the dominant source of clean-load 404/405 noise in this repo.

## Baseline Inventory

| Route | Expected API calls on load | Contract-level error baseline |
|---|---|---|
| `/dashboard` | `GET /dashboard/metrics` (PM/Owner) or `GET /tenant/dashboard` (Tenant) | **0 known contract misses** |
| `/properties/search` | `GET /properties/search`, optional saved-filters endpoints when authenticated | **0 known contract misses** |
| `/payments` | `GET /payments/invoices`, `GET /payments/payment-methods`, `GET /payments/history`, `GET /billing/autopay` | **0 known contract misses (active page)** |
| `/maintenance` | `GET /maintenance` | **0 known contract misses** |
| `/messaging` | `GET /messaging/conversations`, `GET /messaging/conversations/:id/messages` | **0 known contract misses after WS2.1 fix** |
| `/reporting` | `GET /reporting/:reportType` (selected report) | **0 known contract misses** |

## Fixed noise contributors in this workstream

1. **Messaging conversation details vs messages endpoint ambiguity**
   - Before: frontend fetched `/messaging/conversations/:id` and normalized from mixed shapes.
   - Now: frontend fetches `/messaging/conversations/:id/messages` directly.
   - Impact: reduced endpoint-shape ambiguity and lowered risk of parse/load errors during messaging route hydration.

## Remaining known mismatch risks

1. **Legacy, non-routed payments page uses stale endpoints**
   - File: `tenant_portal_app/src/PaymentsPage.tsx`
   - Uses `/payment-methods` (no backend controller at that root path).
   - Current user impact: low (not mounted in current app router).
   - Risk if revived: high immediate 404 noise unless updated.

## Guardrail

Run this before merge when touching frontend/backend routes:

```bash
pnpm contracts:core-routes
```

If this check fails, treat as potential endpoint drift and reconcile before release.
