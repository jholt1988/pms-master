const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const API = 'http://127.0.0.1:3001/api';
const OWNER_USER = 'jordan_owner';
const OWNER_PASS = 'demo1234';

async function loginApi(username, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  const data = await res.json();
  return data.access_token || data.accessToken;
}

async function api(token, method, endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, data: json };
}

(async () => {
  const outDir = path.resolve(__dirname, '../../../reports/evidence/A-10');
  fs.mkdirSync(outDir, { recursive: true });

  const ownerToken = await loginApi(OWNER_USER, OWNER_PASS);

  const props = await api(ownerToken, 'GET', '/properties');
  const properties = Array.isArray(props.data)
    ? props.data
    : (props.data?.data || props.data?.properties || []);
  if (!properties.length) throw new Error('No properties available for owner account');
  const propertyId = properties[0].id;

  const title = `A10 Owner Request ${Date.now()}`;

  // Required propertyId check
  const createWithoutProperty = await api(ownerToken, 'POST', '/maintenance', {
    title: `${title} missing-property`,
    description: 'A10 negative test for propertyId required',
    priority: 'MEDIUM',
  });

  // Owner create request with propertyId
  const createWithProperty = await api(ownerToken, 'POST', '/maintenance', {
    title,
    description: 'A10 owner minimum verification request',
    priority: 'MEDIUM',
    category: 'General Maintenance',
    propertyId,
  });

  if (createWithProperty.status >= 300) {
    throw new Error(`Owner create with propertyId failed (${createWithProperty.status}): ${JSON.stringify(createWithProperty.data)}`);
  }

  const reqId = createWithProperty.data.id;

  // Owner comment/note allowed
  const addNote = await api(ownerToken, 'POST', `/maintenance/${reqId}/notes`, {
    body: 'A10 owner note: visible operational context',
  });

  // Owner blocked actions
  const statusAttempt = await api(ownerToken, 'PATCH', `/maintenance/${reqId}/status`, {
    status: 'IN_PROGRESS',
    note: 'Attempted owner status update',
  });

  const assignAttempt = await api(ownerToken, 'PATCH', `/maintenance/${reqId}/assign`, {
    technicianId: '00000000-0000-0000-0000-000000000001',
  });

  // UI verification (list/detail read path)
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: /Username/i }).fill(OWNER_USER);
  await page.locator('input[type="password"]').first().fill(OWNER_PASS);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  await page.goto('http://localhost:3000/maintenance-management', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'a10-01-owner-maintenance-list.png'), fullPage: true });

  const row = page.getByText(title, { exact: false }).first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(outDir, 'a10-02-owner-request-detail.png'), fullPage: true });

  const uiBody = (await page.textContent('body')) || '';

  await context.close();
  await browser.close();

  console.log(JSON.stringify({
    title,
    requestId: reqId,
    checks: {
      createWithoutProperty,
      createWithProperty: { status: createWithProperty.status, id: reqId },
      addNote,
      statusAttempt,
      assignAttempt,
      uiHasRequestTitle: uiBody.includes(title),
    },
  }, null, 2));
})();
