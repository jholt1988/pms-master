type SmokeStep = {
  name: string;
  method?: string;
  path: string;
  body?: unknown;
  optional?: boolean;
  expectedStatuses?: number[];
};

const baseUrl = (process.env.SMOKE_BASE_URL ?? process.env.API_URL ?? 'http://127.0.0.1:3001')
  .replace(/\/+$/, '');
const jwt = process.env.SMOKE_JWT;

const requiredSeed = {
  paymentId: process.env.SMOKE_PAYMENT_ID,
  leaseId: process.env.SMOKE_LEASE_ID,
  maintenanceId: process.env.SMOKE_MAINTENANCE_ID,
  vendorId: process.env.SMOKE_VENDOR_ID,
  inspectionId: process.env.SMOKE_INSPECTION_ID,
  reportPropertyId: process.env.SMOKE_PROPERTY_ID,
};

function canonicalApiPath(path: string) {
  if (path.startsWith('/api/')) return path;
  return `/api${path.startsWith('/') ? path : `/${path}`}`;
}

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is required. Run this against a seeded staging env, not an empty database.`);
  }
  return value;
}

async function requestStep(step: SmokeStep) {
  const method = step.method ?? 'GET';
  const url = `${baseUrl}${canonicalApiPath(step.path)}`;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (jwt) headers.authorization = `Bearer ${jwt}`;
  if (step.body !== undefined) headers['content-type'] = 'application/json';

  const response = await fetch(url, {
    method,
    headers,
    body: step.body === undefined ? undefined : JSON.stringify(step.body),
  });

  const expected = step.expectedStatuses ?? [200, 201, 202, 204];
  if (!expected.includes(response.status)) {
    const text = await response.text().catch(() => '');
    throw new Error(`${step.name} failed: ${method} ${url} returned ${response.status}. ${text.slice(0, 500)}`);
  }

  return { name: step.name, status: response.status };
}

async function main() {
  requireEnv('SMOKE_JWT', jwt);

  const paymentId = requireEnv('SMOKE_PAYMENT_ID', requiredSeed.paymentId);
  const leaseId = requireEnv('SMOKE_LEASE_ID', requiredSeed.leaseId);
  const maintenanceId = requireEnv('SMOKE_MAINTENANCE_ID', requiredSeed.maintenanceId);
  const vendorId = requireEnv('SMOKE_VENDOR_ID', requiredSeed.vendorId);
  const inspectionId = requireEnv('SMOKE_INSPECTION_ID', requiredSeed.inspectionId);

  const steps: SmokeStep[] = [
    { name: 'auth me', path: '/auth/me' },
    { name: 'payments delinquency queue', path: '/payments/delinquency/queue' },
    {
      name: 'payment message tenant',
      method: 'POST',
      path: `/payments/${paymentId}/message-tenant`,
      body: { subject: 'Smoke test', message: 'Golden-path smoke test message.' },
    },
    {
      name: 'manual payment record dry path',
      method: 'POST',
      path: `/payments/${paymentId}/record-manual`,
      body: { amount: 1, paymentDate: new Date().toISOString(), notes: 'Golden-path smoke test' },
    },
    { name: 'lease document generation', method: 'POST', path: `/leases/${leaseId}/generate-document` },
    { name: 'lease send for signature', method: 'POST', path: `/leases/${leaseId}/send-for-signature`, body: {} },
    {
      name: 'maintenance assign vendor',
      method: 'POST',
      path: `/maintenance/${maintenanceId}/assign-vendor`,
      body: { vendorId, notes: 'Golden-path smoke test' },
    },
    {
      name: 'maintenance notify tenant',
      method: 'POST',
      path: `/maintenance/${maintenanceId}/notify-tenant`,
      body: { message: 'Golden-path smoke test notification.' },
    },
    { name: 'inspections start alias', method: 'POST', path: '/inspections/start', body: { inspectionId: Number(inspectionId) } },
    { name: 'reports rent roll', path: `/reporting/rent-roll${requiredSeed.reportPropertyId ? `?propertyId=${requiredSeed.reportPropertyId}` : ''}` },
    { name: 'reports vacancy rate', path: `/reporting/vacancy-rate${requiredSeed.reportPropertyId ? `?propertyId=${requiredSeed.reportPropertyId}` : ''}` },
    { name: 'feature flags batch', path: '/feature-flags/check-batch?keys=dashboard_v2&keys=payments_v2' },
    { name: 'quickbooks status', path: '/quickbooks/status' },
  ];

  const results = [];
  for (const step of steps) {
    results.push(await requestStep(step));
  }

  console.log(JSON.stringify({ baseUrl, passed: results.length, results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
