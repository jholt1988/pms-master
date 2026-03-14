# QA Smoke Evidence Template + Pass/Fail Matrix
Date: 2026-03-15
Owner: QA Lead

Use this template during actual execution. Do not pre-fill outcomes.

---

## A) Execution Metadata
- Environment: `________________`
- Base URL: `________________`
- Build/Commit/Tag: `________________`
- Start time (TZ): `________________`
- End time (TZ): `________________`
- Executed by: `________________`
- Witness/Reviewer: `________________`

## B) Tooling / Runtime Proof
- Smoke command: `________________`
- Dependency install command: `________________`
- Automation log artifact: `________________`
- Console/video capture path (optional): `________________`

---

## C) Pass/Fail Matrix (Core Flows)

| Flow ID | Flow Name | Result (PASS/FAIL/BLOCKED) | Evidence refs (logs/screenshots/IDs) | Defect ID(s) | Owner | Notes |
|---|---|---|---|---|---|---|
| A | Auth login/logout/session |  |  |  |  |  |
| B | Property + Unit CRUD |  |  |  |  |  |
| C | Application → Lease |  |  |  |  |  |
| D | Payment method + Payment + Receipt |  |  |  |  |  |
| E | Maintenance request → PM triage |  |  |  |  |  |
| F | Inspection → Estimate |  |  |  |  |  |
| G | Mobile responsive checks |  |  |  |  |  |

---

## D) Endpoint/Baseline Checks Matrix

| Check | Expected | Actual | Result | Evidence |
|---|---|---|---|---|
| /health | 200/OK |  |  |  |
| /health/liveness | 200/OK |  |  |  |
| /health/readiness | 200/OK |  |  |  |
| /api/docs (non-prod) | reachable |  |  |  |
| Smoke harness startup | no missing-module/runtime error |  |  |  |

---

## E) Defect Capture Block
For each failed/blocked case:
- Flow ID: `____`
- Severity (P0/P1/P2): `____`
- Summary: `____`
- Exact error text: `____`
- Repro steps: `____`
- Build/Env: `____`
- Owner assigned: `____`
- Tracking ticket: `____`
- Retest required: Yes / No

---

## F) Open P0 Regression Check
- Defect board source/filter: `________________`
- Snapshot/export artifact: `________________`
- Open P0 count at decision time: `________________`
- QA statement: `________________`

---

## G) QA Smoke Gate Decision Record
- Final result: PASS / FAIL / CONDITIONAL
- Decision rationale (short):
  - `________________`
- Risks accepted (if any):
  - `________________`
- Required follow-up actions:
  - `________________`

Sign-offs:
- QA Lead: `____________`  Timestamp: `____________`
- Release Manager: `____________`  Timestamp: `____________`
- Optional (SRE/Security/Product): `____________`
