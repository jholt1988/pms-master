import { Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import { WorkflowError, WorkflowErrorCode } from './workflow.errors';

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  timeout?: number; // Timeout in milliseconds
  errorThresholdPercentage?: number; // Percentage of errors before opening
  resetTimeout?: number; // Time before attempting to close
  rollingCountTimeout?: number; // Time window for error counting
  rollingCountBuckets?: number; // Number of buckets in rolling window
}

/**
 * Retry options
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number; // Base delay in milliseconds
  maxDelay?: number; // Maximum delay in milliseconds
  timeout?: number; // Timeout per attempt
}

/**
 * Global circuit breaker instances for AI services
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a service
 */
function getCircuitBreaker(
  serviceName: string,
  options: CircuitBreakerOptions = {},
): CircuitBreaker {
  if (circuitBreakers.has(serviceName)) {
    return circuitBreakers.get(serviceName)!;
  }

  const breakerOptions = {
    timeout: options.timeout || 10000, // 10 seconds default
    errorThresholdPercentage: options.errorThresholdPercentage || 50,
    resetTimeout: options.resetTimeout || 30000, // 30 seconds
    rollingCountTimeout: options.rollingCountTimeout || 60000, // 1 minute
    rollingCountBuckets: options.rollingCountBuckets || 10,
  };

  const breaker = new CircuitBreaker(
    async (fn: () => Promise<any>) => fn(),
    breakerOptions,
  );

  circuitBreakers.set(serviceName, breaker);
  return breaker;
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = Math.pow(2, attempt) * baseDelay;
  const jitter = Math.random() * 1000; // 0-1000ms jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a timeout promise that rejects after specified time
 */
function createTimeout(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new WorkflowError(WorkflowErrorCode.TIMEOUT, `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Call AI service with retry, timeout, and circuit breaker
 */
export async function callAIServiceWithRetry<T>(
  serviceName: string,
  methodName: string,
  serviceCall: () => Promise<T>,
  logger: Logger,
  options: {
    retry?: RetryOptions;
    circuitBreaker?: CircuitBreakerOptions;
    correlationId?: string;
  } = {},
): Promise<T> {
  const {
    retry = { maxRetries: 3, baseDelay: 1000, maxDelay: 60000, timeout: 10000 },
    circuitBreaker = {},
    correlationId,
  } = options;

  const breaker = getCircuitBreaker(serviceName, circuitBreaker);
  const startTime = Date.now();

  // Setup circuit breaker event handlers (only once per service)
  if (!circuitBreakers.has(serviceName)) {
    breaker.on('open', () => {
      logger.warn('AI service circuit breaker opened', {
        service: serviceName,
        correlationId,
      });
    });

    breaker.on('halfOpen', () => {
      logger.log('AI service circuit breaker half-open', {
        service: serviceName,
        correlationId,
      });
    });

    breaker.on('close', () => {
      logger.log('AI service circuit breaker closed', {
        service: serviceName,
        correlationId,
      });
    });
  }

  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt <= (retry.maxRetries || 3)) {
    try {
      // Use circuit breaker
      const result = await breaker.fire(async () => {
        // Add timeout
        if (retry.timeout) {
          return Promise.race([
            serviceCall(),
            createTimeout(retry.timeout),
          ]);
        }
        return serviceCall();
      });

      const duration = Date.now() - startTime;

      if (attempt > 0) {
        logger.log('AI service call succeeded after retry', {
          service: serviceName,
          method: methodName,
          attempt: attempt + 1,
          duration,
          correlationId,
        });
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;

      // Check if error is retryable
      const isRetryable = isRetryableError(error);
      if (!isRetryable || attempt > (retry.maxRetries || 3)) {
        const duration = Date.now() - startTime;
        logger.error('AI service call failed', {
          service: serviceName,
          method: methodName,
          attempt,
          maxRetries: retry.maxRetries || 3,
          duration,
          error: lastError.message,
          errorType: lastError.constructor.name,
          correlationId,
        });
        throw lastError;
      }

      // Calculate backoff
      const backoffMs = calculateBackoff(
        attempt - 1,
        retry.baseDelay || 1000,
        retry.maxDelay || 60000,
      );

      logger.warn('AI service call failed, retrying', {
        service: serviceName,
        method: methodName,
        attempt,
        maxRetries: retry.maxRetries || 3,
        backoffMs,
        error: lastError.message,
        correlationId,
      });

      // Wait before retry
      await delay(backoffMs);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('AI service call failed');
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Don't retry on timeout errors (already retried)
  if (error instanceof WorkflowError && error.code === WorkflowErrorCode.TIMEOUT) {
    return false;
  }

  // Don't retry on validation errors
  if (error instanceof WorkflowError && error.code === WorkflowErrorCode.INVALID_INPUT) {
    return false;
  }

  // Don't retry on unauthorized errors
  if (error instanceof WorkflowError && error.code === WorkflowErrorCode.UNAUTHORIZED) {
    return false;
  }

  // Retry on network errors, rate limits, and server errors
  const retryableErrorMessages = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'rate limit',
    'too many requests',
    '503',
    '502',
    '500',
  ];

  const errorMessage = error?.message?.toLowerCase() || '';
  return retryableErrorMessages.some((msg) => errorMessage.includes(msg));
}

/**
 * Get circuit breaker stats for a service
 */
export function getCircuitBreakerStats(serviceName: string): {
  isOpen: boolean;
  isHalfOpen: boolean;
  isClosed: boolean;
  failures: number;
  fires: number;
  cacheHits: number;
  cacheMisses: number;
} | null {
  const breaker = circuitBreakers.get(serviceName);
  if (!breaker) {
    return null;
  }

  return {
    isOpen: breaker.isOpen,
    isHalfOpen: breaker.isHalfOpen,
    isClosed: !breaker.isOpen && !breaker.isHalfOpen,
    failures: breaker.stats.failures,
    fires: breaker.stats.fires,
    cacheHits: breaker.stats.cacheHits,
    cacheMisses: breaker.stats.cacheMisses,
  };
}

/**
 * Get all circuit breaker stats
 */
export function getAllCircuitBreakerStats(): Record<string, ReturnType<typeof getCircuitBreakerStats>> {
  const stats: Record<string, ReturnType<typeof getCircuitBreakerStats>> = {};
  for (const serviceName of circuitBreakers.keys()) {
    stats[serviceName] = getCircuitBreakerStats(serviceName);
  }
  return stats;
}

