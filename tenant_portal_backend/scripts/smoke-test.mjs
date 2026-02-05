import fs from 'node:fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const SPEC_PATH = process.env.SPEC_PATH || '/tmp/swagger.json';

const admin = { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASS || 'Admin123!@#' };
const tenant = { username: process.env.TENANT_USER || 'tenant', password: process.env.TENANT_PASS || 'Tenant123!@#' };

function j(v) {
  return JSON.stringify(v, null, 2);
}

async function http(method, path, { token, jsonBody, formData, expectedStatus } = {}) {
  const url = new URL(path, BASE_URL).toString();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body;
  if (formData) {
    body = formData;
  } else if (jsonBody !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(jsonBody);
  }

  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (expectedStatus && res.status !== expectedStatus) {
    throw new Error(`${method} ${path} expected ${expectedStatus} got ${res.status}: ${typeof data === 'string' ? data.slice(0, 300) : j(data).slice(0, 600)}`);
  }

  return { status: res.status, data };
}

async function login({ username, password }) {
  const out = await http('POST', '/api/auth/login', { jsonBody: { username, password }, expectedStatus: 200 });
  // backend may return { accessToken } or { token }
  const token = out.data?.accessToken || out.data?.token;
  if (!token) throw new Error(`No token returned for ${username}: ${j(out.data)}`);
  return token;
}

function classifyEndpoint(path, method, tags) {
  // crude rules for what we can safely smoke-test automatically
  const t = (tags || []).join(',');

  // skip anything with path params unless we explicitly wire test data
  if (path.includes('{')) return 'SKIP';

  // allow basic health-ish + read-only GETs
  if (method === 'get') return 'GET';

  // allow login/register flows (but we handle /login explicitly)
  if (path === '/api/auth/login') return 'SKIP';
  if (path.startsWith('/api/auth/')) return 'AUTH';

  // allow “create” flows that are unlikely to need external services
  if (t.includes('Maintenance') && method === 'post') return 'MUTATION';
  if (t.includes('MessagingLegacy') && method === 'post' && path.includes('/preview')) return 'MUTATION';

  return 'SKIP';
}

async function main() {
  const spec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));

  const adminToken = await login(admin);
  const tenantToken = await login(tenant);

  const results = [];
  const errors = [];

  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      const group = classifyEndpoint(path, method, op.tags);
      if (group === 'SKIP') continue;

      // pick token (best-effort): tenant endpoints => tenant, else admin
      const token = (path.includes('/my-') || path.includes('/tenant') || path.includes('/leases/my-lease')) ? tenantToken : adminToken;

      try {
        const res = await http(method.toUpperCase(), path, {
          token,
          expectedStatus: method === 'post' && path === '/api/auth/login' ? 201 : undefined,
        });
        results.push({ method: method.toUpperCase(), path, status: res.status, tags: op.tags });
      } catch (e) {
        errors.push({ method: method.toUpperCase(), path, tags: op.tags, error: String(e.message || e) });
      }
    }
  }

  const report = { baseUrl: BASE_URL, ok: results.length, failed: errors.length, results, errors };
  const outPath = `./smoke-report.${Date.now()}.json`;
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`Smoke test complete. OK: ${results.length}, Failed: ${errors.length}`);
  console.log(`Report: ${outPath}`);

  if (errors.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
