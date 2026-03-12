# Property Management Suite (PMS) Staging Demo Org Pipeline

## Purpose
Provide a repeatable staging bootstrap flow for Property Management Suite (PMS):
1. Install dependencies
2. Apply migrations
3. Run deterministic demo-org seed
4. Execute smoke tests

## Script
Use:

```bash
./scripts/staging-seed-pipeline.sh
```

## Current Behavior (as of 2026-03-02)
- Installs backend dependencies (`npm ci`)
- Applies migrations (`prisma migrate deploy`)
- Attempts deterministic seed (`npx ts-node scripts/dev-seed-inspection-demo.ts`)
- Runs smoke tests (`scripts/smoke-tests/run-smoke-tests.js`)

## Known Blockers
1. ✅ Seed schema drift fixed
   - `scripts/dev-seed-inspection-demo.ts` now creates/uses a deterministic organization and links property via `organizationId`.

2. ⛔ Smoke-check endpoint expectations mismatch
   - Smoke suite expects:
     - `/api/health`
     - `/api/health/readiness`
     - `/api/health/liveness`
   - Current backend runtime returns `404` for these routes.

## Next Fix
Choose one path:
- Expose the expected health endpoints in backend routing, or
- Update smoke-test route expectations to match current service topology.

## Expected Outcome
A deterministic PMS staging bootstrap that can run end-to-end and produce reliable smoke-test evidence for demo readiness.
