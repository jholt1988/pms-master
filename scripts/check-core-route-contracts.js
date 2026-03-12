#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const checks = [
  {
    id: 'dashboard-metrics',
    frontendFile: 'tenant_portal_app/src/MainDashboard.tsx',
    frontendPattern: /apiFetch\('\/dashboard\/metrics'/,
    backendFile: 'tenant_portal_backend/src/dashboard/dashboard.controller.ts',
    backendPatterns: [/@Controller\('dashboard'\)/, /@Get\('metrics'\)/],
  },
  {
    id: 'tenant-dashboard',
    frontendFile: 'tenant_portal_app/src/domains/tenant/features/dashboard/TenantDashboard.tsx',
    frontendPattern: /apiFetch\('\/tenant\/dashboard'/,
    backendFile: 'tenant_portal_backend/src/dashboard/tenant-dashboard.controller.ts',
    backendPatterns: [/@Controller\('tenant'\)/, /@Get\('dashboard'\)/],
  },
  {
    id: 'properties-search',
    frontendFile: 'tenant_portal_app/src/services/propertySearch.ts',
    frontendPattern: /properties\/search/,
    backendFile: 'tenant_portal_backend/src/property/property.controller.ts',
    backendPatterns: [/@Controller\(\['properties', 'property'\]\)/, /@Get\('search'\)/],
  },
  {
    id: 'payments-core',
    frontendFile: 'tenant_portal_app/src/domains/tenant/features/payments/PaymentsPage.tsx',
    frontendPattern: /payments\/invoices[\s\S]*payments\/payment-methods[\s\S]*payments\/history/,
    backendFile: 'tenant_portal_backend/src/payments/payments.controller.ts',
    backendPatterns: [/@Controller\('payments'\)/, /@Get\('invoices'\)/, /@Get\('history'\)/],
  },
  {
    id: 'payments-methods',
    frontendFile: 'tenant_portal_app/src/domains/tenant/features/payments/PaymentsPage.tsx',
    frontendPattern: /payments\/payment-methods/,
    backendFile: 'tenant_portal_backend/src/payments/payment-methods.controller.ts',
    backendPatterns: [/@Controller\('payments\/payment-methods'\)/, /@Post\('setup-intent'\)/, /@Delete\(':id'\)/],
  },
  {
    id: 'maintenance-core',
    frontendFile: 'tenant_portal_app/src/domains/tenant/features/maintenance/MaintenancePage.tsx',
    frontendPattern: /apiFetch\('\/maintenance'/,
    backendFile: 'tenant_portal_backend/src/maintenance/maintenance.controller.ts',
    backendPatterns: [/@Controller\('maintenance'\)/, /@Get\(\)/, /@Post\(\)/],
  },
  {
    id: 'messaging-messages-list',
    frontendFile: 'tenant_portal_app/src/domains/shared/features/messaging/MessagingPage.tsx',
    frontendPattern: /messaging\/conversations\/\$\{conversationId\}\/messages/,
    backendFile: 'tenant_portal_backend/src/messaging/messaging.controller.ts',
    backendPatterns: [/@Controller\('messaging'\)/, /@Get\('conversations\/:id\/messages'\)/],
  },
  {
    id: 'reporting-core',
    frontendFile: 'tenant_portal_app/src/ReportingPage.tsx',
    frontendPattern: /apiFetch\(`\/reporting\/\$\{reportType\}\?/,
    backendFile: 'tenant_portal_backend/src/reporting/reporting.controller.ts',
    backendPatterns: [/@Controller\('reporting'\)/, /@Get\('rent-roll'\)/, /@Get\('profit-loss'\)/, /@Get\('maintenance-analytics'\)/, /@Get\('vacancy-rate'\)/, /@Get\('payment-history'\)/],
  },
];

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8');
}

const failures = [];
for (const check of checks) {
  const frontend = read(check.frontendFile);
  const backend = read(check.backendFile);

  if (!check.frontendPattern.test(frontend)) {
    failures.push(`${check.id}: frontend pattern missing in ${check.frontendFile}`);
  }

  for (const pattern of check.backendPatterns) {
    if (!pattern.test(backend)) {
      failures.push(`${check.id}: backend pattern ${pattern} missing in ${check.backendFile}`);
    }
  }
}

if (failures.length) {
  console.error('Core route contract check failed:\n');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log(`Core route contract check passed (${checks.length} checks).`);
