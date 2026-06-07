CREATE TABLE "quickbooks_webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventKey" TEXT NOT NULL,
  "realmId" TEXT NOT NULL,
  "entityName" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "organizationId" UUID,
  "payload" JSONB,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "quickbooks_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quickbooks_webhook_events_eventKey_key" ON "quickbooks_webhook_events"("eventKey");
CREATE INDEX "quickbooks_webhook_events_organizationId_processedAt_idx" ON "quickbooks_webhook_events"("organizationId", "processedAt");
CREATE INDEX "quickbooks_webhook_events_realmId_entityName_idx" ON "quickbooks_webhook_events"("realmId", "entityName");

ALTER TABLE "quickbooks_webhook_events"
  ADD CONSTRAINT "quickbooks_webhook_events_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
