-- Add secondary indexes to unindexed foreign-key / hot-filter columns on
-- several models that previously had none (sequential scans on list queries).

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "RecurringInvoiceSchedule_nextRun_idx" ON "RecurringInvoiceSchedule"("nextRun");

-- CreateIndex
CREATE INDEX "PaymentPlan_status_idx" ON "PaymentPlan"("status");

-- CreateIndex
CREATE INDEX "AutopayEnrollment_paymentMethodId_idx" ON "AutopayEnrollment"("paymentMethodId");

-- CreateIndex
CREATE INDEX "BulkMessageBatch_status_idx" ON "BulkMessageBatch"("status");

-- CreateIndex
CREATE INDEX "BulkMessageBatch_creatorId_idx" ON "BulkMessageBatch"("creatorId");

-- CreateIndex
CREATE INDEX "BulkMessageRecipient_batchId_idx" ON "BulkMessageRecipient"("batchId");

-- CreateIndex
CREATE INDEX "BulkMessageRecipient_userId_idx" ON "BulkMessageRecipient"("userId");

-- CreateIndex
CREATE INDEX "BulkMessageRecipient_status_idx" ON "BulkMessageRecipient"("status");
