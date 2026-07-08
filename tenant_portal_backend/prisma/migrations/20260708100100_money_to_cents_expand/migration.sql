-- MIG-2 + MIG-4 (EXPAND) · add integer-cents columns and backfill from Float; KEEP the Float columns.
-- Safe to deploy now. Ship the dual-write / read-cents application release BEFORE the contract migration.
-- Rounding via ::numeric avoids binary-float error.

BEGIN;

-- ---- Payment (MIG-2) ----
ALTER TABLE "Payment" ADD COLUMN "amountCents" INTEGER;
UPDATE "Payment" SET "amountCents" = ROUND("amount"::numeric * 100)::int WHERE "amountCents" IS NULL;

-- ---- Operational money cluster (MIG-4) ----
ALTER TABLE "Invoice"                  ADD COLUMN "amountCents"               INTEGER;
ALTER TABLE "LateFee"                  ADD COLUMN "amountCents"               INTEGER;
ALTER TABLE "Expense"                  ADD COLUMN "amountCents"               INTEGER;
ALTER TABLE "RecurringInvoiceSchedule" ADD COLUMN "amountCents"               INTEGER;
ALTER TABLE "RecurringInvoiceSchedule" ADD COLUMN "lateFeeAmountCents"        INTEGER;   -- nullable (source is Float?)
ALTER TABLE "PaymentPlan"              ADD COLUMN "amountPerInstallmentCents" INTEGER;
ALTER TABLE "PaymentPlan"              ADD COLUMN "totalAmountCents"          INTEGER;
ALTER TABLE "Lease"                    ADD COLUMN "rentAmountCents"           INTEGER;
ALTER TABLE "Lease"                    ADD COLUMN "depositAmountCents"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Lease"                    ADD COLUMN "currentBalanceCents"       INTEGER NOT NULL DEFAULT 0;

UPDATE "Invoice"                  SET "amountCents"               = ROUND("amount"::numeric * 100)::int               WHERE "amountCents" IS NULL;
UPDATE "LateFee"                  SET "amountCents"               = ROUND("amount"::numeric * 100)::int               WHERE "amountCents" IS NULL;
UPDATE "Expense"                  SET "amountCents"               = ROUND("amount"::numeric * 100)::int               WHERE "amountCents" IS NULL;
UPDATE "RecurringInvoiceSchedule" SET "amountCents"               = ROUND("amount"::numeric * 100)::int               WHERE "amountCents" IS NULL;
UPDATE "RecurringInvoiceSchedule" SET "lateFeeAmountCents"        = ROUND("lateFeeAmount"::numeric * 100)::int        WHERE "lateFeeAmount" IS NOT NULL;
UPDATE "PaymentPlan"              SET "amountPerInstallmentCents" = ROUND("amountPerInstallment"::numeric * 100)::int WHERE "amountPerInstallmentCents" IS NULL;
UPDATE "PaymentPlan"              SET "totalAmountCents"          = ROUND("totalAmount"::numeric * 100)::int          WHERE "totalAmountCents" IS NULL;
UPDATE "Lease"                    SET "rentAmountCents"           = ROUND("rentAmount"::numeric * 100)::int;
UPDATE "Lease"                    SET "depositAmountCents"        = ROUND("depositAmount"::numeric * 100)::int;
UPDATE "Lease"                    SET "currentBalanceCents"       = ROUND("currentBalance"::numeric * 100)::int;

COMMIT;

-- Parity check (run manually before the contract migration; every row must return 0):
-- SELECT 'Payment'    t, count(*) FROM "Payment"                  WHERE "amountCents"               <> ROUND("amount"::numeric*100)::int
-- UNION ALL SELECT 'Invoice',    count(*) FROM "Invoice"                  WHERE "amountCents"               <> ROUND("amount"::numeric*100)::int
-- UNION ALL SELECT 'LateFee',    count(*) FROM "LateFee"                  WHERE "amountCents"               <> ROUND("amount"::numeric*100)::int
-- UNION ALL SELECT 'Expense',    count(*) FROM "Expense"                  WHERE "amountCents"               <> ROUND("amount"::numeric*100)::int
-- UNION ALL SELECT 'RIS',        count(*) FROM "RecurringInvoiceSchedule" WHERE "amountCents"               <> ROUND("amount"::numeric*100)::int
-- UNION ALL SELECT 'PP.install', count(*) FROM "PaymentPlan"              WHERE "amountPerInstallmentCents" <> ROUND("amountPerInstallment"::numeric*100)::int
-- UNION ALL SELECT 'PP.total',   count(*) FROM "PaymentPlan"              WHERE "totalAmountCents"          <> ROUND("totalAmount"::numeric*100)::int
-- UNION ALL SELECT 'Lease.rent', count(*) FROM "Lease"                    WHERE "rentAmountCents"           <> ROUND("rentAmount"::numeric*100)::int
-- UNION ALL SELECT 'Lease.dep',  count(*) FROM "Lease"                    WHERE "depositAmountCents"        <> ROUND("depositAmount"::numeric*100)::int
-- UNION ALL SELECT 'Lease.bal',  count(*) FROM "Lease"                    WHERE "currentBalanceCents"       <> ROUND("currentBalance"::numeric*100)::int;
