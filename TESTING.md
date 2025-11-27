# Testing Documentation

## Table of Contents

1. [Overview](#overview)
2. [Testing Strategy](#testing-strategy)
3. [Backend Testing](#backend-testing)
4. [Frontend Testing](#frontend-testing)
5. [Test Setup & Configuration](#test-setup--configuration)
6. [Writing Tests](#writing-tests)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Test Coverage](#test-coverage)

---

## Overview

The Property Management System (PMS) uses a comprehensive multi-layered testing approach to ensure reliability, maintainability, and quality across both frontend and backend codebases.

### Testing Pyramid

```
        /\
       /E2E\          ← End-to-End Tests (Few, Critical Paths)
      /------\
     /Integration\    ← Integration Tests (Some, Key Interactions)
    /------------\
   /   Unit Tests  \  ← Unit Tests (Many, Individual Components)
  /----------------\
```

### Current Test Status

- **Backend**: ✅ All E2E tests passing
- **Frontend**: ✅ All 60 unit tests passing
- **Coverage**: Meeting threshold requirements

---

## Testing Strategy

### Test Types

#### 1. Unit Tests
- **Purpose**: Test individual functions, methods, and components in isolation
- **Backend**: Service classes, utilities, helpers
- **Frontend**: React components, hooks, utility functions
- **Speed**: Fast (< 100ms per test)
- **Isolation**: Fully mocked dependencies

#### 2. Integration Tests
- **Purpose**: Test interactions between multiple components/services
- **Backend**: Controller + Service + Database interactions
- **Frontend**: Component interactions, API client usage
- **Speed**: Medium (100ms - 1s per test)
- **Isolation**: Partial mocking (e.g., external APIs)

#### 3. End-to-End (E2E) Tests
- **Purpose**: Test complete user workflows from start to finish
- **Backend**: Full API request/response cycles with database
- **Frontend**: Browser-based user interactions (Playwright)
- **Speed**: Slow (1s - 10s per test)
- **Isolation**: Real database, mocked external services

### Testing Principles

1. **Test Independence**: Each test can run in isolation
2. **Deterministic**: Tests produce consistent results
3. **Fast Feedback**: Quick execution for rapid iteration
4. **Maintainable**: Easy to update when code changes
5. **Readable**: Clear test names and structure
6. **Comprehensive**: Cover happy paths, edge cases, and error scenarios

---

## Backend Testing

### Technology Stack

- **Framework**: Jest
- **E2E Testing**: Supertest
- **Database**: PostgreSQL (test database)
- **ORM**: Prisma

### Setup

```bash
cd tenant_portal_backend
npm install

# Ensure test database is running
# Default: postgresql://postgres:jordan@localhost:5432/tenant_portal_test
```

### Running Tests

```bash
# Run all unit tests
npm test

# Run all tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run only E2E tests (serial execution)
npm run test:e2e

# Run specific test file
npm run test:e2e -- payments.e2e.spec.ts

# Run specific test by name
npm run test:e2e -- -t "should create payment"
```

### Test Structure

```
tenant_portal_backend/
├── src/
│   └── **/*.spec.ts          # Unit tests (co-located with source)
├── test/
│   ├── setup.ts              # Global test setup
│   ├── jest-e2e.json         # E2E test configuration
│   ├── factories/
│   │   └── index.ts          # Test data factories
│   ├── utils/
│   │   └── reset-database.ts # Database reset utility
│   └── **/*.e2e.spec.ts      # E2E test files
```

### E2E Test Files

| File | Description |
|------|-------------|
| `auth.e2e.spec.ts` | Authentication flows (login, register, JWT) |
| `payments.e2e.spec.ts` | Payment processing and invoice management |
| `leasing.e2e.spec.ts` | Leasing workflows and lead management |
| `esignature.e2e.spec.ts` | E-signature envelope creation and management |
| `application-lifecycle.e2e.spec.ts` | Rental application lifecycle |

### Database Management

#### Test Database Setup

E2E tests use a separate PostgreSQL database configured in `test/setup.ts`:

```typescript
const TEST_DB_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:jordan@localhost:5432/tenant_portal_test?schema=public_';
```

#### Database Reset Strategy

Tests use a robust database reset mechanism:

```typescript
// test/utils/reset-database.ts
export async function resetDatabase(prisma: PrismaLike): Promise<void> {
  // Truncates all tables with RESTART IDENTITY CASCADE
  // Ensures clean state for each test
}
```

**Key Features**:
- Truncates all public tables (except migrations)
- Resets auto-increment sequences
- Handles foreign key constraints with CASCADE
- Retry logic for deadlock prevention

#### Test Data Factories

Use `TestDataFactory` for consistent test data:

```typescript
import { TestDataFactory } from '../factories';

const user = await prisma.user.create({
  data: TestDataFactory.createUser({
    username: 'test@example.com',
    role: 'TENANT',
  }),
});

const lease = await prisma.lease.create({
  data: TestDataFactory.createLease(user.id, unit.id, {
    rentAmount: 2000,
    status: LeaseStatus.ACTIVE,
  }),
});
```

### Backend Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { resetDatabase } from './utils/reset-database';

describe('Payments API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it('should create payment for invoice', async () => {
    // Arrange
    const tenantUser = await prisma.user.create({
      data: TestDataFactory.createUser({ role: 'TENANT' }),
    });
    const unit = await prisma.unit.create({
      data: TestDataFactory.createUnit(property.id),
    });
    const lease = await prisma.lease.create({
      data: TestDataFactory.createLease(tenantUser.id, unit.id),
    });
    const invoice = await prisma.invoice.create({
      data: TestDataFactory.createInvoice(lease.id),
    });

    // Act
    const response = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        invoiceId: invoice.id,
        leaseId: lease.id,
        amount: 2000,
        paymentMethodId: null,
      });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.amount).toBe(2000);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });
});
```

### Configuration

#### Jest Configuration (`jest.config.js`)

- Unit tests configuration
- Excludes E2E tests
- Includes `test/setup.ts` for global setup

#### E2E Configuration (`test/jest-e2e.json`)

- Separate configuration for E2E tests
- Uses `--runInBand` flag for serial execution (prevents database deadlocks)
- Includes `test/setup.ts` for database setup

---

## Frontend Testing

### Technology Stack

- **Framework**: Vitest
- **Testing Library**: React Testing Library
- **E2E Testing**: Playwright
- **API Mocking**: MSW (Mock Service Worker)
- **Environment**: jsdom

### Setup

```bash
cd tenant_portal_app
npm install

# Initialize MSW (if not already done)
npm run msw:init

# Install Playwright browsers (first time only)
npx playwright install
```

### Running Tests

```bash
# Unit tests - watch mode
npm test

# Unit tests - run once
npm run test:run

# Unit tests - with coverage
npm run test:coverage

# Unit tests - visual UI
npm run test:ui

# E2E tests - all browsers
npm run test:e2e

# E2E tests - UI mode (interactive)
npm run test:e2e:ui

# E2E tests - with browser visible
npm run test:e2e:headed

# E2E tests - debug mode
npm run test:e2e:debug

# Run all tests (unit + E2E)
npm run test:all
```

### Test Structure

```
tenant_portal_app/
├── src/
│   ├── **/*.test.tsx         # Unit tests (co-located)
│   ├── **/*.test.ts          # Unit tests for services
│   ├── test/
│   │   └── setup.ts          # Global test setup (MSW, mocks)
│   └── mocks/
│       ├── server.ts         # MSW server setup
│       └── handlers.ts       # API request handlers
└── e2e/
    └── **/*.spec.ts          # Playwright E2E tests
```

### MSW (Mock Service Worker) Setup

MSW intercepts HTTP requests in tests, allowing you to mock API responses without a real backend.

#### Configuration

```typescript
// src/test/setup.ts
import { server } from '../mocks/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

#### Adding New Handlers

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post(`${API_BASE}/api/endpoint`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 1,
      ...body,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),
];
```

#### Available Handlers

- ✅ Authentication (`/api/auth/*`)
- ✅ Properties (`/api/properties/*`)
- ✅ Leases (`/api/lease/*`)
- ✅ Payments (`/api/payments/*`)
- ✅ Maintenance (`/api/maintenance/*`)
- ✅ Messaging (`/api/messaging/*`)
- ✅ Leads (`/api/leads/*`)
- ✅ Property Search (`/api/properties/search`)
- ✅ Bulk Messaging (`/api/messaging/bulk/*`)

### Frontend Test Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BulkMessageComposer from './BulkMessageComposer';
import * as apiClient from '../../services/apiClient';

// Mock apiFetch
const mockApiFetch = vi.fn();
beforeEach(() => {
  vi.spyOn(apiClient, 'apiFetch').mockImplementation(mockApiFetch);
});

describe('BulkMessageComposer', () => {
  it('submits preview payload with selected filters', async () => {
    mockApiFetch.mockResolvedValue({
      totalRecipients: 2,
      sample: [],
    });

    render(
      <BrowserRouter>
        <BulkMessageComposer
          token="token"
          templates={[{ id: 1, name: 'Reminder', body: 'Hello {{username}}' }]}
        />
      </BrowserRouter>
    );

    await userEvent.selectOptions(screen.getByLabelText(/Template/i), ['1']);
    await userEvent.type(screen.getByLabelText(/Subject/i), 'Rent notice');
    await userEvent.type(screen.getByLabelText(/Property IDs/i), '5,6');
    await userEvent.click(screen.getByLabelText(/Property managers/i));
    await userEvent.click(screen.getByRole('button', { name: /Preview recipients/i }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalled();
    });

    const [endpoint, options] = mockApiFetch.mock.calls[0];
    expect(endpoint).toBe('/messaging/bulk/preview');
    expect(options.body.filters.propertyIds).toEqual([5, 6]);
    
    await waitFor(() => {
      expect(screen.getByText(/will reach/i)).toBeInTheDocument();
    });
  });
});
```

### Component Testing Patterns

#### Testing with Context Providers

```typescript
import { AuthProvider } from '../../AuthContext';

// Mock useAuth
vi.mock('../../AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: { id: 1, role: 'TENANT' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

render(
  <BrowserRouter>
    <AuthProvider>
      <Component />
    </AuthProvider>
  </BrowserRouter>
);
```

#### Testing with Router

```typescript
import { BrowserRouter } from 'react-router-dom';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
```

### E2E Tests (Playwright)

Located in `e2e/` directory:

- `authentication.spec.ts` - Login, logout, registration
- `dashboard.spec.ts` - Dashboard views
- `maintenance.spec.ts` - Maintenance request workflows
- `payments.spec.ts` - Payment processing
- `lease-management.spec.ts` - Lease operations
- `messaging.spec.ts` - Messaging flows
- `application-submission.spec.ts` - Application workflows

---

## Test Setup & Configuration

### Backend Setup (`test/setup.ts`)

```typescript
// Global test configuration
process.env.DATABASE_URL = TEST_DB_URL;
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONITORING_ENABLED = 'false';
process.env.DISABLE_WORKFLOW_SCHEDULER = 'true';

// Apply migrations
execSync('npx prisma migrate deploy', { stdio: 'inherit' });

// Database reset (only for E2E tests)
if (process.env.E2E_TEST_RUNNER === 'true') {
  beforeEach(async () => {
    await resetDatabase(prismaTestClient);
  });
}
```

### Frontend Setup (`src/test/setup.ts`)

```typescript
// MSW server setup
import { server } from '../mocks/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Mock window APIs
Object.defineProperty(window, 'matchMedia', { ... });
global.IntersectionObserver = class IntersectionObserver { ... };
```

### Environment Variables

#### Backend Test Environment

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/tenant_portal_test
JWT_SECRET=test-secret-key
MONITORING_ENABLED=false
DISABLE_WORKFLOW_SCHEDULER=true
E2E_TEST_RUNNER=true  # Enables database reset
```

#### Frontend Test Environment

```bash
VITE_API_URL=http://localhost:3001/api  # Optional, defaults to /api
```

---

## Writing Tests

### Test Structure (AAA Pattern)

```typescript
it('should perform action', async () => {
  // Arrange - Set up test data and mocks
  const input = { value: 'test' };
  mockFunction.mockResolvedValue({ success: true });

  // Act - Execute the code being tested
  const result = await functionUnderTest(input);

  // Assert - Verify the results
  expect(result).toEqual({ success: true });
  expect(mockFunction).toHaveBeenCalledWith(input);
});
```

### Naming Conventions

- **Test files**: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.e2e.spec.ts`
- **Test suites**: `describe('ComponentName', () => { ... })`
- **Test cases**: `it('should do something specific', () => { ... })`

### Common Patterns

#### Testing Async Operations

```typescript
// Use waitFor for async UI updates
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
}, { timeout: 3000 });

// Use findBy queries (auto-waits)
const element = await screen.findByText('Loaded');
```

#### Testing User Interactions

```typescript
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.click(screen.getByRole('button'));
await user.type(screen.getByLabelText('Email'), 'test@example.com');
```

#### Testing Error Scenarios

```typescript
it('should handle API errors gracefully', async () => {
  mockApiFetch.mockRejectedValue(new Error('Network error'));
  
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

#### Testing Form Submissions

```typescript
it('should submit form with valid data', async () => {
  const onSubmit = vi.fn();
  render(<Form onSubmit={onSubmit} />);
  
  await userEvent.type(screen.getByLabelText('Name'), 'John');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({ name: 'John' });
  });
});
```

---

## Best Practices

### 1. Test Independence

✅ **Do**: Each test should be able to run in isolation
```typescript
beforeEach(() => {
  // Clean state before each test
  vi.clearAllMocks();
  resetDatabase();
});
```

❌ **Don't**: Rely on test execution order
```typescript
// BAD - Test depends on previous test
it('test 1', () => { global.state = 'value'; });
it('test 2', () => { expect(global.state).toBe('value'); });
```

### 2. Meaningful Test Names

✅ **Do**: Describe what the test verifies
```typescript
it('should create payment when invoice and lease are provided', () => { ... });
it('should return 400 when payment amount exceeds invoice balance', () => { ... });
```

❌ **Don't**: Use vague or generic names
```typescript
it('test payment', () => { ... });
it('works', () => { ... });
```

### 3. Arrange-Act-Assert Structure

✅ **Do**: Clearly separate setup, execution, and verification
```typescript
it('should calculate total correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];
  
  // Act
  const total = calculateTotal(items);
  
  // Assert
  expect(total).toBe(30);
});
```

### 4. Test One Thing

✅ **Do**: Each test should verify one specific behavior
```typescript
it('should validate email format', () => { ... });
it('should validate email is required', () => { ... });
```

❌ **Don't**: Test multiple behaviors in one test
```typescript
it('should validate email', () => {
  // Testing format, required, and uniqueness all at once
});
```

### 5. Use Appropriate Matchers

✅ **Do**: Use specific, meaningful matchers
```typescript
expect(response.status).toBe(201);
expect(user.role).toBe('TENANT');
expect(array).toHaveLength(3);
expect(object).toHaveProperty('id');
```

### 6. Mock External Dependencies

✅ **Do**: Mock external services and APIs
```typescript
vi.mock('../../services/apiClient');
vi.spyOn(apiClient, 'apiFetch').mockResolvedValue(mockData);
```

### 7. Clean Up Resources

✅ **Do**: Clean up after tests
```typescript
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});
```

### 8. Avoid Flaky Tests

✅ **Do**: Use proper waits and timeouts
```typescript
await waitFor(() => {
  expect(element).toBeInTheDocument();
}, { timeout: 3000 });
```

❌ **Don't**: Use arbitrary delays
```typescript
await new Promise(resolve => setTimeout(resolve, 1000)); // BAD
```

---

## Troubleshooting

### Backend Test Issues

#### Database Connection Errors

**Problem**: `Connection refused` or `database does not exist`

**Solution**:
```bash
# Ensure PostgreSQL is running
# Create test database if needed
createdb tenant_portal_test

# Verify connection string in test/setup.ts
```

#### Foreign Key Constraint Violations

**Problem**: `Foreign key constraint violated`

**Solution**: Ensure proper cleanup order in `beforeEach`:
```typescript
beforeEach(async () => {
  // Delete in reverse dependency order
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.user.deleteMany();
  
  // Or use resetDatabase utility
  await resetDatabase(prisma);
});
```

#### Database Deadlocks

**Problem**: `deadlock detected` errors

**Solution**: 
- Use `--runInBand` flag (already configured in `test:e2e` script)
- Ensure `resetDatabase` has retry logic
- Check for concurrent test execution

#### Port Already in Use

**Problem**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or change test port in test configuration
```

### Frontend Test Issues

#### MSW Handlers Not Working

**Problem**: `Endpoint not mocked` errors

**Solution**:
1. Verify handler is added to `src/mocks/handlers.ts`
2. Check handler path matches request URL exactly
3. Ensure MSW server is started in `beforeAll`

#### Component Not Rendering

**Problem**: `Unable to find element`

**Solution**:
```typescript
// Use findBy queries (auto-waits)
const element = await screen.findByText('Text');

// Or use waitFor
await waitFor(() => {
  expect(screen.getByText('Text')).toBeInTheDocument();
});
```

#### Mock Not Working

**Problem**: Mock function not being called

**Solution**:
```typescript
// Ensure mock is set up before component renders
beforeEach(() => {
  vi.spyOn(module, 'function').mockImplementation(() => { ... });
});

// Or use vi.mock at top level
vi.mock('./module', () => ({
  function: vi.fn(),
}));
```

#### useAuth Context Error

**Problem**: `useAuth must be used within an AuthProvider`

**Solution**:
```typescript
// Mock useAuth before imports
vi.mock('../../AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: { id: 1, role: 'TENANT' },
  }),
}));
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ReferenceError: jest is not defined` | Using Jest syntax in Vitest | Replace `jest` with `vi` |
| `Cannot read properties of undefined` | Missing mock or setup | Add proper mocks in `beforeEach` |
| `Timeout - Async callback was not invoked` | Test didn't complete | Add proper `await` or increase timeout |
| `Multiple elements found` | Query matches multiple elements | Use `getAllBy*` or more specific query |

---

## Test Coverage

### Current Coverage Goals

#### Backend
- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 75%+
- **Statements**: 80%+

#### Frontend
- **Lines**: 60%+
- **Functions**: 60%+
- **Branches**: 60%+
- **Statements**: 60%+

### Generating Coverage Reports

#### Backend
```bash
cd tenant_portal_backend
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

#### Frontend
```bash
cd tenant_portal_app
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Exclusions

Both configurations exclude:
- Test files themselves
- Configuration files
- Type definitions
- Mock data
- Node modules

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Scheduled nightly runs

### Local CI Simulation

```bash
# Backend
cd tenant_portal_backend
CI=true npm run test:e2e

# Frontend
cd tenant_portal_app
CI=true npm run test:all
```

---

## Test Maintenance

### When to Update Tests

- ✅ When adding new features
- ✅ When fixing bugs (add regression test)
- ✅ When refactoring code
- ✅ When changing API contracts
- ✅ When updating dependencies

### Test Review Checklist

- [ ] Test name clearly describes what it tests
- [ ] Test is independent and can run in isolation
- [ ] All assertions are meaningful
- [ ] Error cases are covered
- [ ] Edge cases are considered
- [ ] Test data is realistic
- [ ] Mocks are properly configured
- [ ] Cleanup is performed

---

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)

### Internal Documentation
- `test/factories/index.ts` - Test data factory patterns
- `test/utils/reset-database.ts` - Database reset implementation
- `src/mocks/handlers.ts` - MSW handler examples

---

## Quick Reference

### Backend Commands
```bash
npm test                    # Unit tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm run test:e2e           # E2E tests
```

### Frontend Commands
```bash
npm test                    # Unit tests (watch)
npm run test:run           # Unit tests (once)
npm run test:coverage      # Coverage report
npm run test:ui            # Visual test UI
npm run test:e2e           # E2E tests
npm run test:all           # All tests
```

### Common Test Patterns
```typescript
// Mock API call
vi.spyOn(apiClient, 'apiFetch').mockResolvedValue(data);

// Wait for element
await waitFor(() => expect(element).toBeInTheDocument());

// User interaction
await userEvent.click(button);
await userEvent.type(input, 'text');

// Reset database
await resetDatabase(prisma);
```

---

## Next Steps

- [ ] Add visual regression testing
- [ ] Add performance testing
- [ ] Add accessibility testing (a11y)
- [ ] Increase coverage thresholds
- [ ] Add mutation testing
- [ ] Add contract testing
- [ ] Set up test reporting dashboard

---

**Last Updated**: January 2025
**Maintained By**: Development Team
