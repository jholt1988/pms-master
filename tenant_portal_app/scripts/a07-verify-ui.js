const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_TITLE = process.env.A07_TITLE;
if (!TEST_TITLE) throw new Error('A07_TITLE is required');

async function tenantView(outDir) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: /Username/i }).fill('tenant');
  await page.locator('input[type="password"]').first().fill('Tenant123!@#');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.goto('http://localhost:3000/maintenance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'a07-01-tenant-maintenance-list.png'), fullPage: true });
  const body = (await page.textContent('body')) || '';
  await context.close();
  await browser.close();
  return { hasTitle: body.includes(TEST_TITLE) };
}

async function pmView(outDir) {
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
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'a07-02-pm-queue.png'), fullPage: true });
  await page.getByText(TEST_TITLE, { exact: false }).first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, 'a07-03-pm-detail-photo-gallery.png'), fullPage: true });
  const body = (await page.textContent('body')) || '';
  const hasPhotoIndicator = body.includes('1 photo') || body.includes('Photos (1)');
  await context.close();
  await browser.close();
  return { hasTitle: body.includes(TEST_TITLE), hasPhotoIndicator };
}

(async () => {
  const outDir = path.resolve(__dirname, '../../../reports/evidence/A-07');
  fs.mkdirSync(outDir, { recursive: true });
  const tenant = await tenantView(outDir);
  const pm = await pmView(outDir);
  console.log(JSON.stringify({ testTitle: TEST_TITLE, tenant, pm }, null, 2));
})();
