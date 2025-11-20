# E2E Test Setup - Quick Start Guide

## Current Status ✅

- ✅ **Unit Tests**: 141 tests passing (run with `npm test`)
- ✅ **E2E Test Code**: 59 tests created (auth + leasing)
- ✅ **Database Credentials**: Configured in `test/setup.ts`
- ⚠️ **Database Setup**: Required for E2E tests to run

## Quick Setup Steps

### 1. Verify PostgreSQL is Running

```bash
# Check if PostgreSQL service is running
# Windows:
services.msc
# Look for "postgresql" service and ensure it's running
```

### 2. Create Test Database

Open PostgreSQL command line (psql) or use pgAdmin:

```bash
# Option A: Using psql
psql -U postgres
CREATE DATABASE tenant_portal_test;
\q

# Option B: Using createdb command
createdb -U postgres tenant_portal_test
```

### 3. Run Migrations on Test Database

From the `tenant_portal_backend` directory:

```bash
# Set the test database URL and run migrations
$env:DATABASE_URL="postgresql://postgres:jordan@localhost:5432/tenant_portal_test?schema=public_"
npx prisma migrate deploy

# Or in one command:
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

**Note**: The command in TESTING.md shows:
```bash
DATABASE_URL="postgresql://postgres:jordan@localhost:5432/tenant_portal_test" npx prisma migrate deploy
```

### 4. Verify Database Schema

```bash
# Connect to test database
psql -U postgres -d tenant_portal_test

# List tables
\dt

# You should see tables like: User, Property, Unit, Lease, Lead, etc.
\q
```

### 5. Run E2E Tests

```bash
# From tenant_portal_backend directory
npm run test:e2e
```

Expected result:
```
Test Suites: 2 passed, 2 total
Tests:       59 passed, 59 total
Time:        ~30-40 seconds
```

## Troubleshooting

### Issue: Database doesn't exist

**Error**: `database "tenant_portal_test" does not exist`

**Solution**:
```bash
createdb -U postgres tenant_portal_test
```

### Issue: Authentication failed

**Error**: `Authentication failed... credentials for 'postgres' are not valid`

**Solutions**:
1. Verify password in `test/setup.ts` matches your PostgreSQL password
2. Update the DATABASE_URL in `test/setup.ts`:
   ```typescript
   process.env.DATABASE_URL = 'postgresql://postgres:YOUR_PASSWORD@localhost:5432/tenant_portal_test?schema=public_';
   ```

### Issue: No migrations applied

**Error**: Tests fail with "relation does not exist"

**Solution**: Run migrations:
```bash
# Ensure you're in tenant_portal_backend directory
$env:DATABASE_URL="postgresql://postgres:jordan@localhost:5432/tenant_portal_backend?schema=public_"
npx prisma migrate deploy
```

### Issue: Jest parsing errors

**Error**: "Missing semicolon" or "Jest encountered an unexpected token"

**This means**: You're running Jest from the wrong directory (project root instead of tenant_portal_backend)

**Solution**:
```bash
cd tenant_portal_backend
npm run test:e2e
```

## Alternative: Skip E2E Tests

If you want to continue with just unit tests (which are fully working):

```bash
# Run only unit tests (default)
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:cov
```

All 141 unit tests will pass without any database requirements!

## Summary

**Quick 3-Step Setup:**

1. Create database: `createdb -U postgres tenant_portal_test`
2. Run migrations: `npx prisma migrate deploy` (with DATABASE_URL set)
3. Run E2E tests: `npm run test:e2e`

**Current Working Tests:**
- ✅ 141 unit tests (no database needed)
- ⚠️ 59 E2E tests (database setup needed)

See `TESTING.md` for full documentation.
