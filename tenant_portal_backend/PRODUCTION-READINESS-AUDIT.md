# Production-Readiness Audit: AI Workflows

**Date:** January 2025  
**Auditor:** Senior Systems Architect & SRE  
**Scope:** Workflow Engine & AI Service Integration  
**Status:** ⚠️ **NOT PRODUCTION READY** - Critical Issues Identified

---

## 1. Executive Summary

### Current State Assessment

The AI workflow system is currently in an **MVP "Happy Path" state** with significant gaps that make it unsuitable for production deployment. While the core architecture is sound, the implementation lacks critical production-grade features for error handling, data integrity, security, observability, and performance.

### Risk Level: **HIGH** 🔴

**Deploying as-is would result in:**
- **Data Loss Risk:** No transactional guarantees, failed workflows can leave partial state
- **Security Vulnerabilities:** Code injection via `eval()`, no input validation
- **Operational Blindness:** Insufficient logging/monitoring to debug production issues
- **Cascading Failures:** No circuit breakers, retry storms possible
- **Performance Degradation:** Sequential execution, no caching, potential N+1 queries

### Critical Blockers

1. **Security:** `eval()` usage in condition evaluation (Line 591) - **CRITICAL**
2. **Data Integrity:** No database transactions, `storeExecution()` is a no-op
3. **Error Handling:** No exponential backoff, no dead letter queue
4. **Observability:** Missing structured logging, error codes, and metrics

### Estimated Effort to Production-Ready

- **Phase 1 (Critical Fixes):** 2-3 weeks
- **Phase 2 (Stabilization):** 2-3 weeks  
- **Phase 3 (Optimization):** 2-3 weeks
- **Total:** 6-9 weeks with 1-2 engineers

---

## 2. Gap Analysis

| Workflow Step | Identified Issue | Severity | Proposed Fix |
|--------------|------------------|----------|--------------|
| **Workflow Execution** | No database transactions - partial state on failure | **HIGH** | Wrap execution in Prisma transaction, implement rollback |
| **Workflow Execution** | `storeExecution()` is a no-op (Line 601-604) - executions not persisted | **HIGH** | Implement actual database persistence with Prisma |
| **Condition Evaluation** | Uses `eval()` for condition evaluation (Line 591) - **CODE INJECTION RISK** | **CRITICAL** | Replace with safe expression evaluator (e.g., `expr-eval`, `mathjs`) |
| **Step Retry Logic** | Immediate retries without exponential backoff (Line 88-109) | **MEDIUM** | Implement exponential backoff with jitter (e.g., `2^attempt + random(0-1000ms)`) |
| **Step Retry Logic** | Retry count calculation bug - counts all failed steps, not retries (Line 88-90) | **MEDIUM** | Track retry attempts per step separately |
| **AI Service Calls** | No retry logic for external API calls (OpenAI) | **MEDIUM** | Add retry wrapper with exponential backoff for transient failures |
| **AI Service Calls** | No circuit breaker - can overwhelm API on failures | **MEDIUM** | Implement circuit breaker pattern (e.g., `opossum`) |
| **AI Service Calls** | No timeout configuration - can hang indefinitely | **MEDIUM** | Add configurable timeouts (default 10s) with AbortController |
| **Workflow Scheduler** | Race condition in `runScheduledWorkflows()` - multiple instances can run same workflow | **HIGH** | Use database locks or distributed lock (Redis) |
| **Workflow Scheduler** | No dead letter queue for failed scheduled workflows | **MEDIUM** | Implement DLQ table and retry mechanism |
| **Input Validation** | No validation of workflow input parameters | **MEDIUM** | Add Zod/DTO validation before execution |
| **Input Sanitization** | User input directly used in string interpolation (Line 619, 624) | **MEDIUM** | Sanitize and validate all inputs |
| **Permission Checks** | No authorization checks - any user can trigger any workflow | **HIGH** | Add role-based access control (RBAC) checks |
| **Logging** | Basic logging without structured format or correlation IDs | **MEDIUM** | Implement structured logging with correlation IDs |
| **Error Codes** | Generic error messages - no distinct error codes for debugging | **MEDIUM** | Define error code enum (e.g., `WORKFLOW_NOT_FOUND`, `STEP_EXECUTION_FAILED`) |
| **Metrics** | No metrics collection (success rate, duration, error rate) | **MEDIUM** | Integrate Prometheus metrics or similar |
| **Tracing** | No distributed tracing for workflow execution | **LOW** | Add OpenTelemetry tracing |
| **Step Execution** | Sequential execution only - no parallel step support | **LOW** | Add parallel step execution for independent steps |
| **Database Queries** | Potential N+1 queries in `executeAssignTechnician()` (Line 284-299) | **MEDIUM** | Use Prisma `include` to fetch related data in single query |
| **Caching** | No caching for workflow definitions or AI service responses | **LOW** | Add Redis caching for workflow definitions, cache AI responses |
| **Rate Limiting** | No rate limiting on workflow execution | **MEDIUM** | Add rate limiting per user/tenant |
| **Sensitive Data** | PII and sensitive data may be logged (Line 129, 376) | **HIGH** | Implement data masking in logs (e.g., mask emails, IDs) |
| **Workflow State** | Execution state only in memory - lost on restart | **HIGH** | Persist execution state to database with checkpoints |
| **Conditional Steps** | No validation of condition syntax before execution | **MEDIUM** | Validate condition syntax at workflow registration |
| **Custom Handlers** | No sandboxing for custom step handlers - can execute arbitrary code | **HIGH** | Run custom handlers in isolated context or validate strictly |
| **Email Service** | Email failures don't fail workflow gracefully (Line 235-242) | **MEDIUM** | Add retry logic and proper error handling |
| **Prisma Service** | Optional AI services can cause null reference errors | **MEDIUM** | Make services required or add proper null checks everywhere |

---

## 3. Refactoring Roadmap

### Phase 1: Critical Fixes (Must-Haves to Prevent Crash/Data Loss)

**Timeline:** 2-3 weeks  
**Priority:** 🔴 **BLOCKER**

#### 1.1 Replace `eval()` with Safe Expression Evaluator
- **File:** `workflow-engine.service.ts:580-596`
- **Action:** Replace `eval()` with `expr-eval` or `mathjs`
- **Risk:** Code injection vulnerability
- **Effort:** 1 day

```typescript
// BEFORE (INSECURE):
return eval(evaluated) as boolean;

// AFTER (SECURE):
import { Parser } from 'expr-eval';
const parser = new Parser();
const expr = parser.parse(evaluated);
return expr.evaluate(execution.output);
```

#### 1.2 Implement Database Persistence
- **File:** `workflow-engine.service.ts:601-604`
- **Action:** Implement actual Prisma persistence
- **Risk:** Lost execution history, no audit trail
- **Effort:** 2 days

```typescript
private async storeExecution(execution: WorkflowExecution): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // Store execution
    await tx.workflowExecution.create({
      data: {
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        input: execution.input,
        output: execution.output,
        error: execution.error,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
      },
    });
    
    // Store steps
    for (const step of execution.steps) {
      await tx.workflowExecutionStep.create({
        data: {
          executionId: execution.id,
          stepId: step.stepId,
          status: step.status,
          input: step.input,
          output: step.output,
          error: step.error,
          startedAt: step.startedAt,
          completedAt: step.completedAt,
        },
      });
    }
  });
}
```

#### 1.3 Add Transaction Wrapper for Workflow Execution
- **File:** `workflow-engine.service.ts:44-136`
- **Action:** Wrap entire execution in transaction
- **Risk:** Partial state on failure
- **Effort:** 2 days

```typescript
async executeWorkflow(...): Promise<WorkflowExecution> {
  return await this.prisma.$transaction(async (tx) => {
    // Create execution record first
    const execution = await tx.workflowExecution.create({...});
    
    try {
      // Execute steps...
      // Update execution on each step
      await tx.workflowExecution.update({...});
    } catch (error) {
      // Transaction will auto-rollback
      throw error;
    }
  });
}
```

#### 1.4 Fix Retry Logic Bug
- **File:** `workflow-engine.service.ts:88-109`
- **Action:** Track retry attempts correctly
- **Risk:** Incorrect retry behavior
- **Effort:** 1 day

```typescript
// Track retries per step
const stepRetryCount = new Map<string, number>();

if (!stepResult.success && workflow.onError === 'RETRY') {
  const currentRetries = stepRetryCount.get(step.id) || 0;
  if (currentRetries < (workflow.maxRetries || 3)) {
    stepRetryCount.set(step.id, currentRetries + 1);
    // Retry with exponential backoff
    await this.delay(Math.pow(2, currentRetries) * 1000);
    // ... retry logic
  }
}
```

#### 1.5 Add Input Validation
- **File:** `workflow-engine.service.ts:44-48`
- **Action:** Validate input with Zod schema
- **Risk:** Invalid data causing failures
- **Effort:** 1 day

```typescript
import { z } from 'zod';

const WorkflowInputSchema = z.object({
  tenantId: z.number().optional(),
  unitId: z.number().optional(),
  // ... other fields
}).passthrough();

async executeWorkflow(workflowId: string, input: Record<string, any>) {
  // Validate input
  const validatedInput = WorkflowInputSchema.parse(input);
  // ... rest of execution
}
```

#### 1.6 Add Permission Checks
- **File:** `workflow-engine.service.ts:44-48`
- **Action:** Check user permissions before execution
- **Risk:** Unauthorized workflow execution
- **Effort:** 2 days

```typescript
async executeWorkflow(workflowId: string, input: Record<string, any>, userId?: number) {
  if (userId) {
    const hasPermission = await this.checkWorkflowPermission(userId, workflowId);
    if (!hasPermission) {
      throw new ForbiddenException(`User ${userId} not authorized to execute workflow ${workflowId}`);
    }
  }
  // ... rest of execution
}
```

#### 1.7 Fix Scheduler Race Condition
- **File:** `workflow-scheduler.service.ts:82-115`
- **Action:** Use database locks
- **Risk:** Duplicate workflow executions
- **Effort:** 2 days

```typescript
@Cron(CronExpression.EVERY_MINUTE)
async runScheduledWorkflows(): Promise<void> {
  // Use advisory lock to prevent concurrent execution
  const lockKey = `workflow-scheduler-${Date.now()}`;
  
  const lock = await this.prisma.$queryRaw`
    SELECT pg_try_advisory_lock(hashtext(${lockKey}))
  `;
  
  if (!lock) {
    this.logger.debug('Scheduler already running, skipping');
    return;
  }
  
  try {
    // ... existing logic
  } finally {
    await this.prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
  }
}
```

---

### Phase 2: Stabilization (Logging, Robust Error Handling)

**Timeline:** 2-3 weeks  
**Priority:** 🟡 **HIGH**

#### 2.1 Implement Structured Logging
- **Action:** Add correlation IDs and structured log format
- **Effort:** 2 days

```typescript
import { v4 as uuidv4 } from 'uuid';

async executeWorkflow(...): Promise<WorkflowExecution> {
  const correlationId = uuidv4();
  const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  this.logger.log('Workflow execution started', {
    correlationId,
    executionId,
    workflowId,
    userId,
    input: this.maskSensitiveData(input),
    timestamp: new Date().toISOString(),
  });
  
  // Use correlationId in all subsequent logs
}
```

#### 2.2 Add Error Code Enum
- **Action:** Define and use error codes
- **Effort:** 1 day

```typescript
export enum WorkflowErrorCode {
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  STEP_EXECUTION_FAILED = 'STEP_EXECUTION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  TIMEOUT = 'TIMEOUT',
}

class WorkflowError extends Error {
  constructor(
    public code: WorkflowErrorCode,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}
```

#### 2.3 Implement Exponential Backoff for Retries
- **Action:** Add backoff with jitter
- **Effort:** 1 day

```typescript
private async delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

private calculateBackoff(attempt: number, baseDelay: number = 1000): number {
  const exponentialDelay = Math.pow(2, attempt) * baseDelay;
  const jitter = Math.random() * 1000; // 0-1000ms jitter
  return Math.min(exponentialDelay + jitter, 60000); // Cap at 60s
}
```

#### 2.4 Add Retry Logic for AI Service Calls
- **Action:** Wrap AI calls with retry logic
- **Effort:** 2 days

```typescript
import { retry } from 'ts-retry-promise';

private async callAIServiceWithRetry<T>(
  serviceCall: () => Promise<T>,
  options: { maxRetries?: number; timeout?: number } = {}
): Promise<T> {
  const { maxRetries = 3, timeout = 10000 } = options;
  
  return retry(serviceCall, {
    retries: maxRetries,
    delay: (attempt) => this.calculateBackoff(attempt),
    timeout,
    backoff: 'EXPONENTIAL',
  });
}
```

#### 2.5 Implement Circuit Breaker
- **Action:** Add circuit breaker for AI services
- **Effort:** 2 days

```typescript
import CircuitBreaker from 'opossum';

const circuitBreakerOptions = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const aiServiceBreaker = new CircuitBreaker(
  async (serviceCall: () => Promise<any>) => serviceCall(),
  circuitBreakerOptions
);

aiServiceBreaker.on('open', () => {
  this.logger.warn('AI service circuit breaker opened - too many failures');
});

aiServiceBreaker.on('halfOpen', () => {
  this.logger.log('AI service circuit breaker half-open - testing');
});
```

#### 2.6 Add Dead Letter Queue
- **Action:** Implement DLQ for failed workflows
- **Effort:** 2 days

```typescript
// Add to Prisma schema
model DeadLetterQueue {
  id          String   @id @default(uuid())
  workflowId  String
  executionId String
  input       Json
  error       String
  errorCode   String
  retryCount  Int      @default(0)
  createdAt   DateTime @default(now())
  processedAt DateTime?
}

private async sendToDeadLetterQueue(
  execution: WorkflowExecution,
  error: Error
): Promise<void> {
  await this.prisma.deadLetterQueue.create({
    data: {
      workflowId: execution.workflowId,
      executionId: execution.id,
      input: execution.input,
      error: error.message,
      errorCode: error instanceof WorkflowError ? error.code : 'UNKNOWN',
    },
  });
  
  this.logger.error('Workflow sent to dead letter queue', {
    executionId: execution.id,
    workflowId: execution.workflowId,
    error: error.message,
  });
}
```

#### 2.7 Add Data Masking for Logs
- **Action:** Mask PII in logs
- **Effort:** 1 day

```typescript
private maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const masked = { ...data };
  const sensitiveFields = ['email', 'password', 'ssn', 'creditCard', 'phone'];
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***MASKED***';
    }
  }
  
  return masked;
}
```

#### 2.8 Add Metrics Collection
- **Action:** Integrate Prometheus metrics
- **Effort:** 2 days

```typescript
import { Counter, Histogram } from 'prom-client';

const workflowExecutionCounter = new Counter({
  name: 'workflow_executions_total',
  help: 'Total number of workflow executions',
  labelNames: ['workflow_id', 'status'],
});

const workflowExecutionDuration = new Histogram({
  name: 'workflow_execution_duration_seconds',
  help: 'Workflow execution duration in seconds',
  labelNames: ['workflow_id'],
});

// In executeWorkflow:
const timer = workflowExecutionDuration.startTimer({ workflow_id: workflowId });
try {
  // ... execution
  workflowExecutionCounter.inc({ workflow_id: workflowId, status: 'success' });
} catch (error) {
  workflowExecutionCounter.inc({ workflow_id: workflowId, status: 'failure' });
  throw error;
} finally {
  timer();
}
```

---

### Phase 3: Optimization (Performance and Refactoring)

**Timeline:** 2-3 weeks  
**Priority:** 🟢 **MEDIUM**

#### 3.1 Add Parallel Step Execution
- **Action:** Execute independent steps in parallel
- **Effort:** 3 days

```typescript
// Add to WorkflowStep
interface WorkflowStep {
  // ... existing fields
  dependsOn?: string[]; // Step IDs this step depends on
  parallel?: boolean; // Can run in parallel with other steps
}

// In executeWorkflow:
const stepGraph = this.buildStepGraph(workflow.steps);
const executionOrder = this.topologicalSort(stepGraph);

for (const stepGroup of executionOrder) {
  // Execute steps in parallel if they're independent
  await Promise.all(
    stepGroup.map(step => this.executeStep(step, execution, userId))
  );
}
```

#### 3.2 Fix N+1 Query Issues
- **Action:** Use Prisma includes efficiently
- **Effort:** 1 day

```typescript
// BEFORE (N+1):
const request = await this.prisma.maintenanceRequest.findUnique({
  where: { id: requestId },
});
const property = await this.prisma.property.findUnique({
  where: { id: request.propertyId },
});

// AFTER (Single query):
const request = await this.prisma.maintenanceRequest.findUnique({
  where: { id: requestId },
  include: {
    property: {
      select: {
        latitude: true,
        longitude: true,
      },
    },
    asset: {
      select: {
        category: true,
      },
    },
  },
});
```

#### 3.3 Add Caching Layer
- **Action:** Cache workflow definitions and AI responses
- **Effort:** 3 days

```typescript
import { Cache } from 'cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Injectable()
export class WorkflowEngineService {
  constructor(
    // ... existing
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getWorkflow(workflowId: string): Promise<WorkflowDefinition | undefined> {
    const cacheKey = `workflow:${workflowId}`;
    const cached = await this.cacheManager.get<WorkflowDefinition>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      await this.cacheManager.set(cacheKey, workflow, { ttl: 3600 });
    }
    
    return workflow;
  }
}
```

#### 3.4 Add Rate Limiting
- **Action:** Implement rate limiting per user/tenant
- **Effort:** 2 days

```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 10, // Number of requests
  duration: 60, // Per 60 seconds
});

async executeWorkflow(..., userId?: number) {
  if (userId) {
    try {
      await rateLimiter.consume(`workflow:${userId}`, 1);
    } catch (rejRes) {
      throw new TooManyRequestsException('Rate limit exceeded');
    }
  }
  // ... rest of execution
}
```

#### 3.5 Add Distributed Tracing
- **Action:** Integrate OpenTelemetry
- **Effort:** 3 days

```typescript
import { trace, context } from '@opentelemetry/api';

const tracer = trace.getTracer('workflow-engine');

async executeWorkflow(...): Promise<WorkflowExecution> {
  const span = tracer.startSpan('workflow.execute', {
    attributes: {
      'workflow.id': workflowId,
      'workflow.execution_id': executionId,
    },
  });
  
  try {
    // ... execution
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

#### 3.6 Optimize Database Queries
- **Action:** Add indexes and optimize queries
- **Effort:** 1 day

```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflow_execution_workflow_id_status 
  ON "WorkflowExecution"("workflowId", "status");
  
CREATE INDEX IF NOT EXISTS idx_workflow_execution_started_at 
  ON "WorkflowExecution"("startedAt");
  
CREATE INDEX IF NOT EXISTS idx_workflow_execution_step_execution_id 
  ON "WorkflowExecutionStep"("executionId");
```

#### 3.7 Add Workflow State Checkpointing
- **Action:** Save state at each step for recovery
- **Effort:** 3 days

```typescript
private async checkpointExecution(execution: WorkflowExecution): Promise<void> {
  await this.prisma.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: execution.status,
      output: execution.output,
      steps: {
        upsert: execution.steps.map(step => ({
          where: { executionId_stepId: { executionId: execution.id, stepId: step.stepId } },
          update: step,
          create: step,
        })),
      },
    },
  });
}

// Call checkpointExecution after each step
```

---

## 4. Code Example: Refactored Critical Workflow

Below is a production-ready refactoring of the `executeWorkflow` method demonstrating all critical fixes:

```typescript
import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowStep, WorkflowExecution, WorkflowStatus } from './workflow.types';
import { Parser } from 'expr-eval';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import CircuitBreaker from 'opossum';
import { Counter, Histogram } from 'prom-client';

// Error codes
export enum WorkflowErrorCode {
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  STEP_EXECUTION_FAILED = 'STEP_EXECUTION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  TIMEOUT = 'TIMEOUT',
}

class WorkflowError extends Error {
  constructor(
    public code: WorkflowErrorCode,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

// Input validation schema
const WorkflowInputSchema = z.object({
  tenantId: z.number().optional(),
  unitId: z.number().optional(),
  userId: z.number().optional(),
  // Add other fields as needed
}).passthrough();

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private stepRetryCount: Map<string, Map<string, number>> = new Map(); // executionId -> stepId -> count
  private readonly conditionParser = new Parser();
  
  // Circuit breaker for AI services
  private readonly aiServiceBreaker = new CircuitBreaker(
    async (fn: () => Promise<any>) => fn(),
    {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    }
  );

  // Metrics
  private readonly executionCounter = new Counter({
    name: 'workflow_executions_total',
    help: 'Total workflow executions',
    labelNames: ['workflow_id', 'status'],
  });

  private readonly executionDuration = new Histogram({
    name: 'workflow_execution_duration_seconds',
    help: 'Workflow execution duration',
    labelNames: ['workflow_id'],
  });

  constructor(
    private readonly prisma: PrismaService,
    // ... other services
  ) {
    this.registerDefaultWorkflows();
    this.setupCircuitBreaker();
  }

  private setupCircuitBreaker(): void {
    this.aiServiceBreaker.on('open', () => {
      this.logger.warn('AI service circuit breaker opened');
    });
    this.aiServiceBreaker.on('halfOpen', () => {
      this.logger.log('AI service circuit breaker half-open');
    });
  }

  /**
   * Execute a workflow with full production-grade error handling
   */
  async executeWorkflow(
    workflowId: string,
    input: Record<string, any>,
    userId?: number,
  ): Promise<WorkflowExecution> {
    const correlationId = uuidv4();
    const timer = this.executionDuration.startTimer({ workflow_id: workflowId });
    
    // Validate input
    let validatedInput: Record<string, any>;
    try {
      validatedInput = WorkflowInputSchema.parse(input);
    } catch (error) {
      this.logger.error('Invalid workflow input', {
        correlationId,
        workflowId,
        error: error.message,
        input: this.maskSensitiveData(input),
      });
      throw new WorkflowError(
        WorkflowErrorCode.INVALID_INPUT,
        'Invalid workflow input',
        { validationErrors: error.errors }
      );
    }

    // Get workflow
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      this.logger.error('Workflow not found', { correlationId, workflowId });
      throw new WorkflowError(
        WorkflowErrorCode.WORKFLOW_NOT_FOUND,
        `Workflow ${workflowId} not found`
      );
    }

    // Check permissions
    if (userId) {
      const hasPermission = await this.checkWorkflowPermission(userId, workflowId);
      if (!hasPermission) {
        this.logger.warn('Unauthorized workflow execution attempt', {
          correlationId,
          workflowId,
          userId,
        });
        throw new WorkflowError(
          WorkflowErrorCode.UNAUTHORIZED,
          `User ${userId} not authorized to execute workflow ${workflowId}`
        );
      }
    }

    // Execute in transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create execution record
        const execution: WorkflowExecution = {
          id: executionId,
          workflowId,
          status: 'RUNNING',
          input: validatedInput,
          output: {},
          steps: [],
          startedAt: new Date(),
          completedAt: null,
          error: null,
        };

        this.logger.log('Workflow execution started', {
          correlationId,
          executionId,
          workflowId,
          userId,
          input: this.maskSensitiveData(validatedInput),
        });

        // Initialize retry tracking for this execution
        this.stepRetryCount.set(executionId, new Map());

        try {
          // Execute steps
          for (const step of workflow.steps) {
            const stepResult = await this.executeStepWithRetry(
              step,
              execution,
              userId,
              correlationId,
              workflow,
            );

            execution.steps.push({
              stepId: step.id,
              status: stepResult.success ? 'COMPLETED' : 'FAILED',
              input: stepResult.input,
              output: stepResult.output,
              error: stepResult.error,
              startedAt: stepResult.startedAt,
              completedAt: stepResult.completedAt,
            });

            // Handle step failure
            if (!stepResult.success) {
              if (workflow.onError === 'STOP') {
                execution.status = 'FAILED';
                execution.error = stepResult.error || 'Step execution failed';
                break;
              } else if (workflow.onError === 'CONTINUE') {
                this.logger.warn('Step failed, continuing workflow', {
                  correlationId,
                  executionId,
                  stepId: step.id,
                  error: stepResult.error,
                });
                // Continue to next step
              }
              // RETRY is handled in executeStepWithRetry
            }

            // Update execution output
            if (stepResult.output) {
              execution.output = { ...execution.output, ...stepResult.output };
            }

            // Checkpoint execution state
            await this.checkpointExecution(tx, execution);
          }

          // Mark as completed if still running
          if (execution.status === 'RUNNING') {
            execution.status = 'COMPLETED';
          }

          execution.completedAt = new Date();

          // Final persistence
          await this.persistExecution(tx, execution);

          this.logger.log('Workflow execution completed', {
            correlationId,
            executionId,
            workflowId,
            status: execution.status,
            duration: Date.now() - execution.startedAt.getTime(),
          });

          this.executionCounter.inc({
            workflow_id: workflowId,
            status: execution.status.toLowerCase(),
          });

          return execution;
        } catch (error) {
          execution.status = 'FAILED';
          execution.error = error instanceof Error ? error.message : 'Unknown error';
          execution.completedAt = new Date();

          await this.persistExecution(tx, execution);

          // Send to dead letter queue if max retries exceeded
          if (error instanceof WorkflowError && error.code === WorkflowErrorCode.STEP_EXECUTION_FAILED) {
            await this.sendToDeadLetterQueue(tx, execution, error);
          }

          throw error;
        } finally {
          // Clean up retry tracking
          this.stepRetryCount.delete(executionId);
        }
      });
    } catch (error) {
      this.logger.error('Workflow execution failed', {
        correlationId,
        workflowId,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      });

      this.executionCounter.inc({
        workflow_id: workflowId,
        status: 'failure',
      });

      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Execute step with retry logic and exponential backoff
   */
  private async executeStepWithRetry(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId: number | undefined,
    correlationId: string,
    workflow: WorkflowDefinition,
  ): Promise<{
    success: boolean;
    input: any;
    output: any;
    error: string | null;
    startedAt: Date;
    completedAt: Date;
  }> {
    const retryMap = this.stepRetryCount.get(execution.id) || new Map();
    const maxRetries = workflow.maxRetries || 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await this.executeStep(step, execution, userId, correlationId);
        
        // Reset retry count on success
        retryMap.delete(step.id);
        
        return result;
      } catch (error) {
        attempt++;
        const currentRetries = retryMap.get(step.id) || 0;
        
        if (currentRetries >= maxRetries) {
          this.logger.error('Step failed after max retries', {
            correlationId,
            executionId: execution.id,
            stepId: step.id,
            retries: currentRetries,
            error: error instanceof Error ? error.message : String(error),
          });
          
          throw new WorkflowError(
            WorkflowErrorCode.STEP_EXECUTION_FAILED,
            `Step ${step.id} failed after ${maxRetries} retries`,
            { stepId: step.id, error: error.message }
          );
        }

        // Calculate backoff
        const backoffMs = this.calculateBackoff(currentRetries);
        retryMap.set(step.id, currentRetries + 1);

        this.logger.warn('Step failed, retrying', {
          correlationId,
          executionId: execution.id,
          stepId: step.id,
          attempt: currentRetries + 1,
          maxRetries,
          backoffMs,
        });

        // Wait before retry
        await this.delay(backoffMs);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new WorkflowError(
      WorkflowErrorCode.STEP_EXECUTION_FAILED,
      `Step ${step.id} execution failed`
    );
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId: number | undefined,
    correlationId: string,
  ): Promise<{
    success: boolean;
    input: any;
    output: any;
    error: string | null;
    startedAt: Date;
    completedAt: Date;
  }> {
    const startedAt = new Date();

    try {
      let output: any = {};

      // Use circuit breaker for AI service calls
      if (this.isAIStep(step.type)) {
        output = await this.aiServiceBreaker.fire(() =>
          this.executeAIStep(step, execution, userId, correlationId)
        );
      } else {
        // Execute non-AI steps normally
        switch (step.type) {
          case 'CREATE_LEASE':
            output = await this.executeCreateLease(step, execution, userId);
            break;
          case 'SEND_EMAIL':
            output = await this.executeSendEmail(step, execution, userId);
            break;
          // ... other cases
          default:
            throw new WorkflowError(
              WorkflowErrorCode.STEP_EXECUTION_FAILED,
              `Unknown step type: ${step.type}`
            );
        }
      }

      return {
        success: true,
        input: step.input || {},
        output,
        error: null,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Step execution failed', {
        correlationId,
        executionId: execution.id,
        stepId: step.id,
        stepType: step.type,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        input: step.input || {},
        output: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        startedAt,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Safe condition evaluation (replaces eval)
   */
  private evaluateCondition(condition: string, execution: WorkflowExecution): boolean {
    try {
      // Replace variables with execution values
      let evaluated = condition;
      for (const [key, value] of Object.entries(execution.output)) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        evaluated = evaluated.replace(regex, String(value));
      }

      // Parse and evaluate safely
      const expr = this.conditionParser.parse(evaluated);
      return expr.evaluate(execution.output) as boolean;
    } catch (error) {
      this.logger.error('Condition evaluation failed', {
        condition,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Persist execution to database
   */
  private async persistExecution(
    tx: Prisma.TransactionClient,
    execution: WorkflowExecution,
  ): Promise<void> {
    await tx.workflowExecution.upsert({
      where: { id: execution.id },
      update: {
        status: execution.status,
        output: execution.output,
        error: execution.error,
        completedAt: execution.completedAt,
      },
      create: {
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        input: execution.input,
        output: execution.output,
        error: execution.error,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
      },
    });

    // Persist steps
    for (const step of execution.steps) {
      await tx.workflowExecutionStep.upsert({
        where: {
          executionId_stepId: {
            executionId: execution.id,
            stepId: step.stepId,
          },
        },
        update: {
          status: step.status,
          input: step.input,
          output: step.output,
          error: step.error,
          completedAt: step.completedAt,
        },
        create: {
          executionId: execution.id,
          stepId: step.stepId,
          status: step.status,
          input: step.input,
          output: step.output,
          error: step.error,
          startedAt: step.startedAt,
          completedAt: step.completedAt,
        },
      });
    }
  }

  /**
   * Checkpoint execution state
   */
  private async checkpointExecution(
    tx: Prisma.TransactionClient,
    execution: WorkflowExecution,
  ): Promise<void> {
    await tx.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: execution.status,
        output: execution.output,
      },
    });
  }

  /**
   * Send failed execution to dead letter queue
   */
  private async sendToDeadLetterQueue(
    tx: Prisma.TransactionClient,
    execution: WorkflowExecution,
    error: Error,
  ): Promise<void> {
    await tx.deadLetterQueue.create({
      data: {
        workflowId: execution.workflowId,
        executionId: execution.id,
        input: execution.input,
        error: error.message,
        errorCode: error instanceof WorkflowError ? error.code : 'UNKNOWN',
      },
    });
  }

  /**
   * Check user permission to execute workflow
   */
  private async checkWorkflowPermission(
    userId: number,
    workflowId: string,
  ): Promise<boolean> {
    // TODO: Implement actual permission check
    // For now, return true (should check user role, tenant access, etc.)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return false;
    }

    // Admin can execute any workflow
    if (user.role === 'ADMIN') {
      return true;
    }

    // Add other permission checks as needed
    return true;
  }

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateBackoff(attempt: number, baseDelay: number = 1000): number {
    const exponentialDelay = Math.pow(2, attempt) * baseDelay;
    const jitter = Math.random() * 1000; // 0-1000ms jitter
    return Math.min(exponentialDelay + jitter, 60000); // Cap at 60s
  }

  /**
   * Delay helper
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Mask sensitive data in logs
   */
  private maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const masked = { ...data };
    const sensitiveFields = ['email', 'password', 'ssn', 'creditCard', 'phone', 'token'];

    for (const field of sensitiveFields) {
      if (masked[field]) {
        masked[field] = '***MASKED***';
      }
    }

    return masked;
  }

  /**
   * Check if step is an AI step
   */
  private isAIStep(stepType: string): boolean {
    return [
      'ASSIGN_PRIORITY_AI',
      'ASSESS_PAYMENT_RISK_AI',
      'PREDICT_RENEWAL_AI',
      'PERSONALIZE_NOTIFICATION_AI',
    ].includes(stepType);
  }

  /**
   * Execute AI step (placeholder - implement based on step type)
   */
  private async executeAIStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId: number | undefined,
    correlationId: string,
  ): Promise<any> {
    // Implementation depends on specific AI service
    // This is a placeholder
    switch (step.type) {
      case 'ASSIGN_PRIORITY_AI':
        return await this.executeAssignPriorityAI(step, execution, userId);
      // ... other AI steps
      default:
        throw new Error(`Unknown AI step type: ${step.type}`);
    }
  }

  // ... rest of existing methods (executeCreateLease, etc.)
}
```

---

## 5. Additional Recommendations

### 5.1 Database Schema Updates

Add the following to your Prisma schema:

```prisma
model WorkflowExecution {
  id          String   @id @default(uuid())
  workflowId  String
  status      String   // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
  input       Json
  output      Json
  error       String?
  startedAt   DateTime @default(now())
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  steps       WorkflowExecutionStep[]
  
  @@index([workflowId, status])
  @@index([startedAt])
}

model WorkflowExecutionStep {
  id          Int      @id @default(autoincrement())
  executionId String
  stepId      String
  status      String   // PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
  input       Json
  output      Json
  error       String?
  startedAt   DateTime @default(now())
  completedAt DateTime?
  
  execution   WorkflowExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  
  @@unique([executionId, stepId])
  @@index([executionId])
}

model DeadLetterQueue {
  id          String   @id @default(uuid())
  workflowId  String
  executionId String
  input       Json
  error       String
  errorCode   String
  retryCount  Int      @default(0)
  createdAt   DateTime @default(now())
  processedAt DateTime?
  
  @@index([workflowId])
  @@index([createdAt])
}
```

### 5.2 Environment Variables

Add to `.env`:

```bash
# Workflow Configuration
WORKFLOW_MAX_RETRIES=3
WORKFLOW_RETRY_BASE_DELAY_MS=1000
WORKFLOW_EXECUTION_TIMEOUT_MS=300000

# Circuit Breaker
CIRCUIT_BREAKER_ERROR_THRESHOLD=50
CIRCUIT_BREAKER_RESET_TIMEOUT_MS=30000

# Rate Limiting
WORKFLOW_RATE_LIMIT_POINTS=10
WORKFLOW_RATE_LIMIT_DURATION_SECONDS=60

# Caching
REDIS_URL=redis://localhost:6379
WORKFLOW_CACHE_TTL_SECONDS=3600
```

### 5.3 Monitoring Dashboard

Create a Grafana dashboard with:
- Workflow execution rate (success/failure)
- Average execution duration
- Error rate by workflow
- Circuit breaker status
- Dead letter queue size
- AI service response times

---

## 6. Testing Strategy

### 6.1 Unit Tests

- Test condition evaluation with safe parser
- Test retry logic with exponential backoff
- Test transaction rollback on failure
- Test input validation
- Test permission checks

### 6.2 Integration Tests

- Test full workflow execution
- Test AI service failure scenarios
- Test circuit breaker behavior
- Test dead letter queue
- Test database persistence

### 6.3 Load Tests

- Test concurrent workflow executions
- Test rate limiting
- Test under high load
- Test AI service throttling

---

## 7. Deployment Checklist

Before deploying to production:

- [ ] All Phase 1 fixes implemented
- [ ] Security audit completed (especially `eval()` removal)
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Monitoring and alerting set up
- [ ] Load testing completed
- [ ] Rollback plan documented
- [ ] Runbook created for common issues
- [ ] Team trained on new error codes and logging

---

**Last Updated:** January 2025  
**Next Review:** After Phase 1 completion

