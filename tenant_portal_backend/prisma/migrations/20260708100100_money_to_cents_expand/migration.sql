-- MIG-2 + MIG-4 (EXPAND) · add integer-cents columns + backfill from Float; KEEP the Float columns.
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

-- ---- Entangled rent/deposit copies (ratified 2026-07-08: migrate in the same wave) ----
ALTER TABLE "LeaseHistory"       ADD COLUMN "rentAmountCents"      INTEGER;   -- nullable (source Float?)
ALTER TABLE "LeaseHistory"       ADD COLUMN "depositAmountCents"   INTEGER;   -- nullable (source Float?)
ALTER TABLE "LeaseRenewalOffer"  ADD COLUMN "proposedRentCents"    INTEGER;
ALTER TABLE "RentRecommendation" ADD COLUMN "currentRentCents"            INTEGER;
ALTER TABLE "RentRecommendation" ADD COLUMN "recommendedRentCents"        INTEGER;
ALTER TABLE "RentRecommendation" ADD COLUMN "confidenceIntervalLowCents"  INTEGER;
ALTER TABLE "RentRecommendation" ADD COLUMN "confidenceIntervalHighCents" INTEGER;

UPDATE "LeaseHistory"       SET "rentAmountCents"      = ROUND("rentAmount"::numeric * 100)::int    WHERE "rentAmount" IS NOT NULL;
UPDATE "LeaseHistory"       SET "depositAmountCents"   = ROUND("depositAmount"::numeric * 100)::int WHERE "depositAmount" IS NOT NULL;
UPDATE "LeaseRenewalOffer"  SET "proposedRentCents"    = ROUND("proposedRent"::numeric * 100)::int;
UPDATE "RentRecommendation" SET "currentRentCents"            = ROUND("currentRent"::numeric * 100)::int;
UPDATE "RentRecommendation" SET "recommendedRentCents"        = ROUND("recommendedRent"::numeric * 100)::int;
UPDATE "RentRecommendation" SET "confidenceIntervalLowCents"  = ROUND("confidenceIntervalLow"::numeric * 100)::int;
UPDATE "RentRecommendation" SET "confidenceIntervalHighCents" = ROUND("confidenceIntervalHigh"::numeric * 100)::int;

COMMIT;

-- Parity check before the contract migration (every row must return 0). Money cluster + entangled:
-- SELECT 'Lease.rent' t, count(*) FROM "Lease" WHERE "rentAmountCents" <> ROUND("rentAmount"::numeric*100)::int
-- UNION ALL SELECT 'LRO.proposed', count(*) FROM "LeaseRenewalOffer"  WHERE "proposedRentCents"    <> ROUND("proposedRent"::numeric*100)::int
-- UNION ALL SELECT 'RR.current',   count(*) FROM "RentRecommendation" WHERE "currentRentCents"     <> ROUND("currentRent"::numeric*100)::int
-- UNION ALL SELECT 'RR.recommend', count(*) FROM "RentRecommendation" WHERE "recommendedRentCents" <> ROUND("recommendedRent"::numeric*100)::int
-- UNION ALL SELECT 'LH.rent',      count(*) FROM "LeaseHistory" WHERE "rentAmount" IS NOT NULL AND "rentAmountCents" <> ROUND("rentAmount"::numeric*100)::int;
-- RentRecommendation is now fully cents-native: currentRent, recommendedRent, confidenceIntervalLow, confidenceIntervalHigh all converted.
