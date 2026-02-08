/*
  Warnings:

  - The `unitId` column on the `AgentRun` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `leaseId` column on the `AgentRun` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unitId` column on the `BankTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unitId` column on the `CommunicationLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `leaseId` column on the `CommunicationLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `leaseId` column on the `Document` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unitId` column on the `Expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `issueType` on the `InspectionChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `measurementNotes` on the `InspectionChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `measurementUnit` on the `InspectionChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `measurementValue` on the `InspectionChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `severity` on the `InspectionChecklistItem` table. All the data in the column will be lost.
  - The `unitId` column on the `LeadApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Lease` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `unitId` column on the `MaintenanceAsset` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `MaintenanceRequest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `isAfterHours` on the `MaintenanceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `isUrgentFlag` on the `MaintenanceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `severityDerived` on the `MaintenanceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `severityScoreDerived` on the `MaintenanceRequest` table. All the data in the column will be lost.
  - The `leaseId` column on the `MaintenanceRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unitId` column on the `MaintenanceRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `leaseId` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `organizationId` on the `Property` table. All the data in the column will be lost.
  - The `unitId` column on the `PropertyInquiry` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `RepairEstimate` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `maintenanceRequestId` column on the `RepairEstimate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unitId` column on the `RepairEstimate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unitId` column on the `ScheduleEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unitId` column on the `Tour` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Unit` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `leaseId` column on the `UnitInspection` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserOrganization` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `leaseId` on the `AutopayEnrollment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `leaseId` on the `EsignEnvelope` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `leaseId` on the `Invoice` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Lease` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unitId` on the `Lease` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `leaseId` on the `LeaseDocument` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `leaseId` on the `LeaseHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `leaseId` on the `LeaseNotice` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `leaseId` on the `LeaseRenewalOffer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `requestId` on the `MaintenanceNote` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `requestId` on the `MaintenancePhoto` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `MaintenanceRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `requestId` on the `MaintenanceRequestDocument` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `requestId` on the `MaintenanceRequestHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `name` on table `Property` required. This step will fail if there are existing NULL values in that column.
  - Made the column `address` on table `Property` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `leaseId` on the `RecurringInvoiceSchedule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unitId` on the `RentRecommendation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unitId` on the `RentalApplication` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `RepairEstimate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `estimateId` on the `RepairEstimateLineItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Unit` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unitId` on the `UnitInspection` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ApprovalTaskStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalActionType" AS ENUM ('SEND_MESSAGE', 'ASSIGN_TECHNICIAN', 'CREATE_SCHEDULE_EVENT', 'UPDATE_WORK_ORDER');

-- DropForeignKey
ALTER TABLE "AgentRun" DROP CONSTRAINT "AgentRun_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "AgentRun" DROP CONSTRAINT "AgentRun_requestId_fkey";

-- DropForeignKey
ALTER TABLE "AgentRun" DROP CONSTRAINT "AgentRun_unitId_fkey";

-- DropForeignKey
ALTER TABLE "AutopayEnrollment" DROP CONSTRAINT "AutopayEnrollment_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "BankTransaction" DROP CONSTRAINT "BankTransaction_unitId_fkey";

-- DropForeignKey
ALTER TABLE "CommunicationLog" DROP CONSTRAINT "CommunicationLog_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "CommunicationLog" DROP CONSTRAINT "CommunicationLog_requestId_fkey";

-- DropForeignKey
ALTER TABLE "CommunicationLog" DROP CONSTRAINT "CommunicationLog_unitId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "EsignEnvelope" DROP CONSTRAINT "EsignEnvelope_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_unitId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "LeadApplication" DROP CONSTRAINT "LeadApplication_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "LeadApplication" DROP CONSTRAINT "LeadApplication_unitId_fkey";

-- DropForeignKey
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_unitId_fkey";

-- DropForeignKey
ALTER TABLE "LeaseDocument" DROP CONSTRAINT "LeaseDocument_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "LeaseHistory" DROP CONSTRAINT "LeaseHistory_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "LeaseNotice" DROP CONSTRAINT "LeaseNotice_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "LeaseRenewalOffer" DROP CONSTRAINT "LeaseRenewalOffer_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceAsset" DROP CONSTRAINT "MaintenanceAsset_unitId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceNote" DROP CONSTRAINT "MaintenanceNote_requestId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenancePhoto" DROP CONSTRAINT "MaintenancePhoto_requestId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceRequest" DROP CONSTRAINT "MaintenanceRequest_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceRequest" DROP CONSTRAINT "MaintenanceRequest_unitId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceRequestDocument" DROP CONSTRAINT "MaintenanceRequestDocument_requestId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceRequestHistory" DROP CONSTRAINT "MaintenanceRequestHistory_requestId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyInquiry" DROP CONSTRAINT "PropertyInquiry_unitId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringInvoiceSchedule" DROP CONSTRAINT "RecurringInvoiceSchedule_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "RentRecommendation" DROP CONSTRAINT "RentRecommendation_unitId_fkey";

-- DropForeignKey
ALTER TABLE "RentalApplication" DROP CONSTRAINT "RentalApplication_unitId_fkey";

-- DropForeignKey
ALTER TABLE "RepairEstimate" DROP CONSTRAINT "RepairEstimate_maintenanceRequestId_fkey";

-- DropForeignKey
ALTER TABLE "RepairEstimate" DROP CONSTRAINT "RepairEstimate_unitId_fkey";

-- DropForeignKey
ALTER TABLE "RepairEstimateLineItem" DROP CONSTRAINT "RepairEstimateLineItem_estimateId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleEvent" DROP CONSTRAINT "ScheduleEvent_unitId_fkey";

-- DropForeignKey
ALTER TABLE "Tour" DROP CONSTRAINT "Tour_unitId_fkey";

-- DropForeignKey
ALTER TABLE "UnitInspection" DROP CONSTRAINT "UnitInspection_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "UnitInspection" DROP CONSTRAINT "UnitInspection_unitId_fkey";

-- DropForeignKey
ALTER TABLE "UserOrganization" DROP CONSTRAINT "UserOrganization_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "UserOrganization" DROP CONSTRAINT "UserOrganization_userId_fkey";

-- DropIndex
DROP INDEX "InspectionChecklistItem_issueType_idx";

-- DropIndex
DROP INDEX "InspectionChecklistItem_severity_idx";

-- DropIndex
DROP INDEX "MaintenanceRequest_isAfterHours_idx";

-- DropIndex
DROP INDEX "MaintenanceRequest_isUrgentFlag_idx";

-- DropIndex
DROP INDEX "MaintenanceRequest_severityDerived_idx";

-- DropIndex
DROP INDEX "MaintenanceRequest_severityScoreDerived_idx";

-- DropIndex
DROP INDEX "Property_organizationId_idx";

-- AlterTable
ALTER TABLE "AgentRun" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID,
DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID,
ALTER COLUMN "requestId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "AutopayEnrollment" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "BankTransaction" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID;

-- AlterTable
ALTER TABLE "CommunicationLog" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID,
DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID,
ALTER COLUMN "requestId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID;

-- AlterTable
ALTER TABLE "EsignEnvelope" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID;

-- AlterTable
ALTER TABLE "InspectionChecklistItem" DROP COLUMN "issueType",
DROP COLUMN "measurementNotes",
DROP COLUMN "measurementUnit",
DROP COLUMN "measurementValue",
DROP COLUMN "severity";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "LeadApplication" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID,
ALTER COLUMN "reviewedById" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID NOT NULL,
ADD CONSTRAINT "Lease_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "LeaseDocument" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "LeaseHistory" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "LeaseNotice" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "LeaseRenewalOffer" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceAsset" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID;

-- AlterTable
ALTER TABLE "MaintenanceNote" DROP COLUMN "requestId",
ADD COLUMN     "requestId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "MaintenancePhoto" DROP COLUMN "requestId",
ADD COLUMN     "requestId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceRequest" DROP CONSTRAINT "MaintenanceRequest_pkey",
DROP COLUMN "isAfterHours",
DROP COLUMN "isUrgentFlag",
DROP COLUMN "severityDerived",
DROP COLUMN "severityScoreDerived",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID,
DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID,
ADD CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "MaintenanceRequestDocument" DROP COLUMN "requestId",
ADD COLUMN     "requestId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceRequestHistory" DROP COLUMN "requestId",
ADD COLUMN     "requestId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID;

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "organizationId",
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "address" SET NOT NULL;

-- AlterTable
ALTER TABLE "PropertyInquiry" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID;

-- AlterTable
ALTER TABLE "RecurringInvoiceSchedule" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "RentRecommendation" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "RentalApplication" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "RepairEstimate" DROP CONSTRAINT "RepairEstimate_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "maintenanceRequestId",
ADD COLUMN     "maintenanceRequestId" UUID,
DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID,
ADD CONSTRAINT "RepairEstimate_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "RepairEstimateLineItem" DROP COLUMN "estimateId",
ADD COLUMN     "estimateId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "ScheduleEvent" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID;

-- AlterTable
ALTER TABLE "Tour" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID;

-- AlterTable
ALTER TABLE "Unit" DROP CONSTRAINT "Unit_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "Unit_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "UnitInspection" DROP COLUMN "unitId",
ADD COLUMN     "unitId" UUID NOT NULL,
DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" UUID;

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "UserOrganization";

-- DropEnum
DROP TYPE "InspectionIssueType";

-- DropEnum
DROP TYPE "MeasurementUnit";

-- DropEnum
DROP TYPE "OrgRole";

-- DropEnum
DROP TYPE "SeverityLevel";

-- CreateTable
CREATE TABLE "ApprovalTask" (
    "id" UUID NOT NULL,
    "status" "ApprovalTaskStatus" NOT NULL DEFAULT 'PENDING',
    "agentRunId" TEXT,
    "tenantId" UUID,
    "propertyId" UUID,
    "unitId" UUID,
    "leaseId" UUID,
    "workOrderId" UUID,
    "createdById" UUID,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "executionError" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "actions" JSONB NOT NULL,
    "results" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalTask_status_createdAt_idx" ON "ApprovalTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalTask_tenantId_createdAt_idx" ON "ApprovalTask"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalTask_propertyId_createdAt_idx" ON "ApprovalTask"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalTask_workOrderId_idx" ON "ApprovalTask"("workOrderId");

-- CreateIndex
CREATE INDEX "ApprovalTask_agentRunId_idx" ON "ApprovalTask"("agentRunId");

-- CreateIndex
CREATE UNIQUE INDEX "AutopayEnrollment_leaseId_key" ON "AutopayEnrollment"("leaseId");

-- CreateIndex
CREATE INDEX "Document_leaseId_idx" ON "Document"("leaseId");

-- CreateIndex
CREATE INDEX "EsignEnvelope_leaseId_idx" ON "EsignEnvelope"("leaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Lease_unitId_key" ON "Lease"("unitId");

-- CreateIndex
CREATE INDEX "LeaseDocument_leaseId_createdAt_idx" ON "LeaseDocument"("leaseId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaseHistory_leaseId_createdAt_idx" ON "LeaseHistory"("leaseId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaseNotice_leaseId_type_idx" ON "LeaseNotice"("leaseId", "type");

-- CreateIndex
CREATE INDEX "LeaseRenewalOffer_leaseId_status_idx" ON "LeaseRenewalOffer"("leaseId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceAsset_unitId_idx" ON "MaintenanceAsset"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceAsset_propertyId_unitId_name_key" ON "MaintenanceAsset"("propertyId", "unitId", "name");

-- CreateIndex
CREATE INDEX "MaintenanceNote_requestId_createdAt_idx" ON "MaintenanceNote"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "MaintenancePhoto_requestId_idx" ON "MaintenancePhoto"("requestId");

-- CreateIndex
CREATE INDEX "MaintenanceRequestDocument_requestId_idx" ON "MaintenanceRequestDocument"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRequestDocument_requestId_documentId_key" ON "MaintenanceRequestDocument"("requestId", "documentId");

-- CreateIndex
CREATE INDEX "MaintenanceRequestHistory_requestId_createdAt_idx" ON "MaintenanceRequestHistory"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringInvoiceSchedule_leaseId_key" ON "RecurringInvoiceSchedule"("leaseId");

-- CreateIndex
CREATE INDEX "RentRecommendation_unitId_idx" ON "RentRecommendation"("unitId");

-- CreateIndex
CREATE INDEX "RepairEstimate_maintenanceRequestId_idx" ON "RepairEstimate"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "RepairEstimateLineItem_estimateId_idx" ON "RepairEstimateLineItem"("estimateId");

-- CreateIndex
CREATE INDEX "Tour_unitId_idx" ON "Tour"("unitId");

-- CreateIndex
CREATE INDEX "UnitInspection_unitId_idx" ON "UnitInspection"("unitId");

-- CreateIndex
CREATE INDEX "UnitInspection_leaseId_idx" ON "UnitInspection"("leaseId");

-- AddForeignKey
ALTER TABLE "RentRecommendation" ADD CONSTRAINT "RentRecommendation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAsset" ADD CONSTRAINT "MaintenanceAsset_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequestHistory" ADD CONSTRAINT "MaintenanceRequestHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNote" ADD CONSTRAINT "MaintenanceNote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePhoto" ADD CONSTRAINT "MaintenancePhoto_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseHistory" ADD CONSTRAINT "LeaseHistory_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseDocument" ADD CONSTRAINT "LeaseDocument_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsignEnvelope" ADD CONSTRAINT "EsignEnvelope_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseRenewalOffer" ADD CONSTRAINT "LeaseRenewalOffer_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseNotice" ADD CONSTRAINT "LeaseNotice_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadApplication" ADD CONSTRAINT "LeadApplication_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadApplication" ADD CONSTRAINT "LeadApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceSchedule" ADD CONSTRAINT "RecurringInvoiceSchedule_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopayEnrollment" ADD CONSTRAINT "AutopayEnrollment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitInspection" ADD CONSTRAINT "UnitInspection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitInspection" ADD CONSTRAINT "UnitInspection_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimateLineItem" ADD CONSTRAINT "RepairEstimateLineItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "RepairEstimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequestDocument" ADD CONSTRAINT "MaintenanceRequestDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTask" ADD CONSTRAINT "ApprovalTask_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
