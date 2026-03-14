# Ops P0 — Rollback SOP (Launch Use)
Date: 2026-03-15
Owner: Incident Commander (IC)
Status: Required for release execution

## Purpose
Provide concrete rollback steps for failed launch or severe post-launch degradation.

## Rollback Triggers (execute immediately when true)
- Auth failure rate > 5% for 10+ minutes
- Payment failures spike above baseline for 10+ minutes
- Core workflow unavailable (lease/payment/maintenance)
- Sustained 5xx above agreed threshold
- Data integrity concern after migration

## Preconditions
- Approved rollback artifacts pre-registered:
  - Backend image digest/tag: __________________
  - Frontend artifact hash/tag: ________________
  - Last known-good migration boundary: ________
- Incident channel active
- Roles assigned (IC, Deployer, QA Verifier, Comms Owner)

---

## 1) Immediate Actions (T+0 to T+5m)
1. IC declares rollback in incident channel.
2. Freeze deploy pipeline and stop further config changes.
3. Record start timestamp and incident ID.

**Comms template:**
```text
[ROLLBACK STARTED] Incident <ID> at <time>. Trigger: <reason>.
Action: reverting to last known-good artifacts. Next update in 10 minutes.
```

---

## 2) Execute Application Rollback (T+5m to T+20m)

### 2.1 Backend rollback
**Needs Manual Verification** (environment-specific deploy tooling).

**Exact command template (choose actual platform command):**
```bash
# Example (container platform)
kubectl set image deployment/<backend-deploy> <container>=<rollback-image-digest> -n <namespace>

# Example (compose host)
docker compose -f docker-compose.prod.yml up -d backend
```

### 2.2 Frontend rollback
**Needs Manual Verification**.

**Exact command template:**
```bash
# Example (artifact switch)
<frontend_deploy_command> --artifact <rollback-frontend-hash>
```

### 2.3 Migration impact assessment
- If incident is app-only: do **not** restore DB yet.
- If migration/data corruption suspected: escalate to DB restore decision gate.

Decision owner: IC + DBA

---

## 3) Database Rollback Path (only if required)

> This step is conditional and high impact.

**Needs Manual Verification**.

**Exact command reference:** follow `reports/release/backup-restore-drill-runbook.md` restore procedure using latest safe snapshot ID.

Required before execution:
- [ ] Business owner sign-off for potential data loss window
- [ ] Snapshot ID and timestamp confirmed
- [ ] Restore target/strategy agreed (in-place vs failover)

---

## 4) Post-Rollback Validation (T+20m to T+40m)

Run and capture outputs:
```bash
curl -fsS https://<PROD_API_HOST>/health
curl -fsS https://<PROD_API_HOST>/health/readiness
curl -fsS https://<PROD_API_HOST>/health/liveness
```

Manual critical-flow validation (QA):
- Login/logout
- Property/unit list load
- Payment attempt + result
- Maintenance create/view

**Pass criteria:** health endpoints green + critical flows restored.

---

## 5) Stabilization & Communications (T+40m onward)
1. Announce rollback completion + service status.
2. Continue enhanced monitoring for 60 minutes.
3. Open problem record for root cause analysis.

**Comms template:**
```text
[ROLLBACK COMPLETE] Incident <ID> at <time>.
System restored to <artifact/version>. Core checks passing.
Monitoring elevated for next 60 minutes. RCA to follow.
```

---

## 6) Evidence Capture Template

```markdown
## Rollback Execution Record
- Incident ID:
- Trigger condition:
- Start time / End time:
- IC:
- Rollback backend artifact:
- Rollback frontend artifact:
- DB restore executed? YES/NO
- Commands run:
  -
  -
- Validation results:
- Customer impact window:
- Final status: RECOVERED / PARTIAL / FAILED
- Links: incident channel, logs, dashboard snapshots
```

## 7) Sign-off
- Incident Commander: _____________ Date/Time: ________
- SRE On-call: ___________________ Date/Time: ________
- QA Lead: _______________________ Date/Time: ________
- Release Manager: _______________ Date/Time: ________
