-- CreateEnum
CREATE TYPE "PropertyAvailabilityStatus" AS ENUM ('AVAILABLE', 'LIMITED', 'WAITLISTED', 'COMING_SOON', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "SyndicationChannel" AS ENUM ('ZILLOW', 'APARTMENTS_DOT_COM');

-- CreateEnum
CREATE TYPE "SyndicationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'PAUSED');

-- CreateEnum
CREATE TYPE "EsignProvider" AS ENUM ('DOCUSIGN', 'HELLOSIGN');

-- CreateEnum
CREATE TYPE "EsignEnvelopeStatus" AS ENUM ('CREATED', 'SENT', 'DELIVERED', 'COMPLETED', 'DECLINED', 'VOIDED', 'ERROR');

-- CreateEnum
CREATE TYPE "EsignParticipantStatus" AS ENUM ('CREATED', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED', 'ERROR');

-- CreateEnum
CREATE TYPE "BulkMessageStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BulkRecipientStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "BulkSendStrategy" AS ENUM ('IMMEDIATE', 'SCHEDULED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ESIGNATURE_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'ESIGNATURE_COMPLETED';

-- DropForeignKey
ALTER TABLE "LeadApplication" DROP CONSTRAINT "LeadApplication_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyInquiry" DROP CONSTRAINT "PropertyInquiry_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Tour" DROP CONSTRAINT "Tour_propertyId_fkey";

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LeadApplication" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LeadMessage" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Lease" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "templateId" INTEGER;

-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PropertyInquiry" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tour" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PropertyMarketingProfile" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "minRent" DOUBLE PRECISION,
    "maxRent" DOUBLE PRECISION,
    "availabilityStatus" "PropertyAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "availableOn" TIMESTAMP(3),
    "marketingHeadline" TEXT,
    "marketingDescription" TEXT,
    "rentRangeCurrency" TEXT NOT NULL DEFAULT 'USD',
    "isSyndicationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyMarketingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPhoto" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAmenity" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "amenityId" INTEGER NOT NULL,
    "value" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PropertyAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPropertyFilter" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB NOT NULL,
    "sortBy" TEXT,
    "sortOrder" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedPropertyFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyndicationCredential" (
    "id" SERIAL NOT NULL,
    "channel" "SyndicationChannel" NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyndicationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyndicationQueue" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "channel" "SyndicationChannel" NOT NULL,
    "payload" JSONB,
    "status" "SyndicationStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyndicationQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyndicationErrorLog" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "channel" "SyndicationChannel" NOT NULL,
    "error" TEXT NOT NULL,
    "context" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyndicationErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsignEnvelope" (
    "id" SERIAL NOT NULL,
    "leaseId" INTEGER NOT NULL,
    "provider" "EsignProvider" NOT NULL DEFAULT 'DOCUSIGN',
    "providerEnvelopeId" TEXT NOT NULL,
    "status" "EsignEnvelopeStatus" NOT NULL DEFAULT 'CREATED',
    "providerStatus" TEXT,
    "providerMetadata" JSONB,
    "signedPdfDocumentId" INTEGER,
    "auditTrailDocumentId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EsignEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsignParticipant" (
    "id" SERIAL NOT NULL,
    "envelopeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "userId" INTEGER,
    "status" "EsignParticipantStatus" NOT NULL DEFAULT 'CREATED',
    "recipientId" TEXT,
    "recipientUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EsignParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "mergeFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkMessageBatch" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "BulkMessageStatus" NOT NULL DEFAULT 'DRAFT',
    "sendStrategy" "BulkSendStrategy" NOT NULL DEFAULT 'IMMEDIATE',
    "scheduledAt" TIMESTAMP(3),
    "throttlePerMinute" INTEGER DEFAULT 60,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "filters" JSONB,
    "metadata" JSONB,
    "creatorId" INTEGER,
    "templateId" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkMessageBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkMessageRecipient" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "BulkRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "messageId" INTEGER,
    "errorMessage" TEXT,
    "renderedContent" TEXT,
    "mergeVariables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkMessageRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyMarketingProfile_propertyId_key" ON "PropertyMarketingProfile"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyPhoto_propertyId_idx" ON "PropertyPhoto"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_key_key" ON "Amenity"("key");

-- CreateIndex
CREATE INDEX "PropertyAmenity_propertyId_idx" ON "PropertyAmenity"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyAmenity_amenityId_idx" ON "PropertyAmenity"("amenityId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyAmenity_propertyId_amenityId_key" ON "PropertyAmenity"("propertyId", "amenityId");

-- CreateIndex
CREATE INDEX "SavedPropertyFilter_userId_idx" ON "SavedPropertyFilter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SyndicationCredential_channel_key" ON "SyndicationCredential"("channel");

-- CreateIndex
CREATE INDEX "SyndicationQueue_propertyId_idx" ON "SyndicationQueue"("propertyId");

-- CreateIndex
CREATE INDEX "SyndicationQueue_channel_idx" ON "SyndicationQueue"("channel");

-- CreateIndex
CREATE INDEX "SyndicationQueue_status_idx" ON "SyndicationQueue"("status");

-- CreateIndex
CREATE INDEX "SyndicationErrorLog_propertyId_idx" ON "SyndicationErrorLog"("propertyId");

-- CreateIndex
CREATE INDEX "SyndicationErrorLog_channel_idx" ON "SyndicationErrorLog"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "EsignEnvelope_signedPdfDocumentId_key" ON "EsignEnvelope"("signedPdfDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "EsignEnvelope_auditTrailDocumentId_key" ON "EsignEnvelope"("auditTrailDocumentId");

-- CreateIndex
CREATE INDEX "EsignEnvelope_leaseId_idx" ON "EsignEnvelope"("leaseId");

-- CreateIndex
CREATE INDEX "EsignEnvelope_providerEnvelopeId_idx" ON "EsignEnvelope"("providerEnvelopeId");

-- CreateIndex
CREATE INDEX "EsignParticipant_envelopeId_idx" ON "EsignParticipant"("envelopeId");

-- CreateIndex
CREATE INDEX "EsignParticipant_email_idx" ON "EsignParticipant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BulkMessageRecipient_messageId_key" ON "BulkMessageRecipient"("messageId");

-- CreateIndex
CREATE INDEX "Property_city_state_idx" ON "Property"("city", "state");

-- CreateIndex
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");

-- CreateIndex
CREATE INDEX "Property_bedrooms_idx" ON "Property"("bedrooms");

-- CreateIndex
CREATE INDEX "Property_bathrooms_idx" ON "Property"("bathrooms");

-- CreateIndex
CREATE INDEX "Property_minRent_idx" ON "Property"("minRent");

-- AddForeignKey
ALTER TABLE "PropertyMarketingProfile" ADD CONSTRAINT "PropertyMarketingProfile_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAmenity" ADD CONSTRAINT "PropertyAmenity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAmenity" ADD CONSTRAINT "PropertyAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPropertyFilter" ADD CONSTRAINT "SavedPropertyFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyndicationQueue" ADD CONSTRAINT "SyndicationQueue_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyndicationErrorLog" ADD CONSTRAINT "SyndicationErrorLog_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsignEnvelope" ADD CONSTRAINT "EsignEnvelope_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsignEnvelope" ADD CONSTRAINT "EsignEnvelope_signedPdfDocumentId_fkey" FOREIGN KEY ("signedPdfDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsignEnvelope" ADD CONSTRAINT "EsignEnvelope_auditTrailDocumentId_fkey" FOREIGN KEY ("auditTrailDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsignEnvelope" ADD CONSTRAINT "EsignEnvelope_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsignParticipant" ADD CONSTRAINT "EsignParticipant_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "EsignEnvelope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsignParticipant" ADD CONSTRAINT "EsignParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMessageBatch" ADD CONSTRAINT "BulkMessageBatch_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMessageBatch" ADD CONSTRAINT "BulkMessageBatch_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMessageRecipient" ADD CONSTRAINT "BulkMessageRecipient_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BulkMessageBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMessageRecipient" ADD CONSTRAINT "BulkMessageRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkMessageRecipient" ADD CONSTRAINT "BulkMessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadApplication" ADD CONSTRAINT "LeadApplication_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "LeadApplication_leadId_index" RENAME TO "LeadApplication_leadId_idx";

-- RenameIndex
ALTER INDEX "LeadApplication_propertyId_index" RENAME TO "LeadApplication_propertyId_idx";

-- RenameIndex
ALTER INDEX "LeadMessage_leadId_index" RENAME TO "LeadMessage_leadId_idx";

-- RenameIndex
ALTER INDEX "PropertyInquiry_leadId_index" RENAME TO "PropertyInquiry_leadId_idx";

-- RenameIndex
ALTER INDEX "PropertyInquiry_propertyId_index" RENAME TO "PropertyInquiry_propertyId_idx";

-- RenameIndex
ALTER INDEX "Tour_leadId_index" RENAME TO "Tour_leadId_idx";

-- RenameIndex
ALTER INDEX "Tour_propertyId_index" RENAME TO "Tour_propertyId_idx";

-- RenameIndex
ALTER INDEX "Tour_unitId_index" RENAME TO "Tour_unitId_idx";
