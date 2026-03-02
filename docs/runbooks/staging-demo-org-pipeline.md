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

## Known blocker
Seed step currently fails TypeScript compile due schema drift:
- `PropertyCreateInput` now requires organization linkage
- `scripts/dev-seed-inspection-demo.ts` still creates `Property` without organization relation

Representative error:
- `TS2322 ... Property 'organization' is missing ... required in type 'PropertyCreateInput'`

## Next fix
Patch seed scripts to create/use a deterministic Organization and connect property via `organizationId` (or nested `organization` relation), then re-run pipeline.
