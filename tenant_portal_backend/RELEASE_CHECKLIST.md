# Tenant Portal Backend Release Checklist

Date: 2026-05-01 (Asia/Kuala_Lumpur)

Current head: `e21e975`

## 1) Integration verification

- ✅ `npm run verify:integration` — historical PASS
  - Public endpoints: pass
  - Tenant endpoints: pass
  - Manager endpoints: pass
  - Manual confirmation flow: pass
- ⏳ `npm run smoke:golden-path` — required against seeded staging before production promotion
  - Requires `SMOKE_BASE_URL`, `SMOKE_JWT`, `SMOKE_PAYMENT_ID`, `SMOKE_LEASE_ID`, `SMOKE_MAINTENANCE_ID`, `SMOKE_VENDOR_ID`, `SMOKE_INSPECTION_ID`
  - Optional: `SMOKE_PROPERTY_ID`

## 2) DB/migration readiness

- ✅ Migration sync for AI columns added
- ✅ Verify migration deploy path in CI
- ✅ Seed script available: `npm run seed:inspection-demo:robust`

## 3) Runtime deps

- DB reachable with `DATABASE_URL`
- Redis reachable
- `JWT_SECRET` set
- Production Stripe enabled with `STRIPE_SECRET_KEY`, or explicit override documented
- DocuSign webhook secret set with `ESIGN_WEBHOOK_SECRET` or `DOCUSIGN_CONNECT_SECRET`
- DocuSign provider credentials/base URL/account ID configured for staging/production
- QuickBooks credentials and redirect URL configured for sandbox/production

## 4) Deploy steps

1. Deploy backend image/code
2. Run migrations
3. Run verification script
4. Run seeded golden-path smoke
5. Confirm health endpoints and auth routes
6. Attach DocuSign/QuickBooks/Stripe evidence to release notes

## 5) Rollback conditions

Rollback if any of:

- `/api/auth/login` or `/api/auth/me` failures spike
- `/api/rental-applications` returns 5xx
- payment remediation smoke fails
- lease document/signature smoke fails outside a documented unavailable DocuSign sandbox
- manual maintenance confirm/dispatch flow fails
- QuickBooks status/test-connection fails outside a documented unavailable sandbox
