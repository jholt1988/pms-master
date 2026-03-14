# PMS Launch-Day Runbook (Finalized)
Date: 2026-03-15
Owner: Release Manager (Primary), SRE On-call (Secondary)

## Checks performed (for this runbook finalization)
1. Merged launch checklist + go/no-go criteria into executable timeline.
2. Incorporated current repo constraints discovered during readiness checks.
3. Added explicit blocker gates and manual-verification owner actions.

## Evidence / sources used
- `reports/RELEASE_GO_NO_GO_MERGED.md`
- `clawdbot_remote/pms-plans/tracking/checklists/PMS-L-01_LAUNCH_DAY_CHECKLIST.md`
- Readiness reports in `reports/release/*.md`

## Pass / Fail / Risk
- ✅ **PASS**: End-to-end operational sequence documented with owners and checkpoints.
- ⚠️ **RISK**: This runbook is executable only after open P0 blockers are cleared.

## Blockers (must be resolved before GO)
- **P0**: Missing prod `STRIPE_SECRET_KEY` / unverified payments config.
- **P0**: No verified backup+restore drill evidence and no formal rollback SOP artifact.
- **P0**: Final QA smoke gate not passed for core launch workflows.

## T-24h to T-2h — Pre-Launch
1. **Config Lock Check (Owner: App Lead)**
   - Verify all required prod env keys present and non-placeholder.
   - Confirm Stripe/webhook/email/SMS credentials with provider test events.
2. **Backup Snapshot (Owner: DBA/SRE)**
   - Create DB snapshot and record snapshot ID + timestamp in launch log.
   - Validate snapshot restorability (recent drill evidence attached).
3. **Rollback Artifact Freeze (Owner: Release Manager)**
   - Pin backend image digest, frontend artifact hash, migration IDs, rollback target.
4. **Platform Check (Owner: SRE)**
   - DNS/SSL green for production host; cert valid and not near expiry.
5. **Ops Readiness (Owner: Incident Commander)**
   - On-call roster confirmed; incident channel + paging policy active.

## T-2h to T-30m — Final QA Gate
1. Run smoke automation (health/readiness/liveness/authenticated checks).
2. Execute manual critical flows:
   - Auth login/logout
   - Property + unit CRUD
   - Application → lease
   - Payment method + payment + receipt
   - Maintenance request + PM triage + owner comment
   - Inspection → estimate
   - Mobile responsive spot-check
3. Confirm fast CI gate green and **no open P0**.
4. **GO/NO-GO call**
   - GO only if all above pass and blockers cleared.

## T-30m to T+30m — Launch Execution
1. Announce launch start + freeze non-launch changes.
2. Deploy backend (approved artifact only).
3. Deploy frontend (approved artifact only).
4. Run migrations (if any) and verify migration IDs.
5. Validate health endpoints and first-user login.
6. Validate first transaction flow.
7. Announce launch complete; enter monitoring phase.

## T+30m to T+4h — Early Monitoring
Monitor and log every 15 minutes:
- 5xx/client error rates
- p95 latency + CPU/memory
- queue lag/background jobs
- payments/webhooks processing
- notification delivery success
Escalate immediately if rollback trigger thresholds are hit.

## Rollback Triggers (Immediate)
- Auth failures > 5% for 10+ min
- Payment failure spike above baseline
- Core workflow unavailable
- Sustained elevated 5xx

## Rollback Steps (Owner: Incident Commander)
1. Announce rollback start in incident channel.
2. Revert backend/frontend to pinned rollback artifacts.
3. Restore DB **only if required by migration impact assessment**.
4. Re-run critical smoke checks.
5. Publish rollback incident note with owner and follow-up actions.

## Needs Manual Verification (explicit owner actions)
- **DBA/SRE**: attach latest snapshot + restore drill transcript.
- **App Lead**: attach provider-side webhook test evidence and Stripe live credential check.
- **QA Lead**: attach signed smoke results and P0 defect board snapshot.
- **Release Manager**: attach final artifact manifest (SHA/digests/migrations).

## Recommended actions
1. Resolve all P0 blockers before scheduling GO/NO-GO.
2. Store this runbook and launch log in a shared incident doc with timestamps.
3. Run a 15-minute pre-launch tabletop (execute this runbook verbally with owners).
