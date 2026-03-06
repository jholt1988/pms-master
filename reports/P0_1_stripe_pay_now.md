# P0-1 Stripe Pay Now Checkout Flow

## Scope Completed
Implemented tenant-facing **Pay Now** flow for unpaid invoices and backend Stripe checkout-session endpoint.

## Frontend Changes (`tenant_portal_app`)
- Updated `src/domains/tenant/features/payments/PaymentsPage.tsx`:
  - Added `handlePayNow(invoiceId)`.
  - For each unpaid invoice, **Pay Now** now calls:
    - `POST /payments/stripe/checkout-session`
    - body: `{ invoiceId, successUrl, cancelUrl }`
  - Uses current page URL to construct success/cancel return URLs.
  - Redirects browser to returned `checkoutUrl`.
  - Added button loading/disable state per in-flight invoice checkout call.
  - Added inline error banner for checkout-start failures.

## Backend Changes (`tenant_portal_backend`)
- Added DTO:
  - `src/payments/dto/create-stripe-checkout-session.dto.ts`
  - Validates request fields: `invoiceId`, `successUrl`, `cancelUrl`.

- Updated controller:
  - `src/payments/payments.controller.ts`
  - Added route:
    - `POST /api/payments/stripe/checkout-session`
    - Roles: `TENANT`, `PROPERTY_MANAGER`
    - Request: `{ invoiceId, successUrl, cancelUrl }`
    - Response: `{ checkoutUrl, sessionId, invoiceId }`

- Updated payments service:
  - `src/payments/payments.service.ts`
  - Added `createStripeCheckoutSession(...)` that:
    - Loads invoice + lease/tenant context.
    - Rejects missing invoice and already paid invoices.
    - Enforces tenant ownership and PM org access checks.
    - Reuses tenant Stripe customer or creates one if missing.
    - Calls Stripe service to create hosted checkout session.
    - Returns `{ checkoutUrl, sessionId, invoiceId }`.

- Updated Stripe service:
  - `src/payments/stripe.service.ts`
  - Added `CreateCheckoutSessionDto` and `createCheckoutSession(...)`.
  - Creates Stripe Checkout Session in payment mode with invoice metadata.
  - In Stripe-disabled mode, returns deterministic mock session URL/ID.

## Tests Added
- `tenant_portal_backend/src/payments/payments.stripe-checkout.spec.ts`
  - Covers:
    - successful session creation for unpaid tenant invoice
    - rejection when invoice already paid
    - rejection for cross-tenant access

## Validation Run
- Backend targeted test:
  - `npm test -- --runInBand src/payments/payments.stripe-checkout.spec.ts` ✅
- Backend build/typecheck:
  - `npm run build` ✅

## Notes
- Existing unrelated workspace changes were present before/alongside this task.
- Existing frontend type-check has pre-existing unrelated errors outside this scope.
