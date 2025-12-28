# Prisma Process for Data Quality Workflows

## Overview
This data quality program relies on Prisma-managed tables (e.g., `User`, `Property`, `PropertyMarketingProfile`).
To prevent runtime errors, ensure Prisma migrations are applied and the Prisma Client is generated before running
any data-quality SQL or TypeScript jobs.

## Recommended Execution Order
1. **Apply Prisma migrations** (or schema deploy) to ensure core tables exist.
2. **Generate Prisma Client** so TypeScript jobs can connect safely.
3. **Run SQL setup scripts** to create data quality tables and views.
4. **Run normalization backfill** to standardize existing data.
5. **Run dedupe candidate scripts** to populate staging tables.
6. **Run merge procedures** only after manual review.
7. **Run enrichment jobs** when API credentials are configured.

## Why Prisma Comes First
- The SQL scripts and jobs expect Prisma tables to be present and in sync with the schema.
- Prisma Client generation is required before running any TypeScript scripts that use `PrismaClient`.

## Automation Scripts
Use the scripts below to ensure Prisma setup is handled consistently before data-quality runs:
- `scripts/data-quality/run_prisma_setup.sh`
- `scripts/data-quality/run_prisma_setup.ps1`

## Example End-to-End Flow (Unix)
```bash
scripts/data-quality/run_prisma_setup.sh
psql "$DATABASE_URL" -f scripts/data-quality/profiling.sql
node scripts/data-quality/backfill_normalization.ts
psql "$DATABASE_URL" -f scripts/data-quality/dedupe_users.sql
psql "$DATABASE_URL" -f scripts/data-quality/dedupe_properties.sql
```
