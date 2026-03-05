# ML Data-Readiness Audit Report (Template)

- Generated at: `<ISO_TIMESTAMP>`
- Environment: `<dev|staging|prod>`
- Source DB: `<DATABASE_URL target / schema>`
- Audit script: `scripts/ml-data-readiness-audit.ts`

## Executive Summary

- Overall readiness score: `<0-100%>`
- Inspection MIL score: `<0-100%>`
- Maintenance survival score: `<0-100%>`
- Payment NBA score: `<0-100%>`
- Go / No-Go recommendation: `<GO|NO-GO|CONDITIONAL>`

## 1) Inspection MIL Coverage

- Population size: `<count>`
- Key metrics:
  - Completed inspections: `<n/d (% )>`
  - Completed + lease linked: `<n/d (% )>`
  - Completed + completedDate: `<n/d (% )>`
  - Completed + rooms/checklist: `<n/d (% )>`
  - Checklist condition labels: `<n/d (% )>`
  - Checklist photos: `<n/d (% )>`
  - Completed + signatures: `<n/d (% )>`
- Gaps observed:
  - `<gap 1>`
  - `<gap 2>`
- Action items:
  - `<owner> - <task> - <ETA>`

## 2) Maintenance Survival Coverage

- Population size: `<count>`
- Key metrics:
  - Priority coverage: `<n/d (% )>`
  - Timestamp completeness: `<n/d (% )>`
  - Closed + completedAt: `<n/d (% )>`
  - Asset linkage: `<n/d (% )>`
  - SLA linkage: `<n/d (% )>`
  - History events: `<n/d (% )>`
  - Photo evidence: `<n/d (% )>`
  - Assets + installDate: `<n/d (% )>`
- Gaps observed:
  - `<gap 1>`
  - `<gap 2>`
- Action items:
  - `<owner> - <task> - <ETA>`

## 3) Payment NBA Coverage

- Population size (invoices): `<count>`
- Key metrics:
  - Invoices + dueDate/status/lease linkage: `<n/d (% )>`
  - Payments + status/invoice/method linkage: `<n/d (% )>`
  - Attempts with terminal timestamps: `<n/d (% )>`
  - Invoices with attempts: `<n/d (% )>`
  - Overdue invoice count: `<count>`
- Gaps observed:
  - `<gap 1>`
  - `<gap 2>`
- Action items:
  - `<owner> - <task> - <ETA>`

## 4) Risk Assessment

- Data sparsity risk: `<low|medium|high>`
- Label quality risk: `<low|medium|high>`
- Time-to-production risk: `<low|medium|high>`

## 5) Next Actions (Step 3 Input)

1. `<action>`
2. `<action>`
3. `<action>`

---

### How to generate a fresh report

```bash
cd tenant_portal_backend
ts-node scripts/ml-data-readiness-audit.ts --out reports/ml-data-readiness-latest.md
```
