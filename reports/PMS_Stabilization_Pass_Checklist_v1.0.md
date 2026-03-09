# PMS Stabilization Pass Checklist (v1.0)

**Purpose:** lock current working state, reduce regressions, and make local/demo startup repeatable.  
**Use when:** after major feature pushes, before demos, before handoff.

---

## 0) Pre-flight

- [ ] `git status` is clean (or changes intentionally tracked)
- [ ] Latest `main` pulled
- [ ] Correct env profile selected (`ops/.env.dev` or `ops/.env.supabase`)
- [ ] Docker Desktop healthy

Commands:
```bash
git pull
docker compose --env-file ops/.env.dev up -d --build
```

---

## 1) Service Health & Reachability

- [ ] `backend`, `frontend`, `postgres`, `redis` all `Up`
- [ ] Postgres shows `healthy`
- [ ] Frontend reachable at `http://localhost:3000`
- [ ] Backend health reachable through frontend proxy (`/api/health`)

Commands:
```bash
docker compose ps
curl -i http://localhost:3000
curl -i http://localhost:3000/api/health
docker compose exec frontend sh -lc "wget -S -O- http://backend:3001/api/health | head -n 40"
```

---

## 2) DB & Migration Integrity

- [ ] Prisma migrations apply without errors
- [ ] No schema drift errors at runtime (P2022/P1001)
- [ ] Critical expected columns exist (spot check)

Commands:
```bash
docker compose exec backend sh -lc "cd /app/tenant_portal_backend && npx prisma migrate deploy"
docker compose logs --tail=150 backend
```

Spot-check SQL (optional):
```bash
docker compose exec postgres psql -U pms -d pms -c '\d "ManualPayment"'
docker compose exec postgres psql -U pms -d pms -c '\d "ManualCharge"'
```

---

## 3) Auth & Session Stability

- [ ] Admin/PM login succeeds (no false “session expired” on valid creds)
- [ ] JWT secret is consistent for running environment
- [ ] Role-based routes load correctly (`/lease-management`, `/maintenance-management`)

Quick checks:
- [ ] clear browser storage + hard refresh if auth behaves oddly
- [ ] verify user has org membership in `UserOrganization`

---

## 4) Core Workflow Smoke Tests

### 4A. Manual Payments / Charges (Lease Management)
- [ ] Manual payment post works (cash/check/money order)
- [ ] Reverse manual payment works
- [ ] Manual charge post works
- [ ] Void manual charge works
- [ ] Lease balance updates correctly after each action

### 4B. Maintenance Request Controls
- [ ] PM/Admin can **Accept Request** (`PENDING -> IN_PROGRESS`)
- [ ] PM/Admin can **Reject Request** with required reason
- [ ] Rejection note recorded

### 4C. Reporting
- [ ] Manual Payments Summary loads
- [ ] Manual Charges Summary loads
- [ ] CSV export works for both

---

## 5) UI/UX Stability

- [ ] Lease workflow form fields are readable under dark/light/system themes
- [ ] No obvious console errors blocking flows
- [ ] Navigation points to correct lease page version

Commands:
```bash
docker compose logs --tail=120 frontend
```

---

## 6) Noise Reduction (Dev-friendly)

- [ ] Workflow scheduler disabled in local/dev if workflows not configured
- [ ] Monitoring disabled in local/dev if ML service absent

Recommended local toggles:
```env
DISABLE_WORKFLOW_SCHEDULER=true
MONITORING_ENABLED=false
```

---

## 7) ML Demo Readiness Pass

- [ ] Base/inspection seed completed
- [ ] Targeted ML seed completed
- [ ] Readiness JSON generated
- [ ] Readiness markdown generated

Commands:
```bash
docker compose exec backend sh -lc "cd /app/tenant_portal_backend && npm run ml:simulate:targeted"
```

Outputs:
- `tenant_portal_backend/reports/ml-data-readiness-latest.md`

---

## 8) Evidence Capture (for demo/release)

- [ ] Save screenshots for key flows
- [ ] Save command outputs for health/migrations/readiness
- [ ] Update `pms-plans/demo-evidence.md` (or equivalent)

---

## 9) Go / No-Go Decision

**GO if all are true:**
- [ ] services stable
- [ ] auth stable
- [ ] manual payment/charge workflows pass
- [ ] maintenance accept/reject pass
- [ ] reporting pass
- [ ] ML simulation outputs generated

If any fail: capture blocker + owner + next action before continuing.

---

## 10) Fast Recovery Commands

```bash
# clean restart
docker compose down
docker compose --env-file ops/.env.dev up -d --build

# hard frontend refresh path
docker compose build --no-cache frontend
docker compose up -d frontend

# backend logs
docker compose logs --tail=200 backend
```
