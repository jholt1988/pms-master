-- DropForeignKey
ALTER TABLE "AgentRun" DROP CONSTRAINT "AgentRun_requestId_fkey";

-- DropForeignKey
ALTER TABLE "CommunicationLog" DROP CONSTRAINT "CommunicationLog_requestId_fkey";

-- AlterTable
ALTER TABLE "AgentRun" ALTER COLUMN "requestId" SET DATA TYPE UUID;

-- AlterTable
ALTER TABLE "CommunicationLog" ALTER COLUMN "requestId" SET DATA TYPE UUID;

-- CreateIndex
CREATE INDEX "AgentRun_requestId_idx" ON "AgentRun"("requestId");

-- CreateIndex
CREATE INDEX "CommunicationLog_requestId_createdAt_idx" ON "CommunicationLog"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
