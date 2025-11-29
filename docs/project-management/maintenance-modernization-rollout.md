Maintenance Modernization Rollout
==================================

Overview
--------
- Expanded maintenance data model now tracks assets, technicians, SLA policies, request history, notes, and photos.
- Service layer enforces SLA response/resolution timers, records assignment history, and supports manager-grade filtering/pagination.
- Frontend dashboard exposes richer request context, SLA countdowns, property/unit linkage, and on-screen technician assignment.

Database Migration
------------------
- Ensure `DATABASE_URL` points to a disposable clone before applying structural changes.
- Run `npx prisma migrate dev --name maintenance_modernization` locally once the schema is stable; capture the generated SQL for review.
- For production, execute `npx prisma migrate deploy` after backups are in place. Coordinate downtime if existing maintenance tables must be backfilled.
- Seed baseline data (`npm run db:seed` or `npx prisma db seed`):
  - Create default SLA policies per company and per priority.
  - Register in-house technicians so assignments work on day one.
  - Inventory critical assets (HVAC, plumbing, safety systems) for each property/unit.

Backend Verification
--------------------
- Run `npm run build` in `tenant_portal_backend` to ensure TypeScript passes compilation.
- Smoke-test core flows with an authenticated client:
  1. Tenant submits new request (optionally linking property/unit/asset).
  2. Manager filters queue by priority and property, assigns technician, and advances status.
  3. Confirm SLA timestamps (`responseDueAt`, `dueAt`) populate based on the matched policy.
  4. Add note and verify history entry is captured.
- Validate edge cases:
  - Missing SLA policy falls back to `null` timers.
  - Duplicate asset names are blocked per property/unit (`MaintenanceAsset_property_unit_name_key`).
  - Technician creation rejects unsupported roles.

Frontend Verification
---------------------
- Run `npm run build` in `tenant_portal_app`; ensure CRA build completes.
- From the dashboard:
  - Create requests at multiple priorities and confirm SLA badges update.
  - Use property/unit filters and pagination controls with >25 sample requests.
  - Assign technicians and confirm UI reflects the new owner without refresh glitches.
  - Add maintenance notes from manager and tenant accounts; verify the feed updates immediately.
  - Tenant view should hide manager-only filters while still showing SLA status.

Monitoring & Follow-ups
-----------------------
- Add API coverage for notes/photos upload once storage backend is finalized.
- Implement automated SLA breach alerts (email/slack/webhook) based on `dueAt` and `responseDueAt`.
- Backfill historical maintenance records into new tables, mapping legacy technicians/assets where feasible.
- Extend Jest/e2e suites to cover the new service methods and dashboard behavior.
- Update onboarding/runbooks so property managers know how to seed technicians, assets, and SLA policies.
