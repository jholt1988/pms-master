import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:3000';
const DEMO_USER = process.env.DEMO_USER || 'admin';
const DEMO_PASS = process.env.DEMO_PASS || 'Admin123!@#';
const OUT_DIR = process.env.DEMO_SHOT_DIR || path.resolve(process.cwd(), '../pms-plans/evidence/screenshots/2026-03-06');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function snap(page, filename) {
  const out = path.join(OUT_DIR, filename);
  await page.screenshot({ path: out, fullPage: true });
  console.log('saved', out);
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  // Avoid ambiguous label matches in strict mode.
  const userInput = page.locator('input[type="email"], input[name="username"], input[autocomplete="username"], input[type="text"]').first();
  const passInput = page.locator('input[type="password"]').first();

  await userInput.fill(DEMO_USER);
  await passInput.fill(DEMO_PASS);
  await page.getByRole('button', { name: /sign in|login/i }).first().click();
  await page.waitForLoadState('networkidle');
}

async function clickPropertyCreateButtonIfPresent(page) {
  const candidates = [
    page.getByRole('button', { name: /add property|create property|new property|add new property|create/i }).first(),
    page.getByRole('link', { name: /add property|create property|new property|add new property|create/i }).first(),
    page.locator('[data-testid="add-property"], [data-testid="create-property"], [data-testid="new-property"]').first(),
  ];

  for (const candidate of candidates) {
    try {
      if (await candidate.isVisible({ timeout: 800 })) {
        await candidate.click();
        await page.waitForLoadState('networkidle');
        return true;
      }
    } catch {
      // try next candidate
    }
  }

  return false;
}

async function capturePropertyFormTabs(page) {
  await page.goto(`${BASE_URL}/properties`, { waitUntil: 'networkidle' });

  // Some UIs require clicking an "Add/Create property" action before the form/tabs appear.
  await clickPropertyCreateButtonIfPresent(page);

  // Ensure we are on the creation route if navigation button was not present/effective.
  if (!page.url().includes('/properties/new')) {
    await page.goto(`${BASE_URL}/properties/new`, { waitUntil: 'networkidle' });
  }

  await snap(page, '1_2_property-creation-form.png');

  const tabs = page.getByRole('tab');
  const tabCount = await tabs.count();

  if (tabCount === 0) {
    return;
  }

  for (let i = 0; i < tabCount; i++) {
    const tab = tabs.nth(i);
    const tabNameRaw = await tab.textContent();
    const tabName = (tabNameRaw || `tab-${i + 1}`)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '') || `tab-${i + 1}`;

    try {
      await tab.click();
      await page.waitForLoadState('networkidle');
      await snap(page, `1_2_property-creation-tab-${String(i + 1).padStart(2, '0')}-${tabName}.png`);
    } catch (e) {
      console.warn('failed to capture tab', i + 1, tabName, e?.message || e);
    }
  }
}

async function safeGoto(page, route) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });

  // If we got bounced to login, try re-auth once.
  if (page.url().includes('/login')) {
    await login(page);
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
  }
}

async function captureDesktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await login(page);

  // Dedicated flow for property creation + per-tab screenshots.
  await safeGoto(page, '/dashboard');
  await snap(page, '1_1_empty-dashboard.png');
  await capturePropertyFormTabs(page);

  // Use only existing app routes; avoid stale legacy paths.
  const routes = [
    ['/properties', '1_3_property-detail-units.png'],
    ['/rental-application/form', '2_1_application-form.png'],
    ['/rental-applications-management', '2_2_application-review-pm.png'],
    ['/dashboard', '2_3_tenant-welcome-screen.png'],
    ['/my-lease', '3_1_lease-document-view.png'],
    ['/payments', '4_1_payment-method-added.png'],
    ['/payments?status=success', '4_2_payment-confirmation.png'],
    ['/maintenance', '5_1_maintenance-request-form.png'],
    ['/maintenance-management', '5_2_pm-queue-view.png'],
    ['/messaging', '5_3_request-detail-messaging.png'],
    ['/inspection-management', '6_1_inspection-type-selector.png'],
    ['/inspections/1', '6_2_inspection-checklist.png'],
    ['/inspections/1?report=routine', '6_3_ai-report-routine.png'],
    ['/inspections/1?report=moveout', '6_4_ai-report-move-out.png'],
    ['/reporting', '7_1_owner-dashboard.png'],
    ['/maintenance-management', '7_2_owner-maintenance-view.png'],
    ['/maintenance-management', '7_3_owner-comment-badge.png'],
  ];

  for (const [route, file] of routes) {
    await safeGoto(page, route);
    await snap(page, file);
  }

  await browser.close();
}

async function captureMobile() {
  const browser = await chromium.launch({ headless: true });
  const target = {
    device: devices['iPhone 14 Pro'],
    shots: [
      ['/dashboard', '8_1_mobile-pm-dashboard.png'],
      ['/maintenance', '8_2_mobile-maintenance-form.png'],
      ['/inspections/1', '8_3_mobile-inspection-checklist.png'],
      ['/maintenance-management', '8_4_mobile-owner-request-detail-comment.png'],
    ],
  };

  const context = await browser.newContext({ ...target.device });
  const page = await context.newPage();
  await login(page);
  for (const [route, file] of target.shots) {
    await safeGoto(page, route);
    await snap(page, file);
  }
  await context.close();
  await browser.close();
}

async function main() {
  ensureDir(OUT_DIR);
  await captureDesktop();
  await captureMobile();
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
