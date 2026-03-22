# Tenant Portal Backend ML Data-Readiness Audit

Generated at: **2026-03-22T14:31:04.778Z**
Overall readiness score: **100.0%**

## Inspection MIL coverage

Population size: **1**
Track score: **100.0%**

| Metric | Coverage | Raw |
|---|---:|---:|
| Completed inspections | 100.0% | 1/1 |
| Completed inspections linked to lease | 100.0% | 1/1 |
| Completed inspections with completedDate | 100.0% | 1/1 |
| Completed inspections with >=1 room | 100.0% | 1/1 |
| Completed inspections with >=1 checklist item | 100.0% | 1/1 |
| Checklist items with condition label | 100.0% | 6/6 |
| Checklist items with photo evidence | 100.0% | 6/6 |
| Completed inspections with signatures | 100.0% | 1/1 |

Sample-size hints:
- Completed inspections: 1 (target 100+ for stable baseline models)
- Checklist items: 6 (target 2,000+ for condition calibration)

## Maintenance survival coverage

Population size: **60**
Track score: **100.0%**

| Metric | Coverage | Raw |
|---|---:|---:|
| Requests with priority | 100.0% | 60/60 |
| Requests with createdAt timestamp | 100.0% | 60/60 |
| Closed requests with completedAt timestamp | 100.0% | 40/40 |
| Requests linked to asset | 100.0% | 60/60 |
| Requests with SLA policy | 100.0% | 60/60 |
| Requests with state-change history | 100.0% | 60/60 |
| Requests with photo evidence | 100.0% | 60/60 |
| Assets with installDate | 100.0% | 1/1 |

Sample-size hints:
- Maintenance requests: 60 (target 500+ for initial survival models)
- Assets: 1 (target 200+ with installDate for asset-age features)

## Payment NBA coverage

Population size: **24**
Track score: **100.0%**

| Metric | Coverage | Raw |
|---|---:|---:|
| Invoices with dueDate | 100.0% | 24/24 |
| Invoices linked to lease | 100.0% | 24/24 |
| Invoices with status | 100.0% | 24/24 |
| Payments with status | 100.0% | 18/18 |
| Payments linked to invoice | 100.0% | 18/18 |
| Payments with payment method | 100.0% | 18/18 |
| Invoices with payment attempt records | 100.0% | 24/24 |
| Attempts with terminal status timestamp | 100.0% | 24/24 |

Sample-size hints:
- Invoices: 24, Payments: 18, Attempts: 24
- Currently overdue invoices: 6 (ensure enough positives for action-policy learning)

## Notes
- This script is read-only and does not mutate database state.
- Coverage is schema-driven and intended for data readiness checks before model training.
