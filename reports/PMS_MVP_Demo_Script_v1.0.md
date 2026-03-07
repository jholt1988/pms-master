# PMS MVP Demo Script (Presenter Talk Track)

**Based on:** `reports/PMS_MVP_Demo_Runbook_v1.3.md`  
**Version:** 1.0  
**Length:** ~25–35 minutes  
**Audience:** PMs, Owners, internal stakeholders

---

## 0) Opening (60–90 sec)

**Say:**
"Today I’ll show how our PMS handles the full lifecycle: applicant intake, leasing, payments, maintenance, inspections, owner visibility, and the ML-readiness layer. Everything you’ll see is from one integrated workflow."

**Goal on slide/screen:**
- Path A: Applicant → Tenant
- Path B: AI Inspection + Estimate
- Path C: Owner experience
- Path D: ML simulation + readiness evidence

---

## 1) Path A — Full Story: Applicant to Tenant (8–10 min)

### Scene A1 — Property setup
**Do:** Open PM dashboard → create/open property + unit.  
**Say:**
"We start from the operator side. PM can stand up inventory quickly and keep occupancy context accurate at the unit level."

**Evidence targets:** `1_2_property-creation-form.png`, `1_3_property-detail-units.png`

### Scene A2 — Application intake
**Do:** Submit/review an application.  
**Say:**
"Applications come in with structured tenant data and legal acceptance. PM can review and move directly into lease workflow."

**Evidence targets:** `2_1_application-form.png`, `2_2_application-review-pm.png`

### Scene A3 — Lease + tenant onboarding
**Do:** Show tenant welcome/lease view.  
**Say:**
"Once approved, onboarding is immediate: lease docs are visible and tenant state is now active in the platform."

**Evidence target:** `3_1_lease-document-view.png`

### Scene A4 — Payments
**Do:** Show payment method + Pay Now action.  
**Say:**
"Stripe Pay Now is live. Tenant can add payment method and submit rent in-flow."

**Evidence targets:** `4_1_payment-method-added.png`, `4_2_payment-confirmation.png`

---

## 2) Path B — AI Inspection / Estimate Flow (7–9 min)

### Scene B1 — Maintenance intake + triage
**Do:** Tenant submits maintenance with photo → PM queue view.  
**Say:**
"Request intake captures enough structure for triage, assignment, and downstream analytics."

**Evidence targets:** `5_1_maintenance-request-form.png`, `5_2_pm-queue-view.png`, `5_3_request-detail-messaging.png`

### Scene B2 — Inspection workflow
**Do:** Open inspection flow (move-in/routine/move-out).  
**Say:**
"Inspection runs through a repeatable checklist and creates a defensible data trail for maintenance decisions."

**Evidence targets:** `6_1_inspection-type-selector.png`, `6_2_inspection-checklist.png`

### Scene B3 — AI-assisted estimate generation
**Do:** Generate/regenerate estimate and show history/line item changes.  
**Say:**
"The AI layer suggests work plans and cost ranges. We keep history so PMs can audit changes and compare outcomes."

**Evidence targets:** `6_3_ai-report-routine.png`, `6_4_ai-report-move-out.png`

---

## 3) Path C — Owner Perspective (4–5 min)

### Scene C1 — Owner dashboard visibility
**Do:** Switch to owner-facing dashboard + maintenance history + comments.  
**Say:**
"Owners get transparency without operator overload: property KPIs, maintenance history, and commentable request context."

**Evidence targets:** `7_1_owner-dashboard.png`, `7_2_owner-maintenance-view.png`, `7_3_owner-comment-badge.png`

---

## 4) Path D — ML Simulation Lab (5–7 min)

### Scene D1 — Run simulation pipeline
**Do (terminal):**
```bash
cd tenant_portal_backend
npm run ml:simulate:demo
```

**Say:**
"This command seeds robust inspection data and generates ML-readiness snapshots so we can show model readiness with evidence, not assumptions."

### Scene D2 — Readiness artifact walkthrough
**Do:** Open `tenant_portal_backend/reports/ml-data-readiness-latest.md`  
**Say:**
"We score readiness across three tracks: inspection MIL, maintenance survival, and payment NBA. This tells us where data quality is sufficient and where we still need coverage."

---

## 5) Manual Payments/Charges Feature Highlight (optional 3–4 min add-on)

**Do:** Lease lifecycle manager → Manage workflow → Manual Payments + Manual Charges sections.  
**Say:**
"PM/Admin can now post offline payments (cash/check/money order), add manual charges, and reverse/void with reason capture for auditability."

**Show:**
- Post manual payment
- Reverse payment
- Post manual charge
- Void charge
- Reporting summaries + CSV exports

---

## 6) Close (60 sec)

**Say:**
"In one system, we’ve covered leasing, payments, maintenance, inspections, owner visibility, and ML-readiness with evidence capture. The product is execution-first: every major flow is demonstrable, measurable, and auditable."

**Call to action:**
- Confirm acceptance checklist rows
- Confirm evidence index is complete
- Approve next release gate

---

## Presenter checklist (quick)

- [ ] Demo users can log in (PM/Admin, tenant, owner)
- [ ] Stripe/test payment path loaded
- [ ] Inspection demo data seeded
- [ ] `ml-data-readiness-latest.md` regenerated
- [ ] Screenshot folder + naming convention ready
- [ ] `pms-plans/demo-evidence.md` updated after run

---

## Backup commands

### Demo reset
```bash
bash scripts/pms-dev/demo-reset.sh --root ./pms-master
cd pms-master/tenant_portal_backend && npm run seed:verify:demo
```

### ML refresh
```bash
cd pms-master/tenant_portal_backend
npm run ml:simulate:demo
```
