#!/usr/bin/env node

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://pms-backend:3001/api';
const TENANT_USER = process.env.VERIFY_TENANT_USER || 'tenant';
const TENANT_PASS = process.env.VERIFY_TENANT_PASS || 'Tenant123!@#';

async function req(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

(async () => {
  const login = await req('/auth/login', {
    method: 'POST',
    body: { username: TENANT_USER, password: TENANT_PASS },
  });

  const token = login.data?.access_token;
  const rows = [];

  rows.push({ endpoint: '/auth/login', status: login.status, pass: !!token });

  const checks = [
    '/tenant/dashboard',
    '/maintenance',
    '/payments/invoices',
    '/leases/my-lease',
    '/messaging/conversations',
    '/inspections',
    '/properties/public',
  ];

  for (const path of checks) {
    const r = await req(path, { token: path === '/properties/public' ? undefined : token });
    rows.push({ endpoint: path, status: r.status, pass: r.status === 200 });
  }

  console.table(rows);
  const failed = rows.filter((r) => !r.pass);
  console.log(`Summary: ${rows.length - failed.length}/${rows.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
