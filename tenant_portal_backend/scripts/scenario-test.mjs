const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

const admin = { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASS || 'Admin123!@#' };
const tenant = { username: process.env.TENANT_USER || 'tenant', password: process.env.TENANT_PASS || 'Tenant123!@#' };

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function http(method, path, { token, jsonBody, expected } = {}) {
  const url = new URL(path, BASE_URL).toString();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (jsonBody !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: jsonBody !== undefined ? JSON.stringify(jsonBody) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (expected && res.status !== expected) {
    throw new Error(`${method} ${path} expected ${expected} got ${res.status}: ${typeof data === 'string' ? data.slice(0, 400) : JSON.stringify(data).slice(0, 800)}`);
  }

  return { status: res.status, data };
}

async function login(creds) {
  const { data } = await http('POST', '/api/auth/login', { jsonBody: creds, expected: 200 });
  return data.accessToken || data.access_token || data.token;
}

async function runStep(name, fn) {
  const startedAt = Date.now();
  try {
    const out = await fn();
    return { name, ok: true, ms: Date.now() - startedAt, out };
  } catch (e) {
    return { name, ok: false, ms: Date.now() - startedAt, error: String(e.message || e) };
  }
}

async function main() {
  const results = [];

  const adminToken = await login(admin);
  const tenantToken = await login(tenant);

  // Tenant: dashboard + lease
  results.push(await runStep('tenant: GET /api/dashboard/tenant', async () => http('GET', '/api/dashboard/tenant', { token: tenantToken, expected: 200 })));
  const myLeaseStep = await runStep('tenant: GET /api/leases/my-lease', async () => http('GET', '/api/leases/my-lease', { token: tenantToken, expected: 200 }));
  results.push(myLeaseStep);

  const lease = myLeaseStep.ok ? myLeaseStep.out.data : null;
  const leaseId = lease?.id;
  const unitId = lease?.unitId ?? lease?.unit?.id;
  const propertyId = lease?.unit?.propertyId ?? lease?.unit?.property?.id ?? lease?.propertyId;

  // Tenant: create maintenance request
  let maintenanceId;
  results.push(await runStep('tenant: POST /api/maintenance (create request)', async () => {
    const body = {
      title: 'Scenario test: sink leaking',
      description: 'Water dripping under kitchen sink. Started today. Please advise.',
      priority: 'MEDIUM',
      propertyId,
      unitId,
    };
    const res = await http('POST', '/api/maintenance', { token: tenantToken, jsonBody: body, expected: 201 });
    maintenanceId = res.data?.id;
    return res;
  }));

  results.push(await runStep('tenant: GET /api/maintenance (list mine)', async () => http('GET', '/api/maintenance', { token: tenantToken, expected: 200 })));

  // PM: list maintenance + create tech + assign + set status
  results.push(await runStep('pm: GET /api/maintenance (list)', async () => http('GET', '/api/maintenance', { token: adminToken, expected: 200 })));

  let techId;
  results.push(await runStep('pm: POST /api/maintenance/technicians (create)', async () => {
    const res = await http('POST', '/api/maintenance/technicians', {
      token: adminToken,
      jsonBody: { name: 'Scenario Tech', phone: '555-0101', email: 'tech@example.com' },
      expected: 201,
    });
    techId = res.data?.id;
    return res;
  }));

  if (maintenanceId) {
    results.push(await runStep('pm: PATCH /api/maintenance/:id/assign', async () => http('PATCH', `/api/maintenance/${maintenanceId}/assign`, {
      token: adminToken,
      jsonBody: { technicianId: techId },
      expected: 200,
    })));

    results.push(await runStep('pm: PATCH /api/maintenance/:id/status', async () => http('PATCH', `/api/maintenance/${maintenanceId}/status`, {
      token: adminToken,
      jsonBody: { status: 'IN_PROGRESS', note: 'Assigned + investigating.' },
      expected: 200,
    })));

    results.push(await runStep('tenant: GET /api/maintenance/:id (see updates)', async () => http('GET', `/api/maintenance/${maintenanceId}`, { token: tenantToken, expected: 200 })));
  }

  // Payments: create invoice (likely to surface DTO/schema mismatch)
  results.push(await runStep('pm: POST /api/payments/invoices (create invoice)', async () => {
    const body = {
      description: 'February rent',
      amount: 1200,
      dueDate: new Date().toISOString(),
      leaseId: leaseId, // NOTE: DTO currently expects UUID; this will likely fail validation
    };
    return http('POST', '/api/payments/invoices', { token: adminToken, jsonBody: body, expected: 201 });
  }));

  // Payments: list invoices as tenant
  results.push(await runStep('tenant: GET /api/payments/invoices', async () => http('GET', '/api/payments/invoices', { token: tenantToken, expected: 200 })));

  // Reporting: grab a couple reports
  results.push(await runStep('pm: GET /api/reporting/rent-roll', async () => http('GET', '/api/reporting/rent-roll', { token: adminToken, expected: 200 })));
  results.push(await runStep('pm: GET /api/reporting/profit-loss', async () => http('GET', '/api/reporting/profit-loss', { token: adminToken, expected: 200 })));

  // Rent recs (mock): list stats + recent
  results.push(await runStep('pm: GET /api/rent-recommendations/stats', async () => http('GET', '/api/rent-recommendations/stats', { token: adminToken, expected: 200 })));
  results.push(await runStep('pm: GET /api/rent-recommendations/recent', async () => http('GET', '/api/rent-recommendations/recent', { token: adminToken, expected: 200 })));

  // Output summary
  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;

  console.log(`Scenario test done. OK: ${ok}, Failed: ${fail}`);

  for (const r of results) {
    if (r.ok) {
      console.log(`OK   ${r.name} (${r.ms}ms)`);
    } else {
      console.log(`FAIL ${r.name} (${r.ms}ms) -> ${r.error}`);
    }
  }

  if (fail) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
