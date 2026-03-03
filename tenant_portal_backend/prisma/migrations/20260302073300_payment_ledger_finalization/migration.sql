CREATE TABLE IF NOT EXISTS "PaymentLedgerEntry" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "paymentId" INTEGER NOT NULL,
  "organizationId" UUID,
  "leaseId" UUID,
  "sourceEventId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "grossAmountMinor" INTEGER NOT NULL,
  "platformFeeMinor" INTEGER NOT NULL DEFAULT 0,
  "netAmountMinor" INTEGER NOT NULL,
  "tierSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentLedgerEntry_sourceEventId_key"
  ON "PaymentLedgerEntry"("sourceEventId");

CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_payment_created_idx"
  ON "PaymentLedgerEntry"("paymentId", "createdAt");

CREATE INDEX IF NOT EXISTS "PaymentLedgerEntry_org_created_idx"
  ON "PaymentLedgerEntry"("organizationId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentLedgerEntry_payment_fkey') THEN
    ALTER TABLE "PaymentLedgerEntry"
      ADD CONSTRAINT "PaymentLedgerEntry_payment_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentLedgerEntry_organization_fkey') THEN
    ALTER TABLE "PaymentLedgerEntry"
      ADD CONSTRAINT "PaymentLedgerEntry_organization_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
