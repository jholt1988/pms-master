# Operator App

Next.js operator web app for the decision-driven property management platform.

## Commands

- `pnpm --filter operator_app dev`
- `pnpm --filter operator_app build`
- `pnpm --filter operator_app type-check`

## Recent changes

- 13 new operator API modules added (#118).
- OpenAPI frontend schema regenerated from current openapi.json (#117).
- 4 mock operator services wired to real implementations (#116).
- 3 critical bugs fixed: dead copilot code, broken fetch paths, audit log entityId filter (#115).

## API Proxy

The app proxies backend calls through `/api/backend/*` to the NestJS backend.

Set `OPERATOR_API_BASE_URL` when the backend is not at `http://localhost:3001`.

## Migration Rule

Only migrate workflows that have been audited against `docs/operator-contract-audit.md`.
