-- CreateEnum
CREATE TYPE "InspectionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'STARTED');

-- CreateTable
CREATE TABLE "InspectionRequest" (
    "id" SERIAL NOT NULL,
    "tenantId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "leaseId" UUID NOT NULL,
    "type" "InspectionType" NOT NULL,
    "status" "InspectionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "decisionNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedById" UUID,
    "startedAt" TIMESTAMP(3),
    "startedInspectionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InspectionRequest_tenantId_idx" ON "InspectionRequest"("tenantId");
CREATE INDEX "InspectionRequest_propertyId_idx" ON "InspectionRequest"("propertyId");
CREATE INDEX "InspectionRequest_unitId_idx" ON "InspectionRequest"("unitId");
CREATE INDEX "InspectionRequest_leaseId_idx" ON "InspectionRequest"("leaseId");
CREATE INDEX "InspectionRequest_status_idx" ON "InspectionRequest"("status");
CREATE INDEX "InspectionRequest_type_idx" ON "InspectionRequest"("type");

-- AddForeignKey
ALTER TABLE "InspectionRequest"
  ADD CONSTRAINT "InspectionRequest_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InspectionRequest"
  ADD CONSTRAINT "InspectionRequest_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InspectionRequest"
  ADD CONSTRAINT "InspectionRequest_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InspectionRequest"
  ADD CONSTRAINT "InspectionRequest_leaseId_fkey"
  FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InspectionRequest"
  ADD CONSTRAINT "InspectionRequest_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
