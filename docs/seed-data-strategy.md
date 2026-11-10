# Seed Data Strategy

## Goal
Provide seed data covering each user story and nearly every feature/function of the app, with viable scripts only.

## Current state
- DB has 83 migrations applied, no seed data.
- `seed-demo-dataset.js`: references legacy `Tenant` table not in schema → deprecated (moved to `scripts/deprecated/`).
- Prisma 7 requires adapter-based client construction (`@prisma/adapter-pg`).

## Viable (update to adapter pattern)
- `dev-seed-minimal.ts` — minimal dev baseline (users/org/properties).
- `seed-missing.ts` — fills gaps in coverage.
- `seed-inspection-demo-robust.js` — inspection workflow data.
- `dev-seed-inspection-demo.ts` — inspection demo.

## Deprecate / archive (scripts/deprecated/)
- `seed-demo-dataset.js` — legacy Tenant table, monolithic.
- `a06-seed-lease-document.js`, `a06-seed-lease-leaseDocument.js` — stale a06 helpers.
- `seed-event-simulations.ts`, `seed-ml-targeted-readiness.ts` — specialized, low reuse.

## User stories → data needs
- Auth/RBAC: users for each role (manager, owner, tenant, admin).
- Properties/Units: 3 properties, ~11 units, varied statuses.
- Leases: active, renewal-due, notice-given, delinquent.
- Payments: histories including delinquent tenant.
- Maintenance: every priority+status.
- Applications: across pipeline.
- Inspections: demo + robust scenarios.
- ML: targeted readiness data.

## Action items
1. Update viable scripts to adapter pattern.
2. Add `seed` property to prisma.config.ts pointing to `dev-seed-minimal.ts`.
3. Create a master `seed:all` npm script running viable seeds in order.
4. Move deprecated scripts to `scripts/deprecated/`.
