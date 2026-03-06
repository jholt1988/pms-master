# PMS Manual Transactions QA + Go/No-Go

Date: 2026-03-06 UTC
Scope: MAN-01 through MAN-04 (manual payments, manual charges, API, UI, reporting)

## Build/Compile Verification

### Backend
- Command: `cd tenant_portal_backend && corepack pnpm build`
- Result: PASS

### Frontend
- Command: `cd tenant_portal_app && corepack pnpm build`
- Result: PASS

## Delivered Changes (committed)
- `af73a39` — backend manual payment/charge workflows
- `ef7e221` — lease manager UI for manual payment/charge workflows
- `6cc2ae8` — reporting summaries for manual payments/charges

## Functional QA Checklist

### Manual payment posting (PM/Admin)
- [x] Endpoint implemented: `POST /payments/manual`
- [x] Validation for amount and check/MO reference numbers
- [x] Lease balance decrement on POSTED payment
- [x] Audit event emitted

### Manual payment reversal
- [x] Endpoint implemented: `POST /payments/manual/:id/reverse`
- [x] Reason required
- [x] Lease balance increment on REVERSED payment
- [x] Audit event emitted

### Manual charge posting (PM/Admin)
- [x] Endpoint implemented: `POST /payments/charges/manual`
- [x] Validation for amount/description
- [x] Lease balance increment on POSTED charge
- [x] Audit event emitted

### Manual charge void
- [x] Endpoint implemented: `POST /payments/charges/manual/:id/void`
- [x] Reason required
- [x] Lease balance decrement on VOIDED charge
- [x] Audit event emitted

### UI workflows
- [x] Lease manager includes Manual Payments section
- [x] Lease manager includes Manual Charges section
- [x] Reverse/Void actions available with reason prompt
- [x] Lease refresh after post/reverse/void

### Reporting and CSV
- [x] `GET /reporting/manual-payments-summary`
- [x] `GET /reporting/manual-charges-summary`
- [x] Reporting page includes both views
- [x] CSV export available in both views

## Known Operational Notes
- Migration generation via Prisma `migrate dev` was blocked by pooler/session limits in current DB setup.
- Manual migration SQL was created at:
  - `tenant_portal_backend/prisma/migrations/20260306193700_add_manual_payments_and_charges/migration.sql`
- Deploy must ensure this migration is applied in target environment before using new endpoints/UI.

## Go/No-Go
- **Status: CONDITIONAL GO**
- **Go criteria met:** code compiles, endpoints/UI/reporting implemented and wired.
- **Condition before production use:** apply migration SQL successfully in target DB and verify via smoke run.

## Required Smoke Run in Deployed Environment
1. Post one manual CASH payment (rent) and confirm balance decreases.
2. Reverse that payment and confirm balance restores.
3. Post one manual charge (e.g., utility) and confirm balance increases.
4. Void that charge and confirm balance restores.
5. Open Reporting page:
   - Manual Payments Summary shows posted/reversed entries
   - Manual Charges Summary shows posted/voided entries
   - CSV export works for both

If all 5 pass: release status can be upgraded to **FULL GO**.
