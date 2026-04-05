const { chromium } = require('playwright');
const path = require('path');

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
  await page.screenshot({ path: path.join(outDir, 'a06-01-pm-dashboard.png'), fullPage: true });

  await page.goto('http://localhost:3000/lease-management', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'a06-02-pm-lease-management.png'), fullPage: true });

  const body = (await page.textContent('body')) || '';

  await context.close();
  await browser.close();
  return { pmBodySnippet: body.slice(0, 350) };
}

async function tenantPhase(outDir) {
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
  await page.screenshot({ path: path.join(outDir, 'a06-03-tenant-dashboard.png'), fullPage: true });

  await page.goto('http://localhost:3000/my-lease', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'a06-04-tenant-my-lease.png'), fullPage: true });

  const body = (await page.textContent('body')) || '';
  const hasDoc = body.includes('A06-Test-Lease-Document.pdf');

  await context.close();
  await browser.close();
  return { tenantBodySnippet: body.slice(0, 500), hasDoc };
}

(async () => {
  const outDir = path.resolve(__dirname, '../../../reports/evidence/A-06');
  const fs = require('fs');
  fs.mkdirSync(outDir, { recursive: true });

  const pm = await pmPhase(outDir);
  const tenant = await tenantPhase(outDir);

  console.log(JSON.stringify({ pm, tenant }, null, 2));
})();
