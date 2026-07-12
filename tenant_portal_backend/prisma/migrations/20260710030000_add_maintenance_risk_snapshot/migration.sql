-- CreateEnum
CREATE TYPE "MaintenanceRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "MaintenanceRiskSnapshot" (
    "id" UUID NOT NULL,
    "assetId" INTEGER NOT NULL,
    "organizationId" UUID NOT NULL,
    "category" "MaintenanceAssetCategory" NOT NULL,
    "riskLevel" "MaintenanceRiskLevel" NOT NULL,
    "failureProbability30d" DOUBLE PRECISION NOT NULL,
    "remainingUsefulLifeDays" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "drivers" JSONB,
    "dataQualityFlags" JSONB,
    "recommendedAction" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRiskSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceRiskSnapshot_organizationId_scannedAt_idx" ON "MaintenanceRiskSnapshot"("organizationId", "scannedAt");

-- CreateIndex
CREATE INDEX "MaintenanceRiskSnapshot_assetId_scannedAt_idx" ON "MaintenanceRiskSnapshot"("assetId", "scannedAt");

ALTER TABLE "Lease" ADD COLUMN "depositAmount" INTEGER;

ALTER TABLE "Lease" ADD COLUMN "currentBalance" TEXT;