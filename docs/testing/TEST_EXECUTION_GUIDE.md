# Test Execution Guide

**P0-004: How to Run Tests and Generate Coverage Reports**

This guide provides step-by-step instructions for running tests and generating coverage reports.

**Last Updated:** January 2025

---

## Quick Start

### Run All Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Both
npm run test && npm run test:e2e
```

### Generate Coverage Reports
```bash
# Unit test coverage
npm run test:coverage

# E2E test coverage
npm run test:e2e:coverage

# Both (using script)
# Windows
.\scripts\generate-coverage-report.ps1

# Linux/Mac
./scripts/generate-coverage-report.sh
```

---

## Test Suites

### Unit Tests
**Location:** `src/**/*.spec.ts`

**Run:**
```bash
npm run test
```

**Watch Mode:**
```bash
npm run test:watch
```

**Coverage:**
```bash
npm run test:coverage
```

### E2E Tests
**Location:** `test/**/*.e2e.spec.ts`

**Available Test Suites:**
1. `concurrent-operations.e2e.spec.ts` - Concurrent operations
2. `failure-scenarios.e2e.spec.ts` - Failure scenarios
3. `auth-edge-cases.e2e.spec.ts` - Authentication edge cases

**Run All:**
```bash
npm run test:e2e
```

**Run Specific Suite:**
```bash
npm run test:e2e -- failure-scenarios
npm run test:e2e -- concurrent-operations
npm run test:e2e -- auth-edge-cases
```

**Coverage:**
```bash
npm run test:e2e:coverage
```

---

## Coverage Reports

### Viewing Reports

**HTML Reports:**
- Unit tests: `coverage/index.html`
- E2E tests: `coverage/e2e/index.html`

**Open in Browser:**
```bash
# Windows
start coverage/index.html

# macOS
open coverage/index.html

# Linux
xdg-open coverage/index.html
```

### Report Formats

Coverage reports are generated in multiple formats:
- **HTML** - Interactive browser view
- **Text** - Console output
- **LCOV** - For CI/CD integration
- **JSON** - Machine-readable

---

## Troubleshooting

### Tests Failing

1. **Check Database Connection:**
   ```bash
   # Verify DATABASE_URL in .env
   echo $DATABASE_URL
   ```

2. **Reset Test Database:**
   ```bash
   # Tests automatically reset database, but if issues persist:
   npx prisma migrate reset --force
   ```

3. **Check Prisma Client:**
   ```bash
   npx prisma generate
   ```

### Coverage Not Generating

1. **Check Jest Configuration:**
   - Verify `jest.config.js` or `test/jest-e2e.json`
   - Check `collectCoverage` is enabled

2. **Check File Patterns:**
   - Verify `collectCoverageFrom` includes correct paths
   - Check exclusion patterns

### Common Issues

**Issue:** "Cannot find module"
**Solution:** Run `npm install`

**Issue:** "Prisma client not generated"
**Solution:** Run `npx prisma generate`

**Issue:** "Database connection failed"
**Solution:** Check `.env` file and database server

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx prisma generate
      - run: npm run test:coverage
      - run: npm run test:e2e:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info,./coverage/e2e/lcov.info
```

---

## Best Practices

1. **Run Tests Before Committing:**
   ```bash
   npm run test && npm run test:e2e
   ```

2. **Check Coverage Regularly:**
   ```bash
   npm run test:coverage
   ```

3. **Fix Failing Tests Immediately:**
   - Don't commit broken tests
   - Fix or skip (with reason)

4. **Maintain Coverage Thresholds:**
   - Unit tests: 80%+
   - Critical services: 90%+
   - E2E tests: Baseline established

---

**Last Updated:** January 2025

