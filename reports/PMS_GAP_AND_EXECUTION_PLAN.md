# PMS Gap & Execution Plan (MVP → Beta / Pilot-Ready)

**Beta definition (Jordan):** Pilot-ready for **1–3 friendly customers**.

This document ties:
1) the marketing-level promise (end-state capability checklist)
2) the current repo reality (gaps/risks)
3) a prioritized execution plan to reach beta
4) a program structure (workstreams, deliverables, gates)

Related:
- `reports/PMS_END_STATE_CAPABILITY_CHECKLIST.md`

---

## 1) End-State Capability Checklist (from marketing promise)

### P0 — Must be true for “production-ready / pilot-ready” claim
- Multi-property + unit management with role-based access (tenant/PM/admin)
- Stable auth/security baseline (JWT, RBAC, audit trail for sensitive actions)
- Core workflows fully working:
  - rental application lifecycle
  - maintenance request lifecycle with SLA states
  - payments/invoices history + autopay happy path
  - lease lifecycle (create/renew/terminate tracking)
- Property search + saved filter flows functional (no dead endpoints)
- Reporting dashboards load without API contract failures
- Basic observability/logging in place (without noisy 404 spam)
- Deterministic demo/runbook path reproducible end-to-end

### P1 — Needed to support ROI claims credibly
- Rent optimization flow fully integrated into PM decisions with explainability
- Tenant support automation with measurable ticket deflection
- SLA metrics + response/resolution compliance reporting
- Operational alerts/notifications fully wired (email/in-app)
- Data quality controls for pricing/maintenance analytics
- Role-based UX polish and reduced friction on major forms

### P2 — “AI-first platform” expansion
- Voice AI reception/leasing agents
- Predictive maintenance model in production loop
- Advanced BI and portfolio forecasting
- External integrations (accounting, enterprise exports)
- Mobile-optimized/companion app maturation

---

## 2) Gap vs current `pms-master` (high-level)

### Strong
- Route scaffolding and persona separation exist
- Rental application core flow exists and is mostly aligned
- Many modules present (payments, maintenance, reporting, inspections)
- Security and architecture foundations are present

### Gaps / risks observed
- Contract mismatches still surface periodically (frontend-backend path drift)
- Some workflows are present but partial depth (PM action completeness, edge-case handling)
- Payments flow has had lease-context fragility
- QA evidence shows intermittent environment/state drift (auth/demo reproducibility issues)
- Marketing-level claims (compliance/security/ROI certainty) exceed current proof artifacts unless backed by explicit verification packs

---

## 3) Prioritized execution plan (tied to promise)

### Phase A (1–2 weeks): Trust + contract hardening
- Lock API contracts for high-value routes (search/saved filters/payments/autopay/applications)
- Add “no noisy 4xx/5xx on core route load” CI gate
- Make demo seed/auth deterministic in docker + non-docker
- Produce release-quality smoke runbook + pass/fail checklist

### Phase B (2–4 weeks): Workflow completeness
- Deep-complete PM lifecycle actions:
  - applications (approve/deny/request-info/interview)
  - maintenance SLA transitions
  - lease lifecycle consistency
- Add form negative-test suites for major entry points
- Add persistence/refresh/back-button/state tests on key flows

### Phase C (3–6 weeks): Outcome instrumentation
Instrument KPIs tied to claims:
- ticket deflection
- response/resolution SLA adherence
- rent recommendation acceptance and realized delta
- collections/late payment improvement
Build:
- evidence dashboards
- monthly operational report templates

### Phase D (ongoing): AI differentiation
- Roll forward voice/predictive features behind flags
- Ship only with clear rollback + human override controls
- Maintain eval/regression suite for AI-assisted decisions

---

## 4) Program Structure

### Objective
Deliver PMS to the end-state defined by:
- `pms-plans/marketing/PROPERTY_MANAGEMENT_SUITE_MARKETING.md`
- `OpenLoops/01_Strategy/Property_Suite/Rental-Application.md`

### Workstreams
- Product Workflow Parity
- API/Frontend Contract Hardening
- QA + Regression Automation
- Docs/Runbooks + Evidence
- Branding + GTM Assets
- Release Governance

---

## 5) Task Breakdown (deliverables + approval criteria)

### WS1 — Product Workflow Parity (P0)

**Task 1.1: Rental Application parity matrix closure**
- Deliverable: `reports/RENTAL_APPLICATION_GAP_CLOSURE.md`
- Approval criteria:
  - Every requirement marked MATCH/PARTIAL/GAP
  - All GAPs have ticket IDs + owners + dates

**Task 1.2: PM application review actions deep-complete**
- Deliverable: feature validation report + demo video
- Approval criteria:
  - Approve / Deny / Request Info / Schedule flow works E2E
  - Status transitions auditable
  - No blocker bugs in core paths

**Task 1.3: Payments lease-context stabilization**
- Deliverable: test evidence for autopay flow across roles
- Approval criteria:
  - No 400 leaseId errors in PM happy path
  - Graceful UX when lease missing
  - Smoke test green

---

### WS2 — API/Frontend Contract Hardening (P0)

**Task 2.1: Route contract reconciliation**
- Deliverable: `docs/api/FRONTEND_BACKEND_ROUTE_MATRIX.md`
- Approval criteria:
  - All frontend-called endpoints resolve in backend
  - CI check fails on unknown endpoint calls

**Task 2.2: Observability noise cleanup**
- Deliverable: console/network clean-load report
- Approval criteria:
  - No unexpected 4xx/5xx on core route load
  - Web vitals endpoint behavior explicit by env flag

---

### WS3 — QA + Regression (P0/P1)

**Task 3.1: Core flow smoke suite**
- Deliverable: automated smoke run in CI + local script
- Approval criteria:
  - Login, application flow, maintenance, payments, reporting routes pass

**Task 3.2: Negative test suite for high-risk forms**
- Deliverable: test cases + run output
- Approval criteria:
  - Required fields, format errors, duplicate submit, refresh/back behavior covered

**Task 3.3: Role-based matrix test pass**
- Deliverable: PM / Tenant / Owner coverage report
- Approval criteria:
  - Access controls behave correctly
  - No privilege leaks

---

### WS4 — Docs / Runbooks / Evidence (P1)

**Task 4.1: Canonical runbook pack**
- Deliverable: `docs/runbooks/MVP_DEMO_RUNBOOK.md` + screenshot checklist
- Approval criteria:
  - A new operator can run demo from scratch in one pass

**Task 4.2: Evidence repository standardization**
- Deliverable: structured `reports/evidence/` + naming convention doc
- Approval criteria:
  - Every release has reproducible evidence bundle

---

### WS5 — Branding + GTM Assets (P1)

**Task 5.1: Brand guide finalization**
- Deliverable: current + alternate style guides + PDFs
- Approval criteria:
  - Consistent naming, color usage, logo rules
  - Export package complete

**Task 5.2: Product narrative alignment pack**
- Deliverable: one-pager “promise vs implemented capability”
- Approval criteria:
  - No marketing claim without corresponding product evidence

---

### WS6 — Release Governance (P0)

**Task 6.1: Versioning + release gate**
- Deliverable: release checklist tied to `VERSION` + `CHANGELOG`
- Approval criteria:
  - No release without: smoke pass, route-contract pass, evidence bundle

---

## 6) Delegation plan (optional)

### Coordinator (main thread)
Owns backlog sequencing, dependency management, and final approval.

### Sub-agent roles
A) **pms-contract-auditor**
- Scope: WS2.1 route matrix + CI drift guard
- Output: route matrix doc + failing CI rule for contract drift

B) **pms-workflow-closer**
- Scope: WS1.1, WS1.2, WS1.3
- Output: gap closure report + code changes for workflow parity

C) **pms-qa-harness**
- Scope: WS3.1, WS3.2, WS3.3
- Output: automated tests + execution reports + severity-tagged findings

D) **pms-docs-evidence-ops**
- Scope: WS4.1, WS4.2
- Output: runbooks + evidence folder taxonomy + operator checklist

E) **pms-brand-gtm-sync**
- Scope: WS5.1, WS5.2
- Output: brand assets, PDFs, claim-to-capability map

F) **pms-release-manager**
- Scope: WS6.1
- Output: release gate checklist + semantic version bump proposal

---

## 7) Delegation rules (quality control)

Each sub-agent should return:
1) files changed
2) commit hash
3) test evidence
4) unresolved risks

Constraint: no sub-agent pushes cross-cutting refactors outside their scope.

Recommended merge order:
1. contract hardening
2. workflow fixes
3. QA automation
4. docs/evidence
5. branding/GTM
6. release gate
