# MIL Phase 0 Patch Summary (2026-03-05)

## Scope completed
Implemented Phase 0 MIL persistence scaffolding for:
- `ModelAccessTrace`
- `MilAuditEvent`

No destructive DB operations were run.

---

## Exact files changed

1. `prisma/schema.prisma`
   - Added `ModelAccessTrace` Prisma model with trace/context/model metadata fields and operational indexes.
   - Added `MilAuditEvent` Prisma model with audit envelope fields and query indexes.

2. `prisma/migrations/20260305035200_add_mil_phase0_trace_audit_tables/migration.sql`
   - Added draft SQL migration that creates:
     - `ModelAccessTrace`
     - `MilAuditEvent`
   - Added matching indexes for trace, org, actor, action, result, and createdAt lookup patterns.

3. `src/mil/model-access-trace.service.ts` (new)
   - Added service stub to persist model-access trace records via Prisma.
   - Includes safe failure behavior (warn log, no throw) to avoid breaking call paths.

4. `src/mil/mil-audit-event.service.ts` (new)
   - Added service stub to persist MIL audit events via Prisma.
   - Includes safe failure behavior (warn log, no throw).

5. `src/mil/mil.module.ts`
   - Registered/exported:
     - `ModelAccessTraceService`
     - `MilAuditEventService`

6. `src/mil/mil-security-audit-wrapper.service.ts`
   - Injected both persistence services.
   - `assertAccess(...)` now records trace outcomes (`allowed` / `denied`).
   - `recordModelInvocation(...)` now persists:
     - `ModelAccessTrace` entry (`requested` / `completed` / `failed`)
     - `MilAuditEvent` entry (mirrors audit semantics)
   - Existing `AuditLogService` and `SecurityEventsService` behavior retained.

---

## Validation notes

- Ran `npx prisma generate` successfully after schema updates.
- Full `npm run build` currently fails due pre-existing unrelated TypeScript errors across the repository; not caused by this patch.

---

## Rollback notes

If rollback is required:

1. Revert code changes in:
   - `src/mil/model-access-trace.service.ts`
   - `src/mil/mil-audit-event.service.ts`
   - `src/mil/mil.module.ts`
   - `src/mil/mil-security-audit-wrapper.service.ts`

2. Revert schema and migration artifacts:
   - Remove `ModelAccessTrace` and `MilAuditEvent` models from `prisma/schema.prisma`.
   - Remove migration folder:
     - `prisma/migrations/20260305035200_add_mil_phase0_trace_audit_tables/`

3. Regenerate Prisma client after rollback:
   - `npx prisma generate`

4. If migration was already applied in an environment, roll back DB changes with your standard migration rollback process (or explicit DROP TABLE in controlled env only):
   - `DROP TABLE IF EXISTS "MilAuditEvent";`
   - `DROP TABLE IF EXISTS "ModelAccessTrace";`

(Do not run destructive SQL in production without approved change control.)
