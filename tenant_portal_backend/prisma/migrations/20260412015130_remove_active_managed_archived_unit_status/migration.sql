/*
  Warnings:

  - The values [ACTIVE,MANAGED,ARCHIVED] on the enum `UnitStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CONTRA_ASSET', 'CONTRA_REVENUE');

-- CreateEnum
CREATE TYPE "BookkeepingTransactionStatus" AS ENUM ('PENDING_REVIEW', 'CATEGORIZED', 'ALLOCATED', 'RECONCILED', 'EXCEPTION', 'POSTED');

-- CreateEnum
CREATE TYPE "ReconciliationItemStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'CONFIRMED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "MonthlyCloseStatus" AS ENUM ('OPEN', 'RECONCILING', 'REVIEW', 'LOCKED', 'REPORTED');

-- CreateEnum
CREATE TYPE "OwnerStatementStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('OPEN', 'BID_RECEIVED', 'AWARDED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ForecastUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ForecastStatus" AS ENUM ('PROJECTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AbstractionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REVIEW_NEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "TenantRelationshipStatus" AS ENUM ('APPLICANT', 'APPROVED', 'ONBOARDING', 'ACTIVE', 'DELINQUENT', 'AT_RISK', 'RENEWAL_DUE', 'NOTICE_SENT', 'MOVING_OUT', 'TRANSFERRED', 'FORMER', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TenantHealthClassification" AS ENUM ('STABLE', 'WATCH', 'AT_RISK', 'HIGH_TOUCH');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'CONDITIONALLY_APPROVED';

-- AlterEnum
BEGIN;
CREATE TYPE "UnitStatus_new" AS ENUM ('VACANT', 'OCCUPIED', 'TURNING', 'LISTED', 'APPLIED', 'APPROVED', 'LEASED', 'DELINQUENT', 'UNDER_REPAIR', 'RENEWAL_DUE');
ALTER TABLE "Unit" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Unit" ALTER COLUMN "status" TYPE "UnitStatus_new" USING ("status"::text::"UnitStatus_new");
ALTER TYPE "UnitStatus" RENAME TO "UnitStatus_old";
ALTER TYPE "UnitStatus_new" RENAME TO "UnitStatus";
DROP TYPE "UnitStatus_old";
ALTER TABLE "Unit" ALTER COLUMN "status" SET DEFAULT 'VACANT';
COMMIT;

-- AlterTable
ALTER TABLE "CommunicationLog" ADD COLUMN     "threadId" UUID;

-- AlterTable
ALTER TABLE "Unit" ALTER COLUMN "status" SET DEFAULT 'VACANT';

-- CreateTable
CREATE TABLE "ChartOfAccount" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "parentId" UUID,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChartOfAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "entryNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'standard',
    "memo" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "isAdjusting" BOOLEAN NOT NULL DEFAULT false,
    "isClosing" BOOLEAN NOT NULL DEFAULT false,
    "isReversing" BOOLEAN NOT NULL DEFAULT false,
    "reversesId" UUID,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "postedAt" TIMESTAMP(3),
    "postedById" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLineItem" (
    "id" UUID NOT NULL,
    "journalEntryId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "debitCents" INTEGER NOT NULL DEFAULT 0,
    "creditCents" INTEGER NOT NULL DEFAULT 0,
    "propertyId" UUID,
    "unitId" UUID,
    "leaseId" UUID,
    "vendorId" UUID,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookkeepingTransaction" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "BookkeepingTransactionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "category" TEXT,
    "categoryConfidence" DOUBLE PRECISION,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "bankTransactionId" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "exceptionReason" TEXT,
    "reviewedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookkeepingTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookkeepingAllocation" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "propertyId" UUID,
    "unitId" UUID,
    "leaseId" UUID,
    "vendorId" UUID,
    "ownerId" UUID,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookkeepingAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationSession" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "bankAccountRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "bankEndingBalance" INTEGER,
    "ledgerEndingBalance" INTEGER,
    "differenceAmount" INTEGER,
    "startedById" UUID,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationSessionItem" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "bankTransactionId" TEXT,
    "ledgerEntryId" TEXT,
    "bankAmountCents" INTEGER NOT NULL,
    "ledgerAmountCents" INTEGER,
    "status" "ReconciliationItemStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchConfidence" DOUBLE PRECISION,
    "suggestedMatchId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationSessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerStatement" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "grossIncomeCents" INTEGER NOT NULL DEFAULT 0,
    "totalExpensesCents" INTEGER NOT NULL DEFAULT 0,
    "managementFeeCents" INTEGER NOT NULL DEFAULT 0,
    "netDistributionCents" INTEGER NOT NULL DEFAULT 0,
    "status" "OwnerStatementStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "propertyBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CONTRACTOR',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorCompliance" (
    "id" UUID NOT NULL,
    "vendorId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expirationDate" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantInsurancePolicy" (
    "id" UUID NOT NULL,
    "leaseId" UUID NOT NULL,
    "provider" TEXT,
    "policyNumber" TEXT,
    "coverageAmount" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantInsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerDraw" (
    "id" UUID NOT NULL,
    "ownerStatementId" UUID NOT NULL,
    "ledgerTransactionId" UUID,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "drawDate" TIMESTAMP(3),
    "bankAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerDraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterUtilityBill" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "utilityType" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterUtilityBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilityAllocation" (
    "id" UUID NOT NULL,
    "masterBillId" UUID NOT NULL,
    "leaseId" UUID NOT NULL,
    "allocatedAmountCents" INTEGER NOT NULL,
    "allocationMethod" TEXT NOT NULL,
    "chargeId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UtilityAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartDevice" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "unitId" UUID,
    "provider" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "batteryLevel" INTEGER,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessCode" (
    "id" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "unitId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OmnichannelThread" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "title" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OmnichannelThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorBid" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "maintenanceRequestId" UUID,
    "vendorId" UUID,
    "scope" TEXT NOT NULL,
    "bidAmountCents" INTEGER,
    "aiScore" DOUBLE PRECISION,
    "aiRationale" TEXT,
    "status" "BidStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "awardedAt" TIMESTAMP(3),
    "vendorName" TEXT,
    "vendorEmail" TEXT,
    "responseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapExForecast" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedCostCents" INTEGER NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "projectedYear" INTEGER NOT NULL,
    "urgency" "ForecastUrgency" NOT NULL DEFAULT 'MEDIUM',
    "aiRationale" TEXT,
    "status" "ForecastStatus" NOT NULL DEFAULT 'PROJECTED',
    "approvedBudget" INTEGER,
    "actualCostCents" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapExForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseAbstraction" (
    "id" UUID NOT NULL,
    "leaseId" UUID NOT NULL,
    "documentId" UUID,
    "extractedData" JSONB,
    "keyDates" JSONB,
    "financialTerms" JSONB,
    "clauses" JSONB,
    "aiConfidence" DOUBLE PRECISION,
    "status" "AbstractionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseAbstraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "preferredName" TEXT,
    "relationshipStatus" "TenantRelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "healthClass" "TenantHealthClassification" NOT NULL DEFAULT 'STABLE',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pets" JSONB,
    "vehicles" JSONB,
    "idVerified" BOOLEAN NOT NULL DEFAULT false,
    "idVerifiedAt" TIMESTAMP(3),
    "moveInDate" TIMESTAMP(3),
    "moveOutDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" UUID NOT NULL,
    "tenantProfileId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "isOnLease" BOOLEAN NOT NULL DEFAULT false,
    "dateOfBirth" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantStatusHistory" (
    "id" UUID NOT NULL,
    "tenantProfileId" UUID NOT NULL,
    "fromStatus" "TenantRelationshipStatus",
    "toStatus" "TenantRelationshipStatus" NOT NULL,
    "reason" TEXT,
    "changedById" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Violation" (
    "id" UUID NOT NULL,
    "tenantProfileId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "resolvedNotes" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChartOfAccount_organizationId_type_idx" ON "ChartOfAccount"("organizationId", "type");

-- CreateIndex
CREATE INDEX "ChartOfAccount_organizationId_isActive_idx" ON "ChartOfAccount"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ChartOfAccount_organizationId_code_key" ON "ChartOfAccount"("organizationId", "code");

-- CreateIndex
CREATE INDEX "JournalEntry_organizationId_date_idx" ON "JournalEntry"("organizationId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_organizationId_status_idx" ON "JournalEntry"("organizationId", "status");

-- CreateIndex
CREATE INDEX "JournalEntry_sourceType_sourceId_idx" ON "JournalEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_organizationId_entryNumber_key" ON "JournalEntry"("organizationId", "entryNumber");

-- CreateIndex
CREATE INDEX "JournalLineItem_journalEntryId_idx" ON "JournalLineItem"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLineItem_accountId_idx" ON "JournalLineItem"("accountId");

-- CreateIndex
CREATE INDEX "JournalLineItem_propertyId_idx" ON "JournalLineItem"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "BookkeepingTransaction_bankTransactionId_key" ON "BookkeepingTransaction"("bankTransactionId");

-- CreateIndex
CREATE INDEX "BookkeepingTransaction_organizationId_status_idx" ON "BookkeepingTransaction"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BookkeepingTransaction_organizationId_date_idx" ON "BookkeepingTransaction"("organizationId", "date");

-- CreateIndex
CREATE INDEX "BookkeepingTransaction_sourceType_sourceId_idx" ON "BookkeepingTransaction"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "BookkeepingAllocation_transactionId_idx" ON "BookkeepingAllocation"("transactionId");

-- CreateIndex
CREATE INDEX "BookkeepingAllocation_accountId_idx" ON "BookkeepingAllocation"("accountId");

-- CreateIndex
CREATE INDEX "BookkeepingAllocation_propertyId_idx" ON "BookkeepingAllocation"("propertyId");

-- CreateIndex
CREATE INDEX "ReconciliationSession_organizationId_status_idx" ON "ReconciliationSession"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationSession_organizationId_month_bankAccountRef_key" ON "ReconciliationSession"("organizationId", "month", "bankAccountRef");

-- CreateIndex
CREATE INDEX "ReconciliationSessionItem_sessionId_status_idx" ON "ReconciliationSessionItem"("sessionId", "status");

-- CreateIndex
CREATE INDEX "ReconciliationSessionItem_bankTransactionId_idx" ON "ReconciliationSessionItem"("bankTransactionId");

-- CreateIndex
CREATE INDEX "ReconciliationSessionItem_ledgerEntryId_idx" ON "ReconciliationSessionItem"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "OwnerStatement_organizationId_month_idx" ON "OwnerStatement"("organizationId", "month");

-- CreateIndex
CREATE INDEX "OwnerStatement_ownerId_month_idx" ON "OwnerStatement"("ownerId", "month");

-- CreateIndex
CREATE INDEX "OwnerStatement_status_idx" ON "OwnerStatement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerStatement_organizationId_ownerId_month_key" ON "OwnerStatement"("organizationId", "ownerId", "month");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_idx" ON "Vendor"("organizationId");

-- CreateIndex
CREATE INDEX "VendorCompliance_vendorId_status_idx" ON "VendorCompliance"("vendorId", "status");

-- CreateIndex
CREATE INDEX "TenantInsurancePolicy_leaseId_status_idx" ON "TenantInsurancePolicy"("leaseId", "status");

-- CreateIndex
CREATE INDEX "TenantInsurancePolicy_endDate_idx" ON "TenantInsurancePolicy"("endDate");

-- CreateIndex
CREATE INDEX "OwnerDraw_ownerStatementId_idx" ON "OwnerDraw"("ownerStatementId");

-- CreateIndex
CREATE INDEX "OwnerDraw_status_idx" ON "OwnerDraw"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MasterUtilityBill_propertyId_utilityType_billingPeriod_key" ON "MasterUtilityBill"("propertyId", "utilityType", "billingPeriod");

-- CreateIndex
CREATE INDEX "UtilityAllocation_masterBillId_idx" ON "UtilityAllocation"("masterBillId");

-- CreateIndex
CREATE INDEX "UtilityAllocation_leaseId_idx" ON "UtilityAllocation"("leaseId");

-- CreateIndex
CREATE UNIQUE INDEX "SmartDevice_providerId_key" ON "SmartDevice"("providerId");

-- CreateIndex
CREATE INDEX "SmartDevice_propertyId_deviceType_idx" ON "SmartDevice"("propertyId", "deviceType");

-- CreateIndex
CREATE INDEX "SmartDevice_unitId_idx" ON "SmartDevice"("unitId");

-- CreateIndex
CREATE INDEX "AccessCode_deviceId_status_idx" ON "AccessCode"("deviceId", "status");

-- CreateIndex
CREATE INDEX "AccessCode_propertyId_idx" ON "AccessCode"("propertyId");

-- CreateIndex
CREATE INDEX "OmnichannelThread_tenantId_status_idx" ON "OmnichannelThread"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ContractorBid_propertyId_status_idx" ON "ContractorBid"("propertyId", "status");

-- CreateIndex
CREATE INDEX "ContractorBid_vendorId_idx" ON "ContractorBid"("vendorId");

-- CreateIndex
CREATE INDEX "ContractorBid_maintenanceRequestId_idx" ON "ContractorBid"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "CapExForecast_propertyId_projectedYear_idx" ON "CapExForecast"("propertyId", "projectedYear");

-- CreateIndex
CREATE INDEX "CapExForecast_organizationId_status_idx" ON "CapExForecast"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CapExForecast_urgency_idx" ON "CapExForecast"("urgency");

-- CreateIndex
CREATE INDEX "LeaseAbstraction_leaseId_idx" ON "LeaseAbstraction"("leaseId");

-- CreateIndex
CREATE INDEX "LeaseAbstraction_status_idx" ON "LeaseAbstraction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantProfile_userId_key" ON "TenantProfile"("userId");

-- CreateIndex
CREATE INDEX "TenantProfile_relationshipStatus_idx" ON "TenantProfile"("relationshipStatus");

-- CreateIndex
CREATE INDEX "TenantProfile_healthClass_idx" ON "TenantProfile"("healthClass");

-- CreateIndex
CREATE INDEX "HouseholdMember_tenantProfileId_idx" ON "HouseholdMember"("tenantProfileId");

-- CreateIndex
CREATE INDEX "TenantStatusHistory_tenantProfileId_createdAt_idx" ON "TenantStatusHistory"("tenantProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "Violation_tenantProfileId_isResolved_idx" ON "Violation"("tenantProfileId", "isResolved");

-- CreateIndex
CREATE INDEX "Violation_type_idx" ON "Violation"("type");

-- CreateIndex
CREATE INDEX "Expense_propertyId_idx" ON "Expense"("propertyId");

-- CreateIndex
CREATE INDEX "Expense_propertyId_date_idx" ON "Expense"("propertyId", "date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Invoice_leaseId_idx" ON "Invoice"("leaseId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");

-- CreateIndex
CREATE INDEX "LateFee_invoiceId_idx" ON "LateFee"("invoiceId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Payment_leaseId_idx" ON "Payment"("leaseId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "RentalApplication_propertyId_idx" ON "RentalApplication"("propertyId");

-- CreateIndex
CREATE INDEX "RentalApplication_unitId_idx" ON "RentalApplication"("unitId");

-- CreateIndex
CREATE INDEX "RentalApplication_applicantId_idx" ON "RentalApplication"("applicantId");

-- CreateIndex
CREATE INDEX "RentalApplication_status_idx" ON "RentalApplication"("status");

-- CreateIndex
CREATE INDEX "Unit_propertyId_idx" ON "Unit"("propertyId");

-- CreateIndex
CREATE INDEX "Unit_status_idx" ON "Unit"("status");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "OmnichannelThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLineItem" ADD CONSTRAINT "JournalLineItem_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLineItem" ADD CONSTRAINT "JournalLineItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookkeepingTransaction" ADD CONSTRAINT "BookkeepingTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookkeepingTransaction" ADD CONSTRAINT "BookkeepingTransaction_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookkeepingTransaction" ADD CONSTRAINT "BookkeepingTransaction_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookkeepingAllocation" ADD CONSTRAINT "BookkeepingAllocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "BookkeepingTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookkeepingAllocation" ADD CONSTRAINT "BookkeepingAllocation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationSession" ADD CONSTRAINT "ReconciliationSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationSession" ADD CONSTRAINT "ReconciliationSession_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationSessionItem" ADD CONSTRAINT "ReconciliationSessionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReconciliationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationSessionItem" ADD CONSTRAINT "ReconciliationSessionItem_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStatement" ADD CONSTRAINT "OwnerStatement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStatement" ADD CONSTRAINT "OwnerStatement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerStatement" ADD CONSTRAINT "OwnerStatement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorCompliance" ADD CONSTRAINT "VendorCompliance_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInsurancePolicy" ADD CONSTRAINT "TenantInsurancePolicy_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerDraw" ADD CONSTRAINT "OwnerDraw_ownerStatementId_fkey" FOREIGN KEY ("ownerStatementId") REFERENCES "OwnerStatement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterUtilityBill" ADD CONSTRAINT "MasterUtilityBill_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityAllocation" ADD CONSTRAINT "UtilityAllocation_masterBillId_fkey" FOREIGN KEY ("masterBillId") REFERENCES "MasterUtilityBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityAllocation" ADD CONSTRAINT "UtilityAllocation_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartDevice" ADD CONSTRAINT "SmartDevice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartDevice" ADD CONSTRAINT "SmartDevice_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "SmartDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorBid" ADD CONSTRAINT "ContractorBid_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapExForecast" ADD CONSTRAINT "CapExForecast_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseAbstraction" ADD CONSTRAINT "LeaseAbstraction_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantProfile" ADD CONSTRAINT "TenantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "TenantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantStatusHistory" ADD CONSTRAINT "TenantStatusHistory_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "TenantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "TenantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
