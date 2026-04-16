import { SetMetadata } from '@nestjs/common';
import { CircuitBreakerOptions } from './circuit-breaker.interface';

/**
 * Metadata key for circuit breaker configuration
 */
export const CIRCUIT_BREAKER_KEY = 'circuit_breaker';

/**
 * Metadata interface for decorator storage
 */
export interface CircuitBreakerMetadata {
  name: string;
  fallback?: string;
}

/**
 * Decorator to mark methods for circuit breaker protection
 * 
 * @param options - Circuit breaker configuration options
 * 
 * @example
 * ```typescript
 * @CircuitBreaker({ name: 'stripe', failureThreshold: 3, timeout: 10000 })
 * async createPayment(dto: CreatePaymentDto) {
 *   // Stripe API call
 * }
 * ```
 */
export function CircuitBreaker(options: CircuitBreakerOptions) {
  return SetMetadata(CIRCUIT_BREAKER_KEY, {
    name: options.name,
    fallback: options.fallbackFn?.name,
  } as CircuitBreakerMetadata);
}

/**
 * Decorator to specify a fallback method name
 */
export function CircuitBreakerFallback(fallbackMethodName: string) {
  return SetMetadata(`${CIRCUIT_BREAKER_KEY}_fallback`, fallbackMethodName);
}