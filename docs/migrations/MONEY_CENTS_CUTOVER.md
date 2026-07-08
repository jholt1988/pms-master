# Stage-A App-Layer Cutover — Float → integer cents

Working checklist for moving the money fields off `Float` to integer `*Cents`.
Companion to the DB migrations (`money_to_cents_expand` / `money_to_cents_contract`).

**Canonical rule:** money lives in **integer cents** in the app. Use `src/utils/money.ts`
(`toCents`, `fromCents`, `formatCents`, `sumCents`, `splitCents`). Divide by 100 **only** at
display/serialization. Each site should compile + pass tests before moving on — do this
**incrementally**, not in one blind sweep.

## Fields in scope
`Payment.amount`, `Invoice.amount`, `LateFee.amount`, `Expense.amount`,
`RecurringInvoiceSchedule.amount` + `.lateFeeAmount`,
`PaymentPlan.amountPerInstallment` + `.totalAmount`,
`Lease.rentAmount` + `.depositAmount` + `.currentBalance`,
`LeaseHistory.rentAmount` + `.depositAmount`, `LeaseRenewalOffer.proposedRent`,
`RentRecommendation.currentRent` + `.recommendedRent` + `.confidenceIntervalLow` + `.confidenceIntervalHigh`.
Each now has a `*Cents` column (added by the expand migration).

Already integer cents — **do NOT touch**: `ManualPayment/ManualCharge.amountCents`,
`OwnerStatement.*Cents`, `OwnerDraw.amountCents`, `LedgerTransaction.amountCents`,
`JournalLineItem.debit/creditCents`, `PaymentLedgerEntry.*Minor`, `Bank/BookkeepingTransaction.amountCents`.

## 🔴 Landmines — silent-corruption sites (fix WITH the field flip, verify each)
- [ ] `payments/stripe.service.ts` (~180, 215, 238, 441): `Math.round(dto.amount * 100)`. Stripe wants minor units — once the input is cents, this becomes `dto.amountCents` (**drop the ×100**). ⚠️ Flip only when the client contract sends cents; until then this stays. If wrong: 100× overcharge.
- [ ] `prisma/mock-seed-factory.ts` (~574, 587, 599, 617–619): `Math.round(payment.amount * 100)` to build ledger cents → use `payment.amountCents` directly (drop ×100), else seed ledgers 100× inflated.
- [ ] `payments/payments.service.ts` (507, 538, 662, 693): `lease.update({ currentBalance: { inc/dec: amount } })`. Trace `amount` per function (postManualPayment / reverseManualPayment / postManualCharge / voidManualCharge); dual-write `currentBalanceCents: { inc/dec: <cents> }`. When `currentBalance` becomes the cents column, the value must be cents (no ÷100).
- [ ] `billing/billing.service.ts` (~219): `invoice.amount + schedule.lateFeeAmount` → integer-cents add of `amountCents + lateFeeAmountCents`; dual-write.
- [ ] `payments/ai-payment.service.ts` (258–281, `calculatePaymentPlan`): `Math.ceil(totalAmount / installments)` over-collects and doesn't sum back → replace with `splitCents(totalCents, installments)`; convert `totalAmount`/`invoiceAmount` params + callers to cents.

## Backend — by category (see the audit report for the full ~130 file:line list)
### Prisma writes → dual-write Float + *Cents (~24 sites)
- [ ] `dashboard/dashboard.service.ts` (88–96, 112–118): AI `lease.update({ rentAmount })`
- [ ] `expense/expense.service.ts` (35, 100): Expense create/update (add validator + cents)
- [ ] `policy/rule-action-dispatcher.service.ts` (203): `lateFee.create({ amount })`
- [ ] rent-optimization / lease-renewal writes to `Lease.rentAmount`, `LeaseRenewalOffer.proposedRent`, `RentRecommendation.*`
- [ ] `LeaseHistory` snapshot writes (copy `rentAmountCents`/`depositAmountCents`)
### Reads / field access → read *Cents (~55 sites, 30 files)
- [ ] `payments/payments.service.ts` ledger + delinquency (`1513, 1533, 1549–1556, 2172, 2353, 2506, 2776`)
- [ ] `reporting/owner-analytics.service.ts` (53–88): NOI / cap-rate / IRR from `_sum: { amount }`
- [ ] invoice/lease read models; `PaymentPlan.findMany/findUnique` (1338, 1365, 1396)
### Arithmetic → integer cents (~30 sites — highest risk)
- [ ] `generatePaymentPlanSuggestion`, `assessPaymentRisk` (ai-payment)
- [ ] `applyLateFees` (billing)
- [ ] `currentBalance` mutations (payments; see landmines)
- [ ] `getLedgerForLease` fallback (payments)
- [ ] owner-analytics NOI/IRR; `getRentAdjustmentRecommendation` (ai-lease-renewal)
### DTO / validation / API types (~20 sites)
- [ ] Replace `@IsNumber({ maxDecimalPlaces: 2 })` / `@Min(0.01)` with `@IsInt()` + `@Min(0)` (or `@Min(1)`) on the migrated fields
- [ ] Add `*Cents` to create/update DTOs so clients can dual-send; regenerate OpenAPI

## Clients (each app hand-rolls its own types — no shared contract)
- [ ] Display/formatting (~26): route through a `formatCents`-style helper (`operator_app/src/app/read-only-shell.tsx:110–136` already has the pattern)
- [ ] Forms/state (~11): treat inputs as cents, dual-send
- [ ] API types/mocks (~15): `tenant_portal_app` Payments pages, `apiFixtures.ts:90–113`, `mocks/handlers.ts:912–982`
- [ ] Seeds (~13): dollar literals → cents (`seed-real-data.ts:146–158` real rents; `mock-seed-factory.ts`)
- [ ] Tests: add cents-aware assertions (money paths currently have ~no unit coverage)
- [ ] Regenerate the **keyring-os** OpenAPI mirror after DTO/id types change

## Sequencing
1. Land `src/utils/money.ts` + tests (this PR).
2. Dual-write `*Cents` at every write site (additive, safe) + fix seeds.
3. Flip reads + arithmetic to cents (module by module, with tests); fix the ÷100/×100 landmines as each field goes cents-native.
4. Flip the client contract (DTOs carry cents) + Stripe consume site; regenerate mirrors.
5. Only then merge the **contract** migration (Stage B) that drops the Float columns.
