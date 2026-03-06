import { chromium, devices, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:3000';
const DEMO_USER = process.env.DEMO_USER || 'admin';
const DEMO_PASS = process.env.DEMO_PASS || 'Admin123!@#';
const OUT_DIR = process.env.DEMO_SHOT_DIR || path.resolve(process.cwd(), '../pms-plans/evidence/screenshots/2026-03-06');

async function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function snap(page: Page, filename: string) {
  const out = path.join(OUT_DIR, filename);
  await page.screenshot({ path: out, fullPage: true });
  console.log('saved', out);
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/username|email/i).fill(DEMO_USER);
  await page.getByLabel(/password/i).fill(DEMO_PASS);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForLoadState('networkidle');
}

async function captureDesktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await login(page);

  const routes: Array<[string, string]> = [
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

  const mobileTargets = [
    { device: devices['iPhone 14 Pro'], shots: [
      ['/dashboard', '8_1_mobile-pm-dashboard.png'],
      ['/maintenance/new', '8_2_mobile-maintenance-form.png'],
      ['/inspections/1', '8_3_mobile-inspection-checklist.png'],
      ['/owner/maintenance/1', '8_4_mobile-owner-request-detail-comment.png'],
    ] },
  ];

  for (const target of mobileTargets) {
    const context = await browser.newContext({ ...target.device });
    const page = await context.newPage();
    await login(page);
    for (const [route, file] of target.shots as Array<[string, string]>) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      await snap(page, file);
    }
    await context.close();
  }

  await browser.close();
}

async function main() {
  await ensureDir(OUT_DIR);
  await captureDesktop();
  await captureMobile();
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
