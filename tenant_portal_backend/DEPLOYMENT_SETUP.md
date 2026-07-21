# Deployment Pipeline & Docker Build Fix Guide

## Current Issue

Your Docker build is failing because:
1. **Prisma types not generated**: `pnpm build` requires `@prisma/client` types to be available
2. **Config file conflicts**: `prisma.config.ts` imports `prisma/config` which doesn't exist in Prisma 7
3. **Prebuild script dependency**: Your `package.json` has `"prebuild": "prisma generate"` but Prisma isn't available in the right context

## Solutions

### Option 1: Local Build First (Recommended for Development)

```bash
# In your local monorepo root
cd tenant_portal_backend
pnpm install
pnpm prebuild  # This generates Prisma Client
pnpm build     # Now this works
```

Then Docker can use the pre-built dist:

```bash
docker build -f tenant_portal_backend/Dockerfile .
```

### Option 2: Fix prisma.config.ts

The file `tenant_portal_backend/prisma.config.ts` references `prisma/config` which doesn't exist. Either:

a) Remove it entirely (if you don't need custom Prisma config)
b) Fix the imports to not use `prisma/config` (use `defineConfig` from prisma if available in v7)
c) Use environment variables instead for config

### Option 3: Add prebuild to Dockerfile

Ensure the Dockerfile explicitly handles the prebuild:

```dockerfile
RUN cd /app/tenant_portal_backend && \
    mv prisma.config.ts prisma.config.ts.bak 2>/dev/null || true && \
    pnpm run prebuild && \
    mv prisma.config.ts.bak prisma.config.ts 2>/dev/null || true && \
    pnpm build
```

## GitHub Actions Deployment Pipeline Files Created

1. **.github/workflows/build-and-push.yml** — Builds Docker image and pushes to registry
2. **.github/workflows/deploy.yml** — Deploys to Kubernetes (dev/staging/production)
3. **.github/workflows/security.yml** — Daily security scanning
4. **.github/workflows/health-checks.yml** — Continuous health verification

These workflows are ready to use but need GitHub Secrets configured:
- `KUBE_CONFIG` — Base64-encoded kubeconfig
- `SLACK_WEBHOOK` — Slack notifications
- Environment-specific: `DEV_ENDPOINT`, `STAGING_ENDPOINT`, `PRODUCTION_ENDPOINT`

## Kubernetes Manifests

Created in `k8s/` directory:
- `deployment.yaml` — Deployment, Service, HPA, PDB
- `rbac-security.yaml` — RBAC, NetworkPolicy, PodSecurityPolicy
- `values.yaml` — Helm values for all environments

## Scripts Created

- `scripts/setup-deployment.sh` — Deploy to environment
- `scripts/rollback-deployment.sh` — Rollback deployment
- `scripts/migrate-and-seed.sh` — Run database migrations

## Immediate Next Steps

1. **Fix the Prisma config issue locally first**:
   ```bash
   cd tenant_portal_backend
   pnpm install
   pnpm run prebuild
   ```

2. **Test the Docker build locally**:
   ```bash
   cd ..  # back to monorepo root
   docker build -f tenant_portal_backend/Dockerfile -t tenant-portal-backend:test .
   ```

3. **If build succeeds, verify the image works**:
   ```bash
   docker run -it --rm tenant-portal-backend:test node -v
   ```

4. **Configure GitHub secrets** (for the deployment workflows):
   - Go to GitHub repo Settings > Secrets and variables > Actions
   - Add the secrets listed above

5. **Push to develop branch** to trigger the CI pipeline:
   ```bash
   git add .github/workflows k8s scripts
   git commit -m "Add deployment pipeline and Kubernetes manifests"
   git push origin develop
   ```

## Troubleshooting Build Failures

If the Docker build still fails with Prisma errors:

**Check 1: Is @prisma/client installed?**
```bash
pnpm list @prisma/client
```

**Check 2: Can Prisma generate work?**
```bash
cd tenant_portal_backend
pnpm exec prisma generate --schema=./prisma/schema.prisma
```

**Check 3: Does dist exist after build?**
```bash
ls -la dist/tenant_portal_backend/src/index.js
```

If any of these fail, the issue is in your source code setup, not Docker.

## Docker Build Cache Issues

If you hit cache issues:

```bash
# Clear build cache
docker builder prune

# Rebuild without cache
docker build --no-cache -f tenant_portal_backend/Dockerfile -t tenant-portal-backend:latest .
```

## Production Deployment Checklist

- [ ] `pnpm install && pnpm prebuild && pnpm build` works locally
- [ ] Docker image builds successfully: `docker build -f tenant_portal_backend/Dockerfile .`
- [ ] Kubernetes cluster is accessible: `kubectl cluster-info`
- [ ] GitHub secrets are configured (KUBE_CONFIG, SLACK_WEBHOOK, endpoints)
- [ ] Helm is installed: `helm version`
- [ ] Test deployment to dev: `./scripts/setup-deployment.sh dev`
- [ ] Verify pods are running: `kubectl get pods -n dev`
- [ ] Health check passes: `curl http://localhost:3001/health` (after port-forward)

