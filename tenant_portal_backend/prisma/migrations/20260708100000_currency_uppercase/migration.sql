-- MIG-1 · Currency casing -> uppercase ISO-4217
-- Safe to deploy now (normalizing + default fix). Fixes PaymentLedgerEntry default "usd" -> "USD".

BEGIN;

UPDATE "PaymentLedgerEntry" SET currency = upper(currency) WHERE currency <> upper(currency);
UPDATE "LedgerAccount"      SET currency = upper(currency) WHERE currency <> upper(currency);
UPDATE "ManualPayment"      SET currency = upper(currency) WHERE currency <> upper(currency);
UPDATE "ManualCharge"       SET currency = upper(currency) WHERE currency <> upper(currency);
UPDATE "BankTransaction"    SET currency = upper(currency) WHERE currency <> upper(currency);

ALTER TABLE "PaymentLedgerEntry" ALTER COLUMN currency SET DEFAULT 'USD';

ALTER TABLE "PaymentLedgerEntry"
  ADD CONSTRAINT "PaymentLedgerEntry_currency_iso"
  CHECK (currency = upper(currency) AND char_length(currency) = 3);

COMMIT;
