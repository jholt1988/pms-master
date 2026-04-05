const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const outDir = path.resolve(__dirname, '../../../reports/evidence/A-06');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: /Username/i }).fill('tenant');
  await page.locator('input[type="password"]').first().fill('Tenant123!@#');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  await page.goto('http://localhost:3000/documents', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'a06-05-tenant-documents-page.png'), fullPage: true });

  const body = (await page.textContent('body')) || '';
  console.log(JSON.stringify({ url: page.url(), bodySnippet: body.slice(0, 450) }, null, 2));

  await context.close();
  await browser.close();
})();
