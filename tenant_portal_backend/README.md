# Tenant Portal Backend

[![Backend Verify Integration](https://github.com/jholt1988/pms-master/actions/workflows/backend-verify-integration.yml/badge.svg)](https://github.com/jholt1988/pms-master/actions/workflows/backend-verify-integration.yml)

Backend API for Property Pulse / Tenant Portal.

## Core scripts

```bash
npm run dev
npm run seed:inspection-demo:robust
npm run verify:integration
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
