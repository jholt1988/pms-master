import { execSync } from 'child_process';
import { join } from 'path';
import type { PrismaClient } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';


// Extend timeout for slower end-to-end flows
jest.setTimeout(30000);

process.env.DOTENV_CONFIG_PATH = join(__dirname, '..', '.env.test');
const TEST_DB_URL =
  'postgresql://postgres:jordan@localhost:5432/tenant_portal_test?schema=public';
process.env.DIRECT_DATABASE_URL = TEST_DB_URL;
process.env.DATABASE_URL = TEST_DB_URL;
const { PrismaClient: PrismaClientFactory }: { PrismaClient: new () => PrismaClient } =
  require('@prisma/client');
if (!process.env.SKIP_TEST_MIGRATIONS) {
  process.env.SKIP_TEST_MIGRATIONS = 'true';
}

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.SMTP_HOST = 'smtp.ethereal.email';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'test-password';
process.env.SMTP_FROM = 'noreply@test.com';
process.env.APP_URL = 'http://localhost:3000';
process.env.MONITORING_ENABLED = 'false';
process.env.DISABLE_WORKFLOW_SCHEDULER = 'true';
process.env.DISABLE_STRIPE = 'true';
process.env.STRIPE_SECRET_KEY = 'sk_test_disabled';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

// Detect e2e tests by checking if jest-e2e.json config is being used
const isE2ETest = process.argv.some(arg => arg.includes('jest-e2e.json')) ||
  process.env.JEST_CONFIG_PATH?.includes('jest-e2e.json') ||
  // Check if testRegex in current config matches e2e pattern
  (global as any).__JEST_CONFIG__?.testRegex?.toString().includes('e2e');

// Ensure Prisma schema migrations are applied before running tests
// Only run migrations for e2e tests to avoid heavy setup for unit tests (prevents OOM)
const shouldApplyMigrations = isE2ETest && process.env.SKIP_TEST_MIGRATIONS !== 'true';
if (shouldApplyMigrations) {
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env },
    });
  } catch (error) {
    console.error('Failed to apply Prisma migrations for e2e tests:', error);
    throw error;
  }
}

const prismaTestClient = isE2ETest ? new PrismaClientFactory() : null;

beforeEach(async () => {
  // Only reset database for e2e tests to avoid deadlocks in parallel unit tests
  // Unit tests should use mocks and not touch the real database'
 
  if (isE2ETest && prismaTestClient) {
    await resetDatabase(prismaTestClient as any);
  }
});

afterAll(async () => {
  if (prismaTestClient) {
    await prismaTestClient.$disconnect();
  }
});

// Global test utilities
global.beforeAll(async () => {
  console.log('🧪 Test suite starting...');
});

global.afterAll(async () => {
  console.log('✅ Test suite completed');
});

// Mock console methods to reduce noise in test output (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
};
