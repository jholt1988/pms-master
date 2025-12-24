/*
  Warnings:

  - The `resolvedById` column on the `AnomalyLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `performedById` column on the `ApplicationLifecycleEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `creatorId` column on the `BulkMessageBatch` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ConversationParticipant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `userId` column on the `EsignParticipant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `reviewedById` column on the `LeadApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `uploadedById` column on the `LeaseDocument` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `actorId` column on the `LeaseHistory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `createdById` column on the `LeaseNotice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `respondedById` column on the `LeaseRenewalOffer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `uploadedById` column on the `MaintenancePhoto` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `changedById` column on the `MaintenanceRequestHistory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `createdById` column on the `MessageTemplate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `acceptedById` column on the `RentRecommendation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `rejectedById` column on the `RentRecommendation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `applicantId` column on the `RentalApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `screenedById` column on the `RentalApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `authorId` column on the `RentalApplicationNote` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `approvedById` column on the `RepairEstimate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tenantId` column on the `ScheduleEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `userId` column on the `SecurityEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `userId` column on the `Technician` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `conductedById` column on the `Tour` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `inspectorId` column on the `UnitInspection` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tenantId` column on the `UnitInspection` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `uploadedById` column on the `UnitInspectionPhoto` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_DocumentShares` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `userId` on the `BulkMessageRecipient` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `ConversationParticipant` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `uploadedById` on the `Document` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `createdById` on the `EsignEnvelope` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `recordedById` on the `Expense` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `uploadedById` on the `InspectionChecklistPhoto` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `InspectionSignature` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `tenantId` on the `Lease` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `authorId` on the `MaintenanceNote` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `authorId` on the `MaintenanceRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `senderId` on the `Message` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `Notification` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `NotificationPreference` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `PasswordResetToken` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `Payment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `PaymentMethod` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `generatedById` on the `RepairEstimate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `SavedPropertyFilter` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `createdById` on the `UnitInspection` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `B` on the `_DocumentShares` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `quickbooks_connections` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PreferredContactMethod" AS ENUM ('EMAIL', 'SMS', 'PHONE');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('UI', 'SMS', 'EMAIL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- DropForeignKey
ALTER TABLE "AnomalyLog" DROP CONSTRAINT "AnomalyLog_resolvedById_fkey";

-- DropForeignKey
ALTER TABLE "ApplicationLifecycleEvent" DROP CONSTRAINT "ApplicationLifecycleEvent_performedById_fkey";

-- DropForeignKey
ALTER TABLE "BulkMessageBatch" DROP CONSTRAINT "BulkMessageBatch_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "BulkMessageRecipient" DROP CONSTRAINT "BulkMessageRecipient_userId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "EsignEnvelope" DROP CONSTRAINT "EsignEnvelope_createdById_fkey";

-- DropForeignKey
ALTER TABLE "EsignParticipant" DROP CONSTRAINT "EsignParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "InspectionChecklistPhoto" DROP CONSTRAINT "InspectionChecklistPhoto_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "InspectionSignature" DROP CONSTRAINT "InspectionSignature_userId_fkey";

-- DropForeignKey
ALTER TABLE "LeadApplication" DROP CONSTRAINT "LeadApplication_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LeaseDocument" DROP CONSTRAINT "LeaseDocument_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "LeaseHistory" DROP CONSTRAINT "LeaseHistory_actorId_fkey";

-- DropForeignKey
ALTER TABLE "LeaseNotice" DROP CONSTRAINT "LeaseNotice_createdById_fkey";

-- DropForeignKey
ALTER TABLE "LeaseRenewalOffer" DROP CONSTRAINT "LeaseRenewalOffer_respondedById_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceNote" DROP CONSTRAINT "MaintenanceNote_authorId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenancePhoto" DROP CONSTRAINT "MaintenancePhoto_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceRequest" DROP CONSTRAINT "MaintenanceRequest_authorId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceRequestHistory" DROP CONSTRAINT "MaintenanceRequestHistory_changedById_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "MessageTemplate" DROP CONSTRAINT "MessageTemplate_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_userId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentMethod" DROP CONSTRAINT "PaymentMethod_userId_fkey";

-- DropForeignKey
ALTER TABLE "RentRecommendation" DROP CONSTRAINT "RentRecommendation_acceptedById_fkey";

-- DropForeignKey
ALTER TABLE "RentRecommendation" DROP CONSTRAINT "RentRecommendation_rejectedById_fkey";

-- DropForeignKey
ALTER TABLE "RentalApplication" DROP CONSTRAINT "RentalApplication_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "RentalApplication" DROP CONSTRAINT "RentalApplication_screenedById_fkey";

-- DropForeignKey
ALTER TABLE "RentalApplicationNote" DROP CONSTRAINT "RentalApplicationNote_authorId_fkey";

-- DropForeignKey
ALTER TABLE "RepairEstimate" DROP CONSTRAINT "RepairEstimate_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "RepairEstimate" DROP CONSTRAINT "RepairEstimate_generatedById_fkey";

-- DropForeignKey
ALTER TABLE "SavedPropertyFilter" DROP CONSTRAINT "SavedPropertyFilter_userId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleEvent" DROP CONSTRAINT "ScheduleEvent_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SecurityEvent" DROP CONSTRAINT "SecurityEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "Technician" DROP CONSTRAINT "Technician_userId_fkey";

-- DropForeignKey
ALTER TABLE "Tour" DROP CONSTRAINT "Tour_conductedById_fkey";

-- DropForeignKey
ALTER TABLE "UnitInspection" DROP CONSTRAINT "UnitInspection_createdById_fkey";

-- DropForeignKey
ALTER TABLE "UnitInspection" DROP CONSTRAINT "UnitInspection_inspectorId_fkey";

-- DropForeignKey
ALTER TABLE "UnitInspection" DROP CONSTRAINT "UnitInspection_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "UnitInspectionPhoto" DROP CONSTRAINT "UnitInspectionPhoto_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "_DocumentShares" DROP CONSTRAINT "_DocumentShares_B_fkey";

-- DropForeignKey
ALTER TABLE "quickbooks_connections" DROP CONSTRAINT "quickbooks_connections_userId_fkey";

-- AlterTable
ALTER TABLE "AnomalyLog" DROP COLUMN "resolvedById",
ADD COLUMN     "resolvedById" UUID;

-- AlterTable
ALTER TABLE "ApplicationLifecycleEvent" DROP COLUMN "performedById",
ADD COLUMN     "performedById" UUID;

-- AlterTable
ALTER TABLE "BulkMessageBatch" DROP COLUMN "creatorId",
ADD COLUMN     "creatorId" UUID;

-- AlterTable
ALTER TABLE "BulkMessageRecipient" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_pkey",
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("userId", "conversationId");

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "uploadedById",
ADD COLUMN     "uploadedById" UUID NOT NULL;

-- AlterTable
ALTER TABLE "EsignEnvelope" DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID NOT NULL;

-- AlterTable
ALTER TABLE "EsignParticipant" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID;

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "recordedById",
ADD COLUMN     "recordedById" UUID NOT NULL;

-- AlterTable
ALTER TABLE "InspectionChecklistPhoto" DROP COLUMN "uploadedById",
ADD COLUMN     "uploadedById" UUID NOT NULL;

-- AlterTable
ALTER TABLE "InspectionSignature" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "LeadApplication" DROP COLUMN "reviewedById",
ADD COLUMN     "reviewedById" UUID;

-- AlterTable
ALTER TABLE "Lease" DROP COLUMN "tenantId",
ADD COLUMN     "tenantId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "LeaseDocument" DROP COLUMN "uploadedById",
ADD COLUMN     "uploadedById" UUID;

-- AlterTable
ALTER TABLE "LeaseHistory" DROP COLUMN "actorId",
ADD COLUMN     "actorId" UUID;

-- AlterTable
ALTER TABLE "LeaseNotice" DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID;

-- AlterTable
ALTER TABLE "LeaseRenewalOffer" DROP COLUMN "respondedById",
ADD COLUMN     "respondedById" UUID;

-- AlterTable
ALTER TABLE "MaintenanceNote" DROP COLUMN "authorId",
ADD COLUMN     "authorId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "MaintenancePhoto" DROP COLUMN "uploadedById",
ADD COLUMN     "uploadedById" UUID;

-- AlterTable
ALTER TABLE "MaintenanceRequest" DROP COLUMN "authorId",
ADD COLUMN     "authorId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceRequestHistory" DROP COLUMN "changedById",
ADD COLUMN     "changedById" UUID;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "senderId",
ADD COLUMN     "senderId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "MessageTemplate" DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "NotificationPreference" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "PasswordResetToken" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "RentRecommendation" DROP COLUMN "acceptedById",
ADD COLUMN     "acceptedById" UUID,
DROP COLUMN "rejectedById",
ADD COLUMN     "rejectedById" UUID;

-- AlterTable
ALTER TABLE "RentalApplication" DROP COLUMN "applicantId",
ADD COLUMN     "applicantId" UUID,
DROP COLUMN "screenedById",
ADD COLUMN     "screenedById" UUID;

-- AlterTable
ALTER TABLE "RentalApplicationNote" DROP COLUMN "authorId",
ADD COLUMN     "authorId" UUID;

-- AlterTable
ALTER TABLE "RepairEstimate" DROP COLUMN "generatedById",
ADD COLUMN     "generatedById" UUID NOT NULL,
DROP COLUMN "approvedById",
ADD COLUMN     "approvedById" UUID;

-- AlterTable
ALTER TABLE "SavedPropertyFilter" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "ScheduleEvent" DROP COLUMN "tenantId",
ADD COLUMN     "tenantId" UUID;

-- AlterTable
ALTER TABLE "SecurityEvent" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID;

-- AlterTable
ALTER TABLE "Technician" ADD COLUMN     "emergencyService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "insuranceOnFile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredContact" "PreferredContactMethod" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "serviceZips" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "trades" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID;

-- AlterTable
ALTER TABLE "Tour" DROP COLUMN "conductedById",
ADD COLUMN     "conductedById" UUID;

-- AlterTable
ALTER TABLE "UnitInspection" DROP COLUMN "inspectorId",
ADD COLUMN     "inspectorId" UUID,
DROP COLUMN "createdById",
ADD COLUMN     "createdById" UUID NOT NULL,
DROP COLUMN "tenantId",
ADD COLUMN     "tenantId" UUID;

-- AlterTable
ALTER TABLE "UnitInspectionPhoto" DROP COLUMN "uploadedById",
ADD COLUMN     "uploadedById" UUID;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "_DocumentShares" DROP CONSTRAINT "_DocumentShares_AB_pkey",
DROP COLUMN "B",
ADD COLUMN     "B" UUID NOT NULL,
ADD CONSTRAINT "_DocumentShares_AB_pkey" PRIMARY KEY ("A", "B");

-- AlterTable
ALTER TABLE "quickbooks_connections" DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "routeTo" TEXT,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'RUNNING',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "traceId" TEXT,
    "initiatedById" UUID,
    "tenantId" UUID,
    "propertyId" INTEGER,
    "unitId" INTEGER,
    "leaseId" INTEGER,
    "requestId" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentToolCall" (
    "id" SERIAL NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" SERIAL NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "tenantId" UUID,
    "propertyId" INTEGER,
    "unitId" INTEGER,
    "leaseId" INTEGER,
    "requestId" INTEGER,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricebookLaborRate" (
    "id" SERIAL NOT NULL,
    "trade" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "hourlyLowCents" INTEGER NOT NULL,
    "hourlyHighCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sourceNote" TEXT DEFAULT 'internal pricebook',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricebookLaborRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricebookMaterialPrice" (
    "id" SERIAL NOT NULL,
    "item" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "zipCode" TEXT,
    "unitPriceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sourceNote" TEXT DEFAULT 'internal pricebook',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricebookMaterialPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionImportBatch" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "fileName" TEXT,
    "importedById" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "batchId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "vendor" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "memo" TEXT,
    "category" TEXT,
    "confidence" DOUBLE PRECISION,
    "propertyId" INTEGER,
    "unitId" INTEGER,
    "recordedById" UUID,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRequestDocument" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRequestDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRun_agentName_status_startedAt_idx" ON "AgentRun"("agentName", "status", "startedAt");

-- CreateIndex
CREATE INDEX "AgentRun_propertyId_idx" ON "AgentRun"("propertyId");

-- CreateIndex
CREATE INDEX "AgentRun_tenantId_idx" ON "AgentRun"("tenantId");

-- CreateIndex
CREATE INDEX "AgentRun_requestId_idx" ON "AgentRun"("requestId");

-- CreateIndex
CREATE INDEX "AgentRun_traceId_idx" ON "AgentRun"("traceId");

-- CreateIndex
CREATE INDEX "AgentToolCall_agentRunId_toolName_idx" ON "AgentToolCall"("agentRunId", "toolName");

-- CreateIndex
CREATE INDEX "AgentToolCall_toolName_createdAt_idx" ON "AgentToolCall"("toolName", "createdAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_tenantId_createdAt_idx" ON "CommunicationLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_propertyId_createdAt_idx" ON "CommunicationLog"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_requestId_createdAt_idx" ON "CommunicationLog"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_channel_direction_createdAt_idx" ON "CommunicationLog"("channel", "direction", "createdAt");

-- CreateIndex
CREATE INDEX "PricebookLaborRate_trade_zipCode_idx" ON "PricebookLaborRate"("trade", "zipCode");

-- CreateIndex
CREATE INDEX "PricebookLaborRate_task_idx" ON "PricebookLaborRate"("task");

-- CreateIndex
CREATE UNIQUE INDEX "PricebookLaborRate_trade_task_zipCode_key" ON "PricebookLaborRate"("trade", "task", "zipCode");

-- CreateIndex
CREATE INDEX "PricebookMaterialPrice_item_idx" ON "PricebookMaterialPrice"("item");

-- CreateIndex
CREATE INDEX "PricebookMaterialPrice_zipCode_idx" ON "PricebookMaterialPrice"("zipCode");

-- CreateIndex
CREATE INDEX "TransactionImportBatch_source_createdAt_idx" ON "TransactionImportBatch"("source", "createdAt");

-- CreateIndex
CREATE INDEX "TransactionImportBatch_importedById_createdAt_idx" ON "TransactionImportBatch"("importedById", "createdAt");

-- CreateIndex
CREATE INDEX "BankTransaction_date_idx" ON "BankTransaction"("date");

-- CreateIndex
CREATE INDEX "BankTransaction_propertyId_date_idx" ON "BankTransaction"("propertyId", "date");

-- CreateIndex
CREATE INDEX "BankTransaction_batchId_idx" ON "BankTransaction"("batchId");

-- CreateIndex
CREATE INDEX "MaintenanceRequestDocument_requestId_idx" ON "MaintenanceRequestDocument"("requestId");

-- CreateIndex
CREATE INDEX "MaintenanceRequestDocument_documentId_idx" ON "MaintenanceRequestDocument"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRequestDocument_requestId_documentId_key" ON "MaintenanceRequestDocument"("requestId", "documentId");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "InspectionSignature_userId_idx" ON "InspectionSignature"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Lease_tenantId_key" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_scheduledFor_idx" ON "Notification"("userId", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "RentRecommendation_acceptedById_idx" ON "RentRecommendation"("acceptedById");

-- CreateIndex
CREATE INDEX "RentRecommendation_rejectedById_idx" ON "RentRecommendation"("rejectedById");

-- CreateIndex
CREATE INDEX "SavedPropertyFilter_userId_idx" ON "SavedPropertyFilter"("userId");

-- CreateIndex
CREATE INDEX "Technician_userId_idx" ON "Technician"("userId");

-- CreateIndex
CREATE INDEX "UnitInspection_inspectorId_idx" ON "UnitInspection"("inspectorId");

-- CreateIndex
CREATE INDEX "_DocumentShares_B_index" ON "_DocumentShares"("B");

-- CreateIndex
CREATE UNIQUE INDEX "quickbooks_connections_userId_companyId_key" ON "quickbooks_connections"("userId", "companyId");

-- AddForeignKey
ALTER TABLE "SavedPropertyFilter" ADD CONSTRAINT "SavedPropertyFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentRecommendation" ADD CONSTRAINT "RentRecommendation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentRecommendation" ADD CONSTRAINT "RentRecommendation_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequestHistory" ADD CONSTRAINT "MaintenanceRequestHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNote" ADD CONSTRAINT "MaintenanceNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePhoto" ADD CONSTRAINT "MaintenancePhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseHistory" ADD CONSTRAINT "LeaseHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseDocument" ADD CONSTRAINT "LeaseDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsignEnvelope" ADD CONSTRAINT "EsignEnvelope_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsignParticipant" ADD CONSTRAINT "EsignParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseRenewalOffer" ADD CONSTRAINT "LeaseRenewalOffer_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseNotice" ADD CONSTRAINT "LeaseNotice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMessageBatch" ADD CONSTRAINT "BulkMessageBatch_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMessageRecipient" ADD CONSTRAINT "BulkMessageRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_screenedById_fkey" FOREIGN KEY ("screenedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadApplication" ADD CONSTRAINT "LeadApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplicationNote" ADD CONSTRAINT "RentalApplicationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationLifecycleEvent" ADD CONSTRAINT "ApplicationLifecycleEvent_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyLog" ADD CONSTRAINT "AnomalyLog_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitInspection" ADD CONSTRAINT "UnitInspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitInspection" ADD CONSTRAINT "UnitInspection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitInspection" ADD CONSTRAINT "UnitInspection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitInspectionPhoto" ADD CONSTRAINT "UnitInspectionPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionChecklistPhoto" ADD CONSTRAINT "InspectionChecklistPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionSignature" ADD CONSTRAINT "InspectionSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quickbooks_connections" ADD CONSTRAINT "quickbooks_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToolCall" ADD CONSTRAINT "AgentToolCall_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionImportBatch" ADD CONSTRAINT "TransactionImportBatch_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TransactionImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequestDocument" ADD CONSTRAINT "MaintenanceRequestDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequestDocument" ADD CONSTRAINT "MaintenanceRequestDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentShares" ADD CONSTRAINT "_DocumentShares_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
