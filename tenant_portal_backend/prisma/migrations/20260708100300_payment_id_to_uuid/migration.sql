-- PR2 / Stage B · MIG-3: Payment.id Int autoincrement -> String UUID, repointing all references.
-- !! MAINTENANCE WINDOW: freeze writers to Payment + children, take a FRESH backup first. !!
-- Apply only after the money contract migration above is live and the app uses cents + string ids.
-- References repointed: LedgerTransaction.paymentId (SetNull), PaymentLedgerEntry.paymentId (Restrict),
--   PaymentPlanPayment.paymentId (unique, Cascade), notices.payment_id (loose, no FK).
-- If FK constraint names differ from the Prisma defaults below, confirm with \d "<table>".

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- for gen_random_uuid() on PG < 13

BEGIN;

ALTER TABLE "Payment" ADD COLUMN "id_uuid" UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE "LedgerTransaction"  ADD COLUMN "paymentId_uuid"  UUID;
ALTER TABLE "PaymentLedgerEntry" ADD COLUMN "paymentId_uuid"  UUID;
ALTER TABLE "PaymentPlanPayment" ADD COLUMN "paymentId_uuid"  UUID;
ALTER TABLE "Notice"            ADD COLUMN "payment_id_uuid" UUID;

UPDATE "LedgerTransaction"  c SET "paymentId_uuid"  = p."id_uuid" FROM "Payment" p WHERE c."paymentId"  = p."id";
UPDATE "PaymentLedgerEntry" c SET "paymentId_uuid"  = p."id_uuid" FROM "Payment" p WHERE c."paymentId"  = p."id";
UPDATE "PaymentPlanPayment" c SET "paymentId_uuid"  = p."id_uuid" FROM "Payment" p WHERE c."paymentId"  = p."id";
UPDATE "Notice"            c SET "payment_id_uuid" = p."id_uuid" FROM "Payment" p WHERE c."payment_id" = p."id";

ALTER TABLE "LedgerTransaction"  DROP CONSTRAINT "LedgerTransaction_paymentId_fkey";
ALTER TABLE "PaymentLedgerEntry" DROP CONSTRAINT "PaymentLedgerEntry_paymentId_fkey";
ALTER TABLE "PaymentPlanPayment" DROP CONSTRAINT "PaymentPlanPayment_paymentId_fkey";

ALTER TABLE "Payment" DROP CONSTRAINT "Payment_pkey";
ALTER TABLE "Payment" DROP COLUMN "id";
ALTER TABLE "Payment" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "Payment" ALTER COLUMN "id" DROP DEFAULT;   -- Prisma generates uuid() app-side
ALTER TABLE "Payment" ADD PRIMARY KEY ("id");

-- LedgerTransaction (nullable, ON DELETE SET NULL)
ALTER TABLE "LedgerTransaction" DROP COLUMN "paymentId";
ALTER TABLE "LedgerTransaction" RENAME COLUMN "paymentId_uuid" TO "paymentId";
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "LedgerTransaction_paymentId_idx" ON "LedgerTransaction"("paymentId");

-- PaymentLedgerEntry (required, ON DELETE RESTRICT)
ALTER TABLE "PaymentLedgerEntry" DROP COLUMN "paymentId";
ALTER TABLE "PaymentLedgerEntry" RENAME COLUMN "paymentId_uuid" TO "paymentId";
ALTER TABLE "PaymentLedgerEntry" ALTER COLUMN "paymentId" SET NOT NULL;
ALTER TABLE "PaymentLedgerEntry" ADD CONSTRAINT "PaymentLedgerEntry_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PaymentLedgerEntry_paymentId_createdAt_idx" ON "PaymentLedgerEntry"("paymentId","createdAt");

-- PaymentPlanPayment (unique, ON DELETE CASCADE)
ALTER TABLE "PaymentPlanPayment" DROP COLUMN "paymentId";
ALTER TABLE "PaymentPlanPayment" RENAME COLUMN "paymentId_uuid" TO "paymentId";
ALTER TABLE "PaymentPlanPayment" ALTER COLUMN "paymentId" SET NOT NULL;
ALTER TABLE "PaymentPlanPayment" ADD CONSTRAINT "PaymentPlanPayment_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "PaymentPlanPayment_paymentId_key" ON "PaymentPlanPayment"("paymentId");

-- notices (loose reference; kept loose)
ALTER TABLE "Notice" DROP COLUMN "payment_id";
ALTER TABLE "Notice" RENAME COLUMN "payment_id_uuid" TO "payment_id";
CREATE INDEX "notices_payment_id_idx" ON "Notice"("payment_id");

COMMIT;
