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

-- Email-based duplicates
WITH normalized_emails AS (
  SELECT
    id,
    lower(trim(email)) AS email_norm
  FROM "User"
  WHERE email IS NOT NULL
),
ranked AS (
  SELECT
    id,
    email_norm,
    MIN(id) OVER (PARTITION BY email_norm) AS primary_id
  FROM normalized_emails
)
INSERT INTO data_quality_dedupe_candidates (candidate_type, primary_id, duplicate_id, match_rule)
SELECT
  'User' AS candidate_type,
  primary_id,
  id AS duplicate_id,
  'email_exact' AS match_rule
FROM ranked
WHERE id <> primary_id
ON CONFLICT DO NOTHING;

-- Phone + name duplicates (fallback)
WITH normalized AS (
  SELECT
    id,
    regexp_replace("phoneNumber", '\\D', '', 'g') AS phone_norm,
    lower(trim("firstName")) AS first_name_norm,
    lower(trim("lastName")) AS last_name_norm
  FROM "User"
  WHERE "phoneNumber" IS NOT NULL
    AND "firstName" IS NOT NULL
    AND "lastName" IS NOT NULL
),
ranked AS (
  SELECT
    id,
    phone_norm,
    first_name_norm,
    last_name_norm,
    MIN(id) OVER (PARTITION BY phone_norm, first_name_norm, last_name_norm) AS primary_id
  FROM normalized
)
INSERT INTO data_quality_dedupe_candidates (candidate_type, primary_id, duplicate_id, match_rule)
SELECT
  'User' AS candidate_type,
  primary_id,
  id AS duplicate_id,
  'phone_name' AS match_rule
FROM ranked
WHERE id <> primary_id
ON CONFLICT DO NOTHING;
