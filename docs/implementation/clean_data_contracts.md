# Clean Data Contracts

## clean_user View
**Source**: `scripts/data-quality/build_clean_views.sql`

### Contract
- Required fields: `email`, `phone_number`, `first_name`, `last_name`
- Validity checks:
  - `is_email_valid` uses RFC-5322 regex
  - `is_phone_valid` enforces E.164 format
- Derived fields:
  - `profile_completeness_score` (0-1) based on required identity fields

### Notes
- Records missing any required fields are excluded.
- Use this view for downstream reporting and identity matching.

---

## clean_property View
**Source**: `scripts/data-quality/build_clean_views.sql`

### Contract
- Required fields: `address`, `city`, `state`, `zip_code`
- Validity checks:
  - `is_rent_valid` ensures minRent <= maxRent
  - `is_geo_valid` ensures latitude/longitude range
  - `is_marketing_rent_valid` ensures profile min/max rent alignment
- Derived fields:
  - `rent_range`
  - `has_rent_range`
  - `profile_completeness_score` (0-1) based on address + geo fields

### Notes
- Records missing required fields are excluded.
- The view includes marketing profile alignment for reporting.
