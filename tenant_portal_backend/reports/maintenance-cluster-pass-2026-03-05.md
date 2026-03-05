# Maintenance Cluster Pass — 2026-03-05

## Scope completed
Implemented a backward-compatible maintenance ML-readiness hardening pass focused on:
1. Data-contract helpers for timeline/event consistency and null-safe conversions
2. A non-breaking maintenance feature extraction service under `src/maintenance/ai/*`
3. A diagnostics endpoint for maintenance data quality KPIs
4. Compile-clean delivery

## Files changed (this pass)
- `src/maintenance/ai/maintenance-data-contracts.ts` (new)
- `src/maintenance/ai/maintenance-feature-extraction.service.ts` (new)
- `src/maintenance/ai/maintenance-data-quality.service.ts` (new)
- `src/maintenance/maintenance.controller.ts`
- `src/maintenance/maintenance.module.ts`

## What was added

### 1) Data contracts for survival/modeling readiness
`maintenance-data-contracts.ts` now provides:
- `normalizeMaintenanceStatus(...)` → maps raw `Status` into lifecycle stages (`OPEN | ACTIVE | RESOLVED`)
- `normalizePriorityScore(...)` → stable numeric priority mapping for model inputs
- `toOptionalTimestamp(...)` and `safeHoursBetween(...)` → nullable-field guards and time-delta safety
- `buildMaintenanceTimeline(...)` → normalized event timeline builder from request + history + notes + photos, with chronological sorting and invalid-date filtering

This keeps modeling surfaces consistent and resilient to sparse/nullable maintenance records.

### 2) Feature extraction service (`src/maintenance/ai/*`)
`MaintenanceFeatureExtractionService` added with non-breaking behavior (new provider only; no existing flow changed).

Output includes stable feature payload fields such as:
- lifecycle/status features
- priority score
- age / acknowledge / completion timing
- linkage booleans (`asset`, `assignee`, `lease`, `unit`, `property`, `slaPolicy`)
- interaction counts (`notes`, `photos`, `history`, timeline events)
- anomaly flag (`hasTimelineAnomaly`)
- null-safe normalized timestamps

New endpoint:
- `GET /maintenance/ai/features/:id` (roles: `PROPERTY_MANAGER`, `ADMIN`)
- Org access guardrails enforced before returning features

### 3) Data quality diagnostics
`MaintenanceDataQualityService` added + endpoint:
- `GET /maintenance/diagnostics/data-quality` (roles: `PROPERTY_MANAGER`, `ADMIN`)

KPIs reported:
- Missing `installDate` on assets
- Completed requests missing `completedAt`
- `completedAt < createdAt` chronology violations
- Requests missing linkage (`propertyId`/`unitId`/`leaseId`)
- History rows missing `changedById`

Also returns denominator totals and rates for easy monitoring.

## Backward-compatibility notes
- Existing create/update/assignment behavior was not altered.
- Added services are additive and optional for callers.
- Route additions are non-breaking and scoped by role/org checks.

## Validation
- `npm run build` ✅ (TypeScript compile clean)

## Suggested next steps
1. Add unit tests for:
   - timeline normalization and anomaly detection
   - feature extraction null-guard behavior
   - KPI report calculations
2. Add a lightweight batch export endpoint/job for model training snapshots (e.g., paged feature vectors by date range).
3. Expand linkage KPI to include semantic integrity checks (e.g., lease-unit-property chain consistency, not only null checks).
4. Add threshold-based warning states in diagnostics payload (green/yellow/red bands) for easier ops alerting.
