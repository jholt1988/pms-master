# Stage-A App-Layer Cutover — Float → integer cents

Working checklist for moving the money fields off `Float` to integer `*Cents`.
Companion to the DB migrations (`money_to_cents_expand` / `money_to_cents_contract`).

> **Status (2026-07-08):** Stage-A app layer + client cutover **landed across all live surfaces**
> (backend dual-write/read/arithmetic, operator_app, keyring-os, tenant_portal_mobile) plus the
> canonical field rename and OpenAPI DTO annotations. Remaining work is ops/housekeeping — see
> **[Remaining](#remaining)**. `tenant_portal_app` is **deprecated** and excluded. Nothing is merged
> yet; see **[Merge / deploy order](#merge--deploy-order)**.

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
- [x] `payments/stripe.service.ts`: `Math.round(dto.amount * 100)` → `dto.amountCents ?? Math.round(dto.amount*100)`, guarded (uses cents when present). _(PR #57)_
- [x] `prisma/mock-seed-factory.ts`: ledger cents now derive from `scheduleAmountCents` (dropped the `×100`); currency `'usd'`→`'USD'`. _(PR #57)_
- [x] `payments/payments.service.ts` `currentBalance` mutations (postManualPayment / reverseManualPayment / postManualCharge / voidManualCharge): dual-write `currentBalanceCents: { inc/dec: <cents> }`. _(PR #57)_
- [x] `billing/billing.service.ts` `applyLateFees`: integer-cents add (`lateFeeCents` + `newInvoiceAmountCents`); dual-write. _(PR #57)_
- [x] `payments/ai-payment.service.ts` `calculatePaymentPlan` / `generatePaymentPlanSuggestion`: `splitCents(totalCents, installments)` exact-sum; params + callers converted to cents. _(PR #57)_

## Backend — by category
### Prisma writes → dual-write Float + *Cents
- [x] `dashboard/dashboard.service.ts` (AI_ABSTRACTION_REVIEW + RENEWAL_PRICING_GENERATED handlers): guarded `rentAmountCents` dual-write. _(PR #57 — f673bf9)_
- [x] `expense/expense.service.ts`: Expense create/update via `CreateExpenseDto`/`UpdateExpenseDto` (`@IsInt` cents) + `data.amountCents ?? toCents(...)`. _(PR #57)_
- [x] `policy/rule-action-dispatcher.service.ts` (182): `lateFee.create` writes `amountCents`. _(PR #57)_
- [x] rent-optimization / lease-renewal writes to `Lease.rentAmount`, `LeaseRenewalOffer.proposedRent`, `RentRecommendation.*` (incl. `confidenceIntervalLow/High`). _(PR #54 expand + PR #57)_
- [x] `LeaseHistory` snapshot writes (`logHistory` copies `rentAmountCents`/`depositAmountCents`). _(PR #57)_
### Reads / field access → read *Cents
- [x] `payments/payments.service.ts` ledger + delinquency + aging buckets → `invoice.amountCents ?? …`. _(PR #57)_
- [x] `reporting/owner-analytics.service.ts`: NOI / cap-rate / IRR from `_sum: { amountCents }`; response adds `*Cents`. _(PR #57)_
- [x] invoice/lease read models; `getLedgerForLease` fallback prefers `*Cents`. _(PR #57)_
### Arithmetic → integer cents
- [x] `generatePaymentPlanSuggestion` (ai-payment) — cents via `splitCents`. _(PR #57)_
- [x] `applyLateFees` (billing). _(PR #57)_
- [x] `currentBalance` mutations (payments; see landmines). _(PR #57)_
- [x] `getLedgerForLease` fallback (payments). _(PR #57)_
- [x] owner-analytics NOI/IRR. _(PR #57)_
- [x] `assessPaymentRisk` (ai-payment) / `getRentAdjustmentRecommendation` (ai-lease-renewal) — audited: no drift risk (advisory heuristics), reads flipped to prefer `*Cents` for Stage-B survival. _(PR #57 — 766ae53)_
### DTO / validation / API types
- [x] Add optional `*Cents` (`@IsInt()`/`@Min(0)`) to create/update DTOs for dual-send: CreateInvoice/CreatePayment/CreatePaymentPlan/CreateLease/CreateExpense + `CreateRenewalOfferDto.proposedRentCents`. _(PR #57)_
- [x] `@ApiProperty` on money DTO fields so OpenAPI carries `amount` + `*Cents` (payments + lease; manual payment/charge; stripe-checkout). _(PR #57 — 4d4a103, b3ac964)_
- [ ] **Replacement** of `@IsNumber({ maxDecimalPlaces: 2 })` with `@IsInt()` on the dollar fields is intentionally **deferred to Stage B** (dual-send keeps both validators for now).

## Clients (each app hand-rolls its own types — no shared contract)
- [x] **operator_app** — display flipped to `cents(xCents) ?? formatCurrency(x)`: rent/deposit/renewal + analytics cash-flows; payment/delinquency/statement/ledger already cents-native. _(commits 0bf6e7f, 226ad65)_
- [x] **keyring-os** `apps/admin` — operator API types carry `*Cents`; operator-view + tenant-page displays flipped; `tenant.service.ts` projects cents. _(keyring PR #28; backend PR #57 dfb2d52)_
- [x] **tenant_portal_mobile** — read-only displays (Home/Payments/Receipt) + LeaseScreen/LeaseRenewalScreen flipped; types carry `*Cents`. _(PR #57 2cd035e; PR #59)_
- [x] ~~tenant_portal_app~~ Payments/Lease flipped _(PR #57 2b59d93)_ but the app is **DEPRECATED** — left as-is, no further work.
- [x] Canonical field rename `monthlyRent`/`securityDeposit`/`renewalOfferedRent` → `rentAmount`/`depositAmount`/`proposedRent` (mobile PR #58; keyring lease/tenant forms PR #29).
- [ ] API mocks/fixtures (`apiFixtures.ts`, `mocks/handlers.ts`) — **not updated** (were tied to the deprecated tenant_portal_app; revisit if still used).
- [ ] Seeds: `seed-real-data.ts` / `seed.ts` / `seed-demo.ts` / `mock-seed-factory.ts` done _(PR #57)_; **`seed.js` (compiled) NOT regenerated.**
- [ ] Tests: only `money.spec.ts` added; broader cents-aware assertions on money paths still missing.
- [ ] Regenerate the **keyring-os** OpenAPI mirror (`schema.ts`) — DTOs are now annotated, but the regen must run `openapi-typescript` against the **running** backend (ops step).

## Sequencing
1. [x] Land `src/utils/money.ts` + tests.
2. [x] Dual-write `*Cents` at every write site (additive, safe) + fix seeds. _(except dashboard.service.ts + seed.js)_
3. [x] Flip reads + arithmetic to cents (module by module); fix the ÷100/×100 landmines.
4. [x] Flip the client contract (DTOs carry cents) + Stripe consume site; annotate OpenAPI. _(mirror regen still pending)_
5. [ ] Only then merge the **contract** migration (Stage B) that drops the Float columns.

## PR / commit ledger
| PR | Repo | Scope | Base |
|----|------|-------|------|
| #54 | pms-master | `money_to_cents_expand` migration (adds all `*Cents` columns) | main |
| #55 / #56 | pms-master | Invoice.id / Payment.id Int→UUID + `money_to_cents_contract` (Stage B) | main |
| #57 | pms-master | Stage-A app layer: `money.ts`, backend dual-write/read/arithmetic, DTOs + `@ApiProperty`, seeds, operator_app + tenant_portal_app + mobile displays, `tenant.service.ts` cents | main (needs #54) |
| #58 | pms-master | Canonical rename in tenant_portal_mobile | #57 (stacked) |
| #59 | pms-master | tenant_portal_mobile LeaseScreen/LeaseRenewalScreen cents flip | #58 (stacked) |
| #28 | keyring-os | operator API types + operator-view/tenant-page cents displays | main |
| #29 | keyring-os | canonical rename in lease-form/tenant-form/tenant-list | main |

## Remaining
> All backend money reads/writes/arithmetic are now cents-clean (no bare Float money reads remain in the app layer). What's left is ops/housekeeping:
- **Regenerate keyring-os `schema.ts`** via `openapi-typescript` against the running API.
- **`seed.js`** — regenerate from `seed.ts`.
- **Mocks/fixtures + money-path tests** — add cents-aware coverage.
- **Stage B contract migration** — drop Float columns only after all of the above ships and deploys.

## Merge / deploy order
1. **pms-master #54** (expand: add `*Cents` columns) → deploy.
2. **pms-master #57 → #58 → #59** (stacked; app layer + rename + LeaseScreen) → deploy.
3. **keyring-os #28 and #29** (independent of each other; after the backend returns cents).
4. Run the `schema.ts` regen; ship mocks/tests/seed.js/dashboard fixes.
5. **pms-master #56** contract (drop Float) — last, in a maintenance window. **#55** (Payment.id UUID) is independent and also belongs in a maintenance window.
