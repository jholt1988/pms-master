# Test Coverage Reporting Guide

**P0-004: Test Coverage Implementation**

This document describes the test coverage reporting setup for the codebase.

**Last Updated:** January 2025

---

## Overview

Test coverage reporting has been configured for both unit tests and E2E tests to track code coverage and ensure quality standards.

---

## Coverage Configuration

### Unit Tests

**Configuration File:** `jest.config.js`

**Coverage Thresholds:**
- Branches: 70%
- Functions: 75%
- Lines: 80%
- Statements: 80%

**Run Command:**
```bash
npm run test:coverage
```

**Coverage Directory:** `coverage/`

**Excluded Files:**
- Type definitions (`*.d.ts`)
- Interfaces (`*.interface.ts`)
- Modules (`*.module.ts`)
- Main entry points (`main.ts`, `index.ts`)
- Test files (`*.spec.ts`, `*.e2e.spec.ts`)

---

### E2E Tests

**Configuration File:** `test/jest-e2e.json`

**Coverage Thresholds:**
- Currently set to 0% (baseline)
- Can be increased as E2E coverage improves

**Run Command:**
```bash
npm run test:e2e:coverage
```

**Coverage Directory:** `coverage/e2e/`

**Excluded Files:**
- Test files
- Node modules
- Distribution files

---

## Coverage Reports

### Report Formats

Coverage reports are generated in multiple formats:

1. **Text** - Console output
2. **Text Summary** - Brief summary in console
3. **HTML** - Interactive HTML report (open `coverage/index.html`)
4. **LCOV** - For CI/CD integration
5. **JSON** - Machine-readable format

### Viewing Coverage Reports

**HTML Report:**
```bash
# After running coverage
open coverage/index.html        # macOS
start coverage/index.html       # Windows
xdg-open coverage/index.html    # Linux
```

**E2E HTML Report:**
```bash
open coverage/e2e/index.html    # macOS
start coverage/e2e/index.html   # Windows
```

---

## Coverage Metrics

### Current Coverage Status

**Unit Tests:**
- Target: 80% line coverage
- Current: Check `coverage/coverage-summary.json`

**E2E Tests:**
- Target: Baseline established
- Focus: Critical paths and edge cases

### Coverage by Module

Coverage reports show breakdown by:
- Service files
- Controller files
- Module files
- Utility files

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Coverage

on: [push, pull_request]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:coverage
      - run: npm run test:e2e:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info,./coverage/e2e/lcov.info
          flags: unittests,e2etests
```

### Codecov Integration

1. Sign up at [codecov.io](https://codecov.io)
2. Add repository
3. Upload coverage reports:
   ```bash
   npm run test:coverage
   npm run test:e2e:coverage
   # Upload to codecov
   ```

---

## Improving Coverage

### Identifying Gaps

1. **Run Coverage:**
   ```bash
   npm run test:coverage
   ```

2. **View HTML Report:**
   - Open `coverage/index.html`
   - Identify files with low coverage
   - Check uncovered lines

3. **Add Tests:**
   - Focus on uncovered branches
   - Test error paths
   - Test edge cases

### Coverage Best Practices

1. **Aim for High Coverage:**
   - Critical paths: 90%+
   - Business logic: 80%+
   - Utilities: 70%+

2. **Quality over Quantity:**
   - Don't just aim for 100%
   - Focus on meaningful tests
   - Test behavior, not implementation

3. **Regular Reviews:**
   - Review coverage reports weekly
   - Address coverage gaps in sprints
   - Set coverage goals per module

---

## Troubleshooting

### Coverage Not Generating

**Issue:** Coverage directory not created

**Solution:**
```bash
# Ensure Jest is configured correctly
npm run test:coverage -- --verbose

# Check jest.config.js for coverageDirectory
```

### Low Coverage Scores

**Issue:** Coverage below thresholds

**Solution:**
1. Identify uncovered files
2. Add tests for missing coverage
3. Review if files should be excluded

### E2E Coverage Issues

**Issue:** E2E coverage not accurate

**Solution:**
- E2E tests may have lower coverage (expected)
- Focus on critical user paths
- Use unit tests for detailed coverage

---

## Coverage Goals

### Short-term (Next Sprint)
- [ ] Achieve 80% line coverage on critical services
- [ ] Add coverage reporting to CI/CD
- [ ] Set up coverage badges

### Medium-term (Next Month)
- [ ] Achieve 80% coverage across all services
- [ ] Integrate with code coverage service
- [ ] Set up coverage trend tracking

### Long-term (Next Quarter)
- [ ] Maintain 80%+ coverage
- [ ] Automated coverage alerts
- [ ] Coverage-based PR reviews

---

## Commands Reference

```bash
# Unit test coverage
npm run test:coverage

# E2E test coverage
npm run test:e2e:coverage

# Both with watch mode
npm run test:watch

# Coverage with specific file
npm run test:coverage -- src/services/my-service.ts
```

---

**Last Updated:** January 2025  
**Status:** Configured and Ready

