-- PR2 / Stage B · MIG-2 + MIG-4 (CONTRACT): lock down cents columns, drop Float columns.
-- Deploy ONLY after PR1 (expand) is live in every environment AND the dual-write / read-cents
-- application release is out. Run the expand parity checks (0 rows) before applying this.

BEGIN;

-- NOT NULL on required cents columns (money cluster)
ALTER TABLE "Payment"                  ALTER COLUMN "amountCents"               SET NOT NULL;
ALTER TABLE "Invoice"                  ALTER COLUMN "amountCents"               SET NOT NULL;
ALTER TABLE "LateFee"                  ALTER COLUMN "amountCents"               SET NOT NULL;
ALTER TABLE "Expense"                  ALTER COLUMN "amountCents"               SET NOT NULL;
ALTER TABLE "RecurringInvoiceSchedule" ALTER COLUMN "amountCents"               SET NOT NULL;
ALTER TABLE "PaymentPlan"              ALTER COLUMN "amountPerInstallmentCents" SET NOT NULL;
ALTER TABLE "PaymentPlan"              ALTER COLUMN "totalAmountCents"          SET NOT NULL;
ALTER TABLE "Lease"                    ALTER COLUMN "rentAmountCents"           SET NOT NULL;
-- Lease.depositAmountCents / currentBalanceCents are already NOT NULL DEFAULT 0

-- NOT NULL on required entangled cents (LeaseHistory cents stay nullable — source was Float?)
ALTER TABLE "LeaseRenewalOffer"  ALTER COLUMN "proposedRentCents"           SET NOT NULL;
ALTER TABLE "RentRecommendation" ALTER COLUMN "currentRentCents"            SET NOT NULL;
ALTER TABLE "RentRecommendation" ALTER COLUMN "recommendedRentCents"        SET NOT NULL;
ALTER TABLE "RentRecommendation" ALTER COLUMN "confidenceIntervalLowCents"  SET NOT NULL;
ALTER TABLE "RentRecommendation" ALTER COLUMN "confidenceIntervalHighCents" SET NOT NULL;

-- Non-negative guards. NOTE: none on Lease.currentBalanceCents (can be negative: credit/overpayment).
ALTER TABLE "Payment"                  ADD CONSTRAINT "Payment_amountCents_nonneg"  CHECK ("amountCents" >= 0);
ALTER TABLE "Invoice"                  ADD CONSTRAINT "Invoice_amountCents_nonneg"  CHECK ("amountCents" >= 0);
ALTER TABLE "LateFee"                  ADD CONSTRAINT "LateFee_amountCents_nonneg"  CHECK ("amountCents" >= 0);
ALTER TABLE "Expense"                  ADD CONSTRAINT "Expense_amountCents_nonneg"  CHECK ("amountCents" >= 0);
ALTER TABLE "RecurringInvoiceSchedule" ADD CONSTRAINT "RIS_amountCents_nonneg"      CHECK ("amountCents" >= 0 AND ("lateFeeAmountCents" IS NULL OR "lateFeeAmountCents" >= 0));
ALTER TABLE "PaymentPlan"              ADD CONSTRAINT "PaymentPlan_amounts_nonneg"  CHECK ("amountPerInstallmentCents" >= 0 AND "totalAmountCents" >= 0);
ALTER TABLE "Lease"                    ADD CONSTRAINT "Lease_rentDeposit_nonneg"    CHECK ("rentAmountCents" >= 0 AND "depositAmountCents" >= 0);
ALTER TABLE "LeaseRenewalOffer"  ADD CONSTRAINT "LeaseRenewalOffer_proposedRentCents_nonneg" CHECK ("proposedRentCents" >= 0);
ALTER TABLE "RentRecommendation" ADD CONSTRAINT "RentRecommendation_rents_nonneg" CHECK ("currentRentCents" >= 0 AND "recommendedRentCents" >= 0 AND "confidenceIntervalLowCents" >= 0 AND "confidenceIntervalHighCents" >= 0);
ALTER TABLE "LeaseHistory"       ADD CONSTRAINT "LeaseHistory_rentDeposit_nonneg" CHECK (("rentAmountCents" IS NULL OR "rentAmountCents" >= 0) AND ("depositAmountCents" IS NULL OR "depositAmountCents" >= 0));

-- Drop the Float columns (money cluster)
ALTER TABLE "Payment"                  DROP COLUMN "amount";
ALTER TABLE "Invoice"                  DROP COLUMN "amount";
ALTER TABLE "LateFee"                  DROP COLUMN "amount";
ALTER TABLE "Expense"                  DROP COLUMN "amount";
ALTER TABLE "RecurringInvoiceSchedule" DROP COLUMN "amount";
ALTER TABLE "RecurringInvoiceSchedule" DROP COLUMN "lateFeeAmount";
ALTER TABLE "PaymentPlan"              DROP COLUMN "amountPerInstallment";
ALTER TABLE "PaymentPlan"              DROP COLUMN "totalAmount";
ALTER TABLE "Lease"                    DROP COLUMN "rentAmount";
ALTER TABLE "Lease"                    DROP COLUMN "depositAmount";
ALTER TABLE "Lease"                    DROP COLUMN "currentBalance";

-- Drop the Float columns (entangled)
ALTER TABLE "LeaseHistory"       DROP COLUMN "rentAmount";
ALTER TABLE "LeaseHistory"       DROP COLUMN "depositAmount";
ALTER TABLE "LeaseRenewalOffer"  DROP COLUMN "proposedRent";
ALTER TABLE "RentRecommendation" DROP COLUMN "currentRent";
ALTER TABLE "RentRecommendation" DROP COLUMN "recommendedRent";
ALTER TABLE "RentRecommendation" DROP COLUMN "confidenceIntervalLow";
ALTER TABLE "RentRecommendation" DROP COLUMN "confidenceIntervalHigh";

COMMIT;
