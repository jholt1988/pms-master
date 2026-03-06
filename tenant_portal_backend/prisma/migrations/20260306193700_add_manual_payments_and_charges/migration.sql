-- CreateEnum
CREATE TYPE "ManualPaymentMethod" AS ENUM ('CASH', 'CHECK', 'MONEY_ORDER');

-- CreateEnum
CREATE TYPE "ManualPaymentAppliedTo" AS ENUM ('RENT', 'LATE_FEE', 'UTILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ManualPaymentStatus" AS ENUM ('POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ManualChargeType" AS ENUM ('LATE_FEE', 'UTILITY', 'CLEANING', 'DAMAGE', 'MISC');

-- CreateEnum
CREATE TYPE "ManualChargeStatus" AS ENUM ('POSTED', 'VOIDED');

-- CreateTable
CREATE TABLE "ManualPayment" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "propertyId" UUID NOT NULL,
    "unitId" UUID,
    "tenantId" UUID NOT NULL,
    "leaseId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" "ManualPaymentMethod" NOT NULL,
    "referenceNumber" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedTo" "ManualPaymentAppliedTo" NOT NULL DEFAULT 'RENT',
    "memo" TEXT,
    "status" "ManualPaymentStatus" NOT NULL DEFAULT 'POSTED',
    "reversalReason" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ManualPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualCharge" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "propertyId" UUID NOT NULL,
    "unitId" UUID,
    "tenantId" UUID NOT NULL,
    "leaseId" UUID NOT NULL,
    "chargeType" "ManualChargeType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT NOT NULL,
    "chargeDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "ManualChargeStatus" NOT NULL DEFAULT 'POSTED',
    "voidReason" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ManualCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualPayment_organizationId_createdAt_idx" ON "ManualPayment"("organizationId", "createdAt");
CREATE INDEX "ManualPayment_leaseId_receivedAt_idx" ON "ManualPayment"("leaseId", "receivedAt");
CREATE INDEX "ManualPayment_tenantId_receivedAt_idx" ON "ManualPayment"("tenantId", "receivedAt");
CREATE INDEX "ManualPayment_propertyId_receivedAt_idx" ON "ManualPayment"("propertyId", "receivedAt");
CREATE INDEX "ManualPayment_method_referenceNumber_idx" ON "ManualPayment"("method", "referenceNumber");

-- Unique partial index to prevent duplicate active references for check/money order
CREATE UNIQUE INDEX "ManualPayment_org_method_reference_posted_unique"
ON "ManualPayment"("organizationId", "method", "referenceNumber")
WHERE "referenceNumber" IS NOT NULL AND "status" = 'POSTED' AND "method" IN ('CHECK', 'MONEY_ORDER');

-- CreateIndex
CREATE INDEX "ManualCharge_organizationId_createdAt_idx" ON "ManualCharge"("organizationId", "createdAt");
CREATE INDEX "ManualCharge_leaseId_chargeDate_idx" ON "ManualCharge"("leaseId", "chargeDate");
CREATE INDEX "ManualCharge_tenantId_chargeDate_idx" ON "ManualCharge"("tenantId", "chargeDate");
CREATE INDEX "ManualCharge_propertyId_chargeDate_idx" ON "ManualCharge"("propertyId", "chargeDate");
CREATE INDEX "ManualCharge_chargeType_status_idx" ON "ManualCharge"("chargeType", "status");

-- AddForeignKey
ALTER TABLE "ManualPayment" ADD CONSTRAINT "ManualPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManualPayment" ADD CONSTRAINT "ManualPayment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualPayment" ADD CONSTRAINT "ManualPayment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManualPayment" ADD CONSTRAINT "ManualPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualPayment" ADD CONSTRAINT "ManualPayment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualPayment" ADD CONSTRAINT "ManualPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualCharge" ADD CONSTRAINT "ManualCharge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManualCharge" ADD CONSTRAINT "ManualCharge_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualCharge" ADD CONSTRAINT "ManualCharge_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManualCharge" ADD CONSTRAINT "ManualCharge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualCharge" ADD CONSTRAINT "ManualCharge_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualCharge" ADD CONSTRAINT "ManualCharge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
