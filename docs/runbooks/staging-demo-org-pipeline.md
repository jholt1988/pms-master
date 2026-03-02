# Staging Demo Org Pipeline (PMS-F-01)

## Purpose
Provide a repeatable staging bootstrap flow for:
1. dependency install
2. migration apply
3. deterministic demo-org seed
4. smoke tests

## Script
Use:

```bash
./scripts/staging-seed-pipeline.sh
```

## Current behavior (as of 2026-03-02)
- Installs backend dependencies (`npm ci`)
- Applies migrations (`prisma migrate deploy`)
- Attempts deterministic seed (`npx ts-node scripts/dev-seed-inspection-demo.ts`)
- Runs smoke tests (`scripts/smoke-tests/run-smoke-tests.js`)

## Known blockers (current)
1. ✅ Seed schema drift fixed
- `scripts/dev-seed-inspection-demo.ts` now creates/uses a deterministic Organization and links property via `organizationId`.

2. ⛔ Smoke check expectations mismatch
- Smoke suite expects health/readiness/liveness endpoints:
  - `/api/health`
  - `/api/health/readiness`
  - `/api/health/liveness`
- Current backend returns 404 for these routes in this runtime.

## Next fix
Either:
- expose health endpoints in backend routing, or
- adjust smoke-tests route expectations for the current service topology.
