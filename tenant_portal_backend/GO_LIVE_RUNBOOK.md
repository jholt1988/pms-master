# Tenant Portal Backend Go-Live Runbook

## Preflight

- Confirm CI workflow `backend-verify-integration` is green.
- Confirm DB + Redis availability.
- Confirm secrets (`JWT_SECRET`, DB credentials).
- Confirm production integration secrets are present when enabled:
  - `STRIPE_SECRET_KEY`
  - `ESIGN_WEBHOOK_SECRET` or `DOCUSIGN_CONNECT_SECRET`
  - DocuSign provider credentials/base URL/account ID
  - QuickBooks sandbox/production app credentials and redirect URL

## Deployment

1. Deploy backend
2. Run:

```bash
npx prisma migrate deploy
npm run verify:integration
```

3. Run seeded golden-path staging smoke before promotion:

```bash
SMOKE_BASE_URL=https://<staging-backend-host> \
SMOKE_JWT=<property-manager-jwt> \
SMOKE_PAYMENT_ID=<seed-payment-id> \
SMOKE_LEASE_ID=<seed-lease-id> \
SMOKE_MAINTENANCE_ID=<seed-maintenance-id> \
SMOKE_VENDOR_ID=<seed-vendor-id> \
SMOKE_INSPECTION_ID=<seed-inspection-id> \
SMOKE_PROPERTY_ID=<optional-property-id> \
npm run smoke:golden-path
```

The smoke covers auth/me, payment remediation, lease document/signature routes, maintenance dispatch, inspections start, reporting, feature flags, and QuickBooks status. Treat any failure as a launch blocker unless explicitly documented as an unavailable external sandbox dependency.

4. Validate logs for startup errors.

## Critical route checks

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/password-policy`
- `GET /api/tenant/dashboard`
- `GET /api/maintenance`
- `GET /api/leases`
- `GET /api/rental-applications`
- `POST /api/payments/:paymentId/message-tenant`
- `POST /api/payments/:paymentId/record-manual`
- `POST /api/leases/:leaseId/generate-document`
- `POST /api/leases/:leaseId/send-for-signature`
- `POST /api/maintenance/:maintenanceId/assign-vendor`
- `GET /api/reporting/rent-roll`
- `GET /api/quickbooks/status`

## Maintenance confirmation path

- create request
- assign technician
- mark completed with note
- tenant confirm-complete

## Production integration evidence

Before launch, attach or link evidence for:

- DocuSign webhook HMAC validation using the deployed callback URL.
- DocuSign envelope create/send/status path in sandbox or production-equivalent staging.
- QuickBooks auth URL/status/test-connection/sync against sandbox company.
- Stripe production safety: production env refuses disabled Stripe unless explicit override is approved.
- `npm run smoke:golden-path` output against seeded staging.

## Rollback

- redeploy previous backend release tag
- re-run quick endpoint checks and `npm run smoke:golden-path` where seeded data is still valid
- notify frontend team if contract changed
