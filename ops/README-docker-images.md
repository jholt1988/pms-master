# Docker Images

## Supported build context

All Docker builds must run from the monorepo root:

```bash
docker build -f tenant_portal_backend/Dockerfile .
docker build -f tenant_portal_app/Dockerfile .
```

Building from `tenant_portal_backend/` or `tenant_portal_app/` directly is unsupported because the images depend on workspace manifests and shared packages from the repo root.

## Backend image contract

- Single process: `node dist/tenant_portal_backend/src/index.js`
- No implicit database migrations on container startup
- Non-root runtime user
- Runtime image includes compiled backend assets, Prisma schema, workspace runtime dependencies, and the `packages/mil-client` workspace package

## Frontend image contract

- Built from the repo root with `VITE_API_URL` as the only build argument
- Served by `nginx:alpine`

## Deploy contract

- CI builds and pushes tagged backend and frontend images
- Servers deploy by `BACKEND_IMAGE`, `FRONTEND_IMAGE`, and `IMAGE_TAG`
- Prisma migrations run via `backend-migrate` before service restart
