# Ops P0 — Backup & Restore Drill Runbook
Date: 2026-03-15
Owner: DBA/SRE
Status: Required before GO

## Purpose
Provide an executable, low-risk drill to prove recoverability (RTO/RPO confidence) before release.

## Safety Rules
- Run restore into **non-production target** only.
- No destructive operations on production.
- Record exact timestamps for snapshot start, restore start, restore complete.

## Roles
- **DBA/SRE:** executes snapshot + restore drill
- **QA Lead:** verifies data integrity checks
- **Release Manager:** validates evidence completeness for GO/NO-GO

---

## 1) Pre-Drill Inputs (must be filled)
- Production DB engine/version: __________________
- Snapshot mechanism (cloud/native): _____________
- Restore target environment: _____________________
- Candidate snapshot ID: _________________________
- RTO target: ______ minutes
- RPO target: ______ minutes

---

## 2) Backup Snapshot Verification

### 2.1 Confirm latest production snapshot exists
**Needs Manual Verification** (infra access needed).

**Exact command (template, choose one used in environment):**
```bash
# AWS RDS example
aws rds describe-db-snapshots --db-instance-identifier <DB_INSTANCE> --snapshot-type automated --max-items 5

# Postgres logical backup example
pg_dump --version
```

**Pass criteria:** Latest snapshot timestamp is within RPO target.

### 2.2 Record snapshot metadata
Capture:
- Snapshot ID
- Created timestamp (UTC + local TZ)
- Source DB identifier
- Storage region/account

---

## 3) Restore Drill (to non-prod)

### 3.1 Provision restore target
**Needs Manual Verification**.

**Exact command (example template):**
```bash
# AWS RDS example
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier <DRILL_DB_INSTANCE> \
  --db-snapshot-identifier <SNAPSHOT_ID> \
  --db-instance-class <CLASS>
```

### 3.2 Wait for availability
```bash
# AWS RDS example
aws rds wait db-instance-available --db-instance-identifier <DRILL_DB_INSTANCE>
```

### 3.3 Connectivity and schema check (non-destructive)
```bash
psql "<DRILL_DATABASE_URL>" -c "select now();"
psql "<DRILL_DATABASE_URL>" -c "select count(*) from information_schema.tables where table_schema='public';"
```

### 3.4 Application-level verification queries
```bash
psql "<DRILL_DATABASE_URL>" -c "select count(*) as users from users;"
psql "<DRILL_DATABASE_URL>" -c "select count(*) as properties from properties;"
psql "<DRILL_DATABASE_URL>" -c "select count(*) as payments from payments;"
```
(Adjust table names to actual schema if needed.)

### 3.5 Optional API smoke against restored environment
**Needs Manual Verification**.

**Exact command:**
```bash
curl -fsS https://<RESTORED_ENV_API_HOST>/health/readiness
```

---

## 4) RTO/RPO Evaluation
- Restore start: __________________
- Restore complete: _______________
- Effective RTO: __________________
- Snapshot age at incident baseline: _________
- Effective RPO: __________________

**Pass criteria:** Effective RTO/RPO meet target and data checks pass.

---

## 5) Post-Drill Cleanup
**Needs Manual Verification** (infra-specific).

**Exact command (example):**
```bash
# AWS RDS example
aws rds delete-db-instance --db-instance-identifier <DRILL_DB_INSTANCE> --skip-final-snapshot
```

> Execute cleanup only after evidence capture is complete.

---

## 6) Evidence Template (mandatory)

```markdown
## Backup & Restore Drill Evidence
- Drill date/time (TZ):
- Owner(s):
- Snapshot ID:
- Snapshot timestamp:
- Restore target identifier:
- Commands executed:
  -
  -
- Verification query results summary:
- API health result:
- Effective RTO:
- Effective RPO:
- Meets target? YES/NO
- Artifacts (screenshots/log links):
- Open issues / follow-ups:
```

## 7) Sign-off
- DBA/SRE: ____________________ Date/Time: __________
- QA Lead: ____________________ Date/Time: __________
- Release Manager: ____________ Date/Time: __________
