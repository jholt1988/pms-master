# API Route Ownership

Date: 2026-06-04

Purpose: freeze canonical backend route ownership for the Next.js operator app migration.

This document is the source of truth for which backend module owns each API route family. The Next.js operator app should call only canonical routes listed here unless a route is explicitly marked as temporary.

## 1. Route Policy

Canonical browser-facing routes:

- Use `/api/...` as the public HTTP path.
- Use one owner module per route family.
- Return JSON as `{ data, meta, errors }` unless the route is an explicit file/download/stream endpoint.
- Use stable DTOs and generated types before porting the workflow to Next.js.
- Add route contract tests before a route is used by the new operator app.

Compatibility routes:

- May exist for the old Vite app during migration.
- Must not be called from new Next.js operator pages.
- Must have an owner and removal condition.

External routes:

- Webhooks may stay outside `/api` when required by providers.
- Metrics may stay at `/metrics`.

## 2. Canonical Route Ownership Table

| Domain | Canonical Route Family | Owning Backend Module | Owning Controller(s) | Operator App Use | Contract Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Auth/session | `/api/auth` | `auth` | `AuthController` | Yes | P0 | Login, refresh, logout, MFA, current user, password policy. Next.js should wrap auth/session handling cleanly. |
| Users/staff | `/api/users` | `users` | `UsersController` | Yes | P1 | Operator staff/admin management. Requires RBAC and org scoping checks. |
| Organization settings | `/api/settings` | `settings` (planned) | `OrganizationSettingsController` (not registered — orphaned) | Yes | P1 | ⚠ NOT SERVED: the controller exists but is not registered in any module (no `SettingsModule`) and is excluded from tsc, so `/api/settings` currently 404s. Planned feature — kept for wire-up. See #75. |
| Billing / connected account | `/api/billing/connected-account` | `billing` | `BillingController` | Yes | P1 | Served. Stripe connected-account settings. |
| Portfolio/properties | `/api/properties` | `property` | `PropertyController` | Yes | P0 | Canonical owner for portfolio/property/unit read and write workflows. Deprecate `property` alias for operator app. |
| Units | `/api/units` and `/api/properties/:id/units` | `property` | `PropertyController` | Yes | P0 | Prefer nested property unit routes for CRUD and `/api/units/*` only for cross-property operations. (The `UnitsRadialController` shortcut was an unregistered prototype — removed, #75.) |
| Saved property filters | `/api/properties/saved-filters` | `property` | `PropertyController` | Later | P2 | Operator convenience feature, not private beta blocker. |
| Leases | `/api/leases` | `lease` | `LeaseController` | Yes | P0 | Lease lifecycle, tenant notices, renewals, conversion from approved applications. |
| Lease abstraction | `/api/lease-abstraction` | `lease-abstraction` | `LeaseAbstractionController` | Later | P2 | AI/document workflow. Not needed until document ingestion is stable. |
| Leasing leads | `/api/leasing/leads` | `leasing` | `LeasingController` | Yes | P0 | Canonical lead management route. Deprecate unprefixed `/leasing` browser calls after migration. |
| Leasing tours | `/api/leasing/tours` | `leasing` | `ToursController`, `LeasingController` | Yes | P1 | Needs one route family for tours; avoid scattered scheduling semantics. |
| Public application intake | `/api/rental-applications` | `rental-application` | `RentalApplicationController` | Yes | P0 | Public and authenticated application lifecycle should be separated by auth/role, not route ambiguity. |
| Operator application review | `/api/rental-applications` | `rental-application` | `RentalApplicationController` | Yes | P0 | Manager review, policy evaluation, AI review, notes, conversion. |
| Deprecated lead applications | `/api/applications` | `leasing` | `LeadApplicationsController` | No | P0 cleanup | Keep only if needed for legacy intake. Do not use in Next.js operator app. |
| Screening | `/api/screening` | `screening` | `ScreeningController` | Yes | P0 | Fair-housing / adverse-action-sensitive. ⚠ `POST /api/screening/:id/decision` was owned by the unregistered `ScreeningRadialController` (removed, #75) and is NOT currently served — the decision-record / approval-gate flow needs to be (re)built on `ScreeningController`. |
| Payments | `/api/payments` | `payments` | `PaymentsController` | Yes | P0 | Invoices, payments, history, delinquency, payment plans, manual payments, charges, reminders. (The `PaymentsRadialController` shortcut was an unregistered prototype — removed, #75.) |
| Payment methods | `/api/payments/payment-methods` | `payments` | `PaymentMethodsController` | Yes | P0 | Canonical route. `/api/payment-methods` is not owned and must not be used. |
| Billing schedules/autopay | `/api/billing` | `billing` | `BillingController` | Yes | P0 | Autopay, billing schedules, fee schedules, plan cycles, Stripe connected-account onboarding. |
| Bookkeeping/accounting | `/api/bookkeeping` | `bookkeeping` | `BookkeepingController` | Yes | P0 | App-owned accounting: workspace, transactions, reconciliation, chart of accounts, owner statements. MVP scope and payment expansion gates are defined in `docs/accounting-mvp-spec.md`. |
| Transactions shortcut | `/api/bookkeeping/transactions` | `bookkeeping` | `BookkeepingController` | No initially | P1 cleanup | The `TransactionsRadialController` shortcut was an unregistered prototype — removed (#75). Use canonical `/api/bookkeeping` routes on `BookkeepingController`. |
| QuickBooks integration | `/api/quickbooks` | `quickbooks` | `QuickBooksMinimalController`, `QuickBooksWebhookController` | Later | P1 | Integration/export target, not source of truth. Webhook remains external. |
| Maintenance | `/api/maintenance` | `maintenance` | `MaintenanceController` | Yes | P0 | Request queue, status, assignment, notes, photos, AI metrics/features. |
| Legacy maintenance | `/api/maintenance-requests`, `/api/maintenance/:requestId/assignee` | `legacy` | `MaintenanceLegacyController` | No | P0 cleanup | Do not port. Replace with canonical `/api/maintenance`. |
| Inspections | `/api/inspections` | `inspections` | `InspectionsController` | Yes | P0 | List/detail/create/update/complete/approve/photos. Remove `inspections-legacy` for operator app. |
| Inspection requests | `/api/inspections/requests` | `inspections` | `InspectionRequestsController` | Yes | P0 | Canonical operator route for tenant inspection request queue. `/api/inspection-requests` is not owned. |
| Repair estimates | `/api/estimates` | `inspections` | `EstimatesController` | Yes | P1 | Inspection-to-estimate workflow. Requires stable estimate DTO. |
| Documents | `/api/documents` | `documents` | `DocumentsController` after merge | Yes | P0 | Merge duplicate controllers. Canonical upload should be `POST /api/documents`; `/upload` may be temporary alias. |
| E-signature | `/api/esignature` | `esignature` | `EsignatureController` | Yes | P1 | Keep browser-facing canonical `/api/esignature`. Remove direct frontend fetch duplication except file downloads. |
| E-signature webhook | `/webhooks/esignature` | `esignature` | `EsignatureWebhookController` | External | P0 | External provider callback. Excluded from global prefix intentionally. |
| Messaging | `/api/messaging` | `messaging` | `MessagingController` | Yes | P0/P1 | Conversations and messages P1; bulk send P0 due compliance risk. New app should use v2 envelope only. |
| Notifications | `/api/notifications` | `notifications` | `NotificationsController` | Yes | P1 | Unread count, list, read/read-all, preferences. |
| Schedule | `/api/schedule` | `schedule` | `ScheduleController` | Yes | P1 | List, daily/weekly/monthly, summary, create. Client must not pass API base into endpoint names. |
| Reporting | `/api/reporting` | `reporting` | `ReportingController` | Yes | P0/P1 | Fix ` delinquency-report` route typo. Deprecate `/api/reports` alias for operator app. |
| Dashboard | `/api/dashboard` | `dashboard` | `DashboardController`, `TenantDashboardController` | Temporary | P1 | Existing metrics/action-intents. Long-term operator command center should move to `/api/command-center`. |
| Command center | `/api/command-center` | `briefing`, `dashboard`, `feed`, `copilot` | TBD | Yes | P0 new | New operator command center route family should aggregate decisions, signals, evidence, approvals. |
| Decision records | `/api/decisions` | `decisions` | `DecisionRecordController` | Yes | P0 | First-class persisted decision/audit linkage for command-center surfaced recommendations and approvals. |
| Platform foundation | `/api/foundation` | `foundation` | `FoundationController` | Internal/operator | P0 | Event envelope and idempotency smoke contracts for migrated API foundation. |
| AI gateway | `/api/ai-gateway` | `ai-gateway` | `AiGatewayController` | Yes | P0 | Phase 4 AI entrypoint for auditable generation, evaluation, and decision recommendation drafts. |
| Operator workflow inventory | `/api/operator-workflows` | `operator-workflows` | `OperatorWorkflowsController` | Yes | P0 | Canonical workflow inventory/read model for ranked operator workflow visibility. |
| Operator payment workbench | `/api/operator-payments` | `operator-payments` | `OperatorPaymentsController` | Yes | P0 | Read-only payment operations and ledger signal surface for command workflows. |
| Operator property setup | `/api/operator-setup` | `operator-setup` | `OperatorSetupController` | Yes | P0 | Private beta property/unit setup workflow surface. |
| Operator application workflow | `/api/operator-applications` | `operator-applications` | `OperatorApplicationsController` | Yes | P0 | Application screening, review, conversion, and audit-ready workflow surface. |
| Operator lease signing | `/api/operator-lease-signing` | `operator-lease-signing` | `OperatorLeaseSigningController` | Yes | P0 | Lease packet generation, envelope send, resend, and status refresh workflow surface. |
| Operator maintenance dispatch | `/api/operator-maintenance-dispatch` | `operator-maintenance-dispatch` | `OperatorMaintenanceDispatchController` | Yes | P0 | Maintenance-to-vendor bid, award, dispatch, rejection, and completion workbench. |
| Operator inspection estimates | `/api/operator-inspection-estimates` | `operator-inspection-estimates` | `OperatorInspectionEstimatesController` | Yes | P0 | Inspection-to-repair-estimate workflow surface. |
| Operator renewals | `/api/operator-renewals` | `operator-renewals` | `OperatorRenewalsController` | Yes | P0 | Renewal offer, response, signing, refresh, and move-out workflow surface. |
| Operator owner statements | `/api/operator-owner-statements` | `operator-owner-statements` | `OperatorOwnerStatementsController` | Yes | P0 | Owner statement generation, approval, and send workflow surface. |
| Briefing | `/api/briefing` | `briefing` | `BriefingController` | Yes | P1 | Daily briefing. May be folded into command center later. |
| Feed | `/api/feed` | `feed` | `FeedController`, `FeedAggregatorController` | Yes | P1 | Do not use `/api/v2/feed` unless implemented and owned in `pms-master`. |
| Copilot/decisions | `/api/copilot` | `copilot` (planned) | `DecisionEngineController` (not registered — orphaned) | Later | P1 | ⚠ NOT SERVED: `DecisionEngineController` is not registered in any module and is excluded from tsc. Planned decision-engine API (strict action-intent DTOs) — kept for wire-up; see #75. |
| Policy/approvals | `/api/policy` | `policy` | `PolicyController` | Yes | P0 | Approval tasks, property policy, underwriting, payment-plan, maintenance, denial compliance. |
| Analytics/telemetry | `/api/analytics`, `/api/telemetry` | `analytics`, `telemetry` | `AnalyticsController`, `TelemetryController` | Later | P2 | Keep for event capture/reporting. Not a direct command-center dependency unless typed. (The `PortfolioAnalyticsController` prototype was unregistered — removed, #75.) |
| Audit logs | `/api/audit-logs` | `shared` | `AuditLogController` | Yes | P1 | Operator audit views. Ensure org scoping and access controls. |
| Security events | `/api/security-events` | `security-events` | `SecurityEventsController` | Yes | P1 | Used by audit/security pages. |
| Health | `/api/health`, `/health` | `health`, root app | `HealthController`, `AppController` | Operational | P1 | Internal checks. Public shape should be documented. |
| Metrics | `/metrics` | `metrics` | `PrometheusController` | Operational | P1 | External scrape endpoint. Not used by operator app. |
| Webhooks | `/webhooks/*` | `webhooks`, provider modules | Provider webhook controllers | External | P0 | Stripe, QuickBooks, DocuSign/e-signature. Must preserve raw body and idempotency. |
| Listing syndication | `/api/listings/syndication` | `listing-syndication` | `ListingSyndicationController`, provider webhook controllers | Later | P2 | Not private beta blocker unless leasing listings are in beta scope. |
| Rent estimator | `/api/rent-estimator` | `rent-estimator` | `RentEstimatorController` | Later | P2 | Can feed predictive AI later. |
| Rent recommendations | `/api/rent-recommendations` | `rent-optimization` | `RentOptimizationController` | Later | P1/P2 | Decision-driven differentiator, but contract after core lease/payment flows. |
| Owner portal | `/api/owner-portal` | `owner-portal` | Owner portal controllers | Later | P2 | Owner portal is companion surface, not first operator shell blocker. |
| Vendors | `/api/vendors` | `vendors` | Vendor controllers | Yes | P1 | Needed for maintenance dispatch. Verify controller route ownership before porting. |
| Tenant profiles | `/api/tenants` | `tenant` | `TenantController` | Yes | P0 | Tenant workspace, health, activity, profile, household, violations. (The `TenantProfileController` prototype was unregistered — removed, #75.) |
| Tenant feed | `/api/tenant/feed` | `tenant` | `TenantFeedController` | Tenant portal | P2 | Not operator app unless surfaced in tenant workspace. |
| Tenant insurance | `/api/tenant-insurance` | `tenant-insurance` | `TenantInsuranceController` | Later | P2 | Post-core workflow. |
| Utility billing | `/api/utility-billing` | `utility-billing` | `UtilityBillingController` | Later | P2 | Post-MVP unless utilities are in beta scope. |
| Smart devices | `/api/smart-devices` | `smart-devices` | `SmartDevicesController` | Later | P2 | Post-MVP. |
| Privacy | `/api/privacy` | `privacy` | Privacy controllers | Later | P1 | Required if exposing privacy/export/delete flows in beta. |

## 3. Deprecated / Compatibility Route Register

| Route / Alias | Current Owner | Replacement | Status | Removal Condition |
| --- | --- | --- | --- | --- |
| `/api/payment-methods` | None observed | `/api/payments/payment-methods` | Do not use | Remove frontend references immediately. |
| `/api/documents/upload` | `DocumentsController` | `POST /api/documents` | Temporary | After upload semantics are merged into canonical `POST /api/documents`. |
| Duplicate `GET /api/documents` | `DocumentsController` | Single `DocumentsController` | Resolved | `DocumentManagementController` (unregistered, mounted at `/api/documents-legacy`) was removed (#75); only `DocumentsController` remains. |
| `/api/inspections-legacy` | `InspectionsController` | `/api/inspections` | Deprecated | After old Vite inspection pages retire. |
| `/api/property` | `PropertyController` alias | `/api/properties` | Deprecated for operator | After old frontend references retire. |
| `/api/reports` | `ReportingController` alias | `/api/reporting` | Deprecated for operator | After report client is typed. |
| `/api/applications` | `LeadApplicationsController` | `/api/rental-applications` for reviews, `/api/leasing/*` for leads | Ambiguous | After application intake/review split is finalized. |
| `/leasing/*` unprefixed | `LeasingController` | `/api/leasing/*` | Temporary | After Next.js proxy/client is live. |
| `/api/leasing/*` controller alias | `LeasingController` | canonical controller path under global prefix | Cleanup | After global prefix exclusions are simplified. |
| `/esignature/*` unprefixed | `EsignatureController` | `/api/esignature/*` | Temporary | After old frontend direct fetches retire. |
| `/api/v2/feed` | Unclear in `pms-master` | `/api/feed` or `/api/command-center/feed` | Do not use until owned | After command-center route is defined. |
| `/api/maintenance-requests` | `MaintenanceLegacyController` | `/api/maintenance` | Deprecated | After old maintenance page references retire. |
| `/api/leads/*` | `LeadsLegacyController` | `/api/leasing/leads/*` | Deprecated | After lead UI uses canonical leasing route. |

## 4. Route Test Requirements

Every route family marked P0 must have contract tests before Next.js pages call it. The initial OpenAPI route-existence guardrail is `tenant_portal_backend/test/operator-p0-contract.spec.ts` and runs with `pnpm --filter tenant_portal_backend test:contracts:operator`.

Minimum tests:

- Route exists at canonical `/api/...` path.
- Deprecated aliases are not used by new operator client.
- Auth behavior: anonymous, tenant, property manager, admin where applicable.
- Org scoping.
- Success response envelope.
- Error response envelope.
- Validation failure shape.
- Pagination shape for list endpoints.
- Idempotency for payment, ledger, webhook, notice, document generation, and approval actions.

## 5. Next.js Operator Client Rules

The new operator app must:

- Call `/api/backend/*` proxy routes only through typed client functions.
- Never concatenate API base URLs inside components.
- Never call deprecated aliases listed in this document.
- Treat raw downloads as explicit exceptions.
- Use generated types from OpenAPI or shared schemas.
- Include route ownership metadata in client modules during migration.

Example client module naming:

- `src/lib/api/auth.ts`
- `src/lib/api/portfolio.ts`
- `src/lib/api/rental-applications.ts`
- `src/lib/api/payments.ts`
- `src/lib/api/maintenance.ts`
- `src/lib/api/inspections.ts`
- `src/lib/api/documents.ts`
- `src/lib/api/messaging.ts`
- `src/lib/api/accounting.ts`
- `src/lib/api/command-center.ts`

## 6. Immediate Backlog From Ownership Decisions

P0:

1. Merge duplicate document controllers.
2. Remove or replace `/payment-methods` frontend usage.
3. Canonicalize `applications` vs `rental-applications`.
4. Canonicalize inspections and explicitly own inspection request routes.
5. Fix reporting route typo ` delinquency-report`.
6. Simplify global prefix exclusions for leasing and e-signature.
7. Add contract tests for route existence and envelopes for P0 route families.

P1:

1. Define `/api/command-center`.
2. Move messaging to v2 envelope by default.
3. Add typed schedule client.
4. Consolidate radial shortcut controllers under canonical domains.
5. Define webhook ownership and idempotency tests.
