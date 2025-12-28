-- Data quality profiling metrics
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Idempotent creation of the metrics table
CREATE TABLE IF NOT EXISTS data_quality_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date timestamptz NOT NULL DEFAULT now(),
  entity text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  details jsonb DEFAULT '{}'::jsonb
);

-- Null rates for key user fields
INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'User' AS entity,
  'null_rate' AS metric_name,
  CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM((email IS NULL)::int)::numeric / COUNT(*) END AS metric_value,
  jsonb_build_object('field', 'email', 'total', COUNT(*), 'nulls', SUM((email IS NULL)::int))
FROM "User";

INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'User' AS entity,
  'null_rate' AS metric_name,
  CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(("phoneNumber" IS NULL)::int)::numeric / COUNT(*) END AS metric_value,
  jsonb_build_object('field', 'phoneNumber', 'total', COUNT(*), 'nulls', SUM(("phoneNumber" IS NULL)::int))
FROM "User";

INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'User' AS entity,
  'null_rate' AS metric_name,
  CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(("firstName" IS NULL)::int)::numeric / COUNT(*) END AS metric_value,
  jsonb_build_object('field', 'firstName', 'total', COUNT(*), 'nulls', SUM(("firstName" IS NULL)::int))
FROM "User";

INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'User' AS entity,
  'null_rate' AS metric_name,
  CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(("lastName" IS NULL)::int)::numeric / COUNT(*) END AS metric_value,
  jsonb_build_object('field', 'lastName', 'total', COUNT(*), 'nulls', SUM(("lastName" IS NULL)::int))
FROM "User";

-- Null rates for key property fields
INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'Property' AS entity,
  'null_rate' AS metric_name,
  CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM((address IS NULL)::int)::numeric / COUNT(*) END AS metric_value,
  jsonb_build_object('field', 'address', 'total', COUNT(*), 'nulls', SUM((address IS NULL)::int))
FROM "Property";

INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'Property' AS entity,
  'null_rate' AS metric_name,
  CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM((city IS NULL)::int)::numeric / COUNT(*) END AS metric_value,
  jsonb_build_object('field', 'city', 'total', COUNT(*), 'nulls', SUM((city IS NULL)::int))
FROM "Property";

INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'Property' AS entity,
  'null_rate' AS metric_name,
  CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM((state IS NULL)::int)::numeric / COUNT(*) END AS metric_value,
  jsonb_build_object('field', 'state', 'total', COUNT(*), 'nulls', SUM((state IS NULL)::int))
FROM "Property";

INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'Property' AS entity,
  'null_rate' AS metric_name,
  CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(("zipCode" IS NULL)::int)::numeric / COUNT(*) END AS metric_value,
  jsonb_build_object('field', 'zipCode', 'total', COUNT(*), 'nulls', SUM(("zipCode" IS NULL)::int))
FROM "Property";

-- Latitude/longitude coverage
INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'Property' AS entity,
  'geo_coverage' AS metric_name,
  CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM((latitude IS NOT NULL AND longitude IS NOT NULL)::int)::numeric / COUNT(*) END AS metric_value,
  jsonb_build_object('total', COUNT(*), 'with_geo', SUM((latitude IS NOT NULL AND longitude IS NOT NULL)::int))
FROM "Property";

-- Out-of-range coordinates
INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'Property' AS entity,
  'geo_out_of_range' AS metric_name,
  SUM((latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180)::int),
  jsonb_build_object('total', COUNT(*))
FROM "Property";

-- Invalid rent ranges
INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'Property' AS entity,
  'invalid_rent_range' AS metric_name,
  SUM(("minRent" IS NOT NULL AND "maxRent" IS NOT NULL AND "minRent" > "maxRent")::int),
  jsonb_build_object('total', COUNT(*))
FROM "Property";

-- Duplicate properties by normalized address
INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'Property' AS entity,
  'duplicate_address_count' AS metric_name,
  COUNT(*)::numeric,
  jsonb_build_object('address_norm', address_norm, 'city_norm', city_norm, 'state_norm', state_norm, 'zip_norm', zip_norm)
FROM (
  SELECT
    lower(trim(address)) AS address_norm,
    lower(trim(city)) AS city_norm,
    lower(trim(state)) AS state_norm,
    trim("zipCode") AS zip_norm,
    COUNT(*) AS dup_count
  FROM "Property"
  GROUP BY 1, 2, 3, 4
  HAVING COUNT(*) > 1
) duplicates;

-- Duplicate users by email
INSERT INTO data_quality_metrics (entity, metric_name, metric_value, details)
SELECT
  'User' AS entity,
  'duplicate_email_count' AS metric_name,
  COUNT(*)::numeric,
  jsonb_build_object('email', email_norm, 'dup_count', dup_count)
FROM (
  SELECT
    lower(trim(email)) AS email_norm,
    COUNT(*) AS dup_count
  FROM "User"
  WHERE email IS NOT NULL
  GROUP BY 1
  HAVING COUNT(*) > 1
) duplicates;
