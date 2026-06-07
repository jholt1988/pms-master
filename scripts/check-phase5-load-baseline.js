const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const scriptPath = resolve(__dirname, './phase5-load-baseline.mjs');
const runbookPath = resolve(__dirname, '../docs/phase-5-load-test-baseline.md');
const scriptSource = readFileSync(scriptPath, 'utf8');
const runbookSource = readFileSync(runbookPath, 'utf8');

const requiredEndpoints = [
  '/api/command-center',
  '/api/command-center/decisions',
  '/api/command-center/daily-briefing',
  '/api/operator-workflows',
  '/api/operator-payments?limit=50',
  '/api/payments/delinquency/queue?limit=50',
  '/api/operator-maintenance-dispatch?limit=50',
];

const requiredMarkers = [
  'LOAD_TEST_JWT',
  'LOAD_TEST_CONCURRENCY',
  'LOAD_TEST_ITERATIONS',
  'LOAD_TEST_P95_MS',
  'LOAD_TEST_ERROR_RATE',
  'phase5-load-baseline-latest.json',
];

const errors = [];

for (const endpoint of requiredEndpoints) {
  if (!scriptSource.includes(endpoint)) {
    errors.push(`load baseline script missing endpoint: ${endpoint}`);
  }
  if (!runbookSource.includes(endpoint)) {
    errors.push(`load baseline runbook missing endpoint: ${endpoint}`);
  }
}

for (const marker of requiredMarkers) {
  if (!scriptSource.includes(marker) && !runbookSource.includes(marker)) {
    errors.push(`missing load baseline marker: ${marker}`);
  }
}

for (const heading of ['## Production Gate', '## Covered Read Models', '## Thresholds', '## Commands', '## Evidence Template']) {
  if (!runbookSource.includes(heading)) {
    errors.push(`missing load baseline runbook section: ${heading}`);
  }
}

if (errors.length > 0) {
  throw new Error(`Phase 5 load baseline check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
}

console.log(`Phase 5 load baseline coverage OK (${requiredEndpoints.length} endpoints)`);
