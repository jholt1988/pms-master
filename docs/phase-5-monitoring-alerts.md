# Phase 5 Monitoring And Alerts

Date: 2026-06-07

Scope: Kansas private beta launch. Covers the minimum production monitoring and alerting surface for backend health, queues, webhooks, authentication failures, and AI gateway failures.

## Production Gate

Private beta must not launch until:

- `/metrics` is scraped by Prometheus.
- `/api/health/liveness` and `/api/health/readiness` are reachable from the deployment environment.
- Alert rules are loaded by Prometheus without syntax errors.
- Phase 5 gate alerts exist for database health, Redis health, queue/worker failures, webhook endpoint failures, auth failure spikes, and AI gateway failures.
- Alert routing to the on-call owner is configured outside this repo.

## Metrics Sources

| Concern | Metric/Signal | Source |
| --- | --- | --- |
| HTTP failures | `http_errors_total` | `HttpMetricsInterceptor` |
| HTTP latency | `http_request_duration_seconds` | `HttpMetricsInterceptor` |
| Database health | `service_health_status{service="database"}` | `HealthMetricsService` |
| Redis health | `service_health_status{service="redis"}` | `HealthMetricsService` |
| Background jobs | `background_job_errors_total` | `PrometheusService` |
| Event processing | `event_bus_errors_total` | `PrometheusService` |
| AI provider/service | `ai_service_errors_total`, `ai_service_duration_seconds` | `PrometheusService` |
| Webhook endpoints | `http_errors_total{route=~".*(webhooks|webhook).*"}` | `HttpMetricsInterceptor` |
| Auth failures | `http_errors_total{route=~".*auth.*"}` | `HttpMetricsInterceptor` |

## Phase 5 Gate Alerts

Defined in `ops/monitoring/alert-rules.yml`:

- `DatabaseHealthDown`
- `RedisHealthDown`
- `WebhookEndpointFailures`
- `AuthFailureSpike`
- `AIGatewayHttpFailures`
- `AIServiceErrors`
- `QueueWorkerFailures`
- `EventBusProcessingFailures`
- `BackgroundJobFailures`
- `HealthCheckDown`

## Runbook

### DatabaseHealthDown

1. Check `/api/health/readiness`.
2. Check Postgres provider status or Compose `postgres` health.
3. Confirm recent migrations did not fail.
4. If production data is at risk, freeze writes and follow the backup/restore runbook.

### RedisHealthDown

1. Check Redis provider status or Compose `redis` health.
2. Confirm queues are not accumulating retries.
3. Disable non-critical background jobs if Redis remains unstable.
4. Verify idempotency and webhook replay paths before re-enabling writes.

### WebhookEndpointFailures

1. Check provider dashboards for Stripe, DocuSign, and QuickBooks delivery failures.
2. Inspect signature verification errors and raw-body handling.
3. Confirm duplicate events are acknowledged and not retried indefinitely.
4. Replay failed provider events only after idempotency checks pass.

### AuthFailureSpike

1. Check source IP/user concentration.
2. Confirm MFA enforcement rollout did not block valid operators unexpectedly.
3. Check throttling and lockout behavior.
4. Escalate suspected credential attack to security owner.

### AIGatewayHttpFailures / AIServiceErrors

1. Check AI provider status and configured model availability.
2. Inspect audit records and redacted prompts/tool metadata.
3. Disable low-risk auto-execution if recommendations are failing or ungrounded.
4. Fall back to draft-only/human-review workflow mode.

### QueueWorkerFailures / EventBusProcessingFailures

1. Check Redis and worker process health.
2. Inspect failed job names and event names.
3. Verify retry behavior and idempotency keys.
4. Pause affected workflow execution if repeated side effects are possible.

## Verification

Static rule coverage:

```bash
pnpm ops:monitoring:check
```

Prometheus config validation when Docker image is available:

```bash
docker run --rm -v "$PWD/ops/monitoring:/etc/prometheus" prom/prometheus:v2.53.0 promtool check config /etc/prometheus/prometheus.yml
```

Runtime smoke:

```bash
curl -fsS http://127.0.0.1:3001/api/health/liveness
curl -fsS http://127.0.0.1:3001/api/health/readiness
curl -fsS http://127.0.0.1:3001/metrics | head
```

