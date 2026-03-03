-- Ensure Technician has organization scope in environments with legacy table shape
DO $$
DECLARE
  fallback_org uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'Technician'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'Technician' AND column_name = 'organizationId'
    ) THEN
      ALTER TABLE "Technician" ADD COLUMN "organizationId" UUID;

      SELECT id INTO fallback_org FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1;
      IF fallback_org IS NULL THEN
        fallback_org := '11111111-1111-4111-8111-111111111111'::uuid;
        INSERT INTO "Organization" ("id", "name", "createdAt", "updatedAt")
        VALUES (fallback_org, 'Default Organization', now(), now())
        ON CONFLICT ("id") DO NOTHING;
      END IF;

      UPDATE "Technician" SET "organizationId" = fallback_org WHERE "organizationId" IS NULL;

      ALTER TABLE "Technician" ALTER COLUMN "organizationId" SET NOT NULL;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Technician_organizationId_fkey'
      ) THEN
        ALTER TABLE "Technician"
          ADD CONSTRAINT "Technician_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;

      CREATE INDEX IF NOT EXISTS "Technician_organizationId_idx" ON "Technician"("organizationId");
    END IF;
  END IF;
END $$;
