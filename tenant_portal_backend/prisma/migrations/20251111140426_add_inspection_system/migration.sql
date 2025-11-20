-- CreateEnum
CREATE TYPE "InspectionCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'NON_FUNCTIONAL');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('BEDROOM', 'BATHROOM', 'KITCHEN', 'LIVING_ROOM', 'DINING_ROOM', 'UTILITY_ROOM', 'EXTERIOR_BUILDING', 'EXTERIOR_LANDSCAPING', 'EXTERIOR_PARKING', 'COMMON_HALLWAYS', 'COMMON_LAUNDRY', 'COMMON_LOBBY', 'OTHER');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InspectionType" ADD VALUE 'ANNUAL';
ALTER TYPE "InspectionType" ADD VALUE 'EMERGENCY';

-- AlterTable
ALTER TABLE "UnitInspection" ADD COLUMN     "generalNotes" TEXT,
ADD COLUMN     "leaseId" INTEGER,
ADD COLUMN     "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportPath" TEXT,
ADD COLUMN     "tenantId" INTEGER;

-- CreateTable
CREATE TABLE "InspectionRoom" (
    "id" SERIAL NOT NULL,
    "inspectionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "roomType" "RoomType" NOT NULL,

    CONSTRAINT "InspectionRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionChecklistItem" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "condition" "InspectionCondition",
    "notes" TEXT,
    "estimatedAge" INTEGER,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InspectionChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionChecklistSubItem" (
    "id" SERIAL NOT NULL,
    "parentItemId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "condition" "InspectionCondition",
    "estimatedAge" INTEGER,

    CONSTRAINT "InspectionChecklistSubItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionChecklistPhoto" (
    "id" SERIAL NOT NULL,
    "checklistItemId" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionChecklistPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionSignature" (
    "id" SERIAL NOT NULL,
    "inspectionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "signatureData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairEstimate" (
    "id" SERIAL NOT NULL,
    "inspectionId" INTEGER,
    "maintenanceRequestId" INTEGER,
    "propertyId" INTEGER,
    "unitId" INTEGER,
    "totalLaborCost" DOUBLE PRECISION NOT NULL,
    "totalMaterialCost" DOUBLE PRECISION NOT NULL,
    "totalProjectCost" DOUBLE PRECISION NOT NULL,
    "itemsToRepair" INTEGER NOT NULL,
    "itemsToReplace" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" INTEGER NOT NULL,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "approvedById" INTEGER,

    CONSTRAINT "RepairEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairEstimateLineItem" (
    "id" SERIAL NOT NULL,
    "estimateId" INTEGER NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "laborHours" DOUBLE PRECISION,
    "laborRate" DOUBLE PRECISION,
    "laborCost" DOUBLE PRECISION NOT NULL,
    "materialCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "originalCost" DOUBLE PRECISION,
    "depreciatedValue" DOUBLE PRECISION,
    "depreciationRate" DOUBLE PRECISION,
    "conditionAdjustment" DOUBLE PRECISION,
    "estimatedLifetime" INTEGER,
    "currentAge" INTEGER,
    "repairInstructions" TEXT,
    "notes" TEXT,

    CONSTRAINT "RepairEstimateLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InspectionRoom_inspectionId_idx" ON "InspectionRoom"("inspectionId");

-- CreateIndex
CREATE INDEX "InspectionChecklistItem_roomId_idx" ON "InspectionChecklistItem"("roomId");

-- CreateIndex
CREATE INDEX "InspectionChecklistItem_condition_idx" ON "InspectionChecklistItem"("condition");

-- CreateIndex
CREATE INDEX "InspectionChecklistItem_requiresAction_idx" ON "InspectionChecklistItem"("requiresAction");

-- CreateIndex
CREATE INDEX "InspectionChecklistSubItem_parentItemId_idx" ON "InspectionChecklistSubItem"("parentItemId");

-- CreateIndex
CREATE INDEX "InspectionChecklistPhoto_checklistItemId_idx" ON "InspectionChecklistPhoto"("checklistItemId");

-- CreateIndex
CREATE INDEX "InspectionSignature_inspectionId_idx" ON "InspectionSignature"("inspectionId");

-- CreateIndex
CREATE INDEX "InspectionSignature_userId_idx" ON "InspectionSignature"("userId");

-- CreateIndex
CREATE INDEX "RepairEstimate_inspectionId_idx" ON "RepairEstimate"("inspectionId");

-- CreateIndex
CREATE INDEX "RepairEstimate_maintenanceRequestId_idx" ON "RepairEstimate"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "RepairEstimate_status_idx" ON "RepairEstimate"("status");

-- CreateIndex
CREATE INDEX "RepairEstimateLineItem_estimateId_idx" ON "RepairEstimateLineItem"("estimateId");

-- CreateIndex
CREATE INDEX "RepairEstimateLineItem_category_idx" ON "RepairEstimateLineItem"("category");

-- CreateIndex
CREATE INDEX "UnitInspection_leaseId_idx" ON "UnitInspection"("leaseId");

-- AddForeignKey
ALTER TABLE "UnitInspection" ADD CONSTRAINT "UnitInspection_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitInspection" ADD CONSTRAINT "UnitInspection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRoom" ADD CONSTRAINT "InspectionRoom_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "UnitInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionChecklistItem" ADD CONSTRAINT "InspectionChecklistItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "InspectionRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionChecklistSubItem" ADD CONSTRAINT "InspectionChecklistSubItem_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "InspectionChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionChecklistPhoto" ADD CONSTRAINT "InspectionChecklistPhoto_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "InspectionChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionChecklistPhoto" ADD CONSTRAINT "InspectionChecklistPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionSignature" ADD CONSTRAINT "InspectionSignature_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "UnitInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionSignature" ADD CONSTRAINT "InspectionSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "UnitInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimateLineItem" ADD CONSTRAINT "RepairEstimateLineItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "RepairEstimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
