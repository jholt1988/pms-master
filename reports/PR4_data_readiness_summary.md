# PR4 — ML Data-Readiness Tooling Finalization Summary

**Date (UTC):** 2026-03-05  
**Scope:** `tenant_portal_backend` PR4 completion for ML data-readiness tooling, npm aliases, execution, and runbook output.

## What was completed

1. **Finalized audit tooling compatibility fix**
   - Updated `scripts/ml-data-readiness-audit.ts` to match current Prisma enum values.
   - Replaced invalid maintenance status filter:
     - from: `status IN ('COMPLETED', 'CLOSED')`
     - to: `status = 'COMPLETED'`
   - This resolved runtime failure (`ERROR: invalid input value for enum "Status": "CLOSED"`).

2. **Added npm script aliases** in `tenant_portal_backend/package.json`
   - `ml:readiness` → `ts-node scripts/ml-data-readiness-audit.ts`
   - `ml:readiness:json` → `ts-node scripts/ml-data-readiness-audit.ts --json`
   - `ml:readiness:md` → `ts-node scripts/ml-data-readiness-audit.ts --out reports/ml-data-readiness-latest.md`
   - `ml:readiness:help` → `ts-node scripts/ml-data-readiness-audit.ts --help`

3. **Updated docs**
   - Updated `scripts/ml-data-readiness-audit-README.md` to use npm aliases as primary usage path while preserving direct `ts-node` usage.

4. **Executed audit script successfully**
   - Generated terminal, JSON, and markdown outputs.

---

## Commands run + outputs

Working directory for all commands below:
`/home/jordanh316/.openclaw/workspace/pms-master/tenant_portal_backend`

### 1) Standard audit

Command:
```bash
npm run ml:readiness
```

Output (excerpt):
```text
ML Data-Readiness Audit (2026-03-05T06:50:51.093Z)
Overall score: 20.8%

Inspection MIL coverage: 12.5% (population 7)
Maintenance survival coverage: 37.5% (population 60)
Payment NBA coverage: 12.5% (population 0)
```

Full captured output:
- `tenant_portal_backend/reports/PR4_ml_readiness_command_output.txt`

### 2) Markdown snapshot generation

Command:
```bash
npm run ml:readiness:md
```

Output (excerpt):
```text
Markdown report written to: /home/jordanh316/.openclaw/workspace/pms-master/tenant_portal_backend/reports/ml-data-readiness-latest.md
```

Full captured output:
- `tenant_portal_backend/reports/PR4_ml_readiness_md_command_output.txt`

Generated markdown audit:
- `tenant_portal_backend/reports/ml-data-readiness-latest.md`

### 3) JSON output

Command:
```bash
npm run ml:readiness:json
```

Output (excerpt):
```json
{
  "generatedAt": "2026-03-05T06:51:20.596Z",
  "overallScore": 0.20833333333333334,
  "tracks": [
    { "track": "inspection_mil", "score": 0.125 },
    { "track": "maintenance_survival", "score": 0.375 },
    { "track": "payment_nba", "score": 0.125 }
  ]
}
```

Full captured output:
- `tenant_portal_backend/reports/PR4_ml_readiness_json_output.txt`

### 4) Help/usage verification

Command:
```bash
npm run ml:readiness:help
```

Output:
```text
Usage:
  ts-node scripts/ml-data-readiness-audit.ts [--json] [--out <markdown-file>]

Examples:
  ts-node scripts/ml-data-readiness-audit.ts
  ts-node scripts/ml-data-readiness-audit.ts --json
  ts-node scripts/ml-data-readiness-audit.ts --out reports/ml-data-readiness-latest.md
```

Full captured output:
- `tenant_portal_backend/reports/PR4_ml_readiness_help_output.txt`

---

## Current readiness snapshot (from run)

- **Overall readiness:** `20.8%`
- **Inspection MIL:** `12.5%` (population 7)
- **Maintenance survival:** `37.5%` (population 60)
- **Payment NBA:** `12.5%` (invoice population 0)

Interpretation: tooling is now operational, but dataset coverage is still sparse for production-grade ML model training.

---

## Usage instructions (operator quick start)

From `tenant_portal_backend/`:

```bash
# human-readable summary in terminal
npm run ml:readiness

# machine-readable JSON
npm run ml:readiness:json

# write markdown snapshot report
npm run ml:readiness:md

# show help
npm run ml:readiness:help
```

Direct invocation remains available:

```bash
ts-node scripts/ml-data-readiness-audit.ts [--json] [--out reports/ml-data-readiness-latest.md]
```

---

## Files changed for PR4

- `tenant_portal_backend/scripts/ml-data-readiness-audit.ts`
- `tenant_portal_backend/package.json`
- `tenant_portal_backend/scripts/ml-data-readiness-audit-README.md`
- `tenant_portal_backend/reports/ml-data-readiness-latest.md` (generated)
- `tenant_portal_backend/reports/PR4_ml_readiness_command_output.txt` (captured)
- `tenant_portal_backend/reports/PR4_ml_readiness_md_command_output.txt` (captured)
- `tenant_portal_backend/reports/PR4_ml_readiness_json_output.txt` (captured)
- `tenant_portal_backend/reports/PR4_ml_readiness_help_output.txt` (captured)
