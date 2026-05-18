# Testing Standards

## Test Pyramid
- Unit: service/domain logic, validators, authorization branches, adapters.
- Integration: module-level behavior with real DB boundaries where needed.
- E2E: critical user/business flows via API surface.

## Commands
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e:critical`
- `npm run test:e2e` (full non-quarantine)
- `npm run test:e2e:quarantine` (known flaky/non-blocking lane)
- `npm run test:coverage` (unit coverage gate)

## Coverage Policy
- Global unit coverage minimum: 80% for branches/functions/lines/statements.
- Critical modules (`src/auth`, `src/payments`) target stricter thresholds (85%).
- E2E coverage is informational; critical-path pass/fail is enforced in CI.

## Determinism Requirements
- Use test DB schema isolation and reset between e2e tests.
- Freeze time and random where business logic depends on clock/randomness.
- Mock external dependencies (Stripe, email, AI, queues) for unit/integration tests.

## Naming Conventions
- Unit/integration: `*.spec.ts`
- Integration explicit: `*.integration.spec.ts`
- E2E: `*.e2e.spec.ts`
- Quarantine list maintained via script pattern in `package.json`.
