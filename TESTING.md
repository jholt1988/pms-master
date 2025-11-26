# Testing Guide

This document outlines the testing strategy and how to run tests for the PMS application.

## Testing Overview

The application uses a multi-layered testing approach:

1. **Unit Tests** - Test individual components and services in isolation
2. **Integration Tests** - Test interactions between components
3. **End-to-End (E2E) Tests** - Test complete user workflows

## Backend Testing

### Setup

Backend tests use **Jest** with **Supertest** for API testing.

```bash
cd tenant_portal_backend
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only E2E tests
npm run test:e2e
```

### Test Structure

- **Unit Tests**: `src/**/*.spec.ts` - Test individual services and controllers
- **E2E Tests**: `test/**/*.e2e.spec.ts` - Test complete API workflows

### E2E Test Files

- `test/auth.e2e.spec.ts` - Authentication flows
- `test/application-lifecycle.e2e.spec.ts` - Application lifecycle management
- `test/leasing.e2e.spec.ts` - Leasing workflows
- `test/esignature.e2e.spec.ts` - E-signature flows
- `test/payments.e2e-spec.ts` - Payment processing

### Test Database

E2E tests use a separate test database. Configure in `test/setup.ts`:

```typescript
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/tenant_portal_test'
```

## Frontend Testing

### Setup

Frontend uses **Vitest** for unit tests and **Playwright** for E2E tests.

```bash
cd tenant_portal_app
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

### Running Tests

```bash
# Unit tests
npm test              # Watch mode
npm run test:run      # Run once
npm run test:coverage # With coverage
npm run test:ui       # Visual UI

# E2E tests
npm run test:e2e           # Run all E2E tests
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:headed    # Run with browser visible
npm run test:e2e:debug     # Debug mode

# Run all tests
npm run test:all
```

### E2E Test Files

### Frontend E2E Tests (Playwright)

Located in `e2e/` directory:

- `e2e/application-submission.spec.ts` - Application submission workflow
- `e2e/authentication.spec.ts` - Login/logout flows
- `e2e/application-management.spec.ts` - Application management (PM and Tenant views)
- `e2e/maintenance.spec.ts` - Maintenance request creation and management
- `e2e/payments.spec.ts` - Payment processing and invoice management
- `e2e/lease-management.spec.ts` - Lease creation, viewing, and management
- `e2e/messaging.spec.ts` - Messaging and conversation flows
- `e2e/dashboard.spec.ts` - Dashboard views for tenants and property managers

### Backend E2E Tests (Jest + Supertest)

Located in `test/` directory:

- `test/auth.e2e.spec.ts` - Authentication flows
- `test/application-lifecycle.e2e.spec.ts` - Application lifecycle management
- `test/maintenance.e2e.spec.ts` - Maintenance request API
- `test/payments.e2e.spec.ts` - Payment processing API
- `test/lease.e2e.spec.ts` - Lease management API
- `test/messaging.e2e.spec.ts` - Messaging API
- `test/dashboard.e2e.spec.ts` - Dashboard data API
- `test/property.e2e.spec.ts` - Property management API
- `test/notifications.e2e.spec.ts` - Notifications API
- `test/leasing.e2e.spec.ts` - Leasing workflows
- `test/esignature.e2e.spec.ts` - E-signature flows
- `test/payments.e2e-spec.ts` - Payment processing

### Playwright Configuration

Configuration in `playwright.config.ts`:

- **Base URL**: `http://localhost:5173`
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Chrome Mobile, Safari Mobile
- **Auto-start**: Dev server starts automatically

## Test Coverage Goals

### Backend
- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 75%+
- **Statements**: 80%+

### Frontend
- **Lines**: 60%+
- **Functions**: 60%+
- **Branches**: 60%+
- **Statements**: 60%+

## Writing Tests

### Backend E2E Test Example

```typescript
describe('Feature API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.someTable.deleteMany();
  });

  it('should perform action', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/endpoint')
      .send({ data: 'value' })
      .expect(201);
    
    expect(response.body).toHaveProperty('id');
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### Frontend E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should complete workflow', async ({ page }) => {
  await page.goto('/route');
  await page.fill('input[name="field"]', 'value');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*success/);
});
```

## CI/CD Integration

### GitHub Actions

E2E tests run automatically on:
- Push to `main` or `develop`
- Pull requests

See `.github/workflows/e2e-tests.yml` for configuration.

### Local CI Simulation

```bash
# Backend
cd tenant_portal_backend
CI=true npm run test:e2e

# Frontend
cd tenant_portal_app
CI=true npm run test:e2e
```

## Test Data Management

### Test Factories

Backend uses `TestDataFactory` in `test/factories/index.ts`:

```typescript
const user = await prisma.user.create({
  data: TestDataFactory.createUser({
    username: 'test@example.com',
  }),
});
```

### Test Isolation

- Each test cleans up its data in `beforeEach`
- Tests use unique identifiers to avoid conflicts
- Database is reset between test suites

## Debugging Tests

### Backend

```bash
# Run specific test file
npm run test:e2e -- application-lifecycle.e2e.spec.ts

# Run with verbose output
npm run test:e2e -- --verbose

# Run single test
npm run test:e2e -- -t "should submit application"
```

### Frontend

```bash
# Debug mode (opens Playwright inspector)
npm run test:e2e:debug

# UI mode (interactive test runner)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/authentication.spec.ts

# Run with browser visible
npm run test:e2e:headed
```

## Best Practices

1. **Test Independence**: Each test should be able to run in isolation
2. **Clean Setup/Teardown**: Always clean up test data
3. **Meaningful Names**: Test names should describe what they test
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Avoid Flakiness**: Use proper waits, not arbitrary timeouts
6. **Test User Flows**: E2E tests should mirror real user behavior
7. **Mock External Services**: Don't hit real APIs in tests
8. **Fast Feedback**: Keep tests fast for quick iteration

## Troubleshooting

### Backend Tests Failing

1. **Database Connection**: Ensure test database is running
2. **Port Conflicts**: Check if port 3001 is available
3. **Environment Variables**: Verify test env vars in `test/setup.ts`

### Frontend E2E Tests Failing

1. **Dev Server**: Ensure app starts on `http://localhost:5173`
2. **Browser Installation**: Run `npx playwright install`
3. **Selectors**: Update selectors if UI changes
4. **Timing**: Add proper waits for async operations

## Next Steps

- [ ] Add visual regression testing
- [ ] Add performance testing
- [ ] Add accessibility testing
- [ ] Increase coverage thresholds
- [ ] Add mutation testing

