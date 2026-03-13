# PMS End-State Capability Checklist (Promise → Proof)

**Purpose:** Define the minimum pilot-ready/beta-ready capability set for the Property Management Suite (PMS), aligned to the current marketing promise and used as the release gate for 1–3 friendly customers.

**Beta definition (Jordan):** Pilot-ready for **1–3 friendly customers**.

**Primary promise anchors (source-of-truth):**
- `pms-plans/marketing/PROPERTY_MANAGEMENT_SUITE_MARKETING.md`
- `OpenLoops/01_Strategy/Property_Suite/Rental-Application.md`

**How to use this checklist**
- Each item should be marked **PASS / PARTIAL / FAIL** with a link to evidence:
  - automated tests (preferred)
  - runbook steps + screenshots
  - logs/metrics screenshots
  - API contract matrix / drift guard report
- **P0** items are required for any “production-ready” or “pilot-ready” claim.
- **P1** items are required to credibly support ROI claims in pilot conversations.
- **P2** items are explicitly *not required* for beta; they are differentiation expansion.

---

## P0 — Must be true for “production-ready / pilot-ready” claim

### Identity / Access
- [ ] Multi-property + unit management works end-to-end with role-based access (**tenant / PM / admin**)
- [ ] Stable auth/security baseline in place (**JWT, RBAC**) and enforced on core workflows
- [ ] Audit trail exists for sensitive actions (or explicit interim approach documented)

### Core workflows (E2E)
- [ ] Rental application lifecycle works end-to-end
- [ ] Maintenance request lifecycle works end-to-end (incl. SLA state progression)
- [ ] Payments/invoices history loads and **autopay happy path** works
- [ ] Lease lifecycle works end-to-end (create / renew / terminate tracking)

### Product usability / reliability
- [ ] Property search + saved filter flows functional (**no dead endpoints**)
- [ ] Reporting dashboards load without API contract failures
- [ ] Basic observability/logging in place (no noisy 404/4xx spam on core route load)
- [ ] Deterministic demo/runbook path reproducible end-to-end (seed/auth/env are stable)

---

## P1 — Needed to support ROI claims credibly

### AI/ML decision support (instrumented + explainable)
- [ ] Rent optimization flow integrated into PM decision workflow with explainability
- [ ] Tenant support automation in place with measurable ticket deflection

### Operations + compliance signals
- [ ] SLA metrics + response/resolution compliance reporting
- [ ] Operational alerts/notifications fully wired (email and/or in-app) for critical flows
- [ ] Data quality controls for pricing/maintenance analytics

### UX polish (role-based)
- [ ] Role-based UX friction reduced on major forms (validation, error states, recoverability)

---

## P2 — “AI-first platform” expansion (post-beta)

- [ ] Voice AI reception/leasing agents
- [ ] Predictive maintenance model in production loop
- [ ] Advanced BI and portfolio forecasting
- [ ] External integrations (accounting, enterprise exports)
- [ ] Mobile-optimized/companion app maturation

---

## Evidence Pack Template (recommended per pilot release)

When cutting a pilot candidate, assemble an evidence bundle (links ok) covering:
- Route contract matrix + drift guard output
- Smoke suite run output (CI + local)
- Demo runbook pass checklist + screenshots
- Seed/auth determinism notes
- Known risks + rollback/mitigation
