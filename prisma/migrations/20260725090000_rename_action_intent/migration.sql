-- Rename ActionIntent to WorkflowIntent to avoid table-name collision
-- with the backend's ActionIntent table in the public schema.

ALTER TABLE "ActionIntent" RENAME TO "WorkflowIntent";
ALTER INDEX "ActionIntent_tenantId_status_tier_idx" RENAME TO "WorkflowIntent_tenantId_status_tier_idx";
ALTER TABLE "WorkflowIntent" RENAME CONSTRAINT "ActionIntent_pkey" TO "WorkflowIntent_pkey";
ALTER TABLE "WorkflowIntent" RENAME CONSTRAINT "ActionIntent_tenantId_fkey" TO "WorkflowIntent_tenantId_fkey";
