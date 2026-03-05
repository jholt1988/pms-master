# ML Data-Readiness Audit Script

Script: `scripts/ml-data-readiness-audit.ts`

This is a read-only Prisma/Postgres audit for ML expansion **Step 2**. It reports coverage for:
- Inspection MIL
- Maintenance survival
- Payment NBA

## Usage

From `tenant_portal_backend/` (preferred npm aliases):

```bash
npm run ml:readiness
```

JSON output:

```bash
npm run ml:readiness:json
```

Write a markdown snapshot:

```bash
npm run ml:readiness:md
```

Help:

```bash
npm run ml:readiness:help
```

Direct script invocation still works:

```bash
ts-node scripts/ml-data-readiness-audit.ts [--json] [--out reports/ml-data-readiness-latest.md]
```

## What it checks

### Inspection MIL
- Completion rate and completion metadata
- Lease linkage
- Presence of rooms and checklist items
- Condition labeling coverage
- Photo evidence and signatures

### Maintenance survival
- Priority/timestamp completeness
- Asset and SLA linkage
- State history and photo evidence
- Asset install-date coverage

### Payment NBA
- Invoice due date/status/lease linkage
- Payment status, invoice linkage, method linkage
- Payment attempt outcome timestamps
- Invoice-attempt linkage and overdue count context

## Maintenance ML-readiness API surfaces

In addition to this offline audit script, maintenance now exposes live diagnostics and feature extraction endpoints:

- `GET /maintenance/diagnostics/data-quality` (roles: `PROPERTY_MANAGER`, `ADMIN`)
  - Returns current data quality totals/rates (missing install dates, chronology violations, linkage gaps, etc.)
- `GET /maintenance/ai/features/:id` (roles: `PROPERTY_MANAGER`, `ADMIN`)
  - Returns a normalized model-feature payload for a single maintenance request

These are additive/non-breaking endpoints intended for readiness monitoring and feature contract validation.

## Notes
- Script is **non-destructive** (read-only queries).
- Coverage score is an operational readiness indicator, not a model accuracy metric.
