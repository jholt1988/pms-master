import { Module, Global } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { ExternalServiceBreaker } from './external-service-breaker';

/**
 * Circuit Breaker Module
 * 
 * Provides circuit breaker functionality for external API calls.
 * Use @Global() to make it available across all modules without explicit imports.
 * 
 * @example
 * ```typescript
 * // In app.module.ts imports
 * CircuitBreakerModule,
 * ```
 */
@Global()
@Module({
  providers: [CircuitBreakerService, ExternalServiceBreaker],
  exports: [CircuitBreakerService, ExternalServiceBreaker],
})
export class CircuitBreakerModule {}