# Docker Environment Workflow

Docker builds in this repo must use the monorepo root as the build context. The supported Dockerfiles are:

- `tenant_portal_backend/Dockerfile`
- `tenant_portal_app/Dockerfile`

## Local development

Start the stack with local infrastructure:

```bash
docker compose --env-file ops/.env.dev up -d --build
```

Run Prisma migrations explicitly:

```bash
docker compose --env-file ops/.env.dev run --rm --profile tools backend-migrate
```

Helpful shortcuts:

```bash
pnpm env:dev
pnpm env:dev:migrate
pnpm env:logs:backend
pnpm env:health
```

## Supabase-backed development

Use the Supabase profile when you want production-like database connectivity:

```bash
docker compose --env-file ops/.env.supabase up -d --build
docker compose --env-file ops/.env.supabase run --rm --profile tools backend-migrate
```

If Prisma returns `P1001`, validate the direct database URL, firewall access, and VPN requirements first.

## Production and staging deploys

Production-style deployments are image based. `docker-compose.prod.yml` overrides backend and frontend to use:

- `BACKEND_IMAGE`
- `FRONTEND_IMAGE`
- `IMAGE_TAG`

Typical flow:

```bash
docker compose --env-file ops/.env.prod -f docker-compose.yml -f docker-compose.prod.yml pull backend frontend
docker compose --env-file ops/.env.prod -f docker-compose.yml -f docker-compose.prod.yml run --rm backend-migrate
docker compose --env-file ops/.env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build
```

`ops/.env.prod.example` documents the required image and runtime variables.

## Validation

Validate the merged Compose files before shipping changes:

```bash
docker compose --env-file ops/.env.dev config
docker compose --env-file ops/.env.prod.example -f docker-compose.yml -f docker-compose.prod.yml config
```

## Notes

- The backend container no longer runs Prisma migrations on startup.
- `backend-migrate` is the only supported Compose service for running deploy migrations.
- In production-oriented Compose, backend and frontend do not publish host ports; traffic should enter through the frontend or external ingress.
