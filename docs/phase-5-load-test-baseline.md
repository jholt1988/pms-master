# Phase 5 Load Test Baseline

Date: 2026-06-07

Scope: Kansas private beta launch. This baseline covers the operator read models most likely to drive daily usage: command center, workflow inventory, payments, and maintenance dispatch.

## Production Gate

Private beta must have at least one captured load baseline against seeded staging before launch.

Pass criteria for the initial private beta baseline:

- All covered endpoints return only 2xx responses.
- Aggregate error rate per scenario is less than or equal to 1%.
- p95 latency per scenario is less than or equal to 1500 ms under the default baseline.
- Results are saved to release evidence.
- Any failed scenario has an owner and remediation ticket before private beta.

The default baseline is intentionally modest for the initial target of roughly 30 units per customer:

- Concurrency: 4 workers.
- Iterations: 10 requests per worker per scenario.
- Total: 40 requests per scenario.

## Covered Read Models

| Area | Endpoint |
| --- | --- |
| Command center snapshot | `/api/command-center` |
| Command center decision queue | `/api/command-center/decisions` |
| Daily briefing | `/api/command-center/daily-briefing` |
| Workflow inventory | `/api/operator-workflows` |
| Payment workbench | `/api/operator-payments?limit=50` |
| Delinquency queue | `/api/payments/delinquency/queue?limit=50` |
| Maintenance dispatch workbench | `/api/operator-maintenance-dispatch?limit=50` |

## Thresholds

Defaults:

- `LOAD_TEST_P95_MS=1500`
- `LOAD_TEST_ERROR_RATE=0.01`
- `LOAD_TEST_CONCURRENCY=4`
- `LOAD_TEST_ITERATIONS=10`

Tighten these thresholds after the first staging baseline is captured and reviewed.

## Commands

Run the static coverage check:

```bash
pnpm load:phase5:check
```

Run the baseline against local or staging API:

```bash
LOAD_TEST_BASE_URL="https://staging.example.com" \
LOAD_TEST_JWT="<operator-jwt>" \
pnpm load:phase5
```

PowerShell:

```powershell
$env:LOAD_TEST_BASE_URL = "http://127.0.0.1:3001"
$env:LOAD_TEST_JWT = "<operator-jwt>"
pnpm load:phase5
```

Optional overrides:

```bash
LOAD_TEST_CONCURRENCY=8 LOAD_TEST_ITERATIONS=25 LOAD_TEST_P95_MS=1200 LOAD_TEST_ERROR_RATE=0.005 pnpm load:phase5
```

The script writes JSON results to `reports/phase5-load-baseline-latest.json` by default. Override with `LOAD_TEST_OUTPUT`.

## Evidence Template

```markdown
## Phase 5 Load Baseline Evidence

- Date/time:
- Environment:
- Commit:
- Operator org/user:
- Command:
- Concurrency:
- Iterations:
- p95 threshold:
- Error-rate threshold:
- Result artifact:
- Scenarios passed:
- Scenarios failed:
- Follow-ups:
- Release decision: PASS/FAIL
```

