# QA Smoke Runbook — Core Flows (Executable)
Date: 2026-03-15
Owner: QA Lead
Execution mode: Automated where available + manual verification for business journeys

## Important Constraint
This runbook is executable, but **no execution is claimed in this document**. Record actual outcomes in the evidence template.

---

## 0) Preconditions (Must be true before start)
- [ ] Target environment selected: `________________`
- [ ] Build/artifact version: `________________`
- [ ] Smoke dependencies installed (including axios): `npm ci` completed
- [ ] QA test users available:
  - [ ] Admin/PM user
  - [ ] Agent/Leasing user
  - [ ] Tenant user
- [ ] Test data prepared (or IDs pre-created)
- [ ] Payment test method available
- [ ] Evidence folder created for run artifacts/screenshots/logs

Command baseline (example):
```bash
node scripts/smoke-tests/run-smoke-tests.js | tee reports/release/artifacts/smoke-automation-$(date +%F-%H%M).log
```

---

## 1) Automated Baseline Checks

### 1.1 Health / Readiness / Docs
1. Execute smoke harness.
2. Verify endpoints return expected status:
   - `/health`
   - `/health/liveness`
   - `/health/readiness`
   - `/api/docs` (if non-prod)

Pass criteria:
- [ ] Harness runs without module/runtime errors.
- [ ] Endpoints return expected success status.

Evidence:
- [ ] Attached smoke harness log path: `________________`

---

## 2) Core Business Smoke Flows (Manual/Hybrid)

For each flow: record exact entity IDs, timestamps, screenshots, and API traces where possible.

### Flow A — Auth (Login/Session/Logout)
Steps:
1. Login with valid QA user.
2. Verify dashboard/home loads.
3. Logout and verify session invalidated.

Pass criteria:
- [ ] Valid login works.
- [ ] Protected page access requires auth after logout.

Owner: QA Lead

### Flow B — Property + Unit CRUD
Steps:
1. Create property.
2. Create unit under property.
3. Edit property and unit fields.
4. Deactivate/archive (or delete) test records as per system behavior.
5. Confirm list/detail reflect updates.

Pass criteria:
- [ ] Create/read/update/delete-or-archive actions succeed.
- [ ] Data consistency across list/detail views.

Owner: QA + PM Ops

### Flow C — Application → Lease
Steps:
1. Create/submit rental application.
2. Progress application through approval decision.
3. Convert approved application to lease.
4. Validate lease record values (parties, dates, rent, unit link).

Pass criteria:
- [ ] Application can move to approved state.
- [ ] Lease creation from approved app succeeds.
- [ ] Lease references correct unit/applicant.

Owner: QA + Leasing Ops

### Flow D — Payment Method + Payment + Receipt
Steps:
1. Attach/add payment method (test mode).
2. Post a payment against lease/account.
3. Verify transaction status success.
4. Verify receipt artifact/record generated and visible.

Pass criteria:
- [ ] Payment captured/recorded successfully.
- [ ] Receipt generated and retrievable.

Owner: QA + Payments Owner

### Flow E — Maintenance Request → PM Triage
Steps:
1. Tenant creates maintenance request.
2. PM/Admin views and triages (assign/priority/status/comment).
3. Confirm status updates and audit trail/comments visible.

Pass criteria:
- [ ] Request creation and triage both succeed.
- [ ] Assignment/status/comment persist correctly.

Owner: QA + Property Manager

### Flow F — Inspection → Estimate
Steps:
1. Create inspection entry for unit/property.
2. Record findings requiring estimate.
3. Generate/link estimate from inspection findings.

Pass criteria:
- [ ] Inspection saved with findings.
- [ ] Estimate generated/linked correctly.

Owner: QA + Maintenance Ops

### Flow G — Mobile Responsive Checks
Devices/viewports (minimum):
- [ ] iPhone 12/13-ish viewport
- [ ] Android mid-size viewport

Steps:
1. Login and navigate key pages.
2. Execute one quick transaction (e.g., maintenance request create or payment view).
3. Validate no blocking UI breakages (overflow, hidden primary CTAs, unusable forms).

Pass criteria:
- [ ] Core tasks are usable on mobile viewport.
- [ ] No P0/P1 UI blocker observed.

Owner: QA (manual)

---

## 3) Failure Handling Rules
- Any failed step must include:
  - exact error text,
  - screenshot/log reference,
  - suspected component,
  - severity proposal.
- For P0 failure: immediately mark smoke gate **FAIL**, notify Release Manager, stop GO recommendation.
- Re-test only after fix is deployed and version is recorded.

---

## 4) Final Smoke Gate Decision
Gate can be marked PASS only when:
- [ ] Automated baseline completed without runtime blocker.
- [ ] Flows A–G all PASS (or formally waived with signed risk acceptance).
- [ ] No open P0 regressions.
- [ ] QA Lead + Release Manager sign-off captured.

Sign-off:
- QA Lead: `____________`  Time: `____________`
- Release Manager: `____________`  Time: `____________`
