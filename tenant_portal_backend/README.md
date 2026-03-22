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
