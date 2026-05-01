import { CircuitBreakerService } from './circuit-breaker.service';
import { CircuitBreakerState } from './circuit-breaker.interface';
import { ExternalService, ExternalServiceBreaker } from './external-service-breaker';

describe('CircuitBreakerService compatibility API', () => {
  it('registers circuits and opens after the configured failure threshold', async () => {
    const service = new CircuitBreakerService();
    service.register('stripe', { failureThreshold: 2, timeout: 30_000 });

    expect(service.getState('stripe')).toBe(CircuitBreakerState.CLOSED);

    service.recordFailure('stripe');
    expect(service.getState('stripe')).toBe(CircuitBreakerState.CLOSED);

    service.recordFailure('stripe');
    expect(service.getState('stripe')).toBe(CircuitBreakerState.OPEN);
    expect(service.areAnyOpen()).toBe(true);
  });

  it('uses fallback instead of the primary operation when an external service circuit is open', async () => {
    const service = new CircuitBreakerService();
    const breaker = new ExternalServiceBreaker(service);

    for (let i = 0; i < 5; i++) {
      service.recordFailure(ExternalService.STRIPE);
    }

    await expect(
      breaker.executeWithBreaker(
        ExternalService.STRIPE,
        jest.fn().mockRejectedValue(new Error('should not be called')),
        jest.fn().mockResolvedValue('queued'),
      ),
    ).resolves.toBe('queued');
  });
});
