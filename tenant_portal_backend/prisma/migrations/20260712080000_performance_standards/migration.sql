-- Phase 2: Add missing database indexes for query performance

-- User indexes
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- Unit indexes
CREATE INDEX IF NOT EXISTS "Unit_propertyId_idx" ON "Unit"("propertyId");
CREATE INDEX IF NOT EXISTS "Unit_status_idx" ON "Unit"("status");

-- Invoice indexes
CREATE INDEX IF NOT EXISTS "Invoice_leaseId_idx" ON "Invoice"("leaseId");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "Invoice_dueDate_idx" ON "Invoice"("dueDate");
CREATE INDEX IF NOT EXISTS "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");

-- Payment indexes
CREATE INDEX IF NOT EXISTS "Payment_leaseId_idx" ON "Payment"("leaseId");
CREATE INDEX IF NOT EXISTS "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- Message indexes
CREATE INDEX IF NOT EXISTS "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");

-- RentalApplication indexes
CREATE INDEX IF NOT EXISTS "RentalApplication_propertyId_idx" ON "RentalApplication"("propertyId");
CREATE INDEX IF NOT EXISTS "RentalApplication_unitId_idx" ON "RentalApplication"("unitId");
CREATE INDEX IF NOT EXISTS "RentalApplication_applicantId_idx" ON "RentalApplication"("applicantId");
CREATE INDEX IF NOT EXISTS "RentalApplication_status_idx" ON "RentalApplication"("status");

-- Expense indexes
CREATE INDEX IF NOT EXISTS "Expense_propertyId_idx" ON "Expense"("propertyId");
CREATE INDEX IF NOT EXISTS "Expense_propertyId_date_idx" ON "Expense"("propertyId", "date");
CREATE INDEX IF NOT EXISTS "Expense_category_idx" ON "Expense"("category");

-- LateFee indexes
CREATE INDEX IF NOT EXISTS "LateFee_invoiceId_idx" ON "LateFee"("invoiceId");
