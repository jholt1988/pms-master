import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const baseUrl = (process.env.LOAD_TEST_BASE_URL ?? process.env.API_URL ?? 'http://127.0.0.1:3001').replace(/\/+$/, '');
const jwt = process.env.LOAD_TEST_JWT ?? process.env.SMOKE_JWT;
const concurrency = positiveInt(process.env.LOAD_TEST_CONCURRENCY, 4);
const iterations = positiveInt(process.env.LOAD_TEST_ITERATIONS, 10);
const p95ThresholdMs = positiveInt(process.env.LOAD_TEST_P95_MS, 1500);
const errorRateThreshold = numberInRange(process.env.LOAD_TEST_ERROR_RATE, 0.01, 0, 1);
const outputPath = process.env.LOAD_TEST_OUTPUT ?? resolve(here, '../reports/phase5-load-baseline-latest.json');

const scenarios = [
  { name: 'command-center snapshot', method: 'GET', path: '/api/command-center' },
  { name: 'command-center decisions', method: 'GET', path: '/api/command-center/decisions' },
  { name: 'command-center daily briefing', method: 'GET', path: '/api/command-center/daily-briefing' },
  { name: 'operator workflow inventory', method: 'GET', path: '/api/operator-workflows' },
  { name: 'operator payment workbench', method: 'GET', path: '/api/operator-payments?limit=50' },
  { name: 'payments delinquency queue', method: 'GET', path: '/api/payments/delinquency/queue?limit=50' },
  { name: 'operator maintenance dispatch', method: 'GET', path: '/api/operator-maintenance-dispatch?limit=50' },
];

if (!jwt) {
  throw new Error('LOAD_TEST_JWT or SMOKE_JWT is required. Run against a seeded local/staging API with an operator token.');
}

const startedAt = new Date().toISOString();
const results = [];

for (const scenario of scenarios) {
  results.push(await runScenario(scenario));
}

const completedAt = new Date().toISOString();
const failed = results.filter((result) => result.errorRate > errorRateThreshold || result.p95Ms > p95ThresholdMs);
const report = {
  baseUrl,
  startedAt,
  completedAt,
  concurrency,
  iterations,
  thresholds: {
    p95Ms: p95ThresholdMs,
    errorRate: errorRateThreshold,
  },
  scenarios: results,
  passed: failed.length === 0,
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));

if (failed.length > 0) {
  throw new Error(
    `Phase 5 load baseline failed thresholds:\n${failed
      .map((result) => `- ${result.name}: p95=${result.p95Ms}ms errorRate=${result.errorRate}`)
      .join('\n')}`,
  );
}

async function runScenario(scenario) {
  const totalRequests = concurrency * iterations;
  const latencies = [];
  const statuses = {};
  const errors = [];
  const started = performance.now();

  await Promise.all(
    Array.from({ length: concurrency }, async (_, workerIndex) => {
      for (let iteration = 0; iteration < iterations; iteration += 1) {
        const result = await requestOnce(scenario, workerIndex, iteration);
        latencies.push(result.durationMs);
        statuses[result.status] = (statuses[result.status] ?? 0) + 1;
        if (!result.ok) {
          errors.push(result);
        }
      }
    }),
  );

  const durationMs = Math.round(performance.now() - started);
  const sorted = [...latencies].sort((a, b) => a - b);
  const errorRate = errors.length / totalRequests;

  return {
    name: scenario.name,
    method: scenario.method,
    path: scenario.path,
    totalRequests,
    durationMs,
    requestsPerSecond: round(totalRequests / (durationMs / 1000), 2),
    minMs: sorted[0] ?? 0,
    medianMs: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted[sorted.length - 1] ?? 0,
    errorRate: round(errorRate, 4),
    statuses,
    errors: errors.slice(0, 5).map(({ status, body }) => ({ status, body })),
  };
}

async function requestOnce(scenario, workerIndex, iteration) {
  const url = `${baseUrl}${scenario.path}`;
  const start = performance.now();
  try {
    const response = await fetch(url, {
      method: scenario.method,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${jwt}`,
        'x-load-test-worker': String(workerIndex),
        'x-load-test-iteration': String(iteration),
      },
    });
    const durationMs = Math.round(performance.now() - start);
    const ok = response.status >= 200 && response.status < 300;
    const body = ok ? undefined : (await response.text().catch(() => '')).slice(0, 300);
    return { ok, status: response.status, durationMs, body };
  } catch (error) {
    return {
      ok: false,
      status: 'FETCH_ERROR',
      durationMs: Math.round(performance.now() - start),
      body: error instanceof Error ? error.message : String(error),
    };
  }
}

function percentile(sorted, value) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1);
  return sorted[index];
}

function positiveInt(raw, fallback) {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function numberInRange(raw, fallback, min, max) {
  const parsed = Number.parseFloat(raw ?? '');
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
