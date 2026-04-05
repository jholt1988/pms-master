const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const API = 'http://127.0.0.1:3001/api';
const TENANT = { username: 'tenant', password: 'Tenant123!@#' };
const PM = { username: 'admin', password: 'Admin123!@#' };

async function loginApi({ username, password }) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${username}: ${res.status}`);
  const json = await res.json();
  return json.access_token || json.accessToken;
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
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

(async () => {
  const outDir = path.resolve(__dirname, '../../../reports/evidence/A-11');
  fs.mkdirSync(outDir, { recursive: true });

  const tenantToken = await loginApi(TENANT);
  const pmToken = await loginApi(PM);

  // 1) Tenant creates or reuses an active request
  const reqNotes = `A11 mobile draft verification ${Date.now()}`;
  let requestId;
  let createReq = await api(tenantToken, 'POST', '/inspections/requests', {
    type: 'MOVE_IN',
    notes: reqNotes,
  });

  if (createReq.status < 300) {
    requestId = createReq.data?.id;
  } else {
    const listReq = await api(tenantToken, 'GET', '/inspections/requests');
    const requests = Array.isArray(listReq.data) ? listReq.data : (listReq.data?.data || []);
    const candidate = requests.find((r) => ['PENDING', 'APPROVED'].includes(String(r.status))) || requests[0];
    if (!candidate?.id) {
      throw new Error(`Failed to create or locate inspection request: ${createReq.status} ${JSON.stringify(createReq.data)}`);
    }
    requestId = candidate.id;
  }

  // 2) PM approves request (idempotent: if already approved, continue)
  let approve = await api(pmToken, 'PATCH', `/inspections/requests/${requestId}/decision`, {
    decision: 'APPROVED',
    notes: 'A11 automated approval for draft verification',
  });
  if (approve.status >= 300) {
    const reqDetail = await api(tenantToken, 'GET', '/inspections/requests');
    const requests = Array.isArray(reqDetail.data) ? reqDetail.data : (reqDetail.data?.data || []);
    const thisReq = requests.find((r) => Number(r.id) === Number(requestId));
    if (!thisReq || String(thisReq.status) !== 'APPROVED') {
      throw new Error(`Failed to approve request: ${approve.status} ${JSON.stringify(approve.data)}`);
    }
  }

  // 3) Tenant starts approved inspection
  const start = await api(tenantToken, 'POST', '/inspections/start', { requestId });
  if (start.status >= 300) {
    throw new Error(`Failed to start inspection: ${start.status} ${JSON.stringify(start.data)}`);
  }
  const inspectionId = start.data?.inspectionId || start.data?.id;
  if (!inspectionId) throw new Error('No inspectionId returned from start endpoint');

  // 4) Mobile viewport UX draft verification
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    recordVideo: { dir: outDir, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: /Username/i }).fill(TENANT.username);
  await page.locator('input[type="password"]').first().fill(TENANT.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  await page.goto(`http://localhost:3000/tenant/inspections/${inspectionId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'a11-01-mobile-detail-initial.png'), fullPage: true });

  // Fill first checklist row draft fields without saving
  const firstCondition = page.locator('select').first();
  await firstCondition.selectOption('GOOD');

  const firstAttention = page.locator('select').nth(1);
  await firstAttention.selectOption('YES');

  const draftNote = `A11 draft note ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Notes' }).first().fill(draftNote);

  // Add photo draft URL/caption fields if present
  const urlInputs = page.locator('input[placeholder*="Photo URL"], input[placeholder*="photo url"], input[placeholder*="https://"]');
  const captionInputs = page.locator('input[placeholder*="Caption"], input[placeholder*="caption"]');
  const hasUrlInput = (await urlInputs.count()) > 0;
  if (hasUrlInput) {
    await urlInputs.first().fill('https://example.com/a11-mobile-photo.png');
  }
  const hasCaptionInput = (await captionInputs.count()) > 0;
  if (hasCaptionInput) {
    await captionInputs.first().fill('A11 draft caption');
  }

  await page.screenshot({ path: path.join(outDir, 'a11-02-mobile-draft-filled.png'), fullPage: true });

  // Verify draft exists in localStorage
  const storageKey = `tenant-inspection-draft:${inspectionId}`;
  const beforeReloadDraftRaw = await page.evaluate((key) => localStorage.getItem(key), storageKey);

  // Reload and verify restore notice + values
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'a11-03-mobile-after-reload.png'), fullPage: true });

  const body = (await page.textContent('body')) || '';
  const hasRestoreNotice = body.includes('Restored draft');
  const restoredNote = await page.getByRole('textbox', { name: 'Notes' }).first().inputValue();
  const restoredCondition = await page.locator('select').first().inputValue();

  // Dismiss notice and capture
  const dismissBtn = page.getByRole('button', { name: /Dismiss/i }).first();
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, 'a11-04-mobile-dismissed-notice.png'), fullPage: true });
  }

  await context.close();
  await browser.close();

  console.log(JSON.stringify({
    requestId,
    inspectionId,
    checks: {
      createReqStatus: createReq.status,
      approveStatus: approve.status,
      startStatus: start.status,
      hasStoredDraft: Boolean(beforeReloadDraftRaw),
      hasRestoreNotice,
      restoredCondition,
      restoredNoteMatches: restoredNote === draftNote,
      usedPhotoDraftFields: hasUrlInput || hasCaptionInput,
    },
  }, null, 2));
})();
