# PMS Release Go/No-Go (Merged)

Date: 2026-03-15  
Owner: Release Team

This one-page checklist merges:
- `clawdbot_remote/pms-plans/tracking/checklists/PMS-L-01_LAUNCH_DAY_CHECKLIST.md`
- `clawdbot_remote/pms-plans/strategy/MVP_LAUNCH_READINESS.md`
- `clawdbot_remote/governance/Prod-Readiness-Checklist-v1.0.md`

---

## A) Launch-Day Operational Gate (from PMS-L-01)

### Pre-Launch
- [ ] Env vars validated
- [ ] DB backup snapshot done
- [ ] Rollback tag/artifact ready
- [ ] Stripe/webhooks + email/SMS creds validated
- [ ] DNS/SSL green
- [ ] Monitoring/alerts active
- [ ] Demo/seed data disabled in prod
- [ ] Launch feature flags confirmed
- [ ] On-call owner assigned

### Final QA Gate
- [ ] Auth smoke test
- [ ] Property/unit CRUD smoke test
- [ ] Application → lease flow
- [ ] Payment flow + receipt
- [ ] Maintenance flow + PM/owner interactions
- [ ] Inspection → estimate flow
- [ ] Mobile responsive spot-check
- [ ] Fast CI gate green
- [ ] No open P0 regressions

### Launch + Early Monitoring
- [ ] Freeze non-launch changes
- [ ] Backend deploy complete
- [ ] Frontend deploy complete
- [ ] Migrations run/verified
- [ ] Health endpoints OK
- [ ] First-user login OK
- [ ] First transaction OK
- [ ] Monitor 5xx / p95 / queue / webhooks / notifications for 4h

### Rollback Triggers
- [ ] Auth failures >5% for 10+ min
- [ ] Payment failure spike above baseline
- [ ] Core workflows unavailable
- [ ] Sustained elevated 5xx

---

## B) MVP Evidence Gate (from MVP_LAUNCH_READINESS)
- [ ] Acceptance validator pass (target: 19/19)
- [ ] Demo runbook/guide/evidence artifacts current
- [ ] Known issues reviewed + accepted
- [ ] Distribution constraints (bundle hosting) addressed if externally shared

---

## C) Governance & Safety Gate (from Prod-Readiness-Checklist)
- [ ] Non-dry-run changes require explicit approved permit
- [ ] High-risk external actions blocked unless stricter approval state met
- [ ] Canonical schema validation enforced (requests/events)
- [ ] Idempotency + replay protection active
- [ ] Concurrency locking active
- [ ] Structured audit logging enabled
- [ ] Notion/schema contract checks passing (if applicable)
- [ ] Secret handling policy enforced (no plaintext secret payloads)
- [ ] Execution isolation/sandbox requirements satisfied

---

## Final Decision
- **GO** only if all A + B pass and no critical fail in C
- **NO-GO** if any P0 defect, failed core smoke flow, or failed security/governance control
