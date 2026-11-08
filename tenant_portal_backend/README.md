# Tenant Portal Backend

[![Backend Verify Integration](https://github.com/jholt1988/pms-master/actions/workflows/backend-verify-integration.yml/badge.svg)](https://github.com/jholt1988/pms-master/actions/workflows/backend-verify-integration.yml)

Backend API for the Property Management Suite (NestJS + TypeScript + Prisma 7 + PostgreSQL).

## Recent changes (synced with merged PRs)

- **Org-context scoping** enforced on reporting, audit, smart devices, security endpoints (#113–#117).
- **DatabaseService migration**: 6 services moved from PrismaService to DatabaseService (#102).
- **Rent-payment confirmation email** sent off-request via BullMQ (#98).
- **DB indexes** added on hot FK/status columns (#95, #97).
- **JWT_SECRET fail-closed**: server refuses to start without a valid secret (#120).
- **Prisma 7 + Docker** generate path fixed (#106–#112).
- **Leaked DocuSign debug artifacts removed** and gitignored (#94).

## Core scripts

```bash
npm run dev
npm run seed:inspection-demo:robust
npm run verify:integration
```

## Environment

```env
DATABASE_URL=postgresql://...
JWT_SECRET=<required, fail-closed>
WORKFLOW_ENGINE_URL=http://127.0.0.1:3003
REDIS_URL=redis://127.0.0.1:6379   # BullMQ email queue
```

## Integration verification

The `verify:integration` script validates:

- auth login for manager + tenant
- key public/tenant/manager endpoints
- manual maintenance completion confirmation flow

CI workflow:

- `.github/workflows/backend-verify-integration.yml`

## Property OS integration (MIL + Workflow Engine)

To use the shared Property OS data/workflows from `pms-master/prisma`:

1. Run backend (port `3001`)
2. Run MIL service (port `3002`)
3. Run Workflow Engine service (port `3003`)

Backend currently reads action intents from Workflow Engine when available.

Env vars:

```env
WORKFLOW_ENGINE_URL=http://127.0.0.1:3003
```

If Workflow Engine is unavailable, `/api/dashboard/action-intents` falls back to mock data.
