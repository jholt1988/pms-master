/*
  Warnings:

  - Added the required column `updatedAt` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApplicationStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE 'SCREENING';
ALTER TYPE "ApplicationStatus" ADD VALUE 'BACKGROUND_CHECK';
ALTER TYPE "ApplicationStatus" ADD VALUE 'DOCUMENTS_REVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE 'INTERVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE 'WITHDRAWN';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_DUE';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
UPDATE "Payment" SET "updatedAt" = "paymentDate" WHERE "updatedAt" IS NULL;

-- AlterTable
ALTER TABLE "RentRecommendation" ALTER COLUMN "factors" DROP DEFAULT,
ALTER COLUMN "marketComparables" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ApplicationLifecycleEvent" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus" NOT NULL,
    "performedById" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationLifecycleEvent_applicationId_idx" ON "ApplicationLifecycleEvent"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationLifecycleEvent_createdAt_idx" ON "ApplicationLifecycleEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "ApplicationLifecycleEvent" ADD CONSTRAINT "ApplicationLifecycleEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationLifecycleEvent" ADD CONSTRAINT "ApplicationLifecycleEvent_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
