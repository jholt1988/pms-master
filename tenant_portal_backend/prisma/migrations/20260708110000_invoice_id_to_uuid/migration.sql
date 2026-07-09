-- MIG-INV · Invoice.id Int autoincrement -> String UUID (OPTION A: single windowed migration).
-- !! MAINTENANCE WINDOW: freeze writers to Invoice + children, take a FRESH backup first. !!
-- Repoints: Payment.invoiceId (SET NULL, nullable), LateFee.invoiceId (RESTRICT, indexed),
--   PaymentPlan.invoiceId (RESTRICT, unique), PaymentAttempt.invoiceId (RESTRICT, in composite unique).
-- Confirm FK/constraint names against \d "<table>" before running.
-- BEFORE dropping the int id: if Invoice.id is shown to users as the invoice number, add a
--   sequential number column first (see runbook "Invoice-number gotcha").

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid() on PG < 13

BEGIN;

ALTER TABLE "Invoice" ADD COLUMN "id_uuid" UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE "Payment"        ADD COLUMN "invoiceId_uuid" UUID;
ALTER TABLE "LateFee"        ADD COLUMN "invoiceId_uuid" UUID;
ALTER TABLE "PaymentPlan"    ADD COLUMN "invoiceId_uuid" UUID;
ALTER TABLE "PaymentAttempt" ADD COLUMN "invoiceId_uuid" UUID;

UPDATE "Payment"        c SET "invoiceId_uuid" = i."id_uuid" FROM "Invoice" i WHERE c."invoiceId" = i."id";
UPDATE "LateFee"        c SET "invoiceId_uuid" = i."id_uuid" FROM "Invoice" i WHERE c."invoiceId" = i."id";
UPDATE "PaymentPlan"    c SET "invoiceId_uuid" = i."id_uuid" FROM "Invoice" i WHERE c."invoiceId" = i."id";
UPDATE "PaymentAttempt" c SET "invoiceId_uuid" = i."id_uuid" FROM "Invoice" i WHERE c."invoiceId" = i."id";

-- drop old FKs (dropping the columns later would cascade these, but be explicit)
ALTER TABLE "Payment"        DROP CONSTRAINT "Payment_invoiceId_fkey";
ALTER TABLE "LateFee"        DROP CONSTRAINT "LateFee_invoiceId_fkey";
ALTER TABLE "PaymentPlan"    DROP CONSTRAINT "PaymentPlan_invoiceId_fkey";
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT "PaymentAttempt_invoiceId_fkey";

-- swap Invoice PK
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_pkey";
ALTER TABLE "Invoice" DROP COLUMN "id";
ALTER TABLE "Invoice" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "Invoice" ALTER COLUMN "id" DROP DEFAULT;   -- Prisma generates uuid() app-side
ALTER TABLE "Invoice" ADD PRIMARY KEY ("id");

-- Payment.invoiceId (nullable, ON DELETE SET NULL) — no index existed originally
ALTER TABLE "Payment" DROP COLUMN "invoiceId";
ALTER TABLE "Payment" RENAME COLUMN "invoiceId_uuid" TO "invoiceId";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- LateFee.invoiceId (required, ON DELETE RESTRICT) — recreate @@index
ALTER TABLE "LateFee" DROP COLUMN "invoiceId";
ALTER TABLE "LateFee" RENAME COLUMN "invoiceId_uuid" TO "invoiceId";
ALTER TABLE "LateFee" ALTER COLUMN "invoiceId" SET NOT NULL;
ALTER TABLE "LateFee" ADD CONSTRAINT "LateFee_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "LateFee_invoiceId_idx" ON "LateFee"("invoiceId");

-- PaymentPlan.invoiceId (required, unique 1:1, ON DELETE RESTRICT)
ALTER TABLE "PaymentPlan" DROP COLUMN "invoiceId";
ALTER TABLE "PaymentPlan" RENAME COLUMN "invoiceId_uuid" TO "invoiceId";
ALTER TABLE "PaymentPlan" ALTER COLUMN "invoiceId" SET NOT NULL;
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "PaymentPlan_invoiceId_key" ON "PaymentPlan"("invoiceId");

-- PaymentAttempt.invoiceId (required, ON DELETE RESTRICT) — recreate composite unique
ALTER TABLE "PaymentAttempt" DROP COLUMN "invoiceId";
ALTER TABLE "PaymentAttempt" RENAME COLUMN "invoiceId_uuid" TO "invoiceId";
ALTER TABLE "PaymentAttempt" ALTER COLUMN "invoiceId" SET NOT NULL;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_autopayEnrollmentId_invoiceId_scheduledFor_key"
  UNIQUE ("autopayEnrollmentId","invoiceId","scheduledFor");

COMMIT;

-- Post-verify (expect 0):
-- SELECT count(*) FROM "LateFee"        WHERE "invoiceId" IS NULL;
-- SELECT count(*) FROM "PaymentPlan"    WHERE "invoiceId" IS NULL;
-- SELECT count(*) FROM "PaymentAttempt" WHERE "invoiceId" IS NULL;
-- SELECT count(*) FROM "Payment" p LEFT JOIN "Invoice" i ON p."invoiceId"=i."id"
--   WHERE p."invoiceId" IS NOT NULL AND i."id" IS NULL;
