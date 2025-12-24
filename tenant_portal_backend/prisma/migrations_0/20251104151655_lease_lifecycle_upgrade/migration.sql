/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'RENEWAL_PENDING', 'NOTICE_GIVEN', 'TERMINATING', 'TERMINATED', 'HOLDOVER', 'CLOSED');

-- CreateEnum
CREATE TYPE "DepositDisposition" AS ENUM ('HELD', 'PARTIAL_RETURN', 'RETURNED', 'FORFEITED');

-- CreateEnum
CREATE TYPE "LeaseTerminationParty" AS ENUM ('MANAGER', 'TENANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BillingAlignment" AS ENUM ('FULL_CYCLE', 'PRORATE');

-- CreateEnum
CREATE TYPE "LeaseRenewalStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "LeaseNoticeType" AS ENUM ('MOVE_OUT', 'RENT_INCREASE', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaseNoticeDeliveryMethod" AS ENUM ('EMAIL', 'SMS', 'PORTAL', 'PRINT', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('EMERGENCY', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "MaintenanceAssetCategory" AS ENUM ('HVAC', 'PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'STRUCTURE', 'SAFETY', 'GROUNDS', 'OTHER');

-- CreateEnum
CREATE TYPE "TechnicianRole" AS ENUM ('IN_HOUSE', 'CONTRACTOR', 'VENDOR');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'BANK_ACCOUNT');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PLAID', 'OTHER');

-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('MONTHLY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGIN_LOCKED', 'PASSWORD_CHANGED', 'MFA_ENROLLMENT_STARTED', 'MFA_ENABLED', 'MFA_DISABLED', 'MFA_CHALLENGE_FAILED', 'AUTOPAY_ENABLED', 'AUTOPAY_DISABLED', 'RECURRING_BILLING_UPDATED', 'APPLICATION_SCREENED', 'APPLICATION_NOTE_CREATED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "scheduleId" INTEGER;

-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoRenewLeadDays" INTEGER,
ADD COLUMN     "billingAlignment" "BillingAlignment" NOT NULL DEFAULT 'FULL_CYCLE',
ADD COLUMN     "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "depositDisposition" "DepositDisposition",
ADD COLUMN     "depositHeldAt" TIMESTAMP(3),
ADD COLUMN     "depositReturnedAt" TIMESTAMP(3),
ADD COLUMN     "moveInAt" TIMESTAMP(3),
ADD COLUMN     "moveOutAt" TIMESTAMP(3),
ADD COLUMN     "noticePeriodDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "renewalAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "renewalDueAt" TIMESTAMP(3),
ADD COLUMN     "renewalOfferedAt" TIMESTAMP(3),
ADD COLUMN     "rentEscalationEffectiveAt" TIMESTAMP(3),
ADD COLUMN     "rentEscalationPercent" DOUBLE PRECISION,
ADD COLUMN     "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "terminationEffectiveAt" TIMESTAMP(3),
ADD COLUMN     "terminationReason" TEXT,
ADD COLUMN     "terminationRequestedBy" "LeaseTerminationParty";

-- AlterTable
ALTER TABLE "MaintenanceRequest" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "assetId" INTEGER,
ADD COLUMN     "assigneeId" INTEGER,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "leaseId" INTEGER,
ADD COLUMN     "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "propertyId" INTEGER,
ADD COLUMN     "responseDueAt" TIMESTAMP(3),
ADD COLUMN     "slaPolicyId" INTEGER,
ADD COLUMN     "unitId" INTEGER;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "paymentMethodId" INTEGER,
ADD COLUMN     "reconciledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RentalApplication" ADD COLUMN     "bankruptcyFiledYear" INTEGER,
ADD COLUMN     "creditScore" INTEGER,
ADD COLUMN     "monthlyDebt" DOUBLE PRECISION,
ADD COLUMN     "rentalHistoryComments" TEXT,
ADD COLUMN     "screenedAt" TIMESTAMP(3),
ADD COLUMN     "screenedById" INTEGER,
ADD COLUMN     "screeningReasons" JSONB,
ADD COLUMN     "screeningScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockoutUntil" TIMESTAMP(3),
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "mfaTempSecret" TEXT,
ADD COLUMN     "passwordUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "MaintenanceAsset" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "name" TEXT NOT NULL,
    "category" "MaintenanceAssetCategory" NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "installDate" TIMESTAMP(3),
    "warrantyExpiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" "TechnicianRole" NOT NULL DEFAULT 'IN_HOUSE',
    "userId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceSlaPolicy" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "priority" "MaintenancePriority" NOT NULL,
    "responseTimeMinutes" INTEGER,
    "resolutionTimeMinutes" INTEGER NOT NULL,
    "propertyId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceSlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRequestHistory" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "changedById" INTEGER,
    "fromStatus" "Status",
    "toStatus" "Status",
    "fromAssigneeId" INTEGER,
    "toAssigneeId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRequestHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceNote" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenancePhoto" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "uploadedById" INTEGER,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenancePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseHistory" (
    "id" SERIAL NOT NULL,
    "leaseId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "fromStatus" "LeaseStatus",
    "toStatus" "LeaseStatus",
    "note" TEXT,
    "rentAmount" DOUBLE PRECISION,
    "depositAmount" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseDocument" (
    "id" SERIAL NOT NULL,
    "leaseId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "uploadedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseRenewalOffer" (
    "id" SERIAL NOT NULL,
    "leaseId" INTEGER NOT NULL,
    "proposedRent" DOUBLE PRECISION NOT NULL,
    "proposedStart" TIMESTAMP(3) NOT NULL,
    "proposedEnd" TIMESTAMP(3) NOT NULL,
    "escalationPercent" DOUBLE PRECISION,
    "message" TEXT,
    "status" "LeaseRenewalStatus" NOT NULL DEFAULT 'OFFERED',
    "expiresAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "respondedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseRenewalOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseNotice" (
    "id" SERIAL NOT NULL,
    "leaseId" INTEGER NOT NULL,
    "type" "LeaseNoticeType" NOT NULL,
    "deliveryMethod" "LeaseNoticeDeliveryMethod" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "message" TEXT,
    "createdById" INTEGER,

    CONSTRAINT "LeaseNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalApplicationNote" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "authorId" INTEGER,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalApplicationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerCustomerId" TEXT,
    "providerPaymentMethodId" TEXT,
    "last4" TEXT,
    "brand" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringInvoiceSchedule" (
    "id" SERIAL NOT NULL,
    "leaseId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL DEFAULT 'Monthly Rent',
    "frequency" "BillingFrequency" NOT NULL DEFAULT 'MONTHLY',
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "nextRun" TIMESTAMP(3) NOT NULL,
    "lateFeeAmount" DOUBLE PRECISION,
    "lateFeeAfterDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoiceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LateFee" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LateFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutopayEnrollment" (
    "id" SERIAL NOT NULL,
    "leaseId" INTEGER NOT NULL,
    "paymentMethodId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutopayEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "username" TEXT,
    "type" "SecurityEventType" NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceAsset_propertyId_idx" ON "MaintenanceAsset"("propertyId");

-- CreateIndex
CREATE INDEX "MaintenanceAsset_unitId_idx" ON "MaintenanceAsset"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceAsset_propertyId_unitId_name_key" ON "MaintenanceAsset"("propertyId", "unitId", "name");

-- CreateIndex
CREATE INDEX "Technician_userId_idx" ON "Technician"("userId");

-- CreateIndex
CREATE INDEX "Technician_role_active_idx" ON "Technician"("role", "active");

-- CreateIndex
CREATE INDEX "MaintenanceSlaPolicy_priority_idx" ON "MaintenanceSlaPolicy"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceSlaPolicy_propertyId_priority_key" ON "MaintenanceSlaPolicy"("propertyId", "priority");

-- CreateIndex
CREATE INDEX "MaintenanceRequestHistory_requestId_createdAt_idx" ON "MaintenanceRequestHistory"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "MaintenanceNote_requestId_createdAt_idx" ON "MaintenanceNote"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "MaintenancePhoto_requestId_idx" ON "MaintenancePhoto"("requestId");

-- CreateIndex
CREATE INDEX "LeaseHistory_leaseId_createdAt_idx" ON "LeaseHistory"("leaseId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaseDocument_leaseId_createdAt_idx" ON "LeaseDocument"("leaseId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaseRenewalOffer_leaseId_status_idx" ON "LeaseRenewalOffer"("leaseId", "status");

-- CreateIndex
CREATE INDEX "LeaseRenewalOffer_expiresAt_idx" ON "LeaseRenewalOffer"("expiresAt");

-- CreateIndex
CREATE INDEX "LeaseNotice_leaseId_type_idx" ON "LeaseNotice"("leaseId", "type");

-- CreateIndex
CREATE INDEX "RentalApplicationNote_applicationId_idx" ON "RentalApplicationNote"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringInvoiceSchedule_leaseId_key" ON "RecurringInvoiceSchedule"("leaseId");

-- CreateIndex
CREATE UNIQUE INDEX "AutopayEnrollment_leaseId_key" ON "AutopayEnrollment"("leaseId");

-- CreateIndex
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_type_idx" ON "SecurityEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_externalId_key" ON "Invoice"("externalId");

-- CreateIndex
CREATE INDEX "Lease_status_idx" ON "Lease"("status");

-- CreateIndex
CREATE INDEX "Lease_endDate_idx" ON "Lease"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_externalId_key" ON "Payment"("externalId");

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MaintenanceAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "MaintenanceSlaPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAsset" ADD CONSTRAINT "MaintenanceAsset_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAsset" ADD CONSTRAINT "MaintenanceAsset_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSlaPolicy" ADD CONSTRAINT "MaintenanceSlaPolicy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequestHistory" ADD CONSTRAINT "MaintenanceRequestHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequestHistory" ADD CONSTRAINT "MaintenanceRequestHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequestHistory" ADD CONSTRAINT "MaintenanceRequestHistory_fromAssigneeId_fkey" FOREIGN KEY ("fromAssigneeId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequestHistory" ADD CONSTRAINT "MaintenanceRequestHistory_toAssigneeId_fkey" FOREIGN KEY ("toAssigneeId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNote" ADD CONSTRAINT "MaintenanceNote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNote" ADD CONSTRAINT "MaintenanceNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePhoto" ADD CONSTRAINT "MaintenancePhoto_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePhoto" ADD CONSTRAINT "MaintenancePhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseHistory" ADD CONSTRAINT "LeaseHistory_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseHistory" ADD CONSTRAINT "LeaseHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseDocument" ADD CONSTRAINT "LeaseDocument_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseDocument" ADD CONSTRAINT "LeaseDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseRenewalOffer" ADD CONSTRAINT "LeaseRenewalOffer_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseRenewalOffer" ADD CONSTRAINT "LeaseRenewalOffer_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseNotice" ADD CONSTRAINT "LeaseNotice_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseNotice" ADD CONSTRAINT "LeaseNotice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RecurringInvoiceSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_screenedById_fkey" FOREIGN KEY ("screenedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplicationNote" ADD CONSTRAINT "RentalApplicationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplicationNote" ADD CONSTRAINT "RentalApplicationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceSchedule" ADD CONSTRAINT "RecurringInvoiceSchedule_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LateFee" ADD CONSTRAINT "LateFee_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopayEnrollment" ADD CONSTRAINT "AutopayEnrollment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopayEnrollment" ADD CONSTRAINT "AutopayEnrollment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
