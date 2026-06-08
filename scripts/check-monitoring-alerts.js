const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const alertPath = resolve(__dirname, '../ops/monitoring/alert-rules.yml');
const runbookPath = resolve(__dirname, '../docs/phase-5-monitoring-alerts.md');
const alertSource = readFileSync(alertPath, 'utf8');
const runbookSource = readFileSync(runbookPath, 'utf8');

const requiredAlerts = [
  'DatabaseHealthDown',
  'RedisHealthDown',
  'WebhookEndpointFailures',
  'AuthFailureSpike',
  'AIGatewayHttpFailures',
  'AIServiceErrors',
  'QueueWorkerFailures',
  'EventBusProcessingFailures',
  'BackgroundJobFailures',
  'HealthCheckDown',
];

const requiredMetrics = [
  'service_health_status{service="database"}',
  'service_health_status{service="redis"}',
  'http_errors_total{route=~".*(webhooks|webhook).*"',
  'http_errors_total{route=~".*auth.*(login|refresh|mfa).*"',
  'http_errors_total{route=~".*ai-gateway.*"',
  'ai_service_errors_total',
  'background_job_errors_total{job_name=~".*(queue|worker|processor|webhook|sync).*"',
  'event_bus_errors_total',
];

const errors = [];

for (const alert of requiredAlerts) {
  if (!alertSource.includes(`alert: ${alert}`)) {
    errors.push(`missing alert rule: ${alert}`);
  }
  if (!runbookSource.includes(alert)) {
    errors.push(`missing runbook mention for alert: ${alert}`);
  }
}

for (const metric of requiredMetrics) {
  if (!alertSource.includes(metric)) {
    errors.push(`missing alert metric expression: ${metric}`);
  }
}

if (!alertSource.includes('phase5_gate: "true"')) {
  errors.push('phase5 gate alerts must be labelled phase5_gate: "true"');
}

for (const heading of ['## Production Gate', '## Metrics Sources', '## Phase 5 Gate Alerts', '## Runbook', '## Verification']) {
  if (!runbookSource.includes(heading)) {
    errors.push(`missing monitoring runbook section: ${heading}`);
  }
}

if (errors.length > 0) {
  throw new Error(`Monitoring alert check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
}

console.log(`Monitoring alert coverage OK (${requiredAlerts.length} alerts)`);
