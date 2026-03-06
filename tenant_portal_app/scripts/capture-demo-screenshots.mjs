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

async function captureDesktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await login(page);

  const routes = [
    ['/dashboard', '1_1_empty-dashboard.png'],
    ['/properties/new', '1_2_property-creation-form.png'],
    ['/properties', '1_3_property-detail-units.png'],
    ['/apply', '2_1_application-form.png'],
    ['/rental-applications', '2_2_application-review-pm.png'],
    ['/tenant/welcome', '2_3_tenant-welcome-screen.png'],
    ['/my-lease', '3_1_lease-document-view.png'],
    ['/payments', '4_1_payment-method-added.png'],
    ['/payments?status=success', '4_2_payment-confirmation.png'],
    ['/maintenance/new', '5_1_maintenance-request-form.png'],
    ['/maintenance', '5_2_pm-queue-view.png'],
    ['/messaging', '5_3_request-detail-messaging.png'],
    ['/inspection-management', '6_1_inspection-type-selector.png'],
    ['/inspections/1', '6_2_inspection-checklist.png'],
    ['/inspections/1?report=routine', '6_3_ai-report-routine.png'],
    ['/inspections/1?report=moveout', '6_4_ai-report-move-out.png'],
    ['/owner/dashboard', '7_1_owner-dashboard.png'],
    ['/owner/maintenance', '7_2_owner-maintenance-view.png'],
    ['/owner/maintenance/1', '7_3_owner-comment-badge.png'],
  ];

  for (const [route, file] of routes) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
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
      ['/maintenance/new', '8_2_mobile-maintenance-form.png'],
      ['/inspections/1', '8_3_mobile-inspection-checklist.png'],
      ['/owner/maintenance/1', '8_4_mobile-owner-request-detail-comment.png'],
    ],
  };

  const context = await browser.newContext({ ...target.device });
  const page = await context.newPage();
  await login(page);
  for (const [route, file] of target.shots) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
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
