/*
  Warnings:

  - Added the required column `event` to the `MilAuditEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MilAuditEvent" ADD COLUMN     "event" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "userId" UUID,
    "payload" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_event_idx" ON "AuditLog"("event");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
