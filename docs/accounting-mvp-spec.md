# Accounting MVP Specification

Date: 2026-06-04

Scope: Kansas private beta, app-owned accounting, Stripe payments, QuickBooks as export/sync target only.

Purpose: define the minimum accounting system the product must own before expanding payment flows beyond read-only visibility and tightly controlled payment capture.

## 1. Product Decision

The app owns accounting for MVP. QuickBooks is not the system of record. QuickBooks may receive exports or sync batches, but the canonical financial state must live in PropertyOS.

This means payment expansion is blocked until the app can:

- Create and maintain a chart of accounts.
- Record operational tenant ledger activity.
- Convert payment, charge, fee, refund, reversal, deposit, vendor, and owner events into balanced accounting entries.
- Reconcile bank/Stripe activity against ledger/accounting records.
- Produce owner statements and distribution approvals from app-owned books.
- Preserve a complete audit trail.

## 2. MVP Boundaries

### Included In Private Beta

| Area | MVP Scope |
| --- | --- |
| Chart of accounts | System-seeded default chart per organization with limited admin customization. |
| Operational tenant ledger | Lease/account balance, charges, payments, credits, reversals, write-offs, deposits, late fees, payment plans. |
| Accounting ledger | Double-entry journal entries with balanced debit/credit lines and property dimensions. |
| Bank/Stripe reconciliation | Manual bank import first, Stripe payout/payment matching where available, exception queue. |
| Monthly close | Property/month close state, lock/reopen controls, close blockers. |
| Owner statements | Draft, review, approve, send status, property breakdown, net distribution calculation. |
| Owner distributions | Approval-gated distribution records and accounting entries; actual money movement may be manual in beta. |
| QuickBooks | Export/sync batch target with mapping and error review, not source of truth. |
| AI | Categorization suggestions, match suggestions, variance explanations, owner statement summary drafts. |
| Audit | Every posting, reversal, approval, close, export, and override records actor/source and evidence. |

### Excluded From Private Beta

| Area | Reason |
| --- | --- |
| Full payroll | Not needed for property-management beta. |
| Automated bank transfers for owner distributions | Too much money-movement risk before accounting controls are proven. |
| Multi-entity consolidated financials | Post-beta scale feature. |
| Accrual/cash toggle complexity by customer | Pick one MVP basis initially and document it. |
| Tax filing and 1099 generation | Later accounting add-on. |
| Advanced budgeting/forecasting | Useful, but after core books are trusted. |
| Fully autonomous posting | AI may suggest, but human approval required for final postings. |

## 3. Accounting Basis

MVP recommendation: use cash-basis operating reports for private beta while designing the journal model so accrual support can be added later.

Required behavior:

- Payments, refunds, reversals, deposits, owner draws, vendor payments, and bank imports post on the effective cash date.
- Rent/fee invoices may appear in operational ledger and receivables views, but accounting reports must clearly distinguish billed, due, collected, and posted cash.
- Delinquency and owner statements must preserve source references to invoices, charges, payments, refunds, and adjustments.

Open decision before production launch: whether first beta customers require accrual financial statements. If yes, add AR/AP journal postings before expanding payment automation.

## 4. Ledger Boundary

The codebase currently has two related financial layers. The MVP must keep them distinct:

| Layer | Current Models | Purpose | Rule |
| --- | --- | --- | --- |
| Operational tenant ledger | `LedgerAccount`, `LedgerTransaction`, `Payment`, `Invoice`, `PaymentLedgerEntry` | Tenant/lease balance, delinquency, payment history, notices, tenant-facing ledger. | Append-only operational facts. Never edit posted balance events; reverse with a new entry. |
| Accounting ledger | `ChartOfAccount`, `JournalEntry`, `JournalLineItem`, `BookkeepingTransaction`, `BookkeepingAllocation`, `ReconciliationSession`, `OwnerStatement` | Company books, property P&L, reconciliation, owner statements, distributions, QuickBooks export. | Balanced debit/credit entries only. Drafts can be edited; posted entries can only be reversed. |

Payment flows may update the operational ledger first, but accounting impact must be explicit and traceable through `sourceType` and `sourceId`.

## 5. Minimum Chart Of Accounts

Seed every organization with these accounts. Codes can be refined later, but codes must be stable once transactions exist.

| Code | Account | Type | Notes |
| --- | --- | --- | --- |
| `1000` | Operating Cash | ASSET | Default cash/bank clearing account. |
| `1010` | Stripe Clearing | ASSET | Stripe payment clearing before payout reconciliation. |
| `1020` | Security Deposits Held | LIABILITY | Tenant deposits held, not owner income. |
| `1100` | Accounts Receivable | ASSET | Needed if accrual is enabled; otherwise used for operational reporting only. |
| `2000` | Tenant Prepayments | LIABILITY | Overpayments or unapplied credits. |
| `2100` | Owner Payable | LIABILITY | Approved net owner distributions payable. |
| `3000` | Owner Equity / Contributions | EQUITY | Initial owner contributions and equity adjustments. |
| `4000` | Rental Income | INCOME | Base rent collected. |
| `4010` | Fee Income | INCOME | Late fees, application fees where retained, NSF fees. |
| `4020` | Other Income | INCOME | Miscellaneous property income. |
| `5000` | Repairs And Maintenance | EXPENSE | Work orders, vendor bills, supplies. |
| `5010` | Utilities | EXPENSE | Property-paid utilities. |
| `5020` | Management Fees | EXPENSE or CONTRA_INCOME | Depends on reporting model; pick one and keep mapping stable. |
| `5030` | Insurance | EXPENSE | Property insurance. |
| `5040` | Taxes | EXPENSE | Property taxes and local charges. |
| `5050` | Bank And Processing Fees | EXPENSE | Stripe fees, bank fees. |
| `9000` | Suspense / Uncategorized | EXPENSE | Temporary review account, must be cleared before close. |

Beta rule: customers can add accounts, but system accounts cannot be deleted. Deactivation is allowed only when no open mappings depend on the account.

## 6. Core Accounting Workflows

### `ACC-MVP-001`: Organization Accounting Setup

Trigger: organization onboarding.

Steps:

1. Seed chart of accounts.
2. Configure default cash account, Stripe clearing account, security deposit liability account, owner payable account, rent income account, fee income account, maintenance expense account, and suspense account.
3. Configure management fee policy if owner statements are enabled.
4. Configure owner reserve policy per property or owner.
5. Record setup audit event.

Exit criteria:

- `GET /api/bookkeeping/chart-of-accounts` returns active accounts.
- Required system accounts exist.
- Payment posting is blocked if required mappings are missing.

### `ACC-MVP-002`: Payment Event To Operational Ledger

Trigger: Stripe payment success/failure, manual payment, refund, reversal, returned payment, late fee, deposit collection.

Steps:

1. Validate org, lease, tenant, invoice/payment plan, amount, currency, and idempotency key.
2. Create or locate `LedgerAccount` for lease.
3. Append `LedgerTransaction` with `sourceType`, `sourceId`, `entryType`, direction, amount, effective date, and actor/source.
4. Update invoice/payment status from derived ledger state, not manual balance edits.
5. Emit financial event for accounting posting.

Exit criteria:

- Duplicate Stripe webhook or manual submission does not duplicate ledger entries.
- Reversals point at `reversesEntryId`.
- Tenant ledger can explain current balance from source entries.

### `ACC-MVP-003`: Operational Event To Accounting Journal

Trigger: operational ledger event reaches an accounting-postable state.

Steps:

1. Map source event to debit/credit lines.
2. Validate all lines have accounts and optional dimensions: property, unit, lease, owner, vendor.
3. Ensure total debits equal total credits.
4. Create `JournalEntry` as `DRAFT` for human review when source is high-risk or mapping confidence is low.
5. Auto-post only allowlisted low-risk entries after mappings are proven.
6. Record source reference and audit event.

Minimum posting examples:

| Source Event | Debit | Credit |
| --- | --- | --- |
| Rent payment collected by Stripe | Stripe Clearing | Rental Income or AR |
| Stripe payout received | Operating Cash | Stripe Clearing |
| Stripe processing fee | Bank And Processing Fees | Stripe Clearing |
| Security deposit collected | Stripe Clearing or Operating Cash | Security Deposits Held |
| Refund issued | Rental Income/AR or Tenant Prepayments | Stripe Clearing or Operating Cash |
| Payment reversal/chargeback | Rental Income/AR or Tenant Prepayments | Stripe Clearing plus fees as applicable |
| Vendor bill paid | Repairs And Maintenance | Operating Cash or AP if later enabled |
| Owner distribution approved | Owner Payable | Operating Cash |

Exit criteria:

- No unbalanced posted journal entries.
- Every posted journal entry references the source event.
- Posted entries are immutable except reversal.

### `ACC-MVP-004`: Transaction Import And Categorization

Trigger: operator imports bank CSV/JSON or bank feed later syncs transactions.

Current route:

- `POST /api/bookkeeping/transactions/import`
- `GET /api/bookkeeping/transactions/pending`
- `PATCH /api/bookkeeping/transactions/:id/categorize`
- `POST /api/bookkeeping/transactions/:id/allocate`
- `PATCH /api/bookkeeping/transactions/:id/exception`

Steps:

1. Import rows as `BookkeepingTransaction` with status `PENDING_REVIEW`.
2. AI suggests category/account and dimensions with confidence.
3. Human accepts category, edits allocation, or marks exception.
4. Allocation total must equal transaction amount.
5. Accepted allocation can create or match accounting journal entry.

Exit criteria:

- Import validates date, description, amount, org scope, and row limits.
- Categorization suggestions below threshold stay in review.
- Suspense/unallocated transactions block monthly close.

### `ACC-MVP-005`: Reconciliation

Trigger: monthly close or operator starts reconciliation.

Current route:

- `GET /api/bookkeeping/reconciliation`
- `PATCH /api/bookkeeping/reconciliation/items/:id/confirm`

Steps:

1. Create reconciliation session by month and bank account reference.
2. Match imported bank transactions to Stripe payouts, ledger entries, or journal entries.
3. AI suggests matches with confidence.
4. Human confirms matches or marks exception.
5. Track difference between bank ending balance and ledger ending balance.
6. Block close if unmatched or exception items remain.

Exit criteria:

- Confirmed match records resolver and timestamp.
- Exceptions appear in command center/accounting workspace.
- Reconciliation summary has unmatched, matched, exception counts, and difference amount.

### `ACC-MVP-006`: Monthly Close

Trigger: end of month or operator opens accounting workspace.

Current route:

- `GET /api/bookkeeping/monthly-close`
- `POST /api/bookkeeping/monthly-close/:propertyId/lock`
- `POST /api/bookkeeping/monthly-close/:propertyId/reopen`

Steps:

1. Show close state per property/month.
2. Compute blockers: unreconciled transactions, exceptions, draft journal entries, suspense allocations, unapproved owner statements.
3. Allow lock only when blockers are clear.
4. Allow reopen only for admin with reason.
5. Audit lock/reopen.

Exit criteria:

- Locked month prevents new postings effective inside that month unless reopened.
- Reopen requires reason and admin role.
- Close status feeds command center.

### `ACC-MVP-007`: Owner Statements And Distribution Approval

Trigger: monthly close review or owner statement generation.

Current route:

- `GET /api/bookkeeping/owner-statements`
- `PATCH /api/bookkeeping/owner-statements/:id/approve`
- `PATCH /api/bookkeeping/owner-statements/:id/send`

Steps:

1. Generate draft statement by owner/month/property from posted accounting entries.
2. Include gross income, expenses, management fees, reserves, owner draws, and net distribution.
3. AI drafts plain-language summary.
4. Human approves statement.
5. Approved statement creates owner payable/distribution accounting entry or distribution task.
6. Sending statement records delivery status.

Exit criteria:

- Draft statements cannot be sent without approval.
- Distribution cannot be executed without approved statement.
- Statement references source journal entries or ledger transactions.

### `ACC-MVP-008`: QuickBooks Export/Sync

Trigger: manual export or scheduled sync after close.

Canonical route ownership:

- `/api/quickbooks`

Steps:

1. Map PropertyOS accounts to QuickBooks accounts.
2. Build export batch from posted entries only.
3. Validate all entries have mappings.
4. Hold anomalies and unmapped entries in exception queue.
5. Send batch and record external IDs.
6. Retry failures idempotently.

Exit criteria:

- QuickBooks sync never mutates PropertyOS accounting state without a local audit event.
- QuickBooks errors are visible in accounting workspace.
- Export can be replayed safely without duplicate external records.

## 7. Payment Expansion Gate

Do not expand payment write flows beyond the narrow existing path until these conditions are met:

| Gate | Requirement |
| --- | --- |
| G1 | Required chart of accounts seeded and mapping checks enforced. |
| G2 | Operational ledger entries are append-only and idempotent. |
| G3 | Refund, reversal, failed payment, chargeback, and write-off policies are defined. |
| G4 | Operational events can produce balanced accounting journal entries or explicit review exceptions. |
| G5 | Stripe webhook replay tests pass for payment success, failure, refund, payout, and dispute where supported. |
| G6 | Reconciliation queue can show unmatched and exception items. |
| G7 | Monthly close blocks on unreconciled, suspense, exception, and draft entries. |
| G8 | Owner statements derive from app-owned accounting entries, not ad hoc payment totals. |
| G9 | Financial mutations create audit events and, where high-risk, approval tasks. |
| G10 | Contract tests cover canonical accounting and payment read/write routes used by Next.js. |

Payment flows allowed before all gates are complete:

- Read-only invoices, payment history, ledger, payment method visibility.
- Stripe setup intent/payment method management if route contracts are stable.
- Manual test payments only in non-production or with admin review.

Payment flows blocked until gates are complete:

- Refunds.
- Reversals.
- Write-offs.
- Owner distributions.
- Automated payment plans.
- Deposit disposition.
- Autopay at scale.
- Any AI-suggested financial posting.

## 8. API Contract Requirements

Canonical route family: `/api/bookkeeping`.

Required MVP endpoints:

| Endpoint | Purpose | MVP Contract Status |
| --- | --- | --- |
| `GET /api/bookkeeping/workspace` | Aggregated accounting workspace | Existing route; standardize envelope. |
| `GET /api/bookkeeping/chart-of-accounts` | Account list | Existing route; add system-account assertions. |
| `POST /api/bookkeeping/chart-of-accounts` | Create account | Existing route; admin only. |
| `GET /api/bookkeeping/transactions/pending` | Review queue | Existing route; standardize pagination. |
| `GET /api/bookkeeping/transactions/exceptions` | Exception queue | Existing route; standardize pagination. |
| `POST /api/bookkeeping/transactions/import` | Manual bank import | Existing route; add idempotency/import batch model later. |
| `PATCH /api/bookkeeping/transactions/:id/categorize` | Accept/edit category | Existing route; require audit. |
| `POST /api/bookkeeping/transactions/:id/allocate` | Allocate transaction to accounts/dimensions | Existing route; require org scoping and audit. |
| `GET /api/bookkeeping/reconciliation` | Reconciliation summary | Existing route; add session detail later. |
| `PATCH /api/bookkeeping/reconciliation/items/:id/confirm` | Confirm match | Existing route; require audit. |
| `GET /api/bookkeeping/monthly-close` | Close state list | Existing route. |
| `POST /api/bookkeeping/monthly-close/:propertyId/lock` | Lock month | Existing route; add blocker enforcement. |
| `POST /api/bookkeeping/monthly-close/:propertyId/reopen` | Reopen month | Existing route; admin plus reason. |
| `GET /api/bookkeeping/owner-statements` | Statement list | Existing route. |
| `PATCH /api/bookkeeping/owner-statements/:id/approve` | Approve statement | Existing route; approval/audit required. |
| `PATCH /api/bookkeeping/owner-statements/:id/send` | Mark sent | Existing route; delivery model later. |

Standard envelope:

```json
{
  "data": {},
  "meta": {
    "requestId": "string"
  },
  "errors": []
}
```

List pagination:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "total": 0,
      "skip": 0,
      "take": 50
    }
  },
  "errors": []
}
```

## 9. Required Tests

Contract tests:

- `/api/bookkeeping/workspace` exists.
- `/api/bookkeeping/chart-of-accounts` exists.
- `/api/bookkeeping/transactions/pending` and `/exceptions` exist.
- `/api/bookkeeping/reconciliation` exists.
- `/api/bookkeeping/monthly-close` exists.
- `/api/bookkeeping/owner-statements` exists.
- `/api/quickbooks` remains integration/export target.

Unit/domain tests:

- Allocation total must equal transaction amount.
- Journal entry cannot post unless debits equal credits.
- Posted journal cannot be edited directly.
- Reversal creates a new journal entry and links to original.
- Locked month blocks new effective-date postings.
- Reopen requires admin role and reason.
- Owner statement cannot be approved with unresolved close blockers.
- Owner distribution cannot be created without approved statement.
- Duplicate Stripe webhook does not duplicate ledger/accounting entries.
- Import row validation rejects missing date, missing description, invalid amount, and oversized batch.

Integration tests:

- Stripe payment success -> operational ledger -> accounting journal draft/post.
- Stripe refund/reversal -> reversal ledger entry -> reversal accounting entry.
- Bank import -> categorize -> allocate -> reconcile -> close.
- Owner statement draft -> approve -> distribution task.
- QuickBooks export batch -> success/failure/retry without duplicates.

## 10. AI Guardrails

Allowed:

- Suggest account/category.
- Suggest reconciliation match.
- Explain variance.
- Draft owner statement summary.
- Flag anomaly and route to review.

Not allowed without approval:

- Post journal entry.
- Finalize reconciliation.
- Lock or reopen month.
- Approve owner statement.
- Create owner distribution.
- Refund, reverse, write off, or alter tenant balance.

Required AI evidence:

- Source transaction.
- Suggested account/category.
- Confidence.
- Reasoning factors.
- Prior similar examples if used.
- Human decision and final result.

## 11. Next Implementation Order

1. Done: add contract tests for accounting route existence and deprecated shortcut usage.
2. Done: standardize `/api/bookkeeping/*` response envelopes and pagination for migrated routes.
3. Done: add chart-of-accounts seeding and required mapping validation.
4. Done: add balanced journal posting service with draft/post/reversal semantics.
5. Done: connect payment operational ledger events to accounting journal drafts as a soft, non-breaking draft creation path.
6. Done: harden reconciliation session and exception queue confirmation rules.
7. Done: enforce monthly close blockers for unreconciled transactions, exceptions, draft journals, suspense allocations, and draft owner statements.
8. Done: generate owner statements from posted accounting entries.
9. Done: add QuickBooks mapping/export batch spec and tests.
10. Done as a gate: expanded payment writes remain blocked until accounting MVP gates pass. Refunds, reversals, payment plans, deposit disposition, owner distributions, and autopay scale-up should not be broadened until `GET /api/bookkeeping/payment-expansion-gates` reports ready.
