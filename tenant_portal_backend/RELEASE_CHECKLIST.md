# Tenant Portal Backend Release Checklist

Date: 2026-03-23 (Asia/Kuala_Lumpur)

Current head: `a2e5002`

## 1) Integration verification

- ✅ `npm run verify:integration` — PASS
  - Public endpoints: pass
  - Tenant endpoints: pass
  - Manager endpoints: pass
  - Manual confirmation flow: pass

## 2) DB/migration readiness

- ✅ Migration sync for AI columns added
- ✅ Verify migration deploy path in CI
- ✅ Seed script available: `npm run seed:inspection-demo:robust`

## 3) Runtime deps

- DB reachable with `DATABASE_URL`
- Redis reachable
- `JWT_SECRET` set

## 4) Deploy steps

1. Deploy backend image/code
2. Run migrations
3. Run verification script
4. Confirm health endpoints and auth routes

## 5) Rollback conditions

Rollback if any of:

- `/api/auth/login` failures spike
- `/api/rental-applications` returns 5xx
- manual maintenance confirm flow fails
