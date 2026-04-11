import { Injectable, Logger } from '@nestjs/common';
import * as CircuitBreaker from 'opossum';

interface AICallResult<T> {
  result: T;
  source: 'ai' | 'fallback';
  latencyMs: number;
  serviceName: string;
}

interface CircuitBreakerConfig {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
}

@Injectable()
export class AIServiceGateway {
  private readonly logger = new Logger(AIServiceGateway.name);
  private readonly breakers = new Map<string, CircuitBreaker>();
  private readonly metrics: { total: number; success: number; fallback: number; errors: number } = {
    total: 0,
    success: 0,
    fallback: 0,
    errors: 0,
  };

  async invoke<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback: () => T,
    config?: CircuitBreakerConfig,
  ): Promise<AICallResult<T>> {
    this.metrics.total++;
    const start = Date.now();
    const breaker = this.getOrCreateBreaker(serviceName, operation, config);

    try {
      const result = await breaker.fire() as T;
      const latencyMs = Date.now() - start;
      this.metrics.success++;
      this.logger.debug(`${serviceName}: AI call succeeded in ${latencyMs}ms`);
      return { result, source: 'ai', latencyMs, serviceName };
    } catch (error) {
      const latencyMs = Date.now() - start;
      this.metrics.fallback++;
      this.logger.warn(
        `${serviceName}: AI call failed after ${latencyMs}ms, using fallback. Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { result: fallback(), source: 'fallback', latencyMs, serviceName };
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  private getOrCreateBreaker(
    name: string,
    operation: () => Promise<any>,
    config?: CircuitBreakerConfig,
  ): CircuitBreaker {
    const key = name;
    if (!this.breakers.has(key)) {
      const breaker = new CircuitBreaker(operation, {
        timeout: config?.timeout ?? 10000,
        errorThresholdPercentage: config?.errorThresholdPercentage ?? 50,
        resetTimeout: config?.resetTimeout ?? 30000,
        volumeThreshold: config?.volumeThreshold ?? 5,
        name,
      });

      breaker.on('open', () => this.logger.warn(`Circuit OPEN for ${name}`));
      breaker.on('halfOpen', () => this.logger.log(`Circuit HALF-OPEN for ${name}`));
      breaker.on('close', () => this.logger.log(`Circuit CLOSED for ${name}`));

      this.breakers.set(key, breaker);
      return breaker;
    }

    const existing = this.breakers.get(key)!;
    (existing as any).action = operation;
    return existing;
  }
}
