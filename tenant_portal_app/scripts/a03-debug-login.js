const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', (msg) => logs.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => logs.push(`[requestfailed] ${req.method()} ${req.url()} -> ${req.failure()?.errorText}`));
  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('/auth/login') || u.includes('/api/')) {
      logs.push(`[response] ${res.status()} ${res.request().method()} ${u}`);
    }
  });

  await page.goto('http://localhost:3000/login?redirect=%2F', { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: /Username/i }).fill('admin');
  await page.locator('input[type="password"]').first().fill('Admin123!@#');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(2500);

  const url = page.url();
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const bodyText = (await page.textContent('body')) || '';

  console.log(JSON.stringify({ url, hasToken: !!token, tokenPrefix: token ? token.slice(0, 20) : null, bodySnippet: bodyText.slice(0, 220), logs }, null, 2));

  await context.close();
  await browser.close();
})();
