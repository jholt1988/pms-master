const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const outDir = path.resolve(__dirname, '../../../reports/evidence/A-03');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, 'a03-03-login-before-submit.png'), fullPage: true });

  await page.getByRole('textbox', { name: /Username/i }).fill('admin');
  await page.locator('input[type="password"]').first().fill('Admin123!@#');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(outDir, 'a03-04-after-submit.png'), fullPage: true });

  const title = await page.title();
  const url = page.url();
  const body = await page.textContent('body');
  console.log(JSON.stringify({ title, url, bodySnippet: (body || '').slice(0, 300) }, null, 2));

  await context.close();
  await browser.close();
})();
