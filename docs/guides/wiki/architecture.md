# Architecture

System architecture overview for PMS.

- Backend: NestJS + Prisma 7 + PostgreSQL, org-context scoping, DatabaseService.
- Frontend: Next.js operator app (13 modules), React tenant portal.
- Mobile: Expo/React Native portals.
- ML: FastAPI + XGBoost rent optimization.
- MIL: Fastify attestation/worker service.
- Workflow engine: Prisma 7 + Docker, action intents.

See [App Architecture](../../architecture/app-architecture.md) and [ADR](../../architecture/adr.md).
