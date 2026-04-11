/*
  Warnings:

  - The `status` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `PropertyGeocodeAudit` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[organizationId,companyId]` on the table `quickbooks_connections` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationId` to the `quickbooks_connections` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PolicyArtifactType" AS ENUM ('LEASE', 'LEDGER_SNAPSHOT', 'NOTICE', 'COMM_LOG', 'TENANT_PROFILE');

-- CreateEnum
CREATE TYPE "PolicyDecisionType" AS ENUM ('APPROVE', 'CONDITIONAL_APPROVE', 'DENY', 'WAITLIST', 'ESCALATE', 'NO_ACTION', 'GENERATE_NOTICE', 'GENERATE_PAYMENT_PLAN', 'REFER_ATTORNEY', 'APPLY_LATE_FEE');

-- CreateEnum
CREATE TYPE "PolicyWorkflowEventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PolicyRuleApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "InspectionStatus" ADD VALUE 'APPROVED';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'OWNER';

-- DropForeignKey
ALTER TABLE "CommunicationLog" DROP CONSTRAINT "CommunicationLog_requestId_fkey";

-- DropForeignKey
ALTER TABLE "SyndicationCredential" DROP CONSTRAINT "SyndicationCredential_organizationId_fkey";

-- DropIndex
DROP INDEX "quickbooks_connections_userId_companyId_key";

-- AlterTable
ALTER TABLE "CommunicationLog" ALTER COLUMN "requestId" SET DATA TYPE UUID;

-- AlterTable
ALTER TABLE "FeeScheduleVersion" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LedgerAccount" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LedgerTransaction" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrgPlanCycle" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "PaymentAttempt" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PaymentLedgerEntry" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PricingSnapshot" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RepairEstimate" ADD COLUMN     "stepByStepPlan" TEXT,
ADD COLUMN     "totalLaborHours" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "StripeWebhookEvent" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserOrganization" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "quickbooks_connections" ADD COLUMN     "organizationId" UUID NOT NULL;

-- DropTable
DROP TABLE "PropertyGeocodeAudit";

-- CreateTable
CREATE TABLE "PolicyBundle" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bundleJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "PolicyBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyWorkflowEvent" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "status" "PolicyWorkflowEventStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PolicyWorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRuleEvaluation" (
    "id" UUID NOT NULL,
    "workflowEventId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "ruleName" TEXT NOT NULL,
    "decisionType" "PolicyDecisionType" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "reasonsJson" JSONB,
    "inputSnapshotJson" JSONB NOT NULL,
    "outputSnapshotJson" JSONB NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyRuleEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRuleApproval" (
    "id" UUID NOT NULL,
    "ruleEvaluationId" UUID NOT NULL,
    "approverUserId" UUID NOT NULL,
    "approverRole" TEXT NOT NULL,
    "status" "PolicyRuleApprovalStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyRuleApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyServiceProof" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "relatedEntityType" TEXT NOT NULL,
    "relatedEntityId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "photoUrl" TEXT,
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "trackingNumber" TEXT,
    "attestationText" TEXT,
    "servedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyServiceProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAttorneyReferral" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "caseStatus" TEXT NOT NULL,
    "handoffMethod" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAttorneyReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAttorneyReferralArtifact" (
    "id" UUID NOT NULL,
    "referralId" UUID NOT NULL,
    "type" "PolicyArtifactType" NOT NULL,
    "uri" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAttorneyReferralArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyMonthlyClose" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedByUserId" UUID,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyMonthlyClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRuleActionLog" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "ruleEvaluationId" UUID,
    "actorType" TEXT NOT NULL,
    "actorId" UUID,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyRuleActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionIntent" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "userId" UUID,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedItem" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priorityScore" DOUBLE PRECISION NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "roleAccess" TEXT[],
    "tenantId" TEXT,
    "propertyId" TEXT,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PolicyBundle_propertyId_isActive_idx" ON "PolicyBundle"("propertyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyBundle_propertyId_version_key" ON "PolicyBundle"("propertyId", "version");

-- CreateIndex
CREATE INDEX "PolicyWorkflowEvent_propertyId_eventType_status_idx" ON "PolicyWorkflowEvent"("propertyId", "eventType", "status");

-- CreateIndex
CREATE INDEX "PolicyWorkflowEvent_aggregateType_aggregateId_idx" ON "PolicyWorkflowEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "PolicyRuleEvaluation_propertyId_ruleName_createdAt_idx" ON "PolicyRuleEvaluation"("propertyId", "ruleName", "createdAt");

-- CreateIndex
CREATE INDEX "PolicyRuleApproval_ruleEvaluationId_status_idx" ON "PolicyRuleApproval"("ruleEvaluationId", "status");

-- CreateIndex
CREATE INDEX "PolicyServiceProof_propertyId_relatedEntityType_relatedEnti_idx" ON "PolicyServiceProof"("propertyId", "relatedEntityType", "relatedEntityId");

-- CreateIndex
CREATE INDEX "PolicyAttorneyReferral_propertyId_tenantId_caseStatus_idx" ON "PolicyAttorneyReferral"("propertyId", "tenantId", "caseStatus");

-- CreateIndex
CREATE INDEX "PolicyAttorneyReferralArtifact_referralId_type_idx" ON "PolicyAttorneyReferralArtifact"("referralId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyMonthlyClose_propertyId_month_key" ON "PolicyMonthlyClose"("propertyId", "month");

-- CreateIndex
CREATE INDEX "PolicyRuleActionLog_propertyId_entityType_entityId_createdA_idx" ON "PolicyRuleActionLog"("propertyId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "PolicyRuleActionLog_ruleEvaluationId_createdAt_idx" ON "PolicyRuleActionLog"("ruleEvaluationId", "createdAt");

-- CreateIndex
CREATE INDEX "ActionIntent_organizationId_status_idx" ON "ActionIntent"("organizationId", "status");

-- CreateIndex
CREATE INDEX "FeedItem_roleAccess_idx" ON "FeedItem"("roleAccess");

-- CreateIndex
CREATE INDEX "FeedItem_priorityScore_idx" ON "FeedItem"("priorityScore" DESC);

-- CreateIndex
CREATE INDEX "FeedItem_propertyId_idx" ON "FeedItem"("propertyId");

-- CreateIndex
CREATE INDEX "OrgPlanCycle_startsAt_endsAt_idx" ON "OrgPlanCycle"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PricingSnapshot_planCycleId_createdAt_idx" ON "PricingSnapshot"("planCycleId", "createdAt");

-- CreateIndex
CREATE INDEX "quickbooks_connections_organizationId_idx" ON "quickbooks_connections"("organizationId");

-- CreateIndex
CREATE INDEX "quickbooks_connections_organizationId_isActive_idx" ON "quickbooks_connections"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "quickbooks_connections_organizationId_companyId_key" ON "quickbooks_connections"("organizationId", "companyId");

-- RenameForeignKey
ALTER TABLE "FeeScheduleVersion" RENAME CONSTRAINT "FeeScheduleVersion_createdBy_fkey" TO "FeeScheduleVersion_createdById_fkey";

-- RenameForeignKey
ALTER TABLE "FeeScheduleVersion" RENAME CONSTRAINT "FeeScheduleVersion_organization_fkey" TO "FeeScheduleVersion_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "OrgPlanCycle" RENAME CONSTRAINT "OrgPlanCycle_activeFeeSchedule_fkey" TO "OrgPlanCycle_activeFeeScheduleId_fkey";

-- RenameForeignKey
ALTER TABLE "OrgPlanCycle" RENAME CONSTRAINT "OrgPlanCycle_organization_fkey" TO "OrgPlanCycle_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "PaymentAttempt" RENAME CONSTRAINT "PaymentAttempt_autopayEnrollment_fkey" TO "PaymentAttempt_autopayEnrollmentId_fkey";

-- RenameForeignKey
ALTER TABLE "PaymentAttempt" RENAME CONSTRAINT "PaymentAttempt_invoice_fkey" TO "PaymentAttempt_invoiceId_fkey";

-- RenameForeignKey
ALTER TABLE "PaymentLedgerEntry" RENAME CONSTRAINT "PaymentLedgerEntry_organization_fkey" TO "PaymentLedgerEntry_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "PaymentLedgerEntry" RENAME CONSTRAINT "PaymentLedgerEntry_payment_fkey" TO "PaymentLedgerEntry_paymentId_fkey";

-- RenameForeignKey
ALTER TABLE "PricingSnapshot" RENAME CONSTRAINT "PricingSnapshot_feeScheduleVersion_fkey" TO "PricingSnapshot_feeScheduleVersionId_fkey";

-- RenameForeignKey
ALTER TABLE "PricingSnapshot" RENAME CONSTRAINT "PricingSnapshot_organization_fkey" TO "PricingSnapshot_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "PricingSnapshot" RENAME CONSTRAINT "PricingSnapshot_planCycle_fkey" TO "PricingSnapshot_planCycleId_fkey";

-- RenameForeignKey
ALTER TABLE "StripeWebhookEvent" RENAME CONSTRAINT "StripeWebhookEvent_organization_fkey" TO "StripeWebhookEvent_organizationId_fkey";

-- AddForeignKey
ALTER TABLE "SyndicationCredential" ADD CONSTRAINT "SyndicationCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quickbooks_connections" ADD CONSTRAINT "quickbooks_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyBundle" ADD CONSTRAINT "PolicyBundle_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyWorkflowEvent" ADD CONSTRAINT "PolicyWorkflowEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRuleEvaluation" ADD CONSTRAINT "PolicyRuleEvaluation_workflowEventId_fkey" FOREIGN KEY ("workflowEventId") REFERENCES "PolicyWorkflowEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRuleEvaluation" ADD CONSTRAINT "PolicyRuleEvaluation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRuleApproval" ADD CONSTRAINT "PolicyRuleApproval_ruleEvaluationId_fkey" FOREIGN KEY ("ruleEvaluationId") REFERENCES "PolicyRuleEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyServiceProof" ADD CONSTRAINT "PolicyServiceProof_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAttorneyReferral" ADD CONSTRAINT "PolicyAttorneyReferral_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAttorneyReferralArtifact" ADD CONSTRAINT "PolicyAttorneyReferralArtifact_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "PolicyAttorneyReferral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyMonthlyClose" ADD CONSTRAINT "PolicyMonthlyClose_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRuleActionLog" ADD CONSTRAINT "PolicyRuleActionLog_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRuleActionLog" ADD CONSTRAINT "PolicyRuleActionLog_ruleEvaluationId_fkey" FOREIGN KEY ("ruleEvaluationId") REFERENCES "PolicyRuleEvaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionIntent" ADD CONSTRAINT "ActionIntent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionIntent" ADD CONSTRAINT "ActionIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "FeeScheduleVersion_org_effective_idx" RENAME TO "FeeScheduleVersion_organizationId_effectiveAt_idx";

-- RenameIndex
ALTER INDEX "FeeScheduleVersion_org_version_unique" RENAME TO "FeeScheduleVersion_organizationId_versionLabel_key";

-- RenameIndex
ALTER INDEX "OrgPlanCycle_org_status_idx" RENAME TO "OrgPlanCycle_organizationId_status_idx";

-- RenameIndex
ALTER INDEX "PaymentAttempt_status_scheduled_idx" RENAME TO "PaymentAttempt_status_scheduledFor_idx";

-- RenameIndex
ALTER INDEX "PaymentAttempt_unique_schedule" RENAME TO "PaymentAttempt_autopayEnrollmentId_invoiceId_scheduledFor_key";

-- RenameIndex
ALTER INDEX "PaymentLedgerEntry_org_created_idx" RENAME TO "PaymentLedgerEntry_organizationId_createdAt_idx";

-- RenameIndex
ALTER INDEX "PaymentLedgerEntry_payment_created_idx" RENAME TO "PaymentLedgerEntry_paymentId_createdAt_idx";

-- RenameIndex
ALTER INDEX "PricingSnapshot_org_created_idx" RENAME TO "PricingSnapshot_organizationId_createdAt_idx";

-- RenameIndex
ALTER INDEX "StripeWebhookEvent_org_processed_idx" RENAME TO "StripeWebhookEvent_organizationId_processedAt_idx";

-- RenameIndex
ALTER INDEX "StripeWebhookEvent_type_idx" RENAME TO "StripeWebhookEvent_eventType_idx";
