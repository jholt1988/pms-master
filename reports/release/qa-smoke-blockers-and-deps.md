# QA Smoke Blockers and Dependencies (P0 Closure Lane)
Date: 2026-03-15
Owner: QA Lead (execution), Release Manager (gate enforcement)

## Scope
This report identifies blockers and required dependencies to close the **P0 smoke gate** for launch-critical workflows.

## Current Status
- **Gate state:** ❌ NOT PASSED
- **Reason:** Smoke harness could not run in current environment (`Cannot find module 'axios'`), and core business-flow smokes were not executed.
- **Evidence source:** `reports/release/smoke-gate-results.md`

---

## P0 Blockers (Must Close Before GO)

| ID | Blocker | Severity | Impact | Owner | Required closure evidence |
|---|---|---|---|---|---|
| B-01 | Smoke automation fails at startup (`axios` missing). | P1 -> P0 gate dependency | No executable automated smoke baseline. | QA Automation + DevOps | Successful smoke command output artifact (timestamped). |
| B-02 | Core launch workflows not executed (auth, CRUD, lease, payment, maintenance, inspection, mobile). | P0 | No proof launch-critical user journeys work. | QA Lead | Completed runbook with pass/fail evidence per flow. |
| B-03 | No explicit proof of “no open P0 regressions” at smoke decision time. | P0 | Launch risk unknown; unresolved critical defects may remain. | QA Lead + PM | Defect-board export/filter for severity P0 + sign-off note. |
| B-04 | Test environment readiness unknown for integrated flows (payments, e-sign, notifications). | P0 | False fails/untested paths if prerequisites unavailable. | Release Manager + App Lead | Environment readiness checklist signed by owners. |

> Note: B-01 is technically a dependency issue but remains launch-gating until resolved because it blocks automation evidence.

---

## Required Dependencies

### 1) Tooling / Runtime Dependencies
- Node + package manager available in smoke execution environment.
- Install project dependencies before smoke run (`npm ci` in correct package/workspace).
- Smoke script dependencies verified (including `axios`).
- CLI tools for evidence capture (e.g., `tee`, screenshots, artifact upload path).

**Owner actions**
- **DevOps:** provide clean, reproducible smoke-run command in CI or release host.
- **QA Automation:** lock smoke command + expected outputs in runbook.

### 2) Environment Dependencies
- Target URL selected (staging/prod-candidate) and reachable.
- Health endpoints reachable: `/health`, `/health/liveness`, `/health/readiness`.
- Auth test account(s) provisioned with required roles.
- Seed/fixture data available for property/unit/application/lease/payment/maintenance/inspection flows.

**Owner actions**
- **App Lead:** confirm env vars/config parity for launch candidate.
- **SRE:** confirm DNS/TLS/network accessibility and app uptime window.

### 3) Integration Dependencies
- Payment provider testability (Stripe keys/webhooks valid in target env).
- E-sign/document flow dependencies available for application→lease handoff (if required by workflow).
- Notification channels functioning where flow depends on email/SMS delivery.

**Owner actions**
- **Payments Owner:** run provider-side test event and attach logs.
- **Integration Owner:** confirm e-sign and webhook reliability checks for smoke window.

### 4) Governance / Defect Dependencies
- Current defect board export filtered to P0 severity.
- Known issues list reconciled against smoke failures.
- Named approvers for QA GO/NO-GO sign-off present during final gate.

**Owner actions**
- **QA Lead:** attach P0 defect snapshot with timestamp.
- **Release Manager:** capture final gate decision and participants.

---

## Exit Criteria for Blocker Closure
All criteria must be met:
1. Smoke automation executes successfully in target environment.
2. All core flows in runbook executed with evidence (pass/fail per step).
3. Any failed smoke case has either:
   - fixed + re-tested PASS, or
   - approved release exception with owner + risk acceptance + expiry.
4. Defect board shows **no open P0 regressions** at decision time.
5. QA Lead signs smoke gate result and updates `reports/release/smoke-gate-results.md`.

---

## Immediate Next Actions (Ordered)
1. Fix dependency/runtime gap (B-01) and re-run automated smoke baseline.
2. Execute manual + automated core-flow runbook end-to-end.
3. Attach evidence pack and complete pass/fail matrix.
4. Close/waive failures formally and issue QA gate decision.
