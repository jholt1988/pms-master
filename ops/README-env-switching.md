# Environment Switching (Docker Compose)

This project includes two ready-to-use env profiles:

- `ops/.env.dev` → Local Docker DB/Redis mode (fastest + most stable for dev)
- `ops/.env.supabase` → Supabase-backed mode (production-like)

---

## 1) Start in local mode (recommended for daily dev)

```bash
docker compose --env-file ops/.env.dev up -d --build
```

Check services:

```bash
docker compose ps
docker compose logs --tail=120 backend
docker compose logs --tail=120 frontend
```

---

## 2) Start in Supabase mode

Before using this mode, update placeholders in `ops/.env.supabase`:

- `<PROJECT_REF>`
- `<PASSWORD>`
- `<REGION>`

Then:

```bash
docker compose --env-file ops/.env.supabase up -d --build
```

If backend can’t connect and restarts with Prisma `P1001`, validate firewall/VPN and Supabase connection details.

---

## 3) Switch modes cleanly

```bash
docker compose down
docker compose --env-file ops/.env.dev up -d --build
# or
docker compose --env-file ops/.env.supabase up -d --build
```

---

## 4) Manual migration run (when needed)

If you choose to keep backend startup independent from migrations:

```bash
docker compose exec backend sh -lc "npx prisma migrate deploy"
```

---

## 5) Quick health checks

Host-level:

```bash
curl -i http://localhost:3000
curl -i http://localhost:3000/api/health
```

Container-network check (from frontend -> backend):

```bash
docker compose exec frontend sh -lc "wget -S -O- http://backend:3001/api/health | head -n 40"
```

---

## 6) Known noisy-but-nonfatal signals

- `POST /api/metrics/web-vitals` 404 (telemetry endpoint not implemented)
- workflow scheduler errors for missing workflows (avoid by keeping `DISABLE_WORKFLOW_SCHEDULER=true` in non-prod)
- `ml-service DOWN` in health monitor when no ML service is deployed (`MONITORING_ENABLED=false` avoids this in local/dev)

---

## 7) Recommended defaults by environment

### Local dev
- `DISABLE_WORKFLOW_SCHEDULER=true`
- `MONITORING_ENABLED=false`
- `MIL_WRAPPER_ENABLED=true`
- `MIL_ENCRYPT_AT_REST_ENABLED=false`
- `MIL_AUDIT_PERSIST_ENABLED=false`

### Production-like staging
- `DISABLE_WORKFLOW_SCHEDULER=false` (if workflows are fully configured)
- `MONITORING_ENABLED=true` (with real dependencies available)
- MIL flags enabled according to rollout plan

