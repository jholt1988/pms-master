/**
 * Circuit Breaker Interface
 * 
 * Defines the contract for circuit breaker implementations.
 * Follows the standard circuit breaker pattern: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 */

export enum CircuitBreakerState {
  /** Normal operation - requests pass through */
  CLOSED = 'CLOSED',
  /** Failure threshold exceeded - requests are blocked */
  OPEN = 'OPEN',
  /** Testing if service recovered - limited requests allowed */
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Unique identifier for this circuit (e.g., 'stripe', 'docusign', 'quickbooks') */
  name: string;
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Number of successes needed to close the circuit from HALF_OPEN */
  successThreshold?: number;
  /** Time in ms to wait before attempting recovery */
  timeout: number;
  /** Whether the circuit is monitoring (useful for toggle) */
  enabled?: boolean;
  /** Custom监控系统 for metrics */
  monitoringFn?: (state: CircuitBreakerState, failureCount: number) => void;
  /** Optional fallback function */
  fallbackFn?: () => Promise<unknown>;
}

export interface CircuitBreakerStatus {
  name: string;
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  nextAttemptTime: Date | null;
}

export interface ICircuitBreaker {
  /** Get unique name of this circuit */
  readonly name: string;
  
  /** Get current state */
  readonly state: CircuitBreakerState;
  
  /** Execute an operation with circuit breaker protection */
  execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>;
  
  /** Record a successful call */
  recordSuccess(): void;
  
  /** Record a failed call */
  recordFailure(): void;
  
  /** Get current status */
  getStatus(): CircuitBreakerStatus;
  
  /** Reset the circuit to CLOSED state */
  reset(): void;
  
  /** Manually open the circuit */
  open(): void;
  
  /** Manually close the circuit */
  close(): void;
}