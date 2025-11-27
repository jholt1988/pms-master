import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

// Extend timeout for slower end-to-end flows
jest.setTimeout(30000);

const TEST_DB_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:jordan@localhost:5432/tenant_portal_test?schema=public_';
process.env.DATABASE_URL = TEST_DB_URL;

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

// Ensure Prisma schema migrations are applied before running tests
if (process.env.SKIP_TEST_MIGRATIONS !== 'true') {
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

const prismaTestClient = new PrismaClient();

beforeEach(async () => {
  await resetDatabase(prismaTestClient as any);
});

afterAll(async () => {
  await prismaTestClient.$disconnect();
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
