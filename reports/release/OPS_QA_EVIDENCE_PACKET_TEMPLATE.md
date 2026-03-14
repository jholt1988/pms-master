# OPS + QA P0 Evidence Packet Template
Date: 2026-03-15

Use this template to submit closure evidence for OPS and QA P0 items.

---

## OPS Lane

### [OPS-01] Validate STRIPE production config end-to-end
- **Status:** <CLOSED | IN_PROGRESS | BLOCKED>
- **Owner:** <Ops/SRE>
- **Date/Time (GMT+8):** <>
- **Environment:** <prod>
- **Summary:** <Validated Stripe key/account mapping and runtime config integrity.>

#### Steps Executed
1. Confirmed env key presence and non-placeholder value.
2. Verified account mapping in runtime.
3. Confirmed app can initialize payment flow without config errors.

#### Commands / Checks Run
```bash
<command>
<command>
```

#### Results
- **Expected:** Stripe config is valid and usable in prod.
- **Actual:** <>
- **Outcome:** <PASS | FAIL>
- **Notes:** <>

#### Evidence Links
- <log/screenshot/report>
- <log/screenshot/report>

#### Risk / Impact
- **Severity:** P0
- **User/Release Impact:** Payment flow cannot be trusted for launch if failed.

#### Follow-up Actions
- [ ] <action + owner + ETA>

#### Sign-off
- **Submitted by:** <>
- **Reviewed by:** <>
- **Final Decision for this item:** <ACCEPTED | REJECTED | NEEDS_RETEST>


### [OPS-02] Validate payment webhook configuration
- **Status:** <CLOSED | IN_PROGRESS | BLOCKED>
- **Owner:** <Ops/SRE>
- **Date/Time (GMT+8):** <>
- **Environment:** <prod/staging>
- **Summary:** <Verified webhook endpoint, signature config, and event processing path.>

#### Steps Executed
1. Verified configured webhook endpoint matches expected.
2. Triggered test event/replay.
3. Confirmed event verified and processed successfully.

#### Commands / Checks Run
```bash
<command>
<command>
```

#### Results
- **Expected:** Signed webhook events process successfully and securely.
- **Actual:** <>
- **Outcome:** <PASS | FAIL>
- **Notes:** <>

#### Evidence Links
- <event log>
- <processing log>

#### Risk / Impact
- **Severity:** P0
- **User/Release Impact:** Billing/payment reliability risk if failed.

#### Follow-up Actions
- [ ] <action + owner + ETA>

#### Sign-off
- **Submitted by:** <>
- **Reviewed by:** <>
- **Final Decision for this item:** <ACCEPTED | REJECTED | NEEDS_RETEST>


### [OPS-03] Execute backup + restore drill in non-prod
- **Status:** <CLOSED | IN_PROGRESS | BLOCKED>
- **Owner:** <DBA/SRE>
- **Date/Time (GMT+8):** <>
- **Environment:** <non-prod restore target>
- **Summary:** <Executed snapshot + restore + verification queries; measured RTO/RPO.>

#### Steps Executed
1. Created/selected backup snapshot.
2. Restored into non-prod environment.
3. Ran integrity verification queries.
4. Recorded RTO/RPO.

#### Commands / Checks Run
```bash
<backup command>
<restore command>
<verification query>
```

#### Results
- **Expected:** Successful restore and verified data integrity within acceptable RTO/RPO.
- **Actual:** <>
- **Outcome:** <PASS | FAIL>
- **Notes:** <>

#### Evidence Links
- <snapshot id/log>
- <restore log>
- <query output>

#### Risk / Impact
- **Severity:** P0
- **User/Release Impact:** Recovery confidence absent if failed.

#### Follow-up Actions
- [ ] <action + owner + ETA>

#### Sign-off
- **Submitted by:** <>
- **Reviewed by:** <>
- **Final Decision for this item:** <ACCEPTED | REJECTED | NEEDS_RETEST>


### [OPS-04] Finalize and sign rollback SOP
- **Status:** <CLOSED | IN_PROGRESS | BLOCKED>
- **Owner:** <Release Manager + Ops>
- **Date/Time (GMT+8):** <>
- **Environment:** <n/a>
- **Summary:** <Rollback SOP finalized, reviewed, and signed; dry-run logic confirmed.>

#### Steps Executed
1. Reviewed rollback triggers and decision gates.
2. Confirmed backend/frontend rollback instructions.
3. Signed SOP and attached dry-run notes.

#### Commands / Checks Run
```bash
<n/a or dry-run command>
```

#### Results
- **Expected:** Actionable rollback SOP approved and ready.
- **Actual:** <>
- **Outcome:** <PASS | FAIL>
- **Notes:** <>

#### Evidence Links
- <signed SOP>
- <dry-run notes>

#### Risk / Impact
- **Severity:** P0
- **User/Release Impact:** Prolonged incident risk if failed.

#### Follow-up Actions
- [ ] <action + owner + ETA>

#### Sign-off
- **Submitted by:** <>
- **Reviewed by:** <>
- **Final Decision for this item:** <ACCEPTED | REJECTED | NEEDS_RETEST>


### [OPS-05] Health endpoint + CORS/API alignment verification
- **Status:** <CLOSED | IN_PROGRESS | BLOCKED>
- **Owner:** <Ops/SRE>
- **Date/Time (GMT+8):** <>
- **Environment:** <prod/staging>
- **Summary:** <Validated health checks and API/CORS alignment for release paths.>

#### Steps Executed
1. Checked health endpoints.
2. Validated frontend-backend API base URLs.
3. Confirmed CORS allows expected origins only.

#### Commands / Checks Run
```bash
<curl health>
<config check>
```

#### Results
- **Expected:** Healthy endpoints and valid CORS/API alignment.
- **Actual:** <>
- **Outcome:** <PASS | FAIL>
- **Notes:** <>

#### Evidence Links
- <health logs>
- <config diff/log>

#### Risk / Impact
- **Severity:** P0/P1 (per failure type)
- **User/Release Impact:** Availability/integration risk.

#### Follow-up Actions
- [ ] <action + owner + ETA>

#### Sign-off
- **Submitted by:** <>
- **Reviewed by:** <>
- **Final Decision for this item:** <ACCEPTED | REJECTED | NEEDS_RETEST>

---

## QA Lane

### [QA-01] Resolve smoke blockers/dependencies
- **Status:** <CLOSED | IN_PROGRESS | BLOCKED>
- **Owner:** <QA Lead + Eng Lead>
- **Date/Time (GMT+8):** <>
- **Environment:** <staging/non-prod>
- **Summary:** <Resolved prerequisite blockers and validated test dependencies.>

#### Steps Executed
1. Reviewed blocker list.
2. Installed/fixed missing dependencies.
3. Confirmed smoke suite can run end-to-end.

#### Commands / Checks Run
```bash
<dependency/install command>
<test precheck command>
```

#### Results
- **Expected:** No blocker prevents smoke execution.
- **Actual:** <>
- **Outcome:** <PASS | FAIL>
- **Notes:** <>

#### Evidence Links
- <blocker log update>
- <precheck output>

#### Risk / Impact
- **Severity:** P0
- **User/Release Impact:** Smoke gate impossible if failed.

#### Follow-up Actions
- [ ] <action + owner + ETA>

#### Sign-off
- **Submitted by:** <>
- **Reviewed by:** <>
- **Final Decision for this item:** <ACCEPTED | REJECTED | NEEDS_RETEST>


### [QA-02] Run core flow smoke suite
- **Status:** <CLOSED | IN_PROGRESS | BLOCKED>
- **Owner:** <QA Lead>
- **Date/Time (GMT+8):** <>
- **Environment:** <staging/prod-like>
- **Summary:** <Executed required core-flow smoke set.>

#### Required Flows
- [ ] Auth login/logout
- [ ] Property + unit CRUD
- [ ] Application → lease
- [ ] Payment + receipt
- [ ] Maintenance request + triage
- [ ] Inspection → estimate

#### Commands / Checks Run
```bash
<smoke command>
<manual checklist refs>
```

#### Results
- **Expected:** All required flows pass.
- **Actual:** <>
- **Outcome:** <PASS | FAIL>
- **Notes:** <defects if any>

#### Evidence Links
- <pass/fail matrix>
- <screenshots/logs/video>

#### Risk / Impact
- **Severity:** P0
- **User/Release Impact:** Core product readiness invalid if failed.

#### Follow-up Actions
- [ ] <action + owner + ETA>

#### Sign-off
- **Submitted by:** <>
- **Reviewed by:** <>
- **Final Decision for this item:** <ACCEPTED | REJECTED | NEEDS_RETEST>


### [QA-03] Validate mobile responsive checks
- **Status:** <CLOSED | IN_PROGRESS | BLOCKED>
- **Owner:** <QA + Frontend Lead>
- **Date/Time (GMT+8):** <>
- **Environment:** <test devices/browsers>
- **Summary:** <Verified mobile responsiveness for key release views.>

#### Steps Executed
1. Tested defined device/browser matrix.
2. Captured viewport-specific evidence.
3. Logged UI defects and retest status.

#### Commands / Checks Run
```bash
<manual/device test notes>
```

#### Results
- **Expected:** Key flows usable on target mobile breakpoints.
- **Actual:** <>
- **Outcome:** <PASS | FAIL>
- **Notes:** <>

#### Evidence Links
- <device matrix>
- <screenshots>

#### Risk / Impact
- **Severity:** P0
- **User/Release Impact:** Mobile user journey degraded if failed.

#### Follow-up Actions
- [ ] <action + owner + ETA>

#### Sign-off
- **Submitted by:** <>
- **Reviewed by:** <>
- **Final Decision for this item:** <ACCEPTED | REJECTED | NEEDS_RETEST>


### [QA-04] Complete gate decision worksheet
- **Status:** <CLOSED | IN_PROGRESS | BLOCKED>
- **Owner:** <QA Lead + Release Manager>
- **Date/Time (GMT+8):** <>
- **Environment:** <n/a>
- **Summary:** <Final QA gate decision recorded with rationale.>

#### Steps Executed
1. Reviewed all QA evidence artifacts.
2. Mapped defects to severity and release risk.
3. Recorded final QA recommendation.

#### Commands / Checks Run
```bash
<n/a>
```

#### Results
- **Expected:** Deterministic QA GO/NO-GO recommendation.
- **Actual:** <>
- **Outcome:** <PASS | FAIL>
- **Notes:** <>

#### Evidence Links
- <signed worksheet>
- <final QA report>

#### Risk / Impact
- **Severity:** P0
- **User/Release Impact:** Release decision lacks QA integrity if missing.

#### Follow-up Actions
- [ ] <action + owner + ETA>

#### Sign-off
- **Submitted by:** <>
- **Reviewed by:** <>
- **Final Decision for this item:** <ACCEPTED | REJECTED | NEEDS_RETEST>
