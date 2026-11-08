# Backend

NestJS backend highlights:

- DatabaseService migration (6 services) (#102).
- Org-context scoping on reporting, audit, smart devices, security (#113-#117).
- JWT_SECRET fail-closed (#120).
- Prisma 7 + Docker generate path (#106-#112).
- Async rent-payment email via BullMQ (#98).
- DB indexes on hot columns (#95, #97).

Env: `DATABASE_URL`, `JWT_SECRET`, `WORKFLOW_ENGINE_URL`, `REDIS_URL`.
See [tenant_portal_backend/README.md](../../../tenant_portal_backend/README.md).
