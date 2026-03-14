# Next 48h Execution Board (P0 + Marketing Alignment)
Date: 2026-03-15
Window: Next 48 hours
Primary Objective: Close highest-risk P0 blockers while preserving launch momentum through safe prelaunch marketing work.

## Command Center References
- `reports/release/P0_CLOSURE_MASTER_BOARD_2026-03-15.md`
- `reports/marketing/PMS_UNIFIED_MARKETING_PLAN_2026-03-15.md`
- `reports/marketing/PMS_WEEK_BY_WEEK_EXECUTION_BOARD_2026-03-15.md`

---

## Priority Order
1. **Security P0 containment and rotation**
2. **Ops P0 config + backup/restore + rollback evidence**
3. **QA P0 blocker closure + smoke execution readiness**
4. **Marketing prelaunch-safe tasks only (no full launch claims)**

---

## A) Security Lane — Next 48h
| Task | Owner | Deadline | Evidence Required | Status |
|---|---|---|---|---|
| Revoke/rotate exposed DocuSign private key | Security Lead | +12h | Provider confirmation + ticket/reference + timestamp | OPEN |
| Remove key file from active branch and confirm no plaintext key remains | Security + Repo Admin | +18h | PR/commit link + scan output | OPEN |
| Run secret scan baseline (repo-wide) | Platform Eng | +20h | Scan command output attached | OPEN |
| Enable CI secret scanning | Platform Eng | +30h | Workflow file + passing CI run | OPEN |
| Publish remediation note draft | Security Lead | +36h | `reports/release/security-remediation.md` updated with closure notes | OPEN |

Suggested execution commands (manual owner run):
- `git grep -n "BEGIN PRIVATE KEY\|PRIVATE KEY"`
- `gitleaks detect --source . --verbose`

---

## B) Ops Lane — Next 48h
| Task | Owner | Deadline | Evidence Required | Status |
|---|---|---|---|---|
| Validate STRIPE prod key + account mapping | Ops/SRE | +12h | Completed checklist + masked screenshots/logs | OPEN |
| Validate payment webhook signing + event handling | Ops/SRE | +18h | Test event logs + endpoint verification output | OPEN |
| Run backup snapshot + restore drill in non-prod | DBA/SRE | +30h | Drill report with RTO/RPO + verification queries | OPEN |
| Finalize and sign rollback SOP | Release Manager + Ops | +36h | Signed SOP + dry-run notes | OPEN |
| Close ops tracker items OPS-01..OPS-05 | Ops Lead | +48h | Tracker status updated with links | OPEN |

---

## C) QA Lane — Next 48h
| Task | Owner | Deadline | Evidence Required | Status |
|---|---|---|---|---|
| Close smoke blockers/dependencies | QA Lead + Eng Lead | +16h | Blocker closure log + dependency proof | OPEN |
| Execute core-flow smoke run | QA Lead | +32h | Completed pass/fail matrix + screenshots/logs | OPEN |
| Execute mobile checks matrix | QA + Frontend Lead | +36h | Device matrix + evidence bundle | OPEN |
| Complete gate decision worksheet | QA + Release Manager | +42h | Signed worksheet with GO/NO-GO rationale | OPEN |
| Update P0 master board QA rows | QA Lead | +48h | QA-01..QA-04 status set with links | OPEN |

---

## D) Marketing Lane (Allowed During NO-GO)
**Only safe prelaunch tasks; no GA announcement or hard quantitative claims.**

| Task | Owner | Deadline | Evidence Required | Status |
|---|---|---|---|---|
| Finalize claims register tags across launch assets | PMM | +18h | Tagged copy snapshot + approval notes | OPEN |
| Patch placeholders in email/social/blog drafts | Content + Lifecycle | +20h | Diff/commit links to corrected files | OPEN |
| Build media kit v1 from approved assets | Design Lead | +30h | Media kit folder/index file | OPEN |
| Prepare Week 1-2 content calendar | PMM + Social | +36h | Calendar artifact with owner/date/channel | OPEN |
| Keep all launch posts in draft-only state | PMM | continuous | Draft links with “Hold until GO” label | OPEN |

---

## Checkpoints
- **T+12h:** Security + Ops first proof check
- **T+24h:** Midpoint review (track overdue items)
- **T+36h:** QA evidence quality review + rollback/sign-off check
- **T+48h:** P0 closure review and updated release decision recommendation

---

## Stop/Go Rule at T+48h
- If any Security/Ops/QA P0 item is still OPEN without approved waiver: **remain NO-GO**.
- If all P0 items are CLOSED with evidence and sign-off: schedule expedited GO re-review.

---

## Owner Update Template (copy/paste)
`[LANE] [TASK-ID] [STATUS] [BLOCKER:none|short-note] [EVIDENCE:link] [NEXT:action] [ETA]`

Example:
`[OPS] OPS-03 IN_PROGRESS [BLOCKER:none] [EVIDENCE:reports/release/backup-restore-drill-runbook.md#run-2026-03-16] [NEXT:complete verification queries] [ETA:14:00]`
