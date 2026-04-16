# Circuit Breaker Integration Guide

## Overview

This document outlines integration patterns for adding circuit breaker protection to external API services (Stripe, DocuSign, QuickBooks) in the tenant_portal_backend.

## Implementation Approach

### 1. Module Registration

Add `CircuitBreakerModule` to `app.module.ts`:

```typescript
import { CircuitBreakerModule } from './common/circuit-breaker';

@Module({
  imports: [
    // ... other modules
    CircuitBreakerModule, // Add this - it's @Global()
  ],
})
export class AppModule {}
```

### 2. Service Integration Pattern

For each external API service, inject the `CircuitBreakerService` and wrap API calls:

```typescript
@Injectable()
export class ExternalApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    // Initialize circuit breaker
    this.circuitBreaker.getOrCreate({
      name: 'external-api-name',
      failureThreshold: 5,       // Open after 5 failures
      successThreshold: 3,       // Close after 3 successes in HALF_OPEN
      timeout: 30000,            // Try recovery after 30 seconds
    });
  }

  async externalApiCall(data: ApiData): Promise<ApiResult> {
    const circuit = this.circuitBreaker.get('external-api-name');
    
    return circuit.execute(
      // Primary: actual API call
      () => this.makeApiCall(data),
      
      // Fallback: graceful degradation
      () => this.getFallbackData(data),
    );
  }
}
```

---

## Integration Plans by Service

### Stripe Service (`/payments/stripe.service.ts`)

**Current State:**
- Uses Stripe SDK directly with retry logic handled by SDK
- Has mock implementation for development (`isStripeDisabled`)
- Uses `STRIPE_SECRET_KEY` for authentication

**Integration Points:**
```typescript
// In stripe.service.ts constructor:
this.circuitBreaker.getOrCreate({
  name: 'stripe',
  failureThreshold: 5,
  timeout: 30000,
  monitoringFn: (state, failures) => {
    if (state === CircuitBreakerState.OPEN) {
      this.logger.error(`Stripe circuit OPEN after ${failures} failures`);
      // Could send alert notification here
    }
  },
});
```

**Protected Methods:**
- `createCustomer()` - API call to create Stripe customer
- `createPaymentIntent()` - Payment processing
- `createCheckoutSession()` - Payment session creation
- `createConnectedAccount()` - Marketplace accounts
- `createWebhook()` - Webhook registration
- Any method making Stripe API calls

**Fallback Strategy:**
- Use mock customer IDs for customer creation
- Return mock payment results
- Log warnings but don't block operations

**Configuration Options:**
```typescript
{
  name: 'stripe',
  failureThreshold: 5,    // Stripe has 429 handling, but this catches prolonged outages
  successThreshold: 3,
  timeout: 30000,         // 30s timeout for half-open test
}
```

---

### DocuSign Service (`/esignature/esignature.service.ts`)

**Current State:**
- Uses axios HTTP client with OAuth/JWT authentication
- Has token refresh mechanism
- Uses `docusign-esign` SDK for envelope operations

**Integration Points:**
```typescript
// In esignature.service.ts:
this.circuitBreaker.getOrCreate({
  name: 'docusign',
  failureThreshold: 3,     // Lower threshold - DocuSign is critical
  timeout: 60000,          // Longer timeout for DocuSign API
  monitoringFn: (state, failures) => {
    if (state === CircuitBreakerState.OPEN) {
      this.logger.error(`DocuSign circuit OPEN`);
    }
  },
});
```

**Protected Methods:**
- `createEnvelope()` - Create and send signing envelope
- `getEnvelopeStatus()` - Check envelope status
- `downloadDocument()` - Get signed documents
- Any method making DocuSign API calls

**Fallback Strategy:**
- Return cached envelope status if available
- Queue envelopes for retry
- Return mock envelope IDs for development

**Configuration Options:**
```typescript
{
  name: 'docusign',
  failureThreshold: 3,     // Lower - document signing is critical path
  successThreshold: 2,
  timeout: 60000,          // 60s - DocuSign envelopes can take time
}
```

---

### QuickBooks Service (`/quickbooks/quickbooks.service.ts`)

**Current State:**
- Uses node-quickbooks SDK with OAuth
- Has token refresh handled by OAuthClient
- Connection stored in database (`quickBooksConnection`)

**Integration Points:**
```typescript
// In quickbooks.service.ts:
this.circuitBreaker.getOrCreate({
  name: 'quickbooks',
  failureThreshold: 5,
  timeout: 30000,
  monitoringFn: (state, failures) => {
    if (state === CircuitBreakerState.OPEN) {
      this.logger.error(`QuickBooks circuit OPEN after ${failures} failures`);
    }
  },
});
```

**Protected Methods:**
- `handleOAuthCallback()` - OAuth flow completion
- `query()` - QuickBooks query operations
- `create()` - Create entities in QuickBooks
- `update()` - Update entities in QuickBooks
- `syncData()` - Full sync operations

**Fallback Strategy:**
- Return cached data
- Queue sync operations for later
- Mark QuickBooks as "disconnected" temporarily

**Configuration Options:**
```typescript
{
  name: 'quickbooks',
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
}
```

---

## Health Check Integration

Add circuit breaker status to the health check endpoint for monitoring:

```typescript
// In health/health.controller.ts or health.service.ts
@Get('circuit-breakers')
getCircuitBreakerStatus() {
  return this.circuitBreakerService.getAllStatuses();
}
```

Returns:
```json
[
  {
    "name": "stripe",
    "state": "CLOSED",
    "failureCount": 0,
    "successCount": 10,
    "lastFailureTime": null,
    "lastSuccessTime": "2024-01-15T10:30:00Z"
  }
]
```

---

## Alerting Recommendations

When circuit opens, consider:
1. **Logging:** Already integrated with monitoringFn
2. **Metrics:** Publish to Prometheus/Datadog with circuit state
3. **Notifications:** Send to Slack/email for OPEN -> HALF_OPEN transitions

---

## Testing

Add unit tests for circuit breaker behavior in each service:

```typescript
describe('StripeService with CircuitBreaker', () => {
  it('should use fallback when circuit is open', async () => {
    // Open the circuit
    circuitBreaker.get('stripe').open();
    
    // Should return fallback
    const result = await service.createCustomer(dto);
    expect(result).toEqual(mockFallbackResult);
  });
  
  it('should record failures', async () => {
    const circuit = circuitBreaker.get('stripe');
    circuit.close();
    
    try {
      await service.createCustomer(dto); // Will fail
    } catch {}
    
    expect(circuit.getStatus().failureCount).toBe(1);
  });
});
```

---

## Migration Checklist

- [ ] Add `CircuitBreakerModule` to `app.module.ts`
- [ ] Inject `CircuitBreakerService` in each external API service
- [ ] Initialize circuit breakers for each service
- [ ] Wrap API calls with `circuit.execute(primary, fallback)`
- [ ] Implement meaningful fallback methods
- [ ] Add health check endpoint for monitoring
- [ ] Add unit tests for circuit breaker behavior
- [ ] Configure monitoring/alerts for circuit state changes