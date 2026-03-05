# PR3 Payment Scaffold Hardening Summary

## Scope completed
Implemented PR3 in `tenant_portal_backend` to finalize the payment strategy scaffold integration with baseline **hard guardrails** while preserving non-breaking behavior and rule-first defaults.

## What was implemented

### 1) Guardrail policy upgraded from skeleton to rule-first baseline
**File:** `tenant_portal_backend/src/payments/ai/guardrail-policy.ts`

Added deterministic guardrails for:
- **Frequency cap** (default max reminders in 24h = 3; configurable by metadata/env-fed context)
- **Quiet hours enforcement** (adjusts proposed send time outside quiet window)
- **Consent hooks**
  - Channel consent (email/sms/push)
  - Notification-type consent (`PAYMENT_DUE`)
  - AI personalization consent

Behavioral design:
- `REMINDER_TIMING`: enforces channel/time adjustments, blocks only if no consented channel or capped.
- `PERSONALIZED_MESSAGE`: blocks AI personalization when consent/cap disallow it; caller falls back to base message.
- `ASSESS_RISK`: explicit allow under rule-first policy.

### 2) AIPaymentService integration finalized (non-breaking)
**File:** `tenant_portal_backend/src/payments/ai-payment.service.ts`

Integrated guardrails into runtime flow:
- `determineReminderTiming()` now:
  - loads guardrail context via Prisma (`notificationPreference`, 24h `PAYMENT_DUE` count)
  - evaluates `REMINDER_TIMING` with proposed channel/time + consent + quiet-hours + frequency metadata
  - applies `adjustedChannel` / `adjustedSendTime` safely
- `generatePersonalizedMessage()` now receives channel + guardrail context and evaluates `PERSONALIZED_MESSAGE` with consent/frequency metadata before LLM call
- Added private helper `getReminderGuardrailContext()` to centralize baseline inputs

Non-breaking guarantees kept:
- No endpoint contract changes
- No schema changes
- AI block path still returns deterministic base reminder message
- Rule-first default avoids throwing and prefers safe fallback behavior

### 3) Test coverage for hard guardrails
**Files:**
- `tenant_portal_backend/src/payments/ai/guardrail-policy.spec.ts` (new)
- `tenant_portal_backend/src/payments/ai-payment.service.spec.ts` (updated for new guardrail context)

Added/updated tests validating:
- frequency cap blocking
- quiet-hours send-time adjustment
- SMS -> EMAIL fallback when SMS consent is not enabled
- personalization block when AI personalization consent disabled
- high urgency SMS path still works when SMS consent is enabled

## Changed files
- `tenant_portal_backend/src/payments/ai/guardrail-policy.ts`
- `tenant_portal_backend/src/payments/ai/guardrail-policy.spec.ts`
- `tenant_portal_backend/src/payments/ai-payment.service.ts`
- `tenant_portal_backend/src/payments/ai-payment.service.spec.ts`

## Test evidence
Command run:

```bash
cd /home/jordanh316/.openclaw/workspace/pms-master/tenant_portal_backend
npm test -- src/payments/ai/guardrail-policy.spec.ts src/payments/ai-payment.service.spec.ts
```

Result:
- **Test Suites:** 2 passed, 2 total
- **Tests:** 13 passed, 13 total
- **Status:** PASS

(Observed non-blocking warning from ts-jest deprecation config; does not affect PR3 functionality.)
