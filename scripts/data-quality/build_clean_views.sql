CREATE OR REPLACE VIEW clean_user AS
SELECT
  u.id,
  u.username,
  u.email,
  u."phoneNumber" AS phone_number,
  u."firstName" AS first_name,
  u."lastName" AS last_name,
  u.role,
  u."lastLoginAt" AS last_login_at,
  u."createdAt" AS created_at,
  u."updatedAt" AS updated_at,
  (u.email ~* '^(?:[a-z0-9!#$%&''*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&''*+/=?^_`{|}~-]+)*|"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])$') AS is_email_valid,
  (u."phoneNumber" ~ '^\\+[1-9]\\d{7,14}$') AS is_phone_valid,
  (
    (CASE WHEN u.email IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN u."phoneNumber" IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN u."firstName" IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN u."lastName" IS NOT NULL THEN 1 ELSE 0 END
    ) / 4.0
  ) AS profile_completeness_score
FROM "User" u
WHERE u."firstName" IS NOT NULL
  AND u."lastName" IS NOT NULL
  AND u.email IS NOT NULL
  AND u."phoneNumber" IS NOT NULL
  AND u.email ~* '^(?:[a-z0-9!#$%&''*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&''*+/=?^_`{|}~-]+)*|\"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*\")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])$'
  AND u."phoneNumber" ~ '^\\+[1-9]\\d{7,14}$';

CREATE OR REPLACE VIEW clean_property AS
SELECT
  p.id,
  p.name,
  p.address,
  p.city,
  p.state,
  p."zipCode" AS zip_code,
  COALESCE(p.country, 'US') AS country,
  p.latitude,
  p.longitude,
  p."minRent" AS min_rent,
  p."maxRent" AS max_rent,
  p."propertyType" AS property_type,
  p.bedrooms,
  p.bathrooms,
  p.tags,
  p."yearBuilt" AS year_built,
  p."createdAt" AS created_at,
  p."updatedAt" AS updated_at,
  mp."availabilityStatus" AS availability_status,
  mp."lastSyncedAt" AS last_synced_at,
  mp."minRent" AS marketing_min_rent,
  mp."maxRent" AS marketing_max_rent,
  (p."minRent" IS NULL OR p."maxRent" IS NULL OR p."minRent" <= p."maxRent") AS is_rent_valid,
  (p.latitude BETWEEN -90 AND 90 AND p.longitude BETWEEN -180 AND 180) AS is_geo_valid,
  (mp."minRent" IS NULL OR mp."maxRent" IS NULL OR mp."minRent" <= mp."maxRent") AS is_marketing_rent_valid,
  (mp."minRent" IS NULL OR mp."maxRent" IS NULL OR p."minRent" IS NULL OR p."maxRent" IS NULL OR (p."minRent" = mp."minRent" AND p."maxRent" = mp."maxRent")) AS is_rent_consistent,
  (p."minRent" IS NOT NULL AND p."maxRent" IS NOT NULL) AS has_rent_range,
  (p."maxRent" - p."minRent") AS rent_range,
  (
    (CASE WHEN p.address IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN p.city IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN p.state IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN p."zipCode" IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN p.latitude IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN p.longitude IS NOT NULL THEN 1 ELSE 0 END
    ) / 6.0
  ) AS profile_completeness_score
FROM "Property" p
LEFT JOIN "PropertyMarketingProfile" mp
  ON mp."propertyId" = p.id
WHERE p.address IS NOT NULL
  AND p.city IS NOT NULL
  AND p.state IS NOT NULL
  AND p."zipCode" IS NOT NULL
  AND (p."minRent" IS NULL OR p."maxRent" IS NULL OR p."minRent" <= p."maxRent")
  AND p.latitude BETWEEN -90 AND 90
  AND p.longitude BETWEEN -180 AND 180
  AND (mp."minRent" IS NULL OR mp."maxRent" IS NULL OR mp."minRent" <= mp."maxRent");
