# Documentation by Generation

This index adds a **generation (chronology) axis** on top of the primary topic-based structure in `/docs`.

- **Primary navigation:** by topic (architecture, implementation, testing, etc.)
- **Secondary navigation:** by generation (phase/wave/version labels inferred from filenames/content)

## Generation taxonomy

- **gen-foundation**: early baseline/planning/assessment docs (often no explicit phase, or foundational P0 framing)
- **gen-phase-1-2**: docs explicitly marked phase 1/2, P0/P1/P2, or equivalent early delivery milestones
- **gen-phase-3-4**: docs explicitly marked phase 3/4
- **gen-phase-5-6**: docs explicitly marked phase 5/6, later stabilization/completion waves
- **gen-v1.x**: docs explicitly versioned with `v1.x` naming
- **gen-unknown**: generation not confidently inferable from filename/content

## By generation → topic

### gen-foundation
- `../assessments/APP_ASSESSMENT_FRAMEWORK.md`
- `../assessments/CODEBASE_ASSESSMENT_REPORT.md`
- `../governance/AGENT_POLICY_MATRIX.md`

### gen-phase-1-2
- `../implementation/P0_IMPLEMENTATION_STATUS.md`
- `../implementation/phase-1-complete.md`
- `../implementation/phase-2-complete.md`
- `../setup/phase-1-seed-implementation.md`
- `../setup/phase-2-environment-setup.md`

### gen-phase-3-4
- `../implementation/phase-3-complete.md`
- `../implementation/phase-4-complete.md`
- `../ai-ml/ai-features-phase-3-complete.md`

### gen-phase-5-6
- `../implementation/phase-5-complete.md`
- `../implementation/phase-6-complete.md`
- `../changelogs/PHASE5_STEP3_3_5_CHANGELOG.md`

### gen-v1.x
- `../../reports/PMS_Audit_Phase4_Report_v1.0.md` *(kept under /reports; operational output area)*
- `../../reports/PMS_Runtime_Verification_Matrix_Phase2_v1.0.md` *(kept under /reports)*
- `../../reports/PMS_MVP_Demo_Script_v1.0.md` *(kept under /reports)*

### gen-unknown
- `../operations/BACKGROUND_WORKFLOW.md`
- most general guides/reference docs without explicit phase/version tags

## By topic → generation hints

- **implementation/**: mostly `gen-phase-1-2`, `gen-phase-3-4`, `gen-phase-5-6`
- **changelogs/**: mixed; infer from filename where possible, otherwise `gen-unknown`
- **assessments/** + **governance/**: mostly `gen-foundation`
- **reports/** (top-level): mixed `gen-phase-*` and `gen-v1.x`; retained in place for workflow compatibility

## Inference policy

Generation is assigned **only when explicit clues exist** (e.g., `phase-2`, `P0`, `v1.0`).
When ambiguous, documents stay in `gen-unknown` to avoid over-assumption.
