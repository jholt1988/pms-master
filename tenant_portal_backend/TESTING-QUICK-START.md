# Workflow Testing Quick Start Guide

**Quick Reference:** Run tests and verify Phase 3 optimizations

---

## Quick Commands

```bash
# Run all workflow tests
npm test -- src/workflows

# Run specific test file
npm test workflow-cache.service.spec.ts
npm test workflow-rate-limiter.service.spec.ts
npm test workflow-parallel-executor.spec.ts
npm test workflow-engine-optimization.spec.ts
npm test workflow-metrics.service.spec.ts

# Run with coverage
npm run test:coverage -- src/workflows

# Run in watch mode
npm run test:watch -- src/workflows
```

---

## Test Coverage Summary

### Phase 3 Optimization Tests

| Test File | Coverage | Status |
|-----------|----------|--------|
| `workflow-cache.service.spec.ts` | 90%+ | ✅ Complete |
| `workflow-rate-limiter.service.spec.ts` | 90%+ | ✅ Complete |
| `workflow-parallel-executor.spec.ts` | 95%+ | ✅ Complete |
| `workflow-engine-optimization.spec.ts` | 85%+ | ✅ Complete |
| `workflow-metrics.service.spec.ts` | 90%+ | ✅ Complete |

---

## Key Test Scenarios

### 1. Caching Tests

```bash
npm test workflow-cache.service.spec.ts
```

**What it tests:**
- ✅ Workflow definition caching
- ✅ AI response caching
- ✅ TTL expiration
- ✅ Cache key generation
- ✅ Cache statistics

### 2. Rate Limiting Tests

```bash
npm test workflow-rate-limiter.service.spec.ts
```

**What it tests:**
- ✅ Allow requests within limit
- ✅ Reject requests exceeding limit
- ✅ Window expiration and reset
- ✅ Key generation

### 3. Parallel Execution Tests

```bash
npm test workflow-parallel-executor.spec.ts
```

**What it tests:**
- ✅ Dependency graph building
- ✅ Topological sort
- ✅ Parallel execution groups
- ✅ Circular dependency detection

### 4. Optimization Integration Tests

```bash
npm test workflow-engine-optimization.spec.ts
```

**What it tests:**
- ✅ Caching integration
- ✅ Rate limiting integration
- ✅ Parallel execution performance
- ✅ Query optimizations

### 5. Metrics Tests

```bash
npm test workflow-metrics.service.spec.ts
```

**What it tests:**
- ✅ Metric recording
- ✅ Metrics calculation
- ✅ Health monitoring
- ✅ Alert generation

---

## Running All Tests

```bash
# Run all workflow tests
npm test -- src/workflows

# Expected output:
# PASS  src/workflows/workflow-cache.service.spec.ts
# PASS  src/workflows/workflow-rate-limiter.service.spec.ts
# PASS  src/workflows/workflow-parallel-executor.spec.ts
# PASS  src/workflows/workflow-engine-optimization.spec.ts
# PASS  src/workflows/workflow-metrics.service.spec.ts
#
# Test Suites: 5 passed, 5 total
# Tests:       45 passed, 45 total
```

---

## Test Coverage Report

After running tests with coverage:

```bash
npm run test:coverage -- src/workflows
```

**Expected Coverage:**
- Statements: >85%
- Branches: >80%
- Functions: >85%
- Lines: >85%

---

## Common Test Issues

### Issue: Tests timing out

**Solution:**
```typescript
// Increase timeout for slow tests
it('should complete within timeout', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Issue: Mock not resetting

**Solution:**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Issue: Async operations not completing

**Solution:**
```typescript
// Always await async operations
const result = await service.executeWorkflow('test', {}, userId);
expect(result).toBeDefined();
```

---

## Next Steps

1. ✅ Run all tests: `npm test -- src/workflows`
2. ✅ Check coverage: `npm run test:coverage -- src/workflows`
3. ✅ Review test results
4. ✅ Fix any failing tests
5. ✅ Add additional test cases as needed

---

**For detailed testing documentation, see:** `WORKFLOW-TESTING-GUIDE.md`

