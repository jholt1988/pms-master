-- CreateEnum
CREATE TYPE "QualificationStatus" AS ENUM ('QUALIFIED', 'NOT_QUALIFIED');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('RECOMMEND_RENT', 'DO_NOT_RECOMMEND_RENT');

-- AlterTable
ALTER TABLE "RentalApplication" ADD COLUMN     "qualificationStatus" "QualificationStatus",
ADD COLUMN     "recommendation" "Recommendation",
ADD COLUMN     "screeningDetails" TEXT;
