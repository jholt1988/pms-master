# Phase 5 Backup And Restore Drill

Date: 2026-06-07

Scope: Kansas private beta launch. This drill proves that PostgreSQL backups can be restored into a non-production target and that the restored database is usable by the PropertyOS backend.

## Production Gate

Private beta must not start until one successful restore drill has evidence attached to the release checklist.

Pass criteria:

- Latest backup is within the agreed RPO target.
- Restore into a non-production target completes within the agreed RTO target.
- Restored schema has Prisma migration history and expected core tables.
- Data-count checks complete without errors.
- Backend can run against the restored database long enough to pass a health check.
- Drill evidence records timestamps, commands, results, and owner sign-off.

Initial Kansas private beta targets:

- RPO target: 24 hours.
- RTO target: 4 hours.
- Drill cadence: before private beta, then monthly during private beta.
- Restore target: isolated non-production database or disposable Compose stack.

## Safety Rules

- Never restore over production.
- Never run destructive SQL against production during a drill.
- Use a distinct restore database name, host, or schema.
- Keep restored data in private infrastructure only.
- Delete restored drill data after evidence is captured unless it is needed for an active incident review.
- Do not put raw backup files in the repo.

## Required Inputs

Record these before starting:

| Field | Value |
| --- | --- |
| Drill owner | |
| Drill date/time | |
| Source environment | |
| Source database engine/version | PostgreSQL 16 target for Compose; production provider value required |
| Backup mechanism | Cloud snapshot, managed backup, or `pg_dump` |
| Backup ID/path | |
| Backup timestamp UTC | |
| Restore target | |
| RPO target | 24 hours for private beta |
| RTO target | 4 hours for private beta |

## Option A: Managed Production Snapshot Drill

Use this path for a managed database provider such as RDS, Supabase, Neon, or another hosted PostgreSQL service.

1. Confirm the latest managed backup or snapshot exists.

```bash
# Provider-specific command or console export.
# Record backup ID, backup timestamp, source database, region, and retention class.
```

2. Restore to an isolated non-production target.

```bash
# Provider-specific restore command.
# The target must have a different hostname/database than production.
```

3. Set `DRILL_DATABASE_URL` to the restored target.

```bash
export DRILL_DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<database>?schema=public"
```

4. Run the non-destructive verification queries from this runbook.

5. Point a non-production backend at `DRILL_DATABASE_URL`, then run a health check.

## Option B: Local Compose Logical Backup Drill

Use this path to rehearse the mechanics locally with the repo Compose stack.

1. Start local infrastructure.

```bash
pnpm env:dev
pnpm env:dev:migrate
```

2. Capture a logical backup from the Compose PostgreSQL service.

PowerShell:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path ".\tmp\backup-drills" | Out-Null
docker compose --env-file ops/.env.dev exec -T postgres pg_dump -U pms -d pms -Fc > ".\tmp\backup-drills\pms-$stamp.dump"
```

Bash:

```bash
stamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p tmp/backup-drills
docker compose --env-file ops/.env.dev exec -T postgres pg_dump -U pms -d pms -Fc > "tmp/backup-drills/pms-$stamp.dump"
```

3. Create an isolated restore database inside the local PostgreSQL container.

```bash
docker compose --env-file ops/.env.dev exec -T postgres psql -U pms -d postgres -c "drop database if exists pms_restore_drill;"
docker compose --env-file ops/.env.dev exec -T postgres psql -U pms -d postgres -c "create database pms_restore_drill owner pms;"
```

4. Restore the dump into the isolated database.

PowerShell:

```powershell
Get-Content ".\tmp\backup-drills\<dump-file>.dump" -Encoding Byte -Raw |
  docker compose --env-file ops/.env.dev exec -T postgres pg_restore -U pms -d pms_restore_drill --clean --if-exists
```

Bash:

```bash
cat "tmp/backup-drills/<dump-file>.dump" |
  docker compose --env-file ops/.env.dev exec -T postgres pg_restore -U pms -d pms_restore_drill --clean --if-exists
```

5. Use the restored database URL for checks.

```bash
export DRILL_DATABASE_URL="postgresql://pms:pms@localhost:5432/pms_restore_drill?schema=public"
```

PowerShell:

```powershell
$env:DRILL_DATABASE_URL = "postgresql://pms:pms@localhost:5432/pms_restore_drill?schema=public"
```

## Non-Destructive Verification Queries

Run against the restore target only.

```bash
psql "$DRILL_DATABASE_URL" -c "select now() as restored_database_time;"
psql "$DRILL_DATABASE_URL" -c "select count(*) as public_tables from information_schema.tables where table_schema = 'public';"
psql "$DRILL_DATABASE_URL" -c "select count(*) as migrations from _prisma_migrations;"
psql "$DRILL_DATABASE_URL" -c "select table_name from information_schema.tables where table_schema = 'public' order by table_name limit 20;"
```

Core table count checks:

```bash
psql "$DRILL_DATABASE_URL" -c "select count(*) as organizations from \"Organization\";"
psql "$DRILL_DATABASE_URL" -c "select count(*) as users from \"User\";"
psql "$DRILL_DATABASE_URL" -c "select count(*) as properties from \"Property\";"
psql "$DRILL_DATABASE_URL" -c "select count(*) as units from \"Unit\";"
psql "$DRILL_DATABASE_URL" -c "select count(*) as leases from \"Lease\";"
psql "$DRILL_DATABASE_URL" -c "select count(*) as audit_logs from \"AuditLog\";"
```

If a table name differs in the active schema, record the corrected query in the evidence and update this runbook.

## Backend Restore Smoke

Run a non-production backend against the restored database. Do not use production secrets.

```bash
DATABASE_URL="$DRILL_DATABASE_URL" pnpm --filter tenant_portal_backend start:check
```

In a separate terminal:

```bash
curl -fsS http://127.0.0.1:3001/api/health/liveness
curl -fsS http://127.0.0.1:3001/api/health/readiness
```

Stop the backend after the smoke check.

## RTO And RPO Calculation

Record:

- Backup timestamp UTC.
- Incident baseline timestamp UTC.
- Restore start timestamp UTC.
- Restore complete timestamp UTC.
- Verification complete timestamp UTC.

Calculations:

- Effective RPO = incident baseline timestamp - backup timestamp.
- Effective RTO = verification complete timestamp - restore start timestamp.

The drill passes only if both are within target and all verification checks pass.

## Cleanup

Managed provider:

- Delete the restored drill database or instance after evidence capture.
- Verify no public networking or production credentials remain attached.

Local Compose:

```bash
docker compose --env-file ops/.env.dev exec -T postgres psql -U pms -d postgres -c "drop database if exists pms_restore_drill;"
```

Backup files under `tmp/backup-drills` should be deleted after evidence capture unless needed for immediate troubleshooting.

## Evidence Template

Copy this into the release evidence log.

```markdown
## Backup And Restore Drill Evidence

- Drill date/time:
- Drill owner:
- Source environment:
- Backup mechanism:
- Backup ID/path:
- Backup timestamp UTC:
- Restore target:
- Restore start UTC:
- Restore complete UTC:
- Verification complete UTC:
- Effective RPO:
- Effective RTO:
- Verification query summary:
- Backend health result:
- Cleanup completed? YES/NO
- Meets production gate? YES/NO
- Issues/follow-ups:
- Sign-off:
```

