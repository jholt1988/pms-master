CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS data_quality_dedupe_candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_type text NOT NULL,
  primary_id text NOT NULL,
  duplicate_id text NOT NULL,
  match_rule text NOT NULL,
  confidence numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_type, primary_id, duplicate_id, match_rule)
);

WITH normalized_properties AS (
  SELECT
    id,
    lower(trim(address)) AS address_norm,
    lower(trim(city)) AS city_norm,
    lower(trim(state)) AS state_norm,
    trim("zipCode") AS zip_norm
  FROM "Property"
  WHERE address IS NOT NULL
    AND city IS NOT NULL
    AND state IS NOT NULL
    AND "zipCode" IS NOT NULL
),
ranked AS (
  SELECT
    id,
    address_norm,
    city_norm,
    state_norm,
    zip_norm,
    MIN(id) OVER (PARTITION BY address_norm, city_norm, state_norm, zip_norm) AS primary_id
  FROM normalized_properties
)
INSERT INTO data_quality_dedupe_candidates (candidate_type, primary_id, duplicate_id, match_rule)
SELECT
  'Property' AS candidate_type,
  primary_id,
  id AS duplicate_id,
  'address_exact' AS match_rule
FROM ranked
WHERE id <> primary_id
ON CONFLICT DO NOTHING;
