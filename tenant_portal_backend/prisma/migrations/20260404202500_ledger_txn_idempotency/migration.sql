-- Enforce idempotent posting for operational ledger transactions

CREATE UNIQUE INDEX IF NOT EXISTS "LedgerTransaction_accountId_sourceType_sourceId_entryType_key"
ON "LedgerTransaction"("accountId", "sourceType", "sourceId", "entryType");
