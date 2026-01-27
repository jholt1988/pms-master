-- Adds daily bucketing for AssetRiskScore to enable ON CONFLICT upserts and prevent table bloat.
-- Safe to run even if some parts already exist.

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  -- Guard: if the table doesn't exist yet, skip (it will be created by an earlier migration).
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'AssetRiskScore'
  ) THEN
    RETURN;
  END IF;

  -- 1) Add scoredOn as DATE (nullable first)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AssetRiskScore'
      AND column_name = 'scoredOn'
  ) THEN
    ALTER TABLE "AssetRiskScore" ADD COLUMN "scoredOn" DATE;
  END IF;

  -- 2) Backfill scoredOn from scoredAt
  UPDATE "AssetRiskScore"
  SET "scoredOn" = ("scoredAt" AT TIME ZONE 'UTC')::date
  WHERE "scoredOn" IS NULL
    AND "scoredAt" IS NOT NULL;

  -- 3) Deduplicate (keep newest scoredAt) before unique constraint
  WITH ranked AS (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "maintenanceAssetId", "modelName", "modelVersion", "scoredOn"
        ORDER BY "scoredAt" DESC, "id" DESC
      ) AS rn
    FROM "AssetRiskScore"
    WHERE "scoredOn" IS NOT NULL
  )
  DELETE FROM "AssetRiskScore" a
  USING ranked r
  WHERE a."id" = r."id"
    AND r.rn > 1;

  -- 4) scoredOn must be not null
  -- If you have any rows with scoredAt null, you may need to delete/backfill them first.
  ALTER TABLE "AssetRiskScore" ALTER COLUMN "scoredOn" SET NOT NULL;

  -- 5) Add unique constraint (idempotent)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AssetRiskScore_asset_model_version_scoredOn_key'
  ) THEN
    ALTER TABLE "AssetRiskScore"
    ADD CONSTRAINT "AssetRiskScore_asset_model_version_scoredOn_key"
    UNIQUE ("maintenanceAssetId", "modelName", "modelVersion", "scoredOn");
  END IF;

  -- 6) Helpful indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'AssetRiskScore_maintenanceAssetId_scoredOn_idx'
  ) THEN
    CREATE INDEX "AssetRiskScore_maintenanceAssetId_scoredOn_idx"
      ON "AssetRiskScore" ("maintenanceAssetId", "scoredOn");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'AssetRiskScore_modelName_modelVersion_scoredOn_idx'
  ) THEN
    CREATE INDEX "AssetRiskScore_modelName_modelVersion_scoredOn_idx"
      ON "AssetRiskScore" ("modelName", "modelVersion", "scoredOn");
  END IF;
END $$;
