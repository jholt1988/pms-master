const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_TITLE = `A07 Photo Request ${Date.now()}`;

async function ensurePhotoFixture(filePath) {
  // 1x1 PNG
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn1xwAAAABJRU5ErkJggg==';
  fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
}

async function tenantPhase(outDir) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  const photoPath = path.join(outDir, 'a07-upload.png');
  await ensurePhotoFixture(photoPath);

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: /Username/i }).fill('tenant');
  await page.locator('input[type="password"]').first().fill('Tenant123!@#');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  await page.goto('http://localhost:3000/maintenance', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, 'a07-01-tenant-maintenance-page.png'), fullPage: true });

  const firstRequestBtn = page.locator('button:has-text("Submit Your First Request")').first();
  const submitBtn = page.locator('button:has-text("Submit Request")').first();
  if (await firstRequestBtn.isVisible().catch(() => false)) {
    await firstRequestBtn.click({ force: true });
  } else {
    await submitBtn.waitFor({ timeout: 15000 });
    await submitBtn.click({ force: true });
  }

  await page.getByText('Submit Maintenance Request', { exact: false }).waitFor({ timeout: 15000 });

  await page.getByRole('textbox', { name: /Maintenance request title|Request Title|title/i }).fill(TEST_TITLE);

  const categoryBtn = page.locator('button:has-text("Category")').first();
  await categoryBtn.click({ force: true });
  // Plumbing is the first category option.
  await page.keyboard.press('Enter');

  const priorityBtn = page.locator('button:has-text("Priority")').first();
  await priorityBtn.click({ force: true });
  // Move selection to HIGH (LOW -> MEDIUM -> HIGH), then select.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await page.getByRole('textbox', { name: /Description/i }).fill('A-07 verification: bathroom leak with photo evidence.');
  await page.getByRole('textbox', { name: /Photo Caption/i }).fill('Leak under sink');

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(photoPath);

  await page.screenshot({ path: path.join(outDir, 'a07-02-tenant-request-filled.png'), fullPage: true });

  await page.getByRole('button', { name: /Submit maintenance request|Submit Request/i }).last().click();
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(outDir, 'a07-03-tenant-after-submit.png'), fullPage: true });

  const body = (await page.textContent('body')) || '';

  await context.close();
  await browser.close();
  return { tenantHasTitle: body.includes(TEST_TITLE) };
}

async function pmPhase(outDir) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: /Username/i }).fill('admin');
  await page.locator('input[type="password"]').first().fill('Admin123!@#');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  await page.goto('http://localhost:3000/maintenance-management', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'a07-04-pm-queue.png'), fullPage: true });

  const card = page.getByText(TEST_TITLE, { exact: false }).first();
  await card.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'a07-05-pm-detail-with-photos.png'), fullPage: true });

  const body = (await page.textContent('body')) || '';
  const queueHasPhotoCount = body.includes('1 photo') || body.includes('1 photos') || body.includes('Photos (1)');

  await context.close();
  await browser.close();
  return { queueHasPhotoCount, pmHasTitle: body.includes(TEST_TITLE), bodySnippet: body.slice(0, 500) };
}

(async () => {
  const outDir = path.resolve(__dirname, '../../../reports/evidence/A-07');
  fs.mkdirSync(outDir, { recursive: true });

  const tenant = await tenantPhase(outDir);
  const pm = await pmPhase(outDir);

  console.log(JSON.stringify({ testTitle: TEST_TITLE, tenant, pm }, null, 2));
})();
