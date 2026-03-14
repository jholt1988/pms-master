# QA P0 Closure Tracker and Decision Rubric
Date: 2026-03-15
Owner: QA Lead (tracking), Release Manager (decision authority)

## Purpose
Track closure of P0 QA smoke blockers and provide a deterministic GO/NO-GO rubric.

---

## 1) P0 Closure Tracker

| Item | Description | Owner | Status (OPEN/BLOCKED/CLOSED/WAIVED) | Evidence Link | Last Updated |
|---|---|---|---|---|---|
| P0-01 | Smoke automation runs successfully (no dependency/runtime blocker). | QA Automation + DevOps | OPEN |  |  |
| P0-02 | Auth flow smoke passed. | QA Lead | OPEN |  |  |
| P0-03 | Property/unit CRUD smoke passed. | QA Lead + PM Ops | OPEN |  |  |
| P0-04 | Application→lease smoke passed. | QA + Leasing Ops | OPEN |  |  |
| P0-05 | Payment + receipt smoke passed with provider proof. | QA + Payments Owner | OPEN |  |  |
| P0-06 | Maintenance triage smoke passed. | QA + Property Manager | OPEN |  |  |
| P0-07 | Inspection→estimate smoke passed. | QA + Maintenance Ops | OPEN |  |  |
| P0-08 | Mobile smoke checks passed on required viewports. | QA Lead | OPEN |  |  |
| P0-09 | Defect board confirms zero open P0 regressions. | QA Lead + PM | OPEN |  |  |
| P0-10 | QA smoke decision signed by QA Lead + Release Manager. | QA Lead + Release Manager | OPEN |  |  |

---

## 2) Decision Rubric (GO/NO-GO)

### Hard NO-GO Conditions
If any condition below is true, decision is **NO-GO**:
1. Any tracker item P0-01..P0-10 is OPEN or BLOCKED.
2. Any smoke flow has unwaived FAIL result.
3. Open P0 defects exist at decision timestamp.
4. Evidence is missing/unverifiable for any marked CLOSED item.

### Conditional (Exception) Path
A failed item may be WAIVED only if all are present:
- Named approver (Release Manager + Product + QA Lead).
- Written risk statement + user impact.
- Time-bound mitigation plan with owner and due date.
- Confirmation that waived item is not safety/security/compliance-critical.

If waiver conditions are incomplete, treat as NO-GO.

### GO Criteria
Decision can be **GO** only when:
- All P0 tracker items are CLOSED (or properly WAIVED per policy),
- Pass/fail matrix complete with evidence links,
- Zero open P0 regressions,
- Required sign-offs captured with timestamps.

---

## 3) QA Decision Worksheet (Fill at Gate Meeting)
- Gate meeting time: `________________`
- Participants: `________________`
- Tracker summary: `__ CLOSED / __ WAIVED / __ OPEN`
- Open P0 defect count: `________________`
- Waivers approved (if any): `________________`
- Final QA recommendation: GO / NO-GO
- Rationale (1-3 bullets):
  - `________________`

Signatures:
- QA Lead: `____________`  Time: `____________`
- Release Manager: `____________`  Time: `____________`
- Product Owner (if waiver used): `____________`  Time: `____________`

---

## 4) Reporting Update Requirement
After gate decision, update these artifacts:
1. `reports/release/smoke-gate-results.md`
2. `reports/RELEASE_GO_NO_GO_DECISION_2026-03-15.md` (or next dated decision file)
3. Attach evidence bundle path in both documents.
