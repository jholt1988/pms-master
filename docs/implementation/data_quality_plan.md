# Data Quality Improvement Plan (Implementation-Ready)

## Objective
Establish a repeatable, auditable data quality program for the app that delivers:
- Deduplication
- Standardization
- Enrichment
- High-quality transformations
- Governance and monitoring

This document is formatted for implementation planning and execution.

---

## 1) Scope and Key Entities
**Primary tables/models** (from `tenant_portal_backend/prisma/schema.prisma`):
- `User`
- `Property`
- `PropertyMarketingProfile`
- `PropertyPhoto`
- `Amenity`
- `PropertyAmenity`

**Supporting entities** (affected by dedup merges):
- `Lease`, `Payment`, `MaintenanceRequest`, `Unit`, `Document`, `Inspection`, `Tour`, `LeadApplication`, etc.

---

## 2) Data Quality Rules (Canonical)
### 2.1 Completeness
- `User.email`, `User.phoneNumber`, `User.firstName`, `User.lastName` should be non-null for active tenants.
- `Property.address`, `Property.city`, `Property.state`, `Property.zipCode` should be non-null.
- `Property.latitude` and `Property.longitude` should be populated for active listings.

### 2.2 Validity
- Email must match RFC-5322-compliant regex.
- Phone must be E.164 formatted.
- `Property.state` must be ISO-3166-2 (US state code).
- `Property.country` must be ISO-3166-1 alpha-2 (default `US`).
- `Property.latitude` in [-90, 90], `Property.longitude` in [-180, 180].
- `Property.minRent <= Property.maxRent`.

### 2.3 Uniqueness & Deduplication
- `User` duplicates: normalize and match on email; fallback to (phone + name).
- `Property` duplicates: normalize on address + city + state + zip.
- `Amenity` duplicates: normalize on `key` and `label`.

### 2.4 Consistency
- `Property.minRent/maxRent` must align with `PropertyMarketingProfile.minRent/maxRent`.
- `PropertyPhoto.isPrimary` should be unique per property.

### 2.5 Timeliness
- `PropertyMarketingProfile.lastSyncedAt` should be within acceptable SLA (e.g., 24h for active listings).

---

## 3) Implementation Workstream Plan

### Workstream A: Profiling & Baseline Metrics
**Goal**: Establish baseline quality metrics.

**Tasks**
1. Build SQL profiling scripts to compute:
   - Null rates
   - Invalid format counts
   - Duplicate counts
   - Out-of-range counts
2. Create a weekly scheduled job to store metrics in a `data_quality_metrics` table.

**Example SQL (Postgres)**
```sql
-- Null rates for key user fields
SELECT
  COUNT(*) AS total_users,
  SUM((email IS NULL)::int) AS null_email,
  SUM((phoneNumber IS NULL)::int) AS null_phone,
  SUM((firstName IS NULL)::int) AS null_first_name,
  SUM((lastName IS NULL)::int) AS null_last_name
FROM "User";

-- Duplicate properties by normalized address
SELECT
  lower(trim(address)) AS address_norm,
  lower(trim(city)) AS city_norm,
  lower(trim(state)) AS state_norm,
  trim(zipCode) AS zip_norm,
  COUNT(*) AS dup_count
FROM "Property"
GROUP BY 1,2,3,4
HAVING COUNT(*) > 1;
```

**Deliverables**
- `scripts/data-quality/profiling.sql`
- `data_quality_metrics` table
- Dashboard or CSV export in `/docs/implementation/data_quality_metrics.md`

---

### Workstream B: Data Standardization
**Goal**: Normalize formats for identifiers and addresses.

**Tasks**
1. Implement normalization utilities:
   - E.164 phone formatting
   - Email trimming/lowercasing
   - Address normalization (USPS/Google)
2. Apply normalization at ingestion and update flows.
3. Backfill historical records with a controlled migration.

**Deliverables**
- `src/utils/normalizePhone.ts`
- `src/utils/normalizeEmail.ts`
- ETL/migration job for historical backfill

---

### Workstream C: Deduplication
**Goal**: Detect and merge duplicate users and properties.

**Tasks**
1. Implement matching rules:
   - Users: email (exact), or (phone + name)
   - Properties: normalized address
2. Add a `dedupe_candidates` table to stage matches.
3. Implement merge procedure:
   - Choose primary record
   - Re-point foreign keys
   - Archive duplicates

**Deliverables**
- `scripts/data-quality/dedupe_users.sql`
- `scripts/data-quality/dedupe_properties.sql`
- Merge stored procedure or application service

---

### Workstream D: Enrichment
**Goal**: Enhance data for analytics and operations.

**Tasks**
1. Geocode missing `Property.latitude` and `Property.longitude`.
2. Enrich property metadata (marketing tags, amenity categories).
3. Store enrichment metadata with `source`, `confidence`, `updatedAt`.

**Deliverables**
- `scripts/enrichment/geocode_properties.ts`
- `Property` update job with enrichment metadata

---

### Workstream E: High-Quality Transformations
**Goal**: Create clean, consistent datasets for reporting.

**Tasks**
1. Build a `clean_property` view/table enforcing all validity rules.
2. Build a `clean_user` view/table with required identity fields.
3. Add derived fields: rent range, availability status, profile completeness score.

**Deliverables**
- `scripts/data-quality/build_clean_views.sql`
- `docs/implementation/clean_data_contracts.md`

---

### Workstream F: Governance & Monitoring
**Goal**: Institutionalize quality management.

**Tasks**
1. Define data ownership and stewardship.
2. Create data dictionary and glossary.
3. Add continuous checks with alert thresholds.

**Deliverables**
- `docs/implementation/data_dictionary.md`
- `docs/implementation/data_quality_slos.md`
- Monitoring dashboards (Grafana/DataDog)

---

## 4) Implementation Sequence (Recommended)
1. Profiling & metrics (Workstream A)
2. Standardization utilities and backfill (Workstream B)
3. Deduplication rules and merge procedures (Workstream C)
4. Enrichment pipelines (Workstream D)
5. Clean data transformations (Workstream E)
6. Governance + monitoring (Workstream F)

---

## 5) Acceptance Criteria
- Null rate for `Property.address/city/state/zip` < 1%
- Duplicate properties < 0.1%
- Valid phone/email formatting > 99%
- `Property.latitude/longitude` coverage > 95%
- `Property.minRent <= maxRent` enforced 100%

---

## 6) Risks & Mitigations
- **Risk**: Incorrect merges in deduplication.
  - **Mitigation**: Manual review for high-impact merges; dry-run mode.
- **Risk**: Enrichment API rate limits.
  - **Mitigation**: Batch processing with retries and caching.

---

## 7) Implementation Notes (Codex-Ready)
- Prefer SQL-first profiling and batch jobs.
- Always stage data fixes in temporary tables before applying updates.
- Use idempotent scripts for ETL and migrations.
- Include audit logs for merges and enrichment updates.

---

## 8) File Placement
- Documentation: `docs/implementation/data_quality_plan.md` (this file)
- SQL Scripts: `scripts/data-quality/*`
- ETL/Jobs: `scripts/enrichment/*` or `src/jobs/*`

