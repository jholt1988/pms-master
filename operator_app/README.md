# Operator App

Next.js operator web app for the decision-driven property management platform.

## Commands

- `pnpm --filter operator_app dev`
- `pnpm --filter operator_app build`
- `pnpm --filter operator_app type-check`

## API Proxy

The app proxies backend calls through `/api/backend/*` to the NestJS backend.

Set `OPERATOR_API_BASE_URL` when the backend is not at `http://localhost:3001`.

## Migration Rule

Only migrate workflows that have been audited against `docs/operator-contract-audit.md`.
