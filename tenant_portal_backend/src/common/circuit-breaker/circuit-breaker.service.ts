import { Injectable, Logger } from '@nestjs/common';
import {
  CircuitBreakerOptions,
  CircuitBreakerState,
  CircuitBreakerStatus,
  ICircuitBreaker,
} from './circuit-breaker.interface';

/**
 * Circuit Breaker Service
 * 
 * Implements the circuit breaker pattern to prevent cascading failures
 * when external services (Stripe, DocuSign, QuickBooks) are unavailable.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests are rejected immediately
 * - HALF_OPEN: Testing recovery, limited requests allowed
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  
  /** Individual circuit breakers keyed by name */
  private readonly circuits: Map<string, CircuitBreaker> = new Map();
  
  /** Global configuration defaults */
  private readonly defaultOptions: Partial<CircuitBreakerOptions> = {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000, // 30 seconds
    enabled: true,
  };

  /**
   * Get or create a circuit breaker by name
   */
  getOrCreate(options: CircuitBreakerOptions): CircuitBreaker {
    const name = options.name;
    
    if (!this.circuits.has(name)) {
      const circuit = new CircuitBreaker({
        ...this.defaultOptions,
        ...options,
      });
      this.circuits.set(name, circuit);
      this.logger.log(`Created circuit breaker: ${name}`);
    }
    
    return this.circuits.get(name)!;
  }

  /**
   * Get all circuit statuses
   */
  getAllStatuses(): CircuitBreakerStatus[] {
    return Array.from(this.circuits.values()).map(circuit => circuit.getStatus());
  }

  /**
   * Get specific circuit by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.circuits.get(name);
  }

  /**
   * Check if any circuit is open
   */
  areAnyOpen(): boolean {
    return Array.from(this.circuits.values()).some(c => c.state === CircuitBreakerState.OPEN);
  }

  /**
   * Get summary of all circuits
   */
  getSummary(): Record<string, { state: CircuitBreakerState; failures: number }> {
    const summary: Record<string, { state: CircuitBreakerState; failures: number }> = {};
    
    this.circuits.forEach((circuit, name) => {
      const status = circuit.getStatus();
      summary[name] = {
        state: status.state,
        failures: status.failureCount,
      };
    });
    
    return summary;
  }
}

/**
 * Individual Circuit Breaker Instance
 */
class CircuitBreaker implements ICircuitBreaker {
  public readonly name: string;
  public state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private readonly logger: Logger;
  
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private nextAttemptTime: Date | null = null;
  
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly enabled: boolean;
  private readonly monitoringFn?: (state: CircuitBreakerState, failureCount: number) => void;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.logger = new Logger(`CircuitBreaker:${options.name}`);
    this.failureThreshold = options.failureThreshold;
    this.successThreshold = options.successThreshold ?? 3;
    this.timeout = options.timeout;
    this.enabled = options.enabled ?? true;
    this.monitoringFn = options.monitoringFn;
  }

  /**
   * Execute an operation with circuit breaker protection
   * @param operation The async function to execute
   * @param fallback Optional fallback function if circuit is open
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled) {
      return operation();
    }

    // Check if we should attempt to close the circuit (recovery)
    if (this.state === CircuitBreakerState.OPEN && this.shouldAttemptRecovery()) {
      this.transitionTo(CircuitBreakerState.HALF_OPEN);
    }

    // If circuit is open, reject immediately with fallback
    if (this.state === CircuitBreakerState.OPEN) {
      if (fallback) {
        return fallback();
      }
      throw new CircuitOpenError(this.name);
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    this.lastSuccessTime = new Date();

    // In HALF_OPEN state, transition to CLOSED after success threshold
    if (this.state === CircuitBreakerState.HALF_OPEN && this.successCount >= this.successThreshold) {
      this.transitionTo(CircuitBreakerState.CLOSED);
    }

    this.monitoringFn?.(this.state, this.failureCount);
  }

  /**
   * Record a failed call
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.successCount = 0;

    // Open the circuit if failure threshold reached
    if (this.state === CircuitBreakerState.CLOSED && this.failureCount >= this.failureThreshold) {
      this.transitionTo(CircuitBreakerState.OPEN);
    }
    
    // In HALF_OPEN state, any failure goes back to OPEN
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionTo(CircuitBreakerState.OPEN);
    }

    this.monitoringFn?.(this.state, this.failureCount);
  }

  /**
   * Get current status
   */
  getStatus(): CircuitBreakerStatus {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Reset the circuit to CLOSED state
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = null;
    this.logger.log(`Circuit ${this.name} has been reset`);
  }

  /**
   * Manually open the circuit
   */
  open(): void {
    this.transitionTo(CircuitBreakerState.OPEN);
  }

  /**
   * Manually close the circuit
   */
  close(): void {
    this.reset();
  }

  /**
   * Check if enough time has passed to attempt recovery
   */
  private shouldAttemptRecovery(): boolean {
    if (!this.nextAttemptTime) return true;
    return new Date() >= this.nextAttemptTime;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;

    // Set next attempt time when opening
    if (newState === CircuitBreakerState.OPEN) {
      this.nextAttemptTime = new Date(Date.now() + this.timeout);
    } else {
      this.nextAttemptTime = null;
    }

    // Reset counters for HALF_OPEN state
    if (newState === CircuitBreakerState.HALF_OPEN) {
      this.successCount = 0;
    }

    this.logger.log(
      `Circuit ${this.name} state transition: ${oldState} -> ${newState}`,
    );
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(circuitName: string) {
    super(`Circuit breaker '${circuitName}' is open - service unavailable`);
    this.name = 'CircuitOpenError';
  }
}