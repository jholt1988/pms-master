# PMS Plans Reorganization Summary

Date: 2026-03-12 (UTC)

## Scope update applied

Per updated scope, `pms-plans/` should contain only true planning/strategy/execution docs. Non-plan artifacts were moved out to canonical repo locations.

## What stayed in `pms-plans`

- `pms-plans/README.md` (index and routing note)
- `pms-plans/REORG_SUMMARY.md` (this document)

## What moved out and why

- All screenshot evidence moved out of `pms-plans/` into `reports/evidence/screenshots/2026-03-06/`.
- Rationale: screenshots are execution evidence/reporting artifacts, not planning docs.

## Old -> new paths

- `pms-plans/evidence/screenshots/2026-03-06/onboarding/*` -> `reports/evidence/screenshots/2026-03-06/onboarding/*`
- `pms-plans/evidence/screenshots/2026-03-06/applications/*` -> `reports/evidence/screenshots/2026-03-06/applications/*`
- `pms-plans/evidence/screenshots/2026-03-06/leasing/*` -> `reports/evidence/screenshots/2026-03-06/leasing/*`
- `pms-plans/evidence/screenshots/2026-03-06/payments/*` -> `reports/evidence/screenshots/2026-03-06/payments/*`
- `pms-plans/evidence/screenshots/2026-03-06/maintenance/*` -> `reports/evidence/screenshots/2026-03-06/maintenance/*`
- `pms-plans/evidence/screenshots/2026-03-06/inspections/*` -> `reports/evidence/screenshots/2026-03-06/inspections/*`
- `pms-plans/evidence/screenshots/2026-03-06/owner/*` -> `reports/evidence/screenshots/2026-03-06/owner/*`
- `pms-plans/evidence/screenshots/2026-03-06/mobile/*` -> `reports/evidence/screenshots/2026-03-06/mobile/*`

## Link and reference updates

Updated source references that pointed to old screenshot location:

- `tenant_portal_app/scripts/capture-demo-screenshots.ts`
- `tenant_portal_app/scripts/capture-demo-screenshots.mjs`
- `tenant_portal_backend/scripts/verify-demo-screenshots.ps1`

## Notes

- Moves were performed with `git mv` to preserve file history.
- No substantive documentation was deleted.
- Conservative categorization retained the same screenshot category buckets.
