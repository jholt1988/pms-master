-- Migration: Add AI and Workflow tables
-- Created: 2025-01-XX
-- Description: Adds tables for workflow execution tracking and AI service data

-- WorkflowExecution table
CREATE TABLE IF NOT EXISTS "WorkflowExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- WorkflowExecutionStep table
CREATE TABLE IF NOT EXISTS "WorkflowExecutionStep" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "WorkflowExecutionStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- PaymentRiskScore table
CREATE TABLE IF NOT EXISTS "PaymentRiskScore" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "failureProbability" DOUBLE PRECISION NOT NULL,
    "factors" JSONB NOT NULL DEFAULT '[]',
    "recommendedActions" JSONB NOT NULL DEFAULT '[]',
    "optimalRetryTime" TIMESTAMP(3),
    "suggestPaymentPlan" BOOLEAN NOT NULL DEFAULT false,
    "paymentPlanSuggestion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRiskScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentRiskScore_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- NotificationPreference table
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL UNIQUE,
    "preferredChannels" TEXT[] NOT NULL DEFAULT ARRAY['EMAIL']::TEXT[],
    "preferredTimes" INTEGER[] NOT NULL DEFAULT ARRAY[9, 14, 18]::INTEGER[],
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "quietHoursStart" INTEGER NOT NULL DEFAULT 22,
    "quietHoursEnd" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AIMaintenanceAssignment table
CREATE TABLE IF NOT EXISTS "AIMaintenanceAssignment" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "requestId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "assignedBy" TEXT NOT NULL DEFAULT 'AI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMaintenanceAssignment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIMaintenanceAssignment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AnomalyDetection table
CREATE TABLE IF NOT EXISTS "AnomalyDetection" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "recommendedActions" JSONB NOT NULL DEFAULT '[]',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" INTEGER,
    CONSTRAINT "AnomalyDetection_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ServiceHealth table
CREATE TABLE IF NOT EXISTS "ServiceHealth" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "serviceName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseTime" INTEGER,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "WorkflowExecution_workflowId_idx" ON "WorkflowExecution"("workflowId");
CREATE INDEX IF NOT EXISTS "WorkflowExecution_status_idx" ON "WorkflowExecution"("status");
CREATE INDEX IF NOT EXISTS "WorkflowExecutionStep_executionId_idx" ON "WorkflowExecutionStep"("executionId");
CREATE INDEX IF NOT EXISTS "PaymentRiskScore_userId_idx" ON "PaymentRiskScore"("userId");
CREATE INDEX IF NOT EXISTS "PaymentRiskScore_invoiceId_idx" ON "PaymentRiskScore"("invoiceId");
CREATE INDEX IF NOT EXISTS "AIMaintenanceAssignment_requestId_idx" ON "AIMaintenanceAssignment"("requestId");
CREATE INDEX IF NOT EXISTS "AIMaintenanceAssignment_technicianId_idx" ON "AIMaintenanceAssignment"("technicianId");
CREATE INDEX IF NOT EXISTS "AnomalyDetection_type_idx" ON "AnomalyDetection"("type");
CREATE INDEX IF NOT EXISTS "AnomalyDetection_severity_idx" ON "AnomalyDetection"("severity");
CREATE INDEX IF NOT EXISTS "AnomalyDetection_detectedAt_idx" ON "AnomalyDetection"("detectedAt");
CREATE INDEX IF NOT EXISTS "ServiceHealth_serviceName_idx" ON "ServiceHealth"("serviceName");
CREATE INDEX IF NOT EXISTS "ServiceHealth_checkedAt_idx" ON "ServiceHealth"("checkedAt");

