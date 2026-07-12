-- Add secondary indexes to MaintenanceRequest for hot list/queue queries.
-- The table previously had no indexes beyond its primary key, so filters by
-- foreign key and status did sequential scans.

-- CreateIndex
CREATE INDEX "MaintenanceRequest_authorId_idx" ON "MaintenanceRequest"("authorId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_propertyId_idx" ON "MaintenanceRequest"("propertyId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_unitId_idx" ON "MaintenanceRequest"("unitId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_assigneeId_idx" ON "MaintenanceRequest"("assigneeId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_leaseId_idx" ON "MaintenanceRequest"("leaseId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_status_idx" ON "MaintenanceRequest"("status");
