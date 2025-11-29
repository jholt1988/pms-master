# Workflow System Testing Guide

**Last Updated:** January 2025  
**Status:** Comprehensive Testing Documentation

---

## Overview

This guide provides comprehensive testing strategies, examples, and best practices for the workflow system. The workflow engine has been enhanced with production-ready features across three phases:

- **Phase 1:** Critical Fixes (Security, Data Integrity, Error Handling)
- **Phase 2:** Stabilization (Logging, Metrics, Circuit Breakers)
- **Phase 3:** Optimization (Parallel Execution, Caching, Rate Limiting)

---

## Table of Contents

1. [Test Structure](#test-structure)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [Performance Tests](#performance-tests)
5. [End-to-End Tests](#end-to-end-tests)
6. [Testing Best Practices](#testing-best-practices)
7. [Test Coverage Requirements](#test-coverage-requirements)

---

## Test Structure

### Test Files

```
src/workflows/
├── workflow-engine.service.spec.ts          # Main workflow engine tests
├── workflow-engine-optimization.spec.ts     # Phase 3 optimization tests
├── workflow-cache.service.spec.ts           # Caching service tests ✅
├── workflow-rate-limiter.service.spec.ts    # Rate limiting tests ✅
├── workflow-metrics.service.spec.ts        # Metrics service tests ✅
├── workflow-parallel-executor.spec.ts       # Parallel execution tests ✅
├── workflow-scheduler.service.spec.ts      # Scheduler tests
└── workflow-ai-helper.spec.ts              # AI helper tests
```

**Status:** ✅ Test files created for Phase 3 optimizations

### Test Categories

1. **Unit Tests** - Test individual components in isolation
2. **Integration Tests** - Test component interactions
3. **Performance Tests** - Test optimization features
4. **E2E Tests** - Test complete workflow execution

---

## Unit Tests

### 1. Workflow Cache Service

**File:** `workflow-cache.service.spec.ts`

**Test Cases:**
- ✅ Cache workflow definitions
- ✅ Cache AI responses
- ✅ TTL expiration
- ✅ Cache key generation
- ✅ Cache statistics
- ✅ Expired entry cleanup

**Example:**
```typescript
describe('WorkflowCacheService', () => {
  it('should cache workflow definition', () => {
    service.setWorkflow('test-workflow', mockWorkflow);
    const cached = service.getWorkflow('test-workflow');
    expect(cached).toEqual(mockWorkflow);
  });

  it('should expire cached workflow after TTL', async () => {
    service.setWorkflow('test-workflow', mockWorkflow, 100);
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(service.getWorkflow('test-workflow')).toBeNull();
  });
});
```

### 2. Rate Limiter Service

**File:** `workflow-rate-limiter.service.spec.ts`

**Test Cases:**
- ✅ Allow requests within limit
- ✅ Reject requests exceeding limit
- ✅ Reset after window expires
- ✅ Track remaining requests
- ✅ Key generation
- ✅ Expired entry cleanup

**Example:**
```typescript
describe('WorkflowRateLimiterService', () => {
  it('should reject requests exceeding limit', async () => {
    const key = 'test-key';
    await service.checkRateLimit(key, 2, 60);
    await service.checkRateLimit(key, 2, 60);
    const result = await service.checkRateLimit(key, 2, 60);
    expect(result.allowed).toBe(false);
  });
});
```

### 3. Parallel Executor

**File:** `workflow-parallel-executor.spec.ts`

**Test Cases:**
- ✅ Build dependency graph
- ✅ Topological sort
- ✅ Parallel execution groups
- ✅ Circular dependency detection
- ✅ Complex dependency graphs

**Example:**
```typescript
describe('topologicalSort', () => {
  it('should sort steps with parallel branches', () => {
    const steps = [
      { id: 'step1', type: 'CREATE_LEASE' },
      { id: 'step2', type: 'SEND_EMAIL', dependsOn: ['step1'] },
      { id: 'step3', type: 'SCHEDULE_INSPECTION', dependsOn: ['step1'] },
    ];
    const graph = buildStepGraph(steps);
    const executionGroups = topologicalSort(graph);
    expect(executionGroups[1].length).toBe(2); // step2 and step3 in parallel
  });
});
```

### 4. Workflow Engine Optimizations

**File:** `workflow-engine-optimization.spec.ts`

**Test Cases:**
- ✅ Workflow definition caching
- ✅ AI response caching
- ✅ Rate limiting enforcement
- ✅ Parallel step execution
- ✅ Query optimizations (N+1 fixes)

**Example:**
```typescript
it('should execute independent steps in parallel', async () => {
  const executionTimes: number[] = [];
  
  service.registerWorkflow({
    id: 'parallel-test',
    steps: [
      {
        id: 'step1',
        type: 'CUSTOM',
        handler: async () => {
          const start = Date.now();
          await delay(100);
          executionTimes.push(Date.now() - start);
          return { result: 'step1' };
        },
      },
      {
        id: 'step2',
        type: 'CUSTOM',
        handler: async () => {
          const start = Date.now();
          await delay(100);
          executionTimes.push(Date.now() - start);
          return { result: 'step2' };
        },
      },
    ],
  });

  const startTime = Date.now();
  await service.executeWorkflow('parallel-test', {}, userId);
  const totalDuration = Date.now() - startTime;

  // Both steps should start around the same time
  expect(Math.abs(executionTimes[0] - executionTimes[1])).toBeLessThan(50);
  // Total duration should be ~100ms (parallel) not ~200ms (sequential)
  expect(totalDuration).toBeLessThan(150);
});
```

### 5. Workflow Metrics Service

**File:** `workflow-metrics.service.spec.ts`

**Test Cases:**
- ✅ Metric recording
- ✅ Workflow metrics calculation
- ✅ Time window filtering
- ✅ Overall health assessment
- ✅ Alert generation
- ✅ Cache management

**Example:**
```typescript
it('should calculate correct metrics', () => {
  service.recordMetric({
    workflowId: 'test-workflow',
    executionId: 'exec-1',
    status: 'COMPLETED',
    duration: 1000,
    stepCount: 3,
    failedStepCount: 0,
  });

  const metrics = service.getWorkflowMetrics('test-workflow', 60);
  expect(metrics.totalExecutions).toBe(1);
  expect(metrics.successfulExecutions).toBe(1);
  expect(metrics.errorRate).toBe(0);
});
```

---

## Integration Tests

### 1. Complete Workflow Execution

**Test:** Execute a full workflow with all features

```typescript
describe('Workflow Execution Integration', () => {
  it('should execute workflow with caching and rate limiting', async () => {
    // Setup
    const workflow = {
      id: 'test-workflow',
      name: 'Test',
      steps: [
        { id: 'step1', type: 'CREATE_LEASE' },
        { id: 'step2', type: 'SEND_EMAIL', dependsOn: ['step1'] },
      ],
    };
    service.registerWorkflow(workflow);

    // Execute
    const result = await service.executeWorkflow('test-workflow', {}, userId);

    // Verify
    expect(result.status).toBe('COMPLETED');
    expect(result.steps).toHaveLength(2);
    expect(cacheService.getWorkflow).toHaveBeenCalled();
    expect(rateLimiter.checkRateLimit).toHaveBeenCalled();
  });
});
```

### 2. Parallel Execution Integration

**Test:** Verify parallel steps execute concurrently

```typescript
it('should execute independent steps in parallel', async () => {
  const executionTimes: number[] = [];

  service.registerWorkflow({
    id: 'parallel-test',
    steps: [
      {
        id: 'step1',
        type: 'CUSTOM',
        handler: async () => {
          const start = Date.now();
          await delay(100);
          executionTimes.push(Date.now() - start);
          return { result: 'step1' };
        },
      },
      {
        id: 'step2',
        type: 'CUSTOM',
        handler: async () => {
          const start = Date.now();
          await delay(100);
          executionTimes.push(Date.now() - start);
          return { result: 'step2' };
        },
      },
    ],
  });

  const startTime = Date.now();
  await service.executeWorkflow('parallel-test', {}, userId);
  const totalDuration = Date.now() - startTime;

  // Both steps should start around the same time
  expect(Math.abs(executionTimes[0] - executionTimes[1])).toBeLessThan(50);
  // Total duration should be ~100ms (parallel) not ~200ms (sequential)
  expect(totalDuration).toBeLessThan(150);
});
```

### 3. Error Handling Integration

**Test:** Verify error handling across all layers

```typescript
it('should handle errors with retry, circuit breaker, and DLQ', async () => {
  // Mock AI service to fail
  aiService.assignPriorityWithAI.mockRejectedValue(new Error('Service unavailable'));

  const result = await service.executeWorkflow('test-workflow', {}, userId);

  // Should retry
  expect(aiService.assignPriorityWithAI).toHaveBeenCalledTimes(3);

  // Should eventually fail and go to DLQ
  expect(result.status).toBe('FAILED');
  expect(prisma.deadLetterQueue.create).toHaveBeenCalled();
});
```

---

## Performance Tests

### 1. Caching Performance

**Test:** Verify cache improves performance

```typescript
describe('Caching Performance', () => {
  it('should improve workflow lookup performance', async () => {
    // First call (cache miss)
    const start1 = Date.now();
    await service.executeWorkflow('test-workflow', {}, userId);
    const duration1 = Date.now() - start1;

    // Second call (cache hit)
    const start2 = Date.now();
    await service.executeWorkflow('test-workflow', {}, userId);
    const duration2 = Date.now() - start2;

    // Cached call should be significantly faster
    expect(duration2).toBeLessThan(duration1 * 0.5);
  });

  it('should reduce AI API calls with caching', async () => {
    const cacheKey = 'ai:test:method:params';
    
    // First call
    await service.executeWorkflow('test-workflow', { title: 'Test' }, userId);
    expect(aiService.assignPriorityWithAI).toHaveBeenCalledTimes(1);

    // Second call with same params (should use cache)
    await service.executeWorkflow('test-workflow', { title: 'Test' }, userId);
    expect(aiService.assignPriorityWithAI).toHaveBeenCalledTimes(1); // Still 1, not 2
  });
});
```

### 2. Parallel Execution Performance

**Test:** Verify parallel execution improves performance

```typescript
describe('Parallel Execution Performance', () => {
  it('should execute parallel steps faster than sequential', async () => {
    // Sequential workflow
    const sequentialWorkflow = {
      id: 'sequential',
      steps: [
        { id: 's1', type: 'CUSTOM', handler: () => delay(100) },
        { id: 's2', type: 'CUSTOM', dependsOn: ['s1'], handler: () => delay(100) },
        { id: 's3', type: 'CUSTOM', dependsOn: ['s2'], handler: () => delay(100) },
      ],
    };

    // Parallel workflow
    const parallelWorkflow = {
      id: 'parallel',
      steps: [
        { id: 'p1', type: 'CUSTOM', handler: () => delay(100) },
        { id: 'p2', type: 'CUSTOM', dependsOn: ['p1'], handler: () => delay(100) },
        { id: 'p3', type: 'CUSTOM', dependsOn: ['p1'], handler: () => delay(100) },
      ],
    };

    const sequentialTime = await measureExecution(sequentialWorkflow);
    const parallelTime = await measureExecution(parallelWorkflow);

    // Parallel should be faster (2 groups vs 3 groups)
    expect(parallelTime).toBeLessThan(sequentialTime);
  });
});
```

### 3. Query Optimization Performance

**Test:** Verify N+1 query fixes

```typescript
describe('Query Optimization', () => {
  it('should use single query instead of N+1', async () => {
    await service.executeWorkflow('test-workflow', { requestId: 1 }, userId);

    // Should be 1 query with includes, not multiple queries
    expect(prisma.maintenanceRequest.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.property.findUnique).not.toHaveBeenCalled();
    expect(prisma.asset.findUnique).not.toHaveBeenCalled();
  });
});
```

---

## End-to-End Tests

### 1. Complete Workflow Lifecycle

```typescript
describe('E2E: Complete Workflow Lifecycle', () => {
  it('should execute maintenance request workflow end-to-end', async () => {
    // 1. Register workflow
    service.registerWorkflow({
      id: 'maintenance-lifecycle',
      steps: [
        { id: 'create', type: 'CREATE_MAINTENANCE_REQUEST' },
        { id: 'assign-priority', type: 'ASSIGN_PRIORITY_AI', dependsOn: ['create'] },
        { id: 'assign-technician', type: 'ASSIGN_TECHNICIAN', dependsOn: ['assign-priority'] },
        { id: 'notify', type: 'SEND_NOTIFICATION', dependsOn: ['assign-technician'] },
      ],
    });

    // 2. Execute workflow
    const result = await service.executeWorkflow(
      'maintenance-lifecycle',
      { title: 'Leak in bathroom', description: 'Water leaking from ceiling' },
      userId
    );

    // 3. Verify execution
    expect(result.status).toBe('COMPLETED');
    expect(result.steps).toHaveLength(4);
    expect(result.steps[0].status).toBe('COMPLETED');
    expect(result.steps[1].status).toBe('COMPLETED');
    expect(result.steps[2].status).toBe('COMPLETED');
    expect(result.steps[3].status).toBe('COMPLETED');

    // 4. Verify database persistence
    const persisted = await prisma.workflowExecution.findUnique({
      where: { id: result.id },
      include: { steps: true },
    });
    expect(persisted).toBeDefined();
    expect(persisted.steps).toHaveLength(4);

    // 5. Verify metrics
    const metrics = metricsService.getWorkflowMetrics('maintenance-lifecycle', 60);
    expect(metrics.totalExecutions).toBeGreaterThan(0);
    expect(metrics.successfulExecutions).toBeGreaterThan(0);
  });
});
```

### 2. Error Recovery E2E

```typescript
it('should recover from failures with retry and DLQ', async () => {
  // Mock transient failure
  let attemptCount = 0;
  aiService.assignPriorityWithAI.mockImplementation(async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('Temporary failure');
    }
    return 'HIGH';
  });

  const result = await service.executeWorkflow('test-workflow', {}, userId);

  // Should eventually succeed after retries
  expect(result.status).toBe('COMPLETED');
  expect(attemptCount).toBe(3);

  // If it still fails, should go to DLQ
  aiService.assignPriorityWithAI.mockRejectedValue(new Error('Permanent failure'));
  const failedResult = await service.executeWorkflow('test-workflow', {}, userId);
  
  expect(failedResult.status).toBe('FAILED');
  expect(prisma.deadLetterQueue.create).toHaveBeenCalled();
});
```

---

## Testing Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Mock external dependencies
- Clean up after tests

### 2. Test Data Management

```typescript
// Use factories for test data
const createMockWorkflow = (overrides = {}) => ({
  id: 'test-workflow',
  name: 'Test',
  description: 'Test',
  steps: [],
  ...overrides,
});

const createMockExecution = (overrides = {}) => ({
  id: 'exec-123',
  workflowId: 'test-workflow',
  status: 'RUNNING',
  input: {},
  output: {},
  steps: [],
  startedAt: new Date(),
  completedAt: null,
  error: null,
  ...overrides,
});
```

### 3. Async Testing

```typescript
// Always await async operations
it('should handle async operations', async () => {
  const result = await service.executeWorkflow('test', {}, userId);
  expect(result).toBeDefined();
});

// Use proper timeout for slow operations
it('should complete within timeout', async () => {
  const result = await service.executeWorkflow('test', {}, userId);
  expect(result).toBeDefined();
}, 10000); // 10 second timeout
```

### 4. Mocking Strategies

```typescript
// Mock Prisma
const mockPrisma = {
  workflowExecution: {
    upsert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

// Mock AI Services
const mockAIService = {
  assignPriorityWithAI: jest.fn().mockResolvedValue('HIGH'),
  assessPaymentRisk: jest.fn().mockResolvedValue({ riskLevel: 'LOW' }),
};

// Mock Cache
const mockCache = {
  getWorkflow: jest.fn(),
  setWorkflow: jest.fn(),
  getAIResponse: jest.fn(),
  setAIResponse: jest.fn(),
};
```

### 5. Assertion Best Practices

```typescript
// Be specific with assertions
expect(result.status).toBe('COMPLETED'); // Not just truthy

// Test error cases
expect(() => service.executeWorkflow('invalid', {}, userId))
  .toThrow(WorkflowError);

// Test edge cases
expect(service.getWorkflow('')).toBeNull();
expect(service.getWorkflow(null as any)).toBeNull();
```

---

## Test Coverage Requirements

### Minimum Coverage Targets

| Component | Target Coverage |
|-----------|----------------|
| WorkflowEngineService | 85% |
| WorkflowCacheService | 90% |
| WorkflowRateLimiterService | 90% |
| WorkflowMetricsService | 85% |
| WorkflowParallelExecutor | 95% |
| WorkflowSchedulerService | 80% |
| WorkflowAIHelper | 85% |

### Critical Paths (Must Have 100% Coverage)

- ✅ Error handling paths
- ✅ Retry logic
- ✅ Circuit breaker state transitions
- ✅ Rate limiting enforcement
- ✅ Cache expiration
- ✅ Transaction rollback
- ✅ Permission checks
- ✅ Input validation

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test workflow-cache.service.spec.ts

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

---

## Test Scenarios Checklist

### Phase 1: Critical Fixes

- [ ] Security: `eval()` replacement with safe parser
- [ ] Database persistence: Executions saved to DB
- [ ] Transactions: Rollback on failure
- [ ] Retry logic: Exponential backoff works
- [ ] Input validation: Invalid inputs rejected
- [ ] Permission checks: Unauthorized access blocked
- [ ] Scheduler: Race condition prevention

### Phase 2: Stabilization

- [ ] Structured logging: Correlation IDs present
- [ ] Error codes: Proper error codes returned
- [ ] Circuit breaker: Opens/closes correctly
- [ ] Retry wrapper: AI calls retry on failure
- [ ] Metrics: Metrics recorded correctly
- [ ] Dead letter queue: Failed executions stored

### Phase 3: Optimization

- [ ] Caching: Workflow definitions cached
- [ ] Caching: AI responses cached
- [ ] Rate limiting: Limits enforced
- [ ] Parallel execution: Independent steps run in parallel
- [ ] Query optimization: No N+1 queries
- [ ] Checkpointing: State saved after steps

---

## Performance Benchmarks

### Expected Performance

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Workflow lookup (cached) | <1ms | Cache hit |
| Workflow lookup (uncached) | <50ms | Database query |
| AI response (cached) | <1ms | Cache hit |
| AI response (uncached) | <2s | API call + retry |
| Parallel step execution | 30-50% faster | vs sequential |
| Database query (optimized) | <50ms | Single query |

### Load Testing

```typescript
describe('Load Testing', () => {
  it('should handle concurrent workflow executions', async () => {
    const concurrentExecutions = 100;
    const promises = Array(concurrentExecutions).fill(null).map(() =>
      service.executeWorkflow('test-workflow', {}, userId)
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(concurrentExecutions);
    expect(results.every(r => r.status === 'COMPLETED')).toBe(true);
  });

  it('should enforce rate limits under load', async () => {
    const limit = 10;
    const promises = Array(limit + 5).fill(null).map(() =>
      service.executeWorkflow('test-workflow', {}, userId)
    );

    const results = await Promise.allSettled(promises);
    const rejected = results.filter(r => r.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
  });
});
```

---

## Continuous Integration

### CI/CD Test Pipeline

```yaml
# .github/workflows/test.yml
name: Workflow Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:coverage
      - run: npm run test:e2e
```

### Pre-commit Hooks

```bash
# Run tests before commit
npm run test
npm run lint
```

---

## Troubleshooting Tests

### Common Issues

1. **Flaky Tests**
   - Use proper timeouts
   - Wait for async operations
   - Clear mocks between tests

2. **Database State**
   - Use transactions for isolation
   - Clean up test data
   - Use test database

3. **Timing Issues**
   - Use `fakeTimers` for time-dependent tests
   - Add appropriate delays
   - Use `waitFor` for async assertions

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)

---

**Last Updated:** January 2025  
**Maintainer:** Development Team

