CREATE TABLE IF NOT EXISTS "StripeWebhookEvent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "stripeAccountId" TEXT,
  "organizationId" UUID,
  "payload" JSONB,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "StripeWebhookEvent_eventId_key"
  ON "StripeWebhookEvent"("eventId");

CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_org_processed_idx"
  ON "StripeWebhookEvent"("organizationId", "processedAt");

CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_type_idx"
  ON "StripeWebhookEvent"("eventType");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StripeWebhookEvent_organization_fkey') THEN
    ALTER TABLE "StripeWebhookEvent"
      ADD CONSTRAINT "StripeWebhookEvent_organization_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
