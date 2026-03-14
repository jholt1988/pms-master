# Ops P0 Closure Tracker — Release 2026-03-15
Owner: Release Manager
Status: OPEN

## Objective
Track and close all Ops P0 blockers required for GO decision.

## P0 Items

| ID | Work Item | Priority | Owner | Status | Evidence Required | Due | Notes |
|---|---|---|---|---|---|---|---|
| OPS-P0-01 | Stripe prod secret/config verified (`STRIPE_SECRET_KEY`, webhook secret, live account match) | P0 | App Lead | OPEN | Completed checklist in `ops-prod-config-verification.md` (A1–A4) + provider evidence | Immediate | Previously identified missing key |
| OPS-P0-02 | Backup snapshot freshness + successful restore drill documented | P0 | DBA/SRE | OPEN | Filled evidence block in `backup-restore-drill-runbook.md` incl. RTO/RPO | Immediate | Must prove recoverability before GO |
| OPS-P0-03 | Rollback SOP executed as tabletop and approved by on-call team | P0 | Incident Commander | OPEN | Completed execution record in `rollback-sop.md` + attendee sign-off | Immediate | Must include DB decision gate clarity |
| OPS-P0-04 | Launch artifact freeze (rollback target digests/hashes/migration boundary) | P0 | Release Manager | OPEN | Artifact manifest link + sign-off in launch log | Immediate | Required for deterministic rollback |
| OPS-P0-05 | Smoke gate passed after config and readiness fixes | P0 | QA Lead | OPEN | Updated `reports/release/smoke-gate-results.md` = PASS | Immediate | GO blocked until pass |

---

## Needs Manual Verification Queue

| Item | Owner | Exact Command | Expected Output | Status |
|---|---|---|---|---|
| Stripe account/key validation | App Lead | `stripe whoami` | Correct production account shown | OPEN |
| Stripe webhook delivery confirmation | App Lead | `stripe trigger payment_intent.succeeded` | Dashboard delivery status 2xx | OPEN |
| Latest DB snapshot inventory | DBA/SRE | `aws rds describe-db-snapshots --db-instance-identifier <DB_INSTANCE> --snapshot-type automated --max-items 5` | Latest snapshot within RPO target | OPEN |
| Restore drill availability wait | DBA/SRE | `aws rds wait db-instance-available --db-instance-identifier <DRILL_DB_INSTANCE>` | Command exits successfully | OPEN |
| Production health endpoint verification | SRE | `curl -fsS https://<PROD_API_HOST>/health/readiness` | 200/success payload | OPEN |

> If non-AWS infrastructure is used, replace command with platform-specific equivalent and keep transcript.

---

## Closure Criteria (all required)
- [ ] OPS-P0-01 closed with evidence
- [ ] OPS-P0-02 closed with evidence
- [ ] OPS-P0-03 closed with evidence
- [ ] OPS-P0-04 closed with evidence
- [ ] OPS-P0-05 closed with evidence
- [ ] Release Manager, SRE, QA sign-offs complete

## Final Ops Gate
- **Ops Gate Result:** PASS / FAIL
- **Decision Timestamp (TZ):** __________________
- **Approvers:** _______________________________
