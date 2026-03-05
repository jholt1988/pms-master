# Step 3 Scaffold: Payment AI Strategy + Guardrails

This change adds a non-breaking integration scaffold for future `AIPaymentService` refactors.

## Added files

- `src/payments/ai/payment-strategy.types.ts`
  - Shared interfaces for:
    - `PaymentRiskStrategy`
    - `PaymentReminderStrategy`
    - normalized result payloads
- `src/payments/ai/payment-strategy.registry.ts`
  - `PaymentStrategyRegistry` Nest provider
  - Register/get/list hooks for risk + reminder strategies
- `src/payments/ai/guardrail-policy.ts`
  - `AIPaymentGuardrailPolicy` skeleton
  - Default policy is intentionally **allow-all** to avoid behavior changes
- `src/payments/ai/index.ts`
  - Barrel exports for AI payment scaffold pieces

## Minimal integration done

1. `PaymentsModule` now provides/exports `PaymentStrategyRegistry`.
2. `AIPaymentService` now uses shared strategy result types from `src/payments/ai/*`.
3. `AIPaymentService.generatePersonalizedMessage()` now runs through `defaultAIPaymentGuardrailPolicy` before calling OpenAI.
   - Current policy allows all requests, so behavior is unchanged.
   - If future policy blocks, service gracefully falls back to base reminder message.

## Why this is safe

- No existing endpoint contracts changed.
- No database schema changes.
- No runtime feature flags changed.
- Guardrail policy default is non-blocking.

## Suggested next step

Implement concrete strategy classes (heuristic vs LLM-backed) and register them through `PaymentStrategyRegistry`, then choose active strategy by config/tenant policy.
