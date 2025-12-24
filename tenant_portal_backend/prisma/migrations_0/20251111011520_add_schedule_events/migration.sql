-- CreateEnum
CREATE TYPE "ScheduleEventType" AS ENUM ('TOUR', 'MOVE_IN', 'MOVE_OUT', 'LEASE_EXPIRATION', 'LEASE_RENEWAL', 'INSPECTION', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "EventPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "ScheduleEvent" (
    "id" SERIAL NOT NULL,
    "type" "ScheduleEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "priority" "EventPriority" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT,
    "status" TEXT DEFAULT 'SCHEDULED',
    "propertyId" INTEGER,
    "unitId" INTEGER,
    "tenantId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleEvent_date_idx" ON "ScheduleEvent"("date");

-- CreateIndex
CREATE INDEX "ScheduleEvent_type_idx" ON "ScheduleEvent"("type");

-- CreateIndex
CREATE INDEX "ScheduleEvent_priority_idx" ON "ScheduleEvent"("priority");

-- CreateIndex
CREATE INDEX "ScheduleEvent_propertyId_idx" ON "ScheduleEvent"("propertyId");

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
