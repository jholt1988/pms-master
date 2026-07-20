/*
  Warnings:

  - You are about to drop the column `currentBalance` on the `Lease` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lease" DROP COLUMN "currentBalance";

-- CreateTable
CREATE TABLE "ScreeningRequest" (
    "id" UUID NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "externalId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningReport" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "creditScore" INTEGER,
    "incomeVerified" BOOLEAN NOT NULL DEFAULT false,
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "backgroundClear" BOOLEAN NOT NULL DEFAULT false,
    "evictionHistory" BOOLEAN NOT NULL DEFAULT false,
    "criminalHistory" BOOLEAN NOT NULL DEFAULT false,
    "recommendation" TEXT,
    "riskFlags" JSONB,
    "rawReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScreeningRequest_applicationId_idx" ON "ScreeningRequest"("applicationId");

-- CreateIndex
CREATE INDEX "ScreeningRequest_externalId_idx" ON "ScreeningRequest"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningReport_requestId_key" ON "ScreeningReport"("requestId");

-- CreateIndex
CREATE INDEX "ScreeningReport_requestId_idx" ON "ScreeningReport"("requestId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");

-- CreateIndex
CREATE INDEX "EsignEnvelope_createdById_idx" ON "EsignEnvelope"("createdById");

-- CreateIndex
CREATE INDEX "Expense_recordedById_idx" ON "Expense"("recordedById");

-- CreateIndex
CREATE INDEX "InspectionChecklistPhoto_uploadedById_idx" ON "InspectionChecklistPhoto"("uploadedById");

-- CreateIndex
CREATE INDEX "Lease_tenantId_idx" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX "Lease_unitId_idx" ON "Lease"("unitId");

-- CreateIndex
CREATE INDEX "MaintenanceNote_authorId_idx" ON "MaintenanceNote"("authorId");

-- CreateIndex
CREATE INDEX "ManualCharge_createdById_idx" ON "ManualCharge"("createdById");

-- CreateIndex
CREATE INDEX "ManualPayment_createdById_idx" ON "ManualPayment"("createdById");

-- CreateIndex
CREATE INDEX "PaymentAttempt_invoiceId_idx" ON "PaymentAttempt"("invoiceId");

-- CreateIndex
CREATE INDEX "PolicyRuleApproval_approverUserId_idx" ON "PolicyRuleApproval"("approverUserId");

-- CreateIndex
CREATE INDEX "PolicyRuleEvaluation_workflowEventId_idx" ON "PolicyRuleEvaluation"("workflowEventId");

-- CreateIndex
CREATE INDEX "PricingSnapshot_feeScheduleVersionId_idx" ON "PricingSnapshot"("feeScheduleVersionId");

-- CreateIndex
CREATE INDEX "RepairEstimate_generatedById_idx" ON "RepairEstimate"("generatedById");

-- CreateIndex
CREATE INDEX "UnitInspection_createdById_idx" ON "UnitInspection"("createdById");

-- CreateIndex
CREATE INDEX "quickbooks_connections_userId_idx" ON "quickbooks_connections"("userId");

-- AddForeignKey
ALTER TABLE "ScreeningRequest" ADD CONSTRAINT "ScreeningRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningReport" ADD CONSTRAINT "ScreeningReport_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ScreeningRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
