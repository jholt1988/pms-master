# Tenant Portal Backend ML Data-Readiness Audit

Generated at: **2026-06-10T22:54:25.087Z**
Overall readiness score: **55.8%**

## Inspection MIL coverage

Population size: **0**
Track score: **0.0%**

| Metric | Coverage | Raw |
|---|---:|---:|
| Completed inspections | 0.0% | 0/0 |
| Completed inspections linked to lease | 0.0% | 0/0 |
| Completed inspections with completedDate | 0.0% | 0/0 |
| Completed inspections with >=1 room | 0.0% | 0/0 |
| Completed inspections with >=1 checklist item | 0.0% | 0/0 |
| Checklist items with condition label | 0.0% | 0/0 |
| Checklist items with photo evidence | 0.0% | 0/0 |
| Completed inspections with signatures | 0.0% | 0/0 |

Sample-size hints:
- Completed inspections: 0 (target 100+ for stable baseline models)
- Checklist items: 0 (target 2,000+ for condition calibration)

## Maintenance survival coverage

Population size: **75**
Track score: **80.0%**

| Metric | Coverage | Raw |
|---|---:|---:|
| Requests with priority | 100.0% | 75/75 |
| Requests with createdAt timestamp | 100.0% | 75/75 |
| Closed requests with completedAt timestamp | 100.0% | 43/43 |
| Requests linked to asset | 80.0% | 60/75 |
| Requests with SLA policy | 80.0% | 60/75 |
| Requests with state-change history | 80.0% | 60/75 |
| Requests with photo evidence | 80.0% | 60/75 |
| Assets with installDate | 20.0% | 1/5 |

Sample-size hints:
- Maintenance requests: 75 (target 500+ for initial survival models)
- Assets: 5 (target 200+ with installDate for asset-age features)

## Payment NBA coverage

Population size: **24**
Track score: **87.5%**

| Metric | Coverage | Raw |
|---|---:|---:|
| Invoices with dueDate | 100.0% | 24/24 |
| Invoices linked to lease | 100.0% | 24/24 |
| Invoices with status | 100.0% | 24/24 |
| Payments with status | 100.0% | 36/36 |
| Payments linked to invoice | 50.0% | 18/36 |
| Payments with payment method | 50.0% | 18/36 |
| Invoices with payment attempt records | 100.0% | 24/24 |
| Attempts with terminal status timestamp | 100.0% | 24/24 |

Sample-size hints:
- Invoices: 24, Payments: 36, Attempts: 24
- Currently overdue invoices: 6 (ensure enough positives for action-policy learning)

## Notes
- This script is read-only and does not mutate database state.
- Coverage is schema-driven and intended for data readiness checks before model training.
