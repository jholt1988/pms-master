# Operator App Contract Audit

Date: 2026-06-04

Scope: existing `tenant_portal_app` frontend and `tenant_portal_backend` API contracts, with the decision that the operator app will move to Next.js.

Goal: identify contract risks before porting workflows into the new Next.js operator app. The main recommendation is to migrate only audited, contract-clean workflows and treat many existing Vite pages as reference material rather than code to copy directly.

## 1. Executive Summary

The current codebase has broad feature coverage, but the frontend/backend contract surface is inconsistent. The risk is not only missing endpoints; it is duplicate route families, mixed response shapes, legacy pages calling stale endpoints, and frontend code normalizing around uncertainty.

The Next.js migration should be used as a contract reset:

- Define one canonical API response envelope.
- Generate a typed API client from OpenAPI or Zod contracts.
- Port only workflows that pass contract tests.
- Retire stale root-level Vite pages when domain-level replacements already exist.
- Preserve backend business logic where sound, but consolidate duplicate controllers and route aliases.

## 2. Audit Method

Reviewed:

- Frontend API usage in `tenant_portal_app/src`.
- Shared API client in `tenant_portal_app/src/services/apiClient.ts`.
- Backend global prefix and route exclusions in `tenant_portal_backend/src/index.ts`.
- Backend controllers for payments, payment methods, inspections, messaging, documents, leasing, rental applications, schedule, reporting, and e-signature.
- Existing raw route inventories generated into:
  - `reports/frontend-api-usage-raw.txt`
  - `reports/backend-routes-raw.txt`

Inventory counts from source search:

- Frontend API/fetch usages: 265.
- Backend controller/route decorator hits: 621.

These counts are approximate and include tests/comments, but they show the size of the contract surface.

## 3. Next.js Migration Decision

Decision:

- Build the operator app in Next.js.
- Keep the existing Vite app as a reference and temporary validation surface.
- Do not bulk-port root-level Vite pages.
- Port workflows by domain after contract cleanup.

Recommended initial Next.js app:

- `apps/operator` or `operator_app`.
- Next.js App Router.
- React + TypeScript.
- Tailwind plus owned components.
- Server-side route handlers only where useful for auth/session/proxy concerns.
- Typed API client generated from backend contracts.
- Route groups by operator workflow: command center, portfolio, leasing, payments, maintenance, inspections, accounting, documents, communications, compliance, settings.

Migration principle:

- A page cannot be migrated until its backend endpoints, response shape, auth/role requirements, and error model are documented and covered by contract tests.

## 4. Cross-Cutting Findings

### P0: No Single API Envelope

Observed shapes include:

- Bare arrays.
- `{ data, total, limit, offset }`.
- `{ success: true, ...result }`.
- `{ inspections, total }` or similar domain-specific wrappers.
- Raw file streams.
- Express `Response` objects for downloads.

Impact:

- Frontend code has defensive utilities like `normalizeApiList` and `unwrapApi`, which hide contract drift.
- Next.js migration will copy uncertainty unless the envelope is standardized first.

Recommendation:

- Canonical JSON response: `{ data, meta, errors }`.
- Canonical pagination: `meta.pagination`.
- Canonical error: `{ errors: [{ code, message, field?, details? }], meta: { requestId } }`.
- Keep raw file responses only for explicit download endpoints.

### P0: Global `/api` Prefix Is Complicated By Route Exclusions

Backend sets global prefix `api`, but excludes:

- `leasing`, `leasing/(.*)`.
- `api/leasing`, `api/leasing/(.*)`.
- `esignature`, `esignature/(.*)`.
- `api/esignature`, `api/esignature/(.*)`.
- webhooks and metrics.

Some controllers also include already-prefixed route paths such as `@Controller(['api/leasing', 'leasing'])` and `@Controller(['esignature','api/esignature'])`.

Impact:

- Route availability is hard to reason about.
- Frontend alternates between `/foo`, `/api/foo`, and full API-base paths.
- Next.js proxy/auth decisions will be harder if routes remain inconsistent.

Recommendation:

- For the operator app, expose only canonical `/api/...` routes.
- Keep external webhooks outside prefix where required.
- Remove `api/*` controller aliases after compatibility window.
- Add route contract tests that assert each canonical path.

### P0: Duplicate Current/Legacy Route Families

Examples:

- `documents`: both `DocumentsController` and `DocumentManagementController` use `@Controller('documents')`.
- `inspections`: controller comments call it legacy but exposes both `inspections-legacy` and `inspections`.
- `applications` and `rental-applications` both exist.
- `leasing` exists with both prefixed and unprefixed aliases.
- `payments` has multiple controllers under the same base path plus radial controllers.

Impact:

- Route conflicts and ambiguous ownership.
- Inconsistent DTOs and response shapes for the same resource.
- Frontend pages can appear to work while depending on a stale route.

Recommendation:

- Assign one canonical controller per domain route.
- Keep compatibility aliases only behind explicit deprecation notes.
- Create a route ownership table in the backend docs.

## 5. Domain Findings

### 5.1 Payments and Payment Methods

Finding:

- Backend canonical payment-method route is `payments/payment-methods`.
- Newer tenant-domain payments page uses `/payments/payment-methods`.
- Stale root `tenant_portal_app/src/PaymentsPage.tsx` calls `/payment-methods` and `/payment-methods/:id`, which is not backed by an active controller.

Impact:

- If the stale root page is ported, payment method loading and creation will fail.

Recommendation:

- Do not port root `PaymentsPage.tsx`.
- Port from `domains/tenant/features/payments/PaymentsPage.tsx` only after reviewing whether it belongs in tenant portal or operator app.
- Operator payments should use canonical endpoints:
  - `/payments/invoices`
  - `/payments`
  - `/payments/history`
  - `/payments/payment-methods`
  - `/payments/payment-methods/setup-intent`
  - `/payments/payment-plans`
  - `/payments/delinquency/*`
- Add contract tests for payment method list/create/delete/setup intent.

Priority: P0.

### 5.2 Documents

Finding:

- Two backend controllers declare `@Controller('documents')`.
- `DocumentsController` exposes:
  - `POST /documents/upload`
  - `GET /documents`
  - `GET /documents/:id/download`
  - `POST /documents/:id/share`
  - `DELETE /documents/:id`
- `DocumentManagementController` exposes:
  - `POST /documents`
  - `GET /documents`
  - `GET /documents/categories`
  - `GET /documents/:id`
  - `GET /documents/:id/download`
  - `DELETE /documents/:id`
- Frontend `DocumentManagementPage.tsx` expects `GET /documents` to return `data.data || []` and uploads to `/documents/upload`.

Impact:

- Duplicate `GET /documents` and `GET /documents/:id/download` definitions can create unpredictable handler selection depending on module order.
- One download endpoint streams a file; another returns metadata with `downloadUrl`.
- Frontend assumptions may silently work or fail depending on which controller wins.

Recommendation:

- Merge document controllers.
- Canonical document API:
  - `GET /documents` returns `{ data: Document[], meta: { pagination } }`.
  - `POST /documents` for upload via multipart.
  - `GET /documents/:id` metadata.
  - `GET /documents/:id/download` raw stream or signed URL with explicit content negotiation.
  - `DELETE /documents/:id` soft delete.
- Remove `/documents/upload` or keep it as deprecated alias to `POST /documents`.

Priority: P0.

### 5.3 Inspections

Finding:

- `InspectionsController` declares `@Controller(['inspections-legacy', 'inspections'])` while comments say legacy.
- Frontend pages contain defensive unwrapping:
  - `data.data`
  - `data.inspections`
  - `data.items`
  - bare array.
- `InspectionManagementPage.tsx` calls `/inspections/requests`, but the inspected controller does not expose that route.
- `PMEstimatingReviewCenter.tsx` uses `unwrapApi` for `/inspections?take=50`.

Impact:

- Inspection list pages can show empty state despite valid backend data if response shape changes.
- `/inspections/requests` may be handled by another controller not seen in the inspected module or may fail; it needs explicit ownership.

Recommendation:

- Define canonical inspections API:
  - `GET /inspections`
  - `POST /inspections`
  - `GET /inspections/:id`
  - `PUT/PATCH /inspections/:id`
  - `POST /inspections/:id/complete`
  - `POST /inspections/:id/approve`
  - `GET /inspection-requests` or `GET /inspections/requests`, one only.
- Return one list shape.
- Remove legacy alias from migrated operator app.

Priority: P0.

### 5.4 Messaging

Finding:

- Current `MessagingController` supports conversations, messages, threads, users, property managers, templates, bulk preview, and bulk operations.
- It intentionally returns a bare array for v1 conversations and envelope for `X-API-Version: 2`.
- Frontend handles this with `normalizeApiList`.

Impact:

- Mixed response versions will make typed Next.js client weaker.
- Bulk messaging is high-risk because it can send many tenant messages; contract and approval shape must be strict.

Recommendation:

- Make Next.js operator app use API v2 only.
- Require `X-API-Version: 2` or move v2 to canonical route.
- Define bulk message DTOs and delivery/audit result shape.
- Keep tenant/owner/vendor communications guarded by compliance scanner.

Priority: P1, P0 for bulk-send workflows.

### 5.5 Applications, Rental Applications, and Leasing

Finding:

- Backend has `applications` for lead applications and `rental-applications` for rental application lifecycle.
- Frontend root `RentalApplicationsManagementPage.tsx` uses `/rental-applications`.
- Copilot also uses `/rental-applications/:id/policy-evaluation`.
- `LeasingAgentService.ts` uses paths under `getApiBase()/leasing`, including `/leads`, `/properties/search`, `/tours/schedule`, and `/applications/submit`.
- Backend `LeasingController` uses route aliases `api/leasing` and `leasing`.
- `LeadApplicationsController` exposes `/applications/submit`, not under `/leasing/applications/submit`.

Impact:

- There are at least three application concepts: lead application, rental application, and leasing-agent application submission.
- The frontend service composes paths that may not match backend route grouping.

Recommendation:

- Canonicalize application domains:
  - `/leasing/leads`
  - `/leasing/tours`
  - `/rental-applications`
  - `/rental-applications/:id/review-action`
  - `/rental-applications/:id/policy-evaluation`
- Deprecate generic `/applications` for operator workflows unless it is explicitly a public applicant intake API.
- Keep public application submission separate from manager review routes.

Priority: P0.

### 5.6 Schedule

Finding:

- Backend supports `/schedule`, `/schedule/events`, `/schedule/summary`, `/schedule/daily`, `/schedule/weekly`, `/schedule/monthly`, `/schedule/today`, `/schedule/this-week`, `/schedule/this-month`, and `/schedule/expirations`.
- Frontend `SchedulePage.tsx` sometimes passes `${API_BASE}/schedule/...` into `apiFetch`; `apiFetch` currently normalizes this in common cases.

Impact:

- This works by client behavior rather than clean calling convention.
- In Next.js, a typed client should not pass full base URLs into endpoint functions.

Recommendation:

- Canonical client functions:
  - `schedule.list({ range })`
  - `schedule.summary()`
  - `schedule.create(payload)`
- Do not pass API base into endpoint names.

Priority: P1.

### 5.7 Reporting

Finding:

- `ReportingController` has `@Controller(['reports', 'reporting'])`.
- One route is declared as `@Get(' delinquency-report')` with a leading space.
- Frontend `ReportingPage.tsx` calls `/reporting/${reportType}`.

Impact:

- `/reporting/delinquency-report` likely does not match because the backend route includes a leading space.
- Duplicate `reports` and `reporting` aliases create avoidable ambiguity.

Recommendation:

- Fix route typo.
- Pick `/reporting`.
- Add route tests for all report types the frontend exposes.

Priority: P0 for typo if delinquency report is in beta.

### 5.8 E-Signature

Finding:

- Backend exposes both `esignature` and `api/esignature` aliases and excludes both from global prefix.
- Frontend `EsignatureApi.ts` uses direct `fetch('/api/esignature/...')` for many calls, bypassing `apiFetch`.

Impact:

- Auth handling, error handling, and base URL behavior are inconsistent.
- Next.js migration could simplify this with one typed client and one route family.

Recommendation:

- Keep canonical `/api/esignature` for browser-facing app.
- Remove direct fetch calls except raw file downloads.
- Add typed e-signature client.

Priority: P1.

### 5.9 Feed / API v2

Finding:

- Frontend copilot calls `/api/v2/feed`.
- With `apiFetch`, when base ends in `/api`, this normalizes to `/api/v2/feed` against the host, which is likely intended.
- Backend route `apps/admin/src/app/api/v2/[...path]` exists in `keyring-os`, but `pms-master` backend must explicitly own this proxy or route.

Impact:

- API v2 feed is unclear in `pms-master` and may be a cross-project concept.

Recommendation:

- For Next.js operator app, define command-center feed directly in backend or in a Next.js BFF route that calls backend canonical endpoints.
- Do not depend on copied `keyring-os` route assumptions unless implemented in `pms-master`.

Priority: P1.

## 6. Contract Remediation Order

### Step 1: Freeze Canonical Routes

Canonical route ownership is tracked in `docs/api-route-ownership.md`.

Initial canonical route families:

- `/auth`
- `/properties`
- `/units`
- `/leases`
- `/rental-applications`
- `/leasing`
- `/payments`
- `/payments/payment-methods`
- `/bookkeeping`
- `/maintenance`
- `/inspections`
- `/documents`
- `/messaging`
- `/schedule`
- `/reporting`
- `/esignature`
- `/policy`
- `/dashboard` or `/command-center`

### Step 2: Standardize API Envelope

Adopt:

```json
{
  "data": {},
  "meta": {},
  "errors": []
}
```

Add compatibility mappers only in backend, not in new frontend pages.

### Step 3: Generate A Typed Client

Use one of:

- OpenAPI from Nest Swagger plus generated TypeScript client.
- Zod schemas shared in a package.
- `ts-rest` style contracts.

Recommendation: use OpenAPI first because the backend already has Swagger setup.

### Step 4: Add Contract Tests

Required test categories:

- Route exists.
- Auth/role behavior.
- Response envelope shape.
- DTO validation.
- Error envelope.
- Pagination shape.
- Idempotency for financial/write endpoints.

### Step 5: Port To Next.js By Workflow

Port order:

1. Auth/session shell.
2. Operator command center.
3. Portfolio/property/unit read workflows.
4. Payments ledger read workflows.
5. Maintenance queue.
6. Inspections list/detail.
7. Applications review.
8. Messaging inbox.
9. Documents.
10. Accounting/bookkeeping.

Do not port stale pages:

- Root `PaymentsPage.tsx`; use newer/canonical payment contracts.
- Pages depending on duplicate document controller behavior.
- Pages using `applications` and `rental-applications` interchangeably.

## 7. P0 Findings Summary

| ID | Finding | Impact | Fix |
| --- | --- | --- | --- |
| C-001 | No canonical response envelope | Typed Next.js client cannot trust response shape | Standardize `{ data, meta, errors }` |
| C-002 | Duplicate `documents` controllers | Unpredictable list/download behavior | Merge controllers and route ownership |
| C-003 | Stale `/payment-methods` frontend calls | Payment method workflows fail | Use `/payments/payment-methods`; retire stale page |
| C-004 | Inspections list shape and missing/unclear `/inspections/requests` | Empty lists or failed inspection request panels | Canonicalize inspections and inspection requests |
| C-005 | `applications` vs `rental-applications` ambiguity | Application workflows can hit wrong lifecycle | Define public application vs manager review routes |
| C-006 | Reporting route typo ` delinquency-report` | Delinquency report route likely unreachable | Fix route and add route test |
| C-007 | Global prefix exclusions and controller aliases | Route behavior hard to reason about | Canonical `/api` routes and deprecate aliases |

## 8. Next Actions

1. Create Next.js operator app scaffold. Done: `operator_app`.
2. Create route ownership doc. Done: `docs/api-route-ownership.md`.
3. Fix P0 backend route conflicts before porting those domains. Initial pass done for document legacy isolation, reporting typo, and inspection request route ownership.
4. Generate OpenAPI and client. Done: `docs/api/openapi.json` and `operator_app/src/lib/api/generated/schema.ts`.
5. Add contract tests for P0 domains. Done: `tenant_portal_backend/test/operator-p0-contract.spec.ts` covers canonical P0 route existence and rejects known stale/conflicting routes.
6. Port the command center and read-only portfolio surface first.
