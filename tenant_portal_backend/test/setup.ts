import { PrismaClient } from '@prisma/client';

// Extend timeout for database operations
jest.setTimeout(10000);

// Mock environment variables for testing
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:jordan@localhost:5432/tenant_portal_test?schema=public_';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SMTP_HOST = 'smtp.ethereal.email';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'test-password';
process.env.SMTP_FROM = 'noreply@test.com';
process.env.APP_URL = 'http://localhost:3000';

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
