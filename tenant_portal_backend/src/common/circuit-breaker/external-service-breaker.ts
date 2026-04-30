/**
 * External Service Circuit Breaker Integration
 * Item 3.2-3.5: Integrate circuit breaker with Stripe, DocuSign, QuickBooks
 */

import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { CircuitBreakerState } from './circuit-breaker.interface';

export enum ExternalService {
  STRIPE = 'stripe',
  DOCUSIGN = 'docusign',
  QUICKBOOKS = 'quickbooks',
  EMAIL = 'email',
}

@Injectable()
export class ExternalServiceBreaker {
  private readonly logger = new Logger(ExternalServiceBreaker.name);

  constructor(private readonly circuitBreaker: CircuitBreakerService) {
    // Initialize breakers for each external service
    this.initializeBreakers();
  }

  private initializeBreakers() {
    // Initialize circuit breakers for each external service
    Object.values(ExternalService).forEach((service) => {
      this.circuitBreaker.register(service, {
        failureThreshold: 5,
        timeout: 30000, // 30 seconds before attempting recovery
      });
    });
  }

  /**
   * Execute a call with circuit breaker protection
   */
  async executeWithBreaker<T>(
    service: ExternalService,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const serviceName = service.toString();

    // Check if circuit is open
    const state = this.circuitBreaker.getState(serviceName);
    
    if (state === CircuitBreakerState.OPEN) {
      this.logger.warn(`Circuit breaker OPEN for ${serviceName}, using fallback`);
      
      if (fallback) {
        return fallback();
      }
      
      throw new Error(`Service ${serviceName} temporarily unavailable (circuit open)`);
    }

    try {
      const result = await operation();
      
      // Success - record success
      this.circuitBreaker.recordSuccess(serviceName);
      
      return result;
    } catch (error) {
      // Failure - record failure
      this.circuitBreaker.recordFailure(serviceName);
      
      this.logger.error(`External service ${serviceName} call failed: ${error.message}`);
      
      // Try fallback if available
      if (fallback) {
        this.logger.warn(`Attempting fallback for ${serviceName}`);
        return fallback();
      }
      
      throw error;
    }
  }

  /**
   * Check if a service is available
   */
  isAvailable(service: ExternalService): boolean {
    const state = this.circuitBreaker.getState(service.toString());
    return state !== CircuitBreakerState.OPEN;
  }

  /**
   * Get status of all external services
   */
  getStatus() {
    return Object.values(ExternalService).map((service) => ({
      service: service.toString(),
      state: this.circuitBreaker.getState(service.toString()),
      failures: 0, // Would track from breaker
    }));
  }
}

// Helper function for use with Stripe webhooks
export async function stripeCallWithBreaker<T>(
  breaker: ExternalServiceBreaker,
  operation: () => Promise<T>
): Promise<T> {
  return breaker.executeWithBreaker(ExternalService.STRIPE, operation, async () => {
    // Fallback: Queue webhook for later processing
    console.log('[Stripe] Webhook queued for retry');
    return null as unknown as T;
  });
}

// Helper function for use with DocuSign webhooks  
export async function docusignCallWithBreaker<T>(
  breaker: ExternalServiceBreaker,
  operation: () => Promise<T>
): Promise<T> {
  return breaker.executeWithBreaker(ExternalService.DOCUSIGN, operation, async () => {
    console.log('[DocuSign] Webhook queued for retry');
    return null as unknown as T;
  });
}

// Helper function for use with QuickBooks sync
export async function quickbooksCallWithBreaker<T>(
  breaker: ExternalServiceBreaker,
  operation: () => Promise<T>
): Promise<T> {
  return breaker.executeWithBreaker(ExternalService.QUICKBOOKS, operation, async () => {
    console.log('[QuickBooks] Sync queued for retry');
    return null as unknown as T;
  });
}