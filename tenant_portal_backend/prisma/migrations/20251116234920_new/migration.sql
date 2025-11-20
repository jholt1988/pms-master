-- DropForeignKey
ALTER TABLE "RentRecommendation" DROP CONSTRAINT "RentRecommendation_unitId_fkey";

-- AlterTable
ALTER TABLE "RentRecommendation" ALTER COLUMN "factors" DROP DEFAULT,
ALTER COLUMN "factors" SET DATA TYPE JSONB,
ALTER COLUMN "marketComparables" DROP DEFAULT,
ALTER COLUMN "marketComparables" SET DATA TYPE JSONB,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "RentRecommendation" ADD CONSTRAINT "RentRecommendation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "RentRecommendation_acceptedById_index" RENAME TO "RentRecommendation_acceptedById_idx";

-- RenameIndex
ALTER INDEX "RentRecommendation_rejectedById_index" RENAME TO "RentRecommendation_rejectedById_idx";

-- RenameIndex
ALTER INDEX "RentRecommendation_status_index" RENAME TO "RentRecommendation_status_idx";

-- RenameIndex
ALTER INDEX "RentRecommendation_unitId_index" RENAME TO "RentRecommendation_unitId_idx";
