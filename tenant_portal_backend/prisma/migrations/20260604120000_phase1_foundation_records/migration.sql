-- Phase 1 foundation persistence: idempotency records and decision records.

CREATE TABLE "IdempotencyRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "requestHash" TEXT,
    "result" JSONB,
    "error" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdempotencyRecord_scope_key_key" ON "IdempotencyRecord"("scope", "key");
CREATE INDEX "IdempotencyRecord_organizationId_scope_status_idx" ON "IdempotencyRecord"("organizationId", "scope", "status");
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

ALTER TABLE "IdempotencyRecord"
ADD CONSTRAINT "IdempotencyRecord_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DecisionRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "workflowId" TEXT NOT NULL,
    "workflowInstanceId" TEXT,
    "actorId" UUID,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "rationale" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "evidenceRefs" JSONB NOT NULL,
    "approvalTaskId" UUID,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DecisionRecord_organizationId_workflowId_createdAt_idx" ON "DecisionRecord"("organizationId", "workflowId", "createdAt");
CREATE INDEX "DecisionRecord_entityType_entityId_idx" ON "DecisionRecord"("entityType", "entityId");
CREATE INDEX "DecisionRecord_approvalTaskId_idx" ON "DecisionRecord"("approvalTaskId");

ALTER TABLE "DecisionRecord"
ADD CONSTRAINT "DecisionRecord_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DecisionRecord"
ADD CONSTRAINT "DecisionRecord_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DecisionRecord"
ADD CONSTRAINT "DecisionRecord_approvalTaskId_fkey"
FOREIGN KEY ("approvalTaskId") REFERENCES "ApprovalTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
