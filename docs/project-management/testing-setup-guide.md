# Testing Setup Guide

**Date:** November 29, 2025  
**Purpose:** Complete guide for setting up and running all test suites

---

## Prerequisites

1. **PostgreSQL** installed and running
2. **Node.js** and npm installed
3. **Database credentials** configured

---

## E2E Test Database Setup (GAP-001)

### Option 1: Automated Setup (Recommended)

Run the PowerShell script from the `tenant_portal_backend` directory:

```powershell
cd tenant_portal_backend
.\setup-e2e-db.ps1
```

**What it does:**
1. Checks PostgreSQL connection
2. Creates test database (`tenant_portal_test`)
3. Applies Prisma migrations
4. Verifies schema

**Configuration:**
- Database: `tenant_portal_test`
- User: `postgres`
- Password: `jordan` (update in script if different)
- Host: `localhost`
- Port: `5432`

### Option 2: Manual Setup

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create test database
CREATE DATABASE tenant_portal_test;

-- Exit psql
\q
```

Then run migrations:

```bash
cd tenant_portal_backend
export DATABASE_URL="postgresql://postgres:jordan@localhost:5432/tenant_portal_test?schema=public_"
npx prisma migrate deploy
```

### Verification

Check that the database was created and has tables:

```sql
psql -U postgres -d tenant_portal_test -c "\dt"
```

You should see 30+ tables.

---

## Running Tests

### Unit Tests (GAP-003)

**Command:**
```bash
cd tenant_portal_backend
npm test
```

**Expected:** 141 unit tests passing

**Coverage:**
- Service layer tests
- Controller tests
- Utility function tests
- All tests use mocks (no database required)

**Watch Mode:**
```bash
npm run test:watch
```

**Coverage Report:**
```bash
npm run test:coverage
```

### E2E Tests (GAP-002)

**Prerequisites:**
- E2E test database must be set up (see above)
- `DATABASE_URL` environment variable set to test database

**Command:**
```bash
cd tenant_portal_backend
npm run test:e2e
```

**Expected:** 59 E2E tests passing

**Test Files:**
- `test/auth.e2e.spec.ts` - Authentication flows
- `test/dashboard.e2e.spec.ts` - Dashboard endpoints
- `test/payments.e2e.spec.ts` - Payment processing
- `test/lease.e2e.spec.ts` - Lease management
- `test/property.e2e.spec.ts` - Property management
- `test/maintenance.e2e.spec.ts` - Maintenance requests
- `test/messaging.e2e.spec.ts` - Messaging system
- `test/notifications.e2e.spec.ts` - Notifications
- `test/leasing.e2e.spec.ts` - Leasing agent
- `test/application-lifecycle.e2e.spec.ts` - Application workflow
- `test/esignature.e2e.spec.ts` - E-signature
- `test/payments-metrics.e2e.spec.ts` - Payment metrics
- `test/maintenance-metrics.e2e.spec.ts` - Maintenance metrics

**Environment Variables:**
The test setup automatically configures:
- `JWT_SECRET=test-secret-key`
- `SMTP_HOST=smtp.ethereal.email`
- `MONITORING_ENABLED=false`
- `DISABLE_WORKFLOW_SCHEDULER=true`

---

## Test Database Reset

E2E tests automatically reset the database before each test using `resetDatabase()` utility.

**Manual Reset:**
```typescript
import { resetDatabase } from './test/utils/reset-database';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
await resetDatabase(prisma);
```

---

## Troubleshooting

### Issue: "Cannot connect to PostgreSQL"

**Solution:**
1. Verify PostgreSQL is running: `pg_isready`
2. Check credentials in `setup-e2e-db.ps1`
3. Verify PostgreSQL is in PATH

### Issue: "Database does not exist"

**Solution:**
1. Run `setup-e2e-db.ps1` to create database
2. Or manually create: `CREATE DATABASE tenant_portal_test;`

### Issue: "Migration failed"

**Solution:**
1. Check `DATABASE_URL` is set correctly
2. Verify database user has CREATE privileges
3. Check Prisma schema is valid: `npx prisma validate`

### Issue: "Tests timeout"

**Solution:**
1. Increase timeout in `test/setup.ts` (currently 30s)
2. Check database connection speed
3. Verify no other processes are using the test database

### Issue: "Prisma Client not generated"

**Solution:**
```bash
npx prisma generate
```

---

## Test Execution Checklist

### Before Running Tests

- [ ] PostgreSQL is running
- [ ] E2E test database exists (`tenant_portal_test`)
- [ ] Prisma migrations applied to test database
- [ ] `DATABASE_URL` environment variable set (for E2E tests)
- [ ] All dependencies installed (`npm install`)

### Running All Tests

```bash
# Unit tests (no database needed)
npm test

# E2E tests (requires test database)
npm run test:e2e
```

### After Running Tests

- [ ] All unit tests passing (141 tests)
- [ ] All E2E tests passing (59 tests)
- [ ] No test database corruption
- [ ] Test results documented

---

## CI/CD Integration

For CI/CD pipelines, use:

```yaml
# Example GitHub Actions
- name: Setup E2E Database
  run: |
    createdb tenant_portal_test
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tenant_portal_test?schema=public_"
    npx prisma migrate deploy

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/tenant_portal_test?schema=public_
```

---

## Test Data Factories

Test factories are available in `test/factories/index.ts` for creating consistent test data.

**Usage:**
```typescript
import { createUser, createProperty, createLease } from './test/factories';

const user = await createUser(prisma, { email: 'test@example.com' });
const property = await createProperty(prisma, { name: 'Test Property' });
```

---

## Next Steps

After completing GAP-001, GAP-002, and GAP-003:

1. **GAP-005:** API endpoint integration testing
2. **GAP-008:** Final integration check (frontend ↔ backend)
3. **GAP-006:** Update API documentation
4. **GAP-007:** Create UAT test scenarios

---

**Last Updated:** November 29, 2025

