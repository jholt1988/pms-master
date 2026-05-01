-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Status" ADD VALUE 'ASSIGNED';
ALTER TYPE "Status" ADD VALUE 'SCHEDULED';
ALTER TYPE "Status" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_tenantId_fkey";

-- DropIndex
DROP INDEX "Lease_tenantId_key";

-- DropIndex
DROP INDEX "Lease_unitId_key";

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "averageRating" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "hourlyRate" DOUBLE PRECISION,
ADD COLUMN     "insuranceExpiry" TIMESTAMP(3),
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "VendorRating" (
    "id" UUID NOT NULL,
    "vendorId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "maintenanceRequestId" UUID,
    "ratedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorAssignment" (
    "id" UUID NOT NULL,
    "vendorId" UUID NOT NULL,
    "maintenanceRequestId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "scheduledDate" TIMESTAMP(3),
    "estimatedDuration" DOUBLE PRECISION,
    "quotedPrice" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" UUID NOT NULL,
    "webhookId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responseStatus" INTEGER,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'medium',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "context" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_events" (
    "id" SERIAL NOT NULL,
    "event_name" VARCHAR(100) NOT NULL,
    "user_id" VARCHAR(100),
    "org_id" VARCHAR(100),
    "entity_id" VARCHAR(100),
    "domain" VARCHAR(50),
    "outcome" VARCHAR(20),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorRating_vendorId_idx" ON "VendorRating"("vendorId");

-- CreateIndex
CREATE INDEX "VendorAssignment_vendorId_idx" ON "VendorAssignment"("vendorId");

-- CreateIndex
CREATE INDEX "VendorAssignment_maintenanceRequestId_idx" ON "VendorAssignment"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");

-- CreateIndex
CREATE INDEX "Decision_domain_resolved_idx" ON "Decision"("domain", "resolved");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_email_key" ON "Tenant"("email");

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRating" ADD CONSTRAINT "VendorRating_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAssignment" ADD CONSTRAINT "VendorAssignment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
