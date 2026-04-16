import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { CircuitBreakerService } from './circuit-breaker.service';
import { CIRCUIT_BREAKER_KEY, CircuitBreakerMetadata } from './circuit-breaker.decorator';
import { Reflector } from '@nestjs/core';

/**
 * Circuit Breaker Interceptor
 * 
 * NestJS interceptor that wraps controller method executions
 * with circuit breaker protection based on metadata.
 * 
 * @example
 * ```typescript
 * @UseInterceptors(CircuitBreakerInterceptor)
 * @CircuitBreaker({ name: 'stripe', failureThreshold: 5, timeout: 30000 })
 * async createPayment(@Body() dto: CreatePaymentDto) {
 *   return this.stripeService.createPayment(dto);
 * }
 * ```
 */
@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CircuitBreakerInterceptor.name);

  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const metadata: CircuitBreakerMetadata | undefined = this.reflector.get(
      CIRCUIT_BREAKER_KEY,
      handler,
    );

    if (!metadata) {
      return next.handle();
    }

    const { name } = metadata;
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    this.logger.debug(`Circuit breaker [${name}] - ${method} ${url}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const circuit = this.circuitBreakerService.get(name);
          if (circuit) {
            circuit.recordSuccess();
          }
        },
      }),
      catchError((error) => {
        const circuit = this.circuitBreakerService.get(name);
        if (circuit) {
          circuit.recordFailure();
          const status = circuit.getStatus();
          this.logger.warn(
            `Circuit breaker [${name}] recorded failure. State: ${status.state}, Failures: ${status.failureCount}`,
          );
        }
        return throwError(() => error);
      }),
    );
  }
}