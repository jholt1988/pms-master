-- This migration modifies RentRecommendation table if it exists
-- The table is created in a later migration (20251117120000_add_rent_recommendations)
-- So we check if the table exists before attempting to modify it

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RentRecommendation') THEN
    -- DropForeignKey
    ALTER TABLE "RentRecommendation" DROP CONSTRAINT IF EXISTS "RentRecommendation_unitId_fkey";

    -- AlterTable
    ALTER TABLE "RentRecommendation" 
      ALTER COLUMN "factors" DROP DEFAULT,
      ALTER COLUMN "factors" SET DATA TYPE JSONB,
      ALTER COLUMN "marketComparables" DROP DEFAULT,
      ALTER COLUMN "marketComparables" SET DATA TYPE JSONB,
      ALTER COLUMN "updatedAt" DROP DEFAULT;

    -- AddForeignKey
    ALTER TABLE "RentRecommendation" ADD CONSTRAINT "RentRecommendation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    -- RenameIndex (only if index exists)
    IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'RentRecommendation_acceptedById_index') THEN
      ALTER INDEX "RentRecommendation_acceptedById_index" RENAME TO "RentRecommendation_acceptedById_idx";
    END IF;

    IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'RentRecommendation_rejectedById_index') THEN
      ALTER INDEX "RentRecommendation_rejectedById_index" RENAME TO "RentRecommendation_rejectedById_idx";
    END IF;

    IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'RentRecommendation_status_index') THEN
      ALTER INDEX "RentRecommendation_status_index" RENAME TO "RentRecommendation_status_idx";
    END IF;

    IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'RentRecommendation_unitId_index') THEN
      ALTER INDEX "RentRecommendation_unitId_index" RENAME TO "RentRecommendation_unitId_idx";
    END IF;
  END IF;
END $$;
