# Docs Reorganization Summary

Date: 2026-03-12

## Scope completed

- Consolidated additional top-level documentation into `/docs` (topic-based primary taxonomy).
- Added a **generation-oriented taxonomy** at `docs/generations/README.md`.
- Updated internal references that pointed to moved files.
- Kept operational/report-output locations conservative to avoid behavior changes.

## Files moved (old → new)

- `AGENT_POLICY_MATRIX.md` → `docs/governance/AGENT_POLICY_MATRIX.md`
- `APP_ASSESSMENT_FRAMEWORK.md` → `docs/assessments/APP_ASSESSMENT_FRAMEWORK.md`
- `CODEBASE_ASSESSMENT_REPORT.md` → `docs/assessments/CODEBASE_ASSESSMENT_REPORT.md`
- `BACKGROUND_WORKFLOW.md` → `docs/operations/BACKGROUND_WORKFLOW.md`
- `P0_IMPLEMENTATION_STATUS.md` → `docs/implementation/P0_IMPLEMENTATION_STATUS.md`
- `CHANGELOG_inspection_action_fields.md` → `docs/changelogs/CHANGELOG_inspection_action_fields.md`
- `CHANGELOG_inspections_consolidation.md` → `docs/changelogs/CHANGELOG_inspections_consolidation.md`
- `CHANGELOG_labor_pricing_baseline.md` → `docs/changelogs/CHANGELOG_labor_pricing_baseline.md`
- `CHANGELOG_runtime_blockers_fix.md` → `docs/changelogs/CHANGELOG_runtime_blockers_fix.md`
- `CHANGELOG_runtime_blockers_fix_2.md` → `docs/changelogs/CHANGELOG_runtime_blockers_fix_2.md`
- `PHASE5_STEP3_3_5_CHANGELOG.md` → `docs/changelogs/PHASE5_STEP3_3_5_CHANGELOG.md`

## Generation mapping rationale

Generation labels are inferred only when explicit signals exist:

- `phase-<n>` naming → mapped to `gen-phase-*` buckets
- `P0/P1/P2` naming → early-generation (`gen-phase-1-2`)
- `v1.x` naming → `gen-v1.x`
- no explicit phase/version signal → `gen-unknown`

Generation index added here:
- `docs/generations/README.md`

This keeps **discoverability by topic and generation**:
- Topic-first browsing remains in existing `/docs/<topic>/...`
- Generation-first browsing is provided by `/docs/generations/README.md` cross-links

## Internal references updated

Updated links in:
- `docs/P0_IMPLEMENTATION_SUMMARY.md`
- `docs/IMPLEMENTATION_COMPLETION_REPORT.md`
- `docs/MVP_PLAN_AND_PRODUCT_OVERVIEW.md`
- `docs/security/SECURITY_AUDIT_LOG.md`
- `docs/README.md` (now references the generation index folder)

## Intentionally left in place (conservative)

- `WIKI_SYNC.md` (root): referenced by `scripts/test-wiki-sync.sh` via fixed root-relative path.
- `reports/` tree (root): used by scripts/ops/workflows as output and checklist paths (e.g., deploy and smoke scripts). Moving would risk changing operational behavior.
- Subproject docs (e.g., `tenant_portal_backend/reports/*`, package/module `README.md`, generated API docs in package folders): kept local because they are tightly coupled to local workflows/components.

## Generation could not be confidently inferred

Examples (kept as `gen-unknown` in index policy):
- `docs/operations/BACKGROUND_WORKFLOW.md`
- Generic guides without explicit phase/version markers
- Mixed historical notes where filename/content does not clearly identify a phase/wave/version
