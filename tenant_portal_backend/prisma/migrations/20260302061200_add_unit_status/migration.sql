DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'UnitStatus'
      AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "UnitStatus" AS ENUM ('ACTIVE', 'MANAGED', 'ARCHIVED');
  END IF;
END$$;

ALTER TABLE "Unit"
  ADD COLUMN IF NOT EXISTS "status" "UnitStatus" NOT NULL DEFAULT 'MANAGED';
