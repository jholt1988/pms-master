# PMS — MVP Plan + Inferred Product Overview (from code review)

Date: 2026-02-04

This document has two goals:
1) **Describe the product as it exists today** (inferred from the codebase: modules, workflows, UI/UX patterns).
2) Provide a **pragmatic MVP plan** to bring each major feature area to “real-world usable” with clear acceptance criteria.

> Notes on data sources
> - I can infer a lot from the repo structure, routes, and services.
> - Calendar / email / finance integrations are not fully connected in this environment yet; this plan assumes we’ll connect them.

---

## 1) Inferred Product Overview

### 1.1 Core concept
A multi-tenant Property Management Suite with role-based experiences:
- **Tenant portal**: lease, payments, maintenance requests, messaging, documents.
- **Property manager portal**: properties/units, leases, maintenance ops, messaging, inspections, scheduling.
- **Admin**: system-level management.

Tech stack (observed):
- Frontend: **Vite + React + TypeScript**, NextUI, domain-based structure.
- Backend: **NestJS + TypeScript**, Prisma/Postgres, modular services.

### 1.2 Primary domains / modules (what’s in the codebase)
- Authentication + RBAC
- Properties & Units
- Leases + documents/e-sign
- Maintenance requests + assets + notes/photos
- Payments (Stripe) + payment methods
- Messaging (bulk + 1:1 + templates)
- Inspections (rooms/checklists/photos/signatures) + repair estimates
- Scheduling/events
- Workflows engine
- QuickBooks integration
- Analytics/monitoring + anomaly logs
- ML modules (rent optimization / predictive maintenance)

### 1.3 UI/UX patterns (observed)
- Role-based routing and domain separation.
- NextUI components + custom UI layer.
- Lazy-loaded routes and chunking.

Current UX strengths:
- Broad feature coverage.
- Modern component foundation.

Current UX risks / gaps to watch:
- Consistency: NextUI + custom variants can drift.
- “Critical but boring”: accessibility, error handling consistency, and testability will decide MVP quality.

---

## 2) MVP Plan (by feature area)

Below: each feature area includes **MVP scope**, **what to ship**, and **acceptance criteria**.

### 2.0 P0 Foundation: contract coherence (must-do before feature MVPs)
These are the “looks built but breaks at runtime” issues. Fixing them early makes every other feature cheaper and more reliable.

**P0 Contract Fixes (current known mismatches)**
- **Inspections list response shape mismatch:** some UIs read `data.data`, while some APIs return `{ inspections, total }` (or other envelopes). Result: empty lists even when backend is working.
- **Payments history endpoint mismatch:** tenant UI calls `/payments/history`, backend appears to expose `GET /payments` (and separate invoice routes). Result: tenant sees no history / broken flows.
- **Messaging bulk resources bug:** messaging UI calls `apiFetch('/messaging/bulk')` but then treats the return value like a raw `Response` (`.ok`, `.json()`), even though `apiFetch` returns JSON. Result: bulk messaging panel can throw.

**Acceptance criteria**
- One standard response envelope across tenant-facing endpoints (e.g., `{ data, meta }`), and all consuming pages use the same shape.
- One blessed inspections API surface (avoid `inspection/` vs `inspections/` duplication) used by both tenant + PM where applicable.
- No tenant/PM nav link leads to 404/unauthorized due to incorrect routes.

### 2.1 Authentication + Roles (Tenant / PM / Admin)
**MVP scope**
- Secure login/logout, password reset, session persistence.
- Role gating for all routes + API endpoints.

**Ship**
- Hardened auth flows (reset, lockout behavior, MFA optional but not required for MVP).
- Consistent error messages and “what to do next”.

**Acceptance criteria**
- A tenant cannot access PM endpoints/pages (and vice versa).
- Password reset works end-to-end.

### 2.2 Properties + Units
**MVP scope**
- CRUD: properties, units, basic metadata.
- Search/filter and clean list/detail pages.

**Ship**
- Minimal required fields, validation, and import-friendly flows.

**Acceptance criteria**
- PM can create property → add units → view unit detail.

### 2.3 Leases + Documents (incl. e-sign)
**MVP scope**
- Lease creation/assignment, lease view for tenant.
- Document upload/share and basic signature workflow.

**Ship**
- Clean “lease lifecycle” states.
- Tenant can download lease documents.

**Acceptance criteria**
- Tenant can see: lease term, rent, due date, documents.

### 2.4 Maintenance Requests
**MVP scope**
- Tenant submits request with photos.
- PM triage, assign, update status.

**Ship**
- Clear status progression + notifications.

**Acceptance criteria**
- Tenant can submit and track a request.
- PM can assign and close.

### 2.5 Payments (Stripe)
**MVP scope**
- Tenant pays rent, manages payment methods.
- PM sees payment ledger.

**Ship**
- Payment status clarity + receipts.

**Acceptance criteria**
- Successful payment + webhook reconciliation.

### 2.6 Messaging (Tenant↔PM) + Bulk Messaging
**MVP scope**
- 1:1 thread per tenant/unit/lease context.
- Bulk messaging templates.

**Ship**
- Deliverability + audit log.

**Acceptance criteria**
- Messages can be sent/received reliably; visible history.

### 2.7 Inspections + Repair Estimates (current focus)
**MVP scope**
- Create inspection → rooms/checklist → photos/signatures.
- Convert inspection action items into repair estimate.

**Already shipped (recent)**
- Inspection detail route with per-room checklist editing + atomic save.
- Estimate generation + estimate history.
- Bid range + 5-level confidence (displayed) while persisting midpoint totals.
- Structured action inputs (severity / issue type / measurements).
- Labor pricing baseline (city/state + overhead) to ground ranges.

**Next milestone(s)**
1) Wire labor rate ranges into the actual bid low/high computations end-to-end.
2) Add subtle “rate source” line and confidence rationale.
3) Add a lightweight materials baseline (later; optional for MVP).

**Acceptance criteria**
- For a given inspection, estimate is deterministic-ish (no wild swings) and explainable.
- Estimates store midpoint totals; UI shows bid range + confidence.

### 2.8 Scheduling / Calendar
**MVP scope**
- PM schedules inspections/tours.
- Tenant sees upcoming events.

**Acceptance criteria**
- Calendar list + event detail + reminders.

### 2.9 Accounting (QuickBooks)
**MVP scope**
- Optional for MVP unless required by your customers.

**Acceptance criteria**
- If enabled: stable connection + basic sync.

### 2.10 Monitoring, security, and “production readiness”
**MVP scope**
- Error logging, basic metrics, secure defaults.
- Test coverage for critical flows.

**Acceptance criteria**
- No known critical security issues.
- Basic smoke tests for core flows.

---

## 3) What I need from you (to refine MVP definitions)
1) Who is MVP user #1: **solo landlord**, **small PM company**, or **mid-size PM**?
2) Payments: rent-only vs rent + fees + partial payments?
3) Messaging: in-app only vs SMS/email?

---

## Appendix: Sources (repo docs)
- assessments/CODEBASE_ASSESSMENT_REPORT.md
- docs/P0_IMPLEMENTATION_SUMMARY.md
- docs/property_management_gap_analysis.md
