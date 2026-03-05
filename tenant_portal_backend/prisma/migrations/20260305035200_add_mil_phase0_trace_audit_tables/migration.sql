-- Phase 0 MIL proposal: persist model access traces + MIL-specific audit events
-- Draft migration SQL (safe to review/apply via normal migration pipeline)

CREATE TABLE "ModelAccessTrace" (
  "id" UUID NOT NULL,
  "traceId" TEXT NOT NULL,
  "requestId" TEXT,
  "operation" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "orgId" UUID,
  "tenantId" UUID,
  "actorUserId" UUID,
  "actorRole" TEXT,
  "module" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "modelProvider" TEXT,
  "modelName" TEXT,
  "modelVersion" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ModelAccessTrace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MilAuditEvent" (
  "id" UUID NOT NULL,
  "traceId" TEXT,
  "orgId" UUID,
  "actorId" UUID,
  "module" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "result" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MilAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModelAccessTrace_traceId_createdAt_idx"
  ON "ModelAccessTrace"("traceId", "createdAt");
CREATE INDEX "ModelAccessTrace_orgId_createdAt_idx"
  ON "ModelAccessTrace"("orgId", "createdAt");
CREATE INDEX "ModelAccessTrace_tenantId_createdAt_idx"
  ON "ModelAccessTrace"("tenantId", "createdAt");
CREATE INDEX "ModelAccessTrace_actorUserId_createdAt_idx"
  ON "ModelAccessTrace"("actorUserId", "createdAt");
CREATE INDEX "ModelAccessTrace_operation_result_createdAt_idx"
  ON "ModelAccessTrace"("operation", "result", "createdAt");

CREATE INDEX "MilAuditEvent_traceId_createdAt_idx"
  ON "MilAuditEvent"("traceId", "createdAt");
CREATE INDEX "MilAuditEvent_orgId_createdAt_idx"
  ON "MilAuditEvent"("orgId", "createdAt");
CREATE INDEX "MilAuditEvent_actorId_createdAt_idx"
  ON "MilAuditEvent"("actorId", "createdAt");
CREATE INDEX "MilAuditEvent_module_action_createdAt_idx"
  ON "MilAuditEvent"("module", "action", "createdAt");
CREATE INDEX "MilAuditEvent_result_createdAt_idx"
  ON "MilAuditEvent"("result", "createdAt");
