-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "userId" UUID;

-- AlterTable
ALTER TABLE "MaintenanceRequest" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "vendorId" UUID;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "currency" TEXT DEFAULT 'USD',
ADD COLUMN     "dateFormat" TEXT DEFAULT 'MM/DD/YYYY',
ADD COLUMN     "lateFeeAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "lateFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateFeeGraceDays" INTEGER DEFAULT 5,
ADD COLUMN     "quickbooksConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timezone" TEXT DEFAULT 'America/New_York';

-- CreateIndex
CREATE INDEX "Decision_domain_type_resolved_idx" ON "Decision"("domain", "type", "resolved");

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
