-- Operational ledger boundary (R1)

-- Enums
DO $$ BEGIN
  CREATE TYPE "LedgerEntryType" AS ENUM ('CHARGE', 'CREDIT', 'PAYMENT', 'REVERSAL', 'RETURN_FEE', 'WRITEOFF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- LedgerAccount table
CREATE TABLE IF NOT EXISTS "LedgerAccount" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "leaseId" UUID NOT NULL,
  "propertyId" UUID,
  "unitId" UUID,
  "residentId" UUID,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LedgerAccount_organizationId_leaseId_key" ON "LedgerAccount"("organizationId", "leaseId");
CREATE INDEX IF NOT EXISTS "LedgerAccount_organizationId_status_idx" ON "LedgerAccount"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "LedgerAccount_leaseId_idx" ON "LedgerAccount"("leaseId");

-- LedgerTransaction table
CREATE TABLE IF NOT EXISTS "LedgerTransaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "accountId" UUID NOT NULL,
  "paymentId" INTEGER,
  "entryType" "LedgerEntryType" NOT NULL,
  "direction" "LedgerDirection" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "categoryCode" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "description" TEXT,
  "reversesEntryId" UUID,
  "reasonCode" TEXT,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "metadata" JSONB,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LedgerTransaction_accountId_effectiveDate_idx" ON "LedgerTransaction"("accountId", "effectiveDate");
CREATE INDEX IF NOT EXISTS "LedgerTransaction_paymentId_idx" ON "LedgerTransaction"("paymentId");
CREATE INDEX IF NOT EXISTS "LedgerTransaction_sourceType_sourceId_idx" ON "LedgerTransaction"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "LedgerTransaction_reversesEntryId_idx" ON "LedgerTransaction"("reversesEntryId");

-- FKs
DO $$ BEGIN
  ALTER TABLE "LedgerAccount"
    ADD CONSTRAINT "LedgerAccount_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "LedgerAccount"
    ADD CONSTRAINT "LedgerAccount_leaseId_fkey"
    FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "LedgerTransaction"
    ADD CONSTRAINT "LedgerTransaction_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "LedgerTransaction"
    ADD CONSTRAINT "LedgerTransaction_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
