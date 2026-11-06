import { execFileSync, execSync } from 'child_process';
import { join } from 'path';
import type { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { resetDatabase } from './utils/reset-database';

// Extend timeout for slower end-to-end flows
jest.setTimeout(30000);

process.env.DOTENV_CONFIG_PATH = join(__dirname, '..', '.env.test');
dotenv.config({ path: join(__dirname, '..', '.env.test') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const DEFAULT_TEST_DB_URL =
  'postgresql://postgres:jordan@localhost:5432/tenant_portal_test?schema=public';

const rawUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error(
    'Missing TEST_DATABASE_URL or DATABASE_URL for e2e tests. CI must provide a valid Postgres connection string.'
  );
}

const TEST_SCHEMA = process.env.TEST_DATABASE_SCHEMA || 'tenant_portal_test';
const TEST_DB_URL = ensureSchema(rawUrl, TEST_SCHEMA);

// Force tests into an isolated schema so resetDatabase can safely TRUNCATE.
const ensureSchema = (url: string, schema: string) => {
  if (url.includes('schema=')) return url;
  const joinChar = url.includes('?') ? '&' : '?';
  return `${url}${joinChar}schema=${encodeURIComponent(schema)}`;
};

const TEST_SCHEMA = process.env.TEST_DATABASE_SCHEMA || 'tenant_portal_test';
const TEST_DB_URL = ensureSchema(rawUrl, TEST_SCHEMA);

process.env.DIRECT_DATABASE_URL = TEST_DB_URL;
process.env.DATABASE_URL = TEST_DB_URL;
const { PrismaClient: PrismaClientFactory }: { PrismaClient: new () => PrismaClient } =
  require('@prisma/client');
// For e2e tests, migrations should normally run once. If you need to skip,
// set SKIP_TEST_MIGRATIONS=true in the environment.

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
process.env.DISABLE_REDIS = 'true';
process.env.STRIPE_SECRET_KEY = 'sk_test_disabled';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'redis';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_URL = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

// Detect e2e tests by checking if jest-e2e.json config is being used
const isE2ETest = process.argv.some((arg) => /jest-e2e.*\.json$/.test(arg)) ||
  /jest-e2e.*\.json$/.test(process.env.JEST_CONFIG_PATH || '') ||
  // Check if testRegex in current config matches e2e pattern
  (global as any).__JEST_CONFIG__?.testRegex?.toString().includes('e2e');

// Ensure Prisma schema is applied before e2e tests. Do not retry with a local
// developer URL: in CI that can hide a broken TEST_DATABASE_URL and point tests
// at an unintended database. Keep the original connection error visible.
const shouldApplyMigrations = isE2ETest && process.env.SKIP_TEST_MIGRATIONS !== 'true';
if (shouldApplyMigrations) {
  try {
    // Make sure schema exists (Postgres only). Prisma will use the schema= param.
    const ensureSchemaScript = `
      const { Client } = require('pg');
      (async () => {
        const url = process.env.DATABASE_URL;
        const u = new URL(url);
        const sslMode = (u.searchParams.get('sslmode') || '').toLowerCase();
        const ssl = sslMode ? { rejectUnauthorized: false } : undefined;
        const c = new Client({ connectionString: url, ssl });
        await c.connect();
        const schema = (u.searchParams.get('schema') || 'public').replace(/\\"/g, '');
        await c.query('CREATE SCHEMA IF NOT EXISTS "' + schema + '"');
        await c.query(
          'CREATE TABLE IF NOT EXISTS "' + schema + '"."RefreshToken" (' +
            '"id" SERIAL PRIMARY KEY,' +
            '"tokenHash" TEXT UNIQUE NOT NULL,' +
            '"userId" UUID NOT NULL,' +
            '"expiresAt" TIMESTAMP(3) NOT NULL,' +
            '"revokedAt" TIMESTAMP(3),' +
            '"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP' +
          ')'
        );
        await c.query('CREATE INDEX IF NOT EXISTS "RefreshToken_tokenHash_idx" ON "' + schema + '"."RefreshToken" ("tokenHash")');
        await c.query('CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "' + schema + '"."RefreshToken" ("userId")');
        await c.end();
      })().catch((e) => {
        console.error(e);
        process.exit(1);
      });
    `;

    execFileSync('node', ['-e', ensureSchemaScript], {
      stdio: 'inherit',
      env: { ...process.env },
    });

    // Sync the isolated test schema to Prisma's schema. This is intentionally
    // db push rather than migrate deploy because setup creates a few tables
    // before applying the Prisma schema and has no _prisma_migrations baseline.
    // --accept-data-loss is safe only for this ephemeral test database.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Refusing to run `prisma db push --accept-data-loss` with NODE_ENV=production. ' +
          'E2E setup must target an ephemeral test database.',
      );
    }
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env },
    });
  } catch (error) {
    console.error('Failed to apply Prisma schema for e2e tests:', error);
    throw error;
  }
}

const prismaTestClient = isE2ETest ? new PrismaClientFactory() : null;

beforeEach(async () => {
  // Only reset database for e2e tests to avoid deadlocks in parallel unit tests.
  // Unit tests should use mocks and not touch the real database.
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
