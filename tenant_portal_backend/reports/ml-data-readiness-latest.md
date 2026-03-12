# Tenant Portal Backend ML Data-Readiness Audit

Generated at: **2026-03-12T12:00:34.206Z**
Overall readiness score: **21.1%**

## Inspection MIL coverage

Population size: **9**
Track score: **12.5%**

| Metric | Coverage | Raw |
|---|---:|---:|
| Completed inspections | 0.0% | 0/9 |
| Completed inspections linked to lease | 0.0% | 0/0 |
| Completed inspections with completedDate | 0.0% | 0/0 |
| Completed inspections with >=1 room | 0.0% | 0/0 |
| Completed inspections with >=1 checklist item | 0.0% | 0/0 |
| Checklist items with condition label | 100.0% | 54/54 |
| Checklist items with photo evidence | 0.0% | 0/54 |
| Completed inspections with signatures | 0.0% | 0/0 |

Sample-size hints:
- Completed inspections: 0 (target 100+ for stable baseline models)
- Checklist items: 54 (target 2,000+ for condition calibration)

## Maintenance survival coverage

Population size: **62**
Track score: **38.3%**

| Metric | Coverage | Raw |
|---|---:|---:|
| Requests with priority | 100.0% | 62/62 |
| Requests with createdAt timestamp | 100.0% | 62/62 |
| Closed requests with completedAt timestamp | 100.0% | 12/12 |
| Requests linked to asset | 0.0% | 0/62 |
| Requests with SLA policy | 3.2% | 2/62 |
| Requests with state-change history | 3.2% | 2/62 |
| Requests with photo evidence | 0.0% | 0/62 |
| Assets with installDate | 0.0% | 0/4 |

Sample-size hints:
- Maintenance requests: 62 (target 500+ for initial survival models)
- Assets: 4 (target 200+ with installDate for asset-age features)

## Payment NBA coverage

Population size: **0**
Track score: **12.5%**

| Metric | Coverage | Raw |
|---|---:|---:|
| Invoices with dueDate | 0.0% | 0/0 |
| Invoices linked to lease | 0.0% | 0/0 |
| Invoices with status | 0.0% | 0/0 |
| Payments with status | 100.0% | 72/72 |
| Payments linked to invoice | 0.0% | 0/72 |
| Payments with payment method | 0.0% | 0/72 |
| Invoices with payment attempt records | 0.0% | 0/0 |
| Attempts with terminal status timestamp | 0.0% | 0/0 |

Sample-size hints:
- Invoices: 0, Payments: 72, Attempts: 0
- Currently overdue invoices: 0 (ensure enough positives for action-policy learning)

## Notes
- This script is read-only and does not mutate database state.
- Coverage is schema-driven and intended for data readiness checks before model training.
