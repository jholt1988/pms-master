# Acceptance Validator Output (Goal B)
Date: 2026-03-15
Mode: **Static evidence validation** + script execution (no end-to-end product run performed in this pass)

## What was checked
- MVP evidence gate requirement: acceptance validator target **19/19**.
- Validator script behavior and runbook path assumptions.
- Alignment with release gate in `RELEASE_GO_NO_GO_MERGED.md` section B.

## Source files / commands
- Files:
  - `clawdbot_remote/pms-plans/strategy/MVP_LAUNCH_READINESS.md`
  - `clawdbot_remote/scripts/pms/demo-acceptance-validate.mjs`
  - `clawdbot_remote/pms-plans/evidence/demo-runbook.md`
  - `pms-master/reports/RELEASE_GO_NO_GO_MERGED.md`
- Commands:
  - `node clawdbot_remote/scripts/pms/demo-acceptance-validate.mjs --json` (fails: default runbook path missing)
  - `node clawdbot_remote/scripts/pms/demo-acceptance-validate.mjs clawdbot_remote/pms-plans/evidence/demo-runbook.md --json` (passes)

## Pass / fail / risk
- **Result:** PASS (evidence validator returns `AUTO_PASS=19`, `AUTO_FAIL=0`).
- **Risk:** **Medium** — validator default path is stale (`pms-plans/demo-runbook.md`) and fails unless runbook path is explicitly provided.

## Blockers
- **P1:** Validator default run path is broken after reorg; can produce false operational failure during launch checks.

## Recommended actions
1. Update `demo-acceptance-validate.mjs` default runbook path to `pms-plans/evidence/demo-runbook.md`.
2. Add a release-check command in docs that uses explicit runbook argument until script is fixed.
3. Attach validator JSON output artifact to release packet for traceability.
