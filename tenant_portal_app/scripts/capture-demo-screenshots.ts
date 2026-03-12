import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:3000';
const DEMO_USER = process.env.DEMO_USER || 'admin';
const DEMO_PASS = process.env.DEMO_PASS || 'Admin123!@#';
const OUT_DIR =
  process.env.DEMO_SHOT_DIR ||
  path.resolve(process.cwd(), '../pms-plans/evidence/screenshots/2026-03-06');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function snap(page, filename) {
  const out = path.join(OUT_DIR, filename);
  await page.screenshot({ path: out, fullPage: true });
  console.log('saved', out);
}

function routeKey(routeOrUrl) {
  const u = new URL(routeOrUrl, BASE_URL);
  return `${u.pathname}${u.search}`;
}

function byHeading(page, re) {
  return page.getByRole('heading', { name: re }).first();
}

function byButton(page, re) {
  return page.getByRole('button', { name: re }).first();
}

function byText(page, re) {
  return page.getByText(re).first();
}

function byTestId(page, id) {
  return page.getByTestId(id).first();
}

async function waitForAnyVisible(page, candidates, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let lastError;

  while (Date.now() < deadline) {
    for (const makeLocator of candidates) {
      try {
        const locator = makeLocator(page);
        await locator.waitFor({ state: 'visible', timeout: 500 });
        return locator;
      } catch (err) {
        lastError = err;
      }
    }
    await page.waitForTimeout(150);
  }

  throw new Error(`Timed out waiting for route-ready marker: ${label}${lastError ? `\nLast error: ${lastError}` : ''}`);
}

async function waitForLoadingToSettle(page) {
  const maybeLoading = [
    page.locator('[aria-busy="true"]'),
    page.locator('[data-testid="loading"]'),
    page.locator('[data-testid="spinner"]'),
    page.locator('[data-testid="skeleton"]'),
    page.locator('.spinner'),
    page.locator('.loading'),
    page.locator('.skeleton'),
    page.locator('text=/loading/i'),
  ];

  for (const locator of maybeLoading) {
    try {
      await locator.waitFor({ state: 'hidden', timeout: 1200 });
    } catch {
      // Ignore. These are optional signals, not gospel tablets.
    }
  }

  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });

  await page.waitForTimeout(200);
}

const ROUTE_WAITS = {
  '/dashboard': {
    label: 'PM dashboard',
    any: [
      (p) => byTestId(p, 'page-dashboard'),
      (p) => byHeading(p, /dashboard|overview/i),
      (p) => byText(p, /occupancy|portfolio|recent activity|tasks|units/i),
      (p) => p.locator('main [role="region"], main .card, [role="main"] .card').first(),
    ],
  },

  '/properties/new': {
    label: 'property creation form',
    any: [
      (p) => byTestId(p, 'page-properties-new'),
      (p) => byHeading(p, /new property|add property|create property/i),
      (p) => p.locator('main form, [role="main"] form').first(),
      (p) => byButton(p, /save|create property|submit/i),
    ],
  },

  '/properties': {
    label: 'properties list/detail units view',
    any: [
      (p) => byTestId(p, 'page-properties'),
      (p) => byHeading(p, /properties|units/i),
      (p) => byText(p, /units|vacancy|occupied|property/i),
      (p) => p.locator('table, [role="table"], [data-testid="properties-table"]').first(),
    ],
  },

  '/apply': {
    label: 'application form',
    any: [
      (p) => byTestId(p, 'page-apply'),
      (p) => byHeading(p, /apply|application|rental application/i),
      (p) => p.locator('main form, [role="main"] form').first(),
      (p) => byButton(p, /submit application|continue|next|apply/i),
    ],
  },

  '/rental-applications': {
    label: 'rental applications review',
    any: [
      (p) => byTestId(p, 'page-rental-applications'),
      (p) => byHeading(p, /rental applications|applications/i),
      (p) => byText(p, /pending|review|submitted|applicant/i),
      (p) => p.locator('table, [role="table"], [data-testid="applications-table"]').first(),
    ],
  },

  '/tenant/welcome': {
    label: 'tenant welcome screen',
    any: [
      (p) => byTestId(p, 'page-tenant-welcome'),
      (p) => byHeading(p, /welcome|tenant welcome/i),
      (p) => byText(p, /next steps|move.?in|lease|payments/i),
      (p) => byButton(p, /get started|continue|view lease/i),
    ],
  },

  '/my-lease': {
    label: 'lease document view',
    any: [
      (p) => byTestId(p, 'page-my-lease'),
      (p) => byHeading(p, /my lease|lease/i),
      (p) => byText(p, /lease agreement|document|sign|download/i),
      (p) => p.locator('iframe, embed, object, [data-testid="lease-document"]').first(),
    ],
  },

  '/payments': {
    label: 'payments page',
    any: [
      (p) => byTestId(p, 'page-payments'),
      (p) => byHeading(p, /payments|billing/i),
      (p) => byText(p, /payment method|autopay|balance|transactions/i),
      (p) => byButton(p, /add payment method|pay now|make payment/i),
    ],
  },

  '/payments?status=success': {
    label: 'payment success confirmation',
    any: [
      (p) => byTestId(p, 'payment-success'),
      (p) => byHeading(p, /payment (successful|success|confirmed)|confirmation/i),
      (p) => byText(p, /thank you|receipt|transaction|confirmation/i),
      (p) => byButton(p, /done|view receipt|back to payments/i),
    ],
  },

  '/maintenance/new': {
    label: 'maintenance request form',
    any: [
      (p) => byTestId(p, 'page-maintenance-new'),
      (p) => byHeading(p, /new maintenance request|request maintenance|maintenance/i),
      (p) => p.locator('main form, [role="main"] form').first(),
      (p) => byButton(p, /submit request|save|send/i),
    ],
  },

  '/maintenance': {
    label: 'maintenance queue/list',
    any: [
      (p) => byTestId(p, 'page-maintenance'),
      (p) => byHeading(p, /maintenance|requests|queue/i),
      (p) => byText(p, /open|in progress|closed|priority/i),
      (p) => p.locator('table, [role="table"], [data-testid="maintenance-table"]').first(),
    ],
  },

  '/messaging': {
    label: 'messaging page',
    any: [
      (p) => byTestId(p, 'page-messaging'),
      (p) => byHeading(p, /messages|messaging|inbox/i),
      (p) => p.getByRole('textbox', { name: /message|reply|type/i }).first(),
      (p) => p.locator('[data-testid="conversation-list"], [data-testid="message-thread"], [role="list"]').first(),
    ],
  },

  '/inspection-management': {
    label: 'inspection type selector',
    any: [
      (p) => byTestId(p, 'page-inspection-management'),
      (p) => byHeading(p, /inspection management|inspections/i),
      (p) => byButton(p, /routine|move.?out|move.?in/i),
      (p) => byText(p, /inspection type|select inspection/i),
    ],
  },

  '/inspections/1': {
    label: 'inspection checklist',
    any: [
      (p) => byTestId(p, 'page-inspection-detail'),
      (p) => byHeading(p, /inspection|checklist/i),
      (p) => byText(p, /checklist|item|pass|fail|notes/i),
      (p) => p.locator('[data-testid="inspection-checklist"], [role="checkbox"], [role="listitem"]').first(),
    ],
  },

  '/inspections/1?report=routine': {
    label: 'routine inspection AI report',
    any: [
      (p) => byTestId(p, 'inspection-report-routine'),
      (p) => byHeading(p, /routine report|inspection report|ai report/i),
      (p) => byText(p, /routine|summary|findings|recommendations/i),
      (p) => p.locator('[data-testid="inspection-report"], article, .report').first(),
    ],
  },

  '/inspections/1?report=moveout': {
    label: 'move-out inspection AI report',
    any: [
      (p) => byTestId(p, 'inspection-report-moveout'),
      (p) => byHeading(p, /move.?out report|inspection report|ai report/i),
      (p) => byText(p, /move.?out|damages|deposit|summary|findings/i),
      (p) => p.locator('[data-testid="inspection-report"], article, .report').first(),
    ],
  },

  '/owner/dashboard': {
    label: 'owner dashboard',
    any: [
      (p) => byTestId(p, 'page-owner-dashboard'),
      (p) => byHeading(p, /owner dashboard|dashboard|portfolio/i),
      (p) => byText(p, /revenue|expenses|maintenance|portfolio|occupancy/i),
      (p) => p.locator('main .card, [role="main"] .card, [data-testid="owner-metrics"]').first(),
    ],
  },

  '/owner/maintenance': {
    label: 'owner maintenance view',
    any: [
      (p) => byTestId(p, 'page-owner-maintenance'),
      (p) => byHeading(p, /maintenance|owner maintenance/i),
      (p) => byText(p, /request|status|priority|property/i),
      (p) => p.locator('table, [role="table"], [data-testid="owner-maintenance-table"]').first(),
    ],
  },

  '/owner/maintenance/1': {
    label: 'owner maintenance detail/comment view',
    any: [
      (p) => byTestId(p, 'page-owner-maintenance-detail'),
      (p) => byHeading(p, /maintenance request|request detail|maintenance/i),
      (p) => byText(p, /comment|comments|activity|status/i),
      (p) => p.locator('[data-testid="comment-badge"], [data-testid="comments"], [role="textbox"]').first(),
    ],
  },
};

async function waitForRouteReady(page, routeOrUrl) {
  const key = routeKey(routeOrUrl);
  const pathnameOnly = new URL(routeOrUrl, BASE_URL).pathname;
  const spec = ROUTE_WAITS[key] || ROUTE_WAITS[pathnameOnly];

  await page.waitForLoadState('domcontentloaded');
  await waitForLoadingToSettle(page);

  if (spec) {
    await waitForAnyVisible(page, spec.any, spec.label, 15000);
  } else {
    await page.locator('main, [role="main"], body').first().waitFor({ state: 'visible' });
  }

  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  }).catch(() => {});

  await page.waitForTimeout(200);
}

async function gotoReady(page, route) {
  const expected = routeKey(route);

  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });

  await page.waitForURL((url) => `${url.pathname}${url.search}` === expected, {
    timeout: 15000,
  }).catch(() => {
    // Ignore soft-routing weirdness; route-specific locator wait below is the main signal.
  });

  await waitForRouteReady(page, route);
}

async function login(page) {
  await gotoReady(page, '/login');

  await page.getByLabel(/username|email/i).fill(DEMO_USER);
  await page.getByLabel(/password/i).fill(DEMO_PASS);

  const submit = page.getByRole('button', { name: /sign in|login/i }).first();

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }).catch(() => null),
    submit.click(),
  ]);

  await waitForRouteReady(page, page.url());
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

  await context.close();
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
    await gotoReady(page, route);
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