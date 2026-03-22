# Tenant Portal Backend Go-Live Runbook

## Preflight

- Confirm CI workflow `backend-verify-integration` is green.
- Confirm DB + Redis availability.
- Confirm secrets (`JWT_SECRET`, DB credentials).

## Deployment

1. Deploy backend
2. Run:

```bash
npx prisma migrate deploy
npm run verify:integration
```

3. Validate logs for startup errors.

## Critical route checks

- `POST /api/auth/login`
- `GET /api/auth/password-policy`
- `GET /api/tenant/dashboard`
- `GET /api/maintenance`
- `GET /api/leases`
- `GET /api/rental-applications`

## Maintenance confirmation path

- create request
- assign technician
- mark completed with note
- tenant confirm-complete

## Rollback

- redeploy previous backend release tag
- re-run quick endpoint checks
- notify frontend team if contract changed
