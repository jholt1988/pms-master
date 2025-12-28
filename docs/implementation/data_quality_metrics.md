# Data Quality Metrics Tracking

## Overview
This document outlines the baseline metrics produced by the profiling scripts and how to refresh them weekly.

## Source of Truth
- SQL profiling script: `scripts/data-quality/profiling.sql`
- Metrics table: `data_quality_metrics`

## Metric Catalog
| Metric Name | Entity | Definition | Notes |
| --- | --- | --- | --- |
| null_rate | User | Null ratio per required user fields | Details JSON stores field, total, nulls |
| null_rate | Property | Null ratio per required property fields | Details JSON stores field, total, nulls |
| geo_coverage | Property | Ratio of properties with latitude + longitude | Details JSON stores total, with_geo |
| geo_out_of_range | Property | Count of properties outside valid lat/long ranges | Details JSON stores total |
| invalid_rent_range | Property | Count where minRent > maxRent | Details JSON stores total |
| duplicate_address_count | Property | Count of duplicated normalized addresses | Details JSON stores normalized address |
| duplicate_email_count | User | Count of duplicated normalized emails | Details JSON stores email + count |

## Refresh Cadence
- Schedule the SQL script weekly using the existing scheduler or a cron job tied to the analytics database.
- Store the script output in the `data_quality_metrics` table and export to CSV for dashboarding.

## Weekly Export (Example)
```sql
COPY (
  SELECT
    metric_date,
    entity,
    metric_name,
    metric_value,
    details
  FROM data_quality_metrics
  WHERE metric_date >= now() - interval '7 days'
  ORDER BY metric_date DESC
) TO '/tmp/data_quality_metrics.csv' WITH CSV HEADER;
```
