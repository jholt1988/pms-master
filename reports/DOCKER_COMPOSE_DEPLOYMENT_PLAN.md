# Docker Compose Deployment Pack

Created files:
- `docker-compose.yml` (local baseline stack)
- `docker-compose.prod.yml` (production override)
- `tenant_portal_backend/Dockerfile`
- `tenant_portal_app/Dockerfile`
- `tenant_portal_app/nginx.conf`
- `ops/.env.prod.example`
- `ops/deploy.sh`
- `ops/deploy.ps1`
- `.dockerignore`

## Quick Start
1. Copy `ops/.env.prod.example` to `ops/.env.prod` and fill secrets.
2. Run deploy script (`ops/deploy.sh` or `ops/deploy.ps1`).
3. Run smoke checklist in `reports/SMOKE_CHECKLIST_POST_P2.md`.

## Notes
- Backend starts with migration + prisma generate in container command.
- Frontend proxies `/api/*` to backend service and serves SPA fallback.
- MIL flags default to safe OFF values.
