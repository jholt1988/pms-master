-- Property geocoding audit trail
CREATE TABLE IF NOT EXISTS "PropertyGeocodeAudit" (
  "id" SERIAL PRIMARY KEY,
  "propertyId" UUID NOT NULL,
  "organizationId" UUID,
  "query" TEXT,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PropertyGeocodeAudit_propertyId_createdAt_idx"
  ON "PropertyGeocodeAudit" ("propertyId", "createdAt");

CREATE INDEX IF NOT EXISTS "PropertyGeocodeAudit_organizationId_createdAt_idx"
  ON "PropertyGeocodeAudit" ("organizationId", "createdAt");

CREATE INDEX IF NOT EXISTS "PropertyGeocodeAudit_status_createdAt_idx"
  ON "PropertyGeocodeAudit" ("status", "createdAt");
