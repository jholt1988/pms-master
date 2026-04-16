/**
 * Circuit Breaker Module
 * 
 * Provides fault tolerance for external API calls using the circuit breaker pattern.
 * Protects against cascading failures when services like Stripe, DocuSign, or QuickBooks are unavailable.
 * 
 * @example
 * ```typescript
 * // 1. Add module to app.module.ts
 * import { CircuitBreakerModule } from './common/circuit-breaker';
 * 
 * @Module({
 *   imports: [CircuitBreakerModule],
 *   // ...
 * })
 * export class AppModule {}
 * 
 * // 2. Use in services:
 * import { CircuitBreakerService } from './common/circuit-breaker';
 * 
 * @Injectable()
 * export class StripeService {
 *   constructor(private readonly cb: CircuitBreakerService) {}
 * 
 *   async createCustomer(dto: CreateCustomerDto) {
 *     const circuit = this.cb.getOrCreate({
 *       name: 'stripe',
 *       failureThreshold: 5,
 *       timeout: 30000,
 *     });
 * 
 *     return circuit.execute(
 *       () => this.stripe.customers.create({ ... }),
 *       () => this.createMockCustomer(dto), // fallback
 *     );
 *   }
 * }
 * ```
 */

export * from './circuit-breaker.interface';
export * from './circuit-breaker.service';
export * from './circuit-breaker.decorator';
export * from './circuit-breaker.interceptor';
export * from './circuit-breaker.module';