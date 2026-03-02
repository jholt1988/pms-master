#!/usr/bin/env node
const axios = require('axios');

const BASE = process.env.BASE_URL || 'http://localhost:3001';
const API_PREFIX = process.env.API_PREFIX || '/api';
const TOKEN = process.env.AUTH_TOKEN || process.env.TOKEN || null;
const TIMEOUT = Number(process.env.TIMEOUT_MS || 5000);

const client = axios.create({ baseURL: BASE, timeout: TIMEOUT });

// Build tests. For some deployments controllers may be registered with or without the global prefix;
// for health endpoints we'll attempt both prefixed and unprefixed variants and accept either.
const endpoints = [
  { desc: 'root', path: '/', expected: [404] },
  { desc: 'swagger docs', path: `${API_PREFIX}/docs`, expected: [200] },
  // Health endpoints - accept either /api/health or /health
  { desc: 'health', path: `${API_PREFIX}/health`, altPath: '/health', expected: [200] },
  { desc: 'readiness', path: `${API_PREFIX}/health/readiness`, altPath: '/health/readiness', expected: [200] },
  { desc: 'liveness', path: `${API_PREFIX}/health/liveness`, altPath: '/health/liveness', expected: [200] },
  // QuickBooks auth-url: with token expect 200, without token expect 401
  { desc: 'quickbooks auth url', path: `${API_PREFIX}/quickbooks/auth-url`, expected: TOKEN ? [200] : [401] },
];

async function runOne(test) {
  const headers = {};
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  const url = test.path;
  try {
    const res = await client.get(url, { headers });
    const ok = test.expected.includes(res.status);
    console.log(`${ok ? '✅' : '❌'} ${test.desc} GET ${url} -> ${res.status}`);
    if (!ok) console.log(`   expected ${test.expected.join('|')}, got ${res.status}`);
    return ok;
  } catch (err) {
    const status = err.response ? err.response.status : null;
    const message = err.response ? (err.response.data && err.response.data.message) : err.message;
    const ok = status && test.expected.includes(status);
    console.log(`${ok ? '✅' : '❌'} ${test.desc} GET ${url} -> ${status || 'ERROR'} (${message})`);
    if (!ok) console.log(`   expected ${test.expected.join('|')}, got ${status || 'ERROR'}`);
    return ok;
  }
}

(async function main(){
  console.log(`Running smoke tests against ${BASE} (API prefix: ${API_PREFIX})`);
  if (TOKEN) console.log('Using Authorization token from AUTH_TOKEN env var');
  let passed = 0;
  for (const t of endpoints) {
    try {
      // If an alternate path is provided (unprefixed) try the main path first, then fallback
      let ok = await runOne(t);
      if (!ok && t.altPath) {
        // temporarily override the path and retry
        const originalPath = t.path;
        t.path = t.altPath;
        ok = await runOne(t);
        t.path = originalPath;
      }
      if (ok) passed++;
    } catch (e) {
      console.error('Unexpected error running test', e);
    }
  }
  console.log(`\nSmoke tests passed ${passed}/${endpoints.length}`);
  process.exit(passed === endpoints.length ? 0 : 2);
})();
