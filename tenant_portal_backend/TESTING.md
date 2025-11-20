# Testing Guide

## Quick Start

### Run All Unit Tests
```bash
npm test
```

### Run Unit Tests Only (Explicit)
```bash
npm run test:unit
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:cov
```

### Run E2E Tests (Requires Database Setup)
```bash
npm run test:e2e
```

## Test Status

### ✅ Unit Tests: 141 Passing (100%)

All unit tests are fully functional and passing:
- **7 test suites**: All passing
- **141 tests**: All passing
- **2 tests**: Skipped (intentional)
- **Execution time**: ~25 seconds

### ⚠️ E2E Tests: 20/59 Passing (34%)

E2E integration tests are running against PostgreSQL database:
- **2 test suites**: Both executing
- **59 tests**: Auth API (31) + Leasing API (28)
- **Passing**: 20 tests (34%)
- **Status**: Infrastructure complete, API implementation gaps identified

See `E2E_TEST_STATUS.md` for detailed breakdown of test results and fixes needed.

## Test Coverage Breakdown

| Component | Tests | Files | Status |
|-----------|-------|-------|--------|
| **Services** | 88 | 4 | ✅ Passing |
| PaymentsService | 22 | payments.service.spec.ts | ✅ |
| EmailService | 13 | email.service.spec.ts | ✅ |
| LeasingService | 28 | leasing.service.spec.ts | ✅ |
| AuthService | 25 | auth.service.spec.ts | ✅ |
| **Controllers** | 52 | 3 | ✅ Passing |
| PaymentsController | 11 | payments.controller.spec.ts | ✅ |
| LeasingController | 27 | leasing.controller.spec.ts | ✅ |
| AuthController | 14 | auth.controller.spec.ts | ✅ |
| **E2E Tests** | 59 | 2 | ⚠️ Needs DB |
| Auth API | 31 | auth.e2e.spec.ts | ⚠️ |
| Leasing API | 28 | leasing.e2e.spec.ts | ⚠️ |

## Configuration

### Jest Configuration

By default, E2E tests are excluded from the test run:
```javascript
// jest.config.js
testPathIgnorePatterns: ['/node_modules/', '\\.e2e\\.spec\\.ts$']
```

### Test Setup

Global test setup is in `test/setup.ts`:
- Environment variables configured
- Test timeouts set to 10 seconds
- Console methods mocked (optional)

## Setting Up E2E Tests

The E2E tests are ready to run once you configure a PostgreSQL test database.

### 1. Create Test Database

```bash
# Using PostgreSQL command line
createdb tenant_portal_test

# Or using psql
psql -U postgres
CREATE DATABASE tenant_portal_test;
```

### 2. Configure Database Connection

Update `test/setup.ts` with valid credentials:
```typescript
process.env.DATABASE_URL = 'postgresql://username:password@localhost:5432/tenant_portal_test?schema=public';
```

### 3. Run Migrations

```bash
DATABASE_URL="postgresql://postgres:jordan@localhost:5432/tenant_portal_test" npx prisma migrate deploy
```

### 4. Run E2E Tests

```bash
npm run test:e2e
```

## Test Structure

### Unit Tests

Located in `src/**/*.spec.ts` alongside source files:
- Fully mocked dependencies
- Fast execution (~25 seconds for all)
- No external dependencies required

### E2E Tests

Located in `test/*.e2e.spec.ts`:
- Real NestJS application
- Real database operations
- Real HTTP requests with supertest
- Requires PostgreSQL database

## Writing New Tests

### Unit Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your-service.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        {
          provide: DependencyService,
          useValue: {
            method: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### E2E Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Your API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200);
  });
});
```

## Test Utilities

### Test Data Factory

Located in `test/factories/index.ts`:
```typescript
import { TestDataFactory } from '../../test/factories';

// In your tests
const user = TestDataFactory.createUser({ role: 'TENANT' });
const property = TestDataFactory.createProperty();
```

Available factories:
- `createUser(overrides?)`
- `createPropertyManager(overrides?)`
- `createProperty(overrides?)`
- `createUnit(propertyId, overrides?)`
- `createLease(tenantId, unitId, overrides?)`
- `createInvoice(leaseId, overrides?)`
- `createPayment(invoiceId, overrides?)`

### Test Data Generators

```typescript
import { testData } from '../../test/factories';

const email = testData.email();
const firstName = testData.firstName();
const address = testData.address();
```

## Troubleshooting

### Issue: Tests Running Slowly

**Solution**: Tests should complete in ~25 seconds. If slower:
- Check for database connection attempts (E2E tests running)
- Ensure E2E tests are excluded: `testPathIgnorePatterns`
- Use `--runInBand` for serial execution if needed

### Issue: Import Errors in Tests

**Solution**: Regenerate Prisma client:
```bash
npx prisma generate
```

### Issue: E2E Tests Failing with Database Error

**Error**: `PrismaClientInitializationError: Authentication failed`

**Solution**: Configure test database in `test/setup.ts`
```typescript
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test_db';
```

### Issue: Module Not Found Errors

**Solution**: Check `tsconfig.json` and ensure test files are included:
```json
{
  "include": ["src/**/*", "test/**/*"]
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: tenant_portal_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npx prisma generate
      - run: npm test
      - run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/tenant_portal_test
```

## Test Maintenance

### Regular Tasks

1. **Keep tests updated** with code changes
2. **Run tests before commits**: `npm test`
3. **Update test data factories** when models change
4. **Regenerate Prisma client** after schema changes: `npx prisma generate`

### Best Practices

- ✅ Write tests alongside new features
- ✅ Keep unit tests fast (< 1 second each)
- ✅ Mock external dependencies in unit tests
- ✅ Use descriptive test names
- ✅ Test both success and error paths
- ✅ Maintain test isolation (no shared state)

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest](https://github.com/visionmedia/supertest)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)
