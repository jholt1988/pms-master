# Canonical Workflow Inventory

Date: 2026-06-04

Scope: Kansas private beta for solo landlords, small property managers, and mid-size property managers operating roughly 30 units per customer, with product support for portfolios up to 250 units.

Purpose: define the canonical workflows that should drive the Next.js operator app migration, rank them by business value, and identify which workflows should become decision-driven first.

## 1. Ranking Method

Each workflow is scored from 1 to 5 across five dimensions:

| Dimension | Meaning |
| --- | --- |
| Revenue / cash impact | Direct effect on collections, deposits, payments, owner distributions, vacancy, or fee revenue. |
| Frequency | How often a 30-unit private beta customer is likely to use it. |
| Risk reduction | Reduction in legal, compliance, financial, operational, or tenant-experience risk. |
| Differentiation | How strongly the workflow supports the product thesis: predictive AI plus decision-driven operations. |
| Implementation leverage | How much existing `pms-master` backend/frontend capability can be reused after contract cleanup. |

Business value score is the sum of those five dimensions, maximum 25.

Priority bands:

- P0: required for private beta credibility or required before dependent workflows can operate.
- P1: high-value beta workflow after P0 foundation.
- P2: valuable but not needed for first paid beta.
- Post-MVP: explicitly out of first release scope.

## 2. Ranked Workflow List

| Rank | Workflow ID | Workflow | Priority | Business Value | First Surface | Why It Matters |
| ---: | --- | --- | --- | ---: | --- | --- |
| 1 | `WF-CMD-001` | Operator command center and decision queue | P0 | 25 | Next.js operator | This is the differentiator and the organizing surface for every urgent operational decision. |
| 2 | `WF-PAY-001` | Rent, fee, deposit, and invoice ledger visibility | P0 | 24 | Operator + tenant | Cash position is the core daily business need; every collections/accounting workflow depends on trusted ledger state. |
| 3 | `WF-MNT-001` | Maintenance intake, triage, and SLA risk routing | P0 | 24 | Operator + tenant | High-frequency workflow with strong AI leverage and tenant-experience impact. |
| 4 | `WF-APP-001` | Application review, screening recommendation, and adverse-action-safe disposition | P0 | 24 | Operator + applicant | Drives leasing revenue and must be fair-housing/adverse-action controlled from the start. |
| 5 | `WF-COL-001` | Delinquency detection, payment-plan recommendation, and Kansas notice gate | P0 | 23 | Operator | Direct cash impact and high compliance risk; ideal decision-driven workflow. |
| 6 | `WF-PORT-001` | Portfolio, property, and unit read model | P0 | 22 | Next.js operator | Foundation for every other workflow and already first-ported as read-only. |
| 7 | `WF-ACC-001` | App-owned accounting workspace and double-entry ledger foundation | P0 | 22 | Operator | Required because the app owns accounting, not QuickBooks. Must be correct before distributions and close. |
| 8 | `WF-LEASE-001` | Approved application to lease, e-signature, deposit, and move-in handoff | P0 | 22 | Operator + applicant/tenant | Converts leasing decisions into occupancy and revenue; touches documents, payments, and compliance. |
| 9 | `WF-DOC-001` | Document store, entity linking, and download/upload contracts | P0 | 21 | Operator | Required evidence layer for leases, notices, applications, maintenance photos, and audit. |
| 10 | `WF-POL-001` | Approval tasks, policy evaluation, and decision audit | P0 | 21 | Operator | Cross-cutting control layer for AI, legal notices, screening, payments, dispatch, and accounting. |
| 11 | `WF-MSG-001` | Compliance-aware messaging inbox and communication drafting | P1 / P0 for bulk send controls | 20 | Operator + tenant | High frequency and high risk; bulk messaging needs strict approval even if full inbox is P1. |
| 12 | `WF-INSP-001` | Inspection list/detail, request queue, and approval | P0/P1 | 20 | Operator | Supports move-in, maintenance, turnover, repair estimates, and documentation. |
| 13 | `WF-BOOK-001` | Bank reconciliation queue and transaction categorization | P1 | 20 | Operator | Strong accounting value and AI leverage, but depends on ledger foundation. |
| 14 | `WF-RENEW-001` | Renewal review, rent recommendation, and offer workflow | P1 | 19 | Operator + tenant | Strong retention/vacancy impact; can follow core leasing/payments stability. |
| 15 | `WF-OWNER-001` | Owner statement review, reserves, and distributions | P1 | 19 | Operator + owner | Important for paid SaaS credibility, but should wait for accounting foundation. |
| 16 | `WF-VEND-001` | Vendor directory, assignment, estimates, and dispatch approvals | P1 | 18 | Operator + vendor | Needed for maintenance execution; high-risk dispatch actions need approval thresholds. |
| 17 | `WF-REPORT-001` | Operating reports: rent roll, delinquency, financial summary | P1 | 18 | Operator | Important for trust and manager routines; lower urgency than executable workflows. |
| 18 | `WF-SCHED-001` | Schedule/calendar summary for inspections, tours, deadlines, move-ins, move-outs | P1 | 17 | Operator | Useful coordinating surface; should feed command center rather than stand alone first. |
| 19 | `WF-LEAD-001` | Lead capture and follow-up | P1 | 17 | Operator + applicant | Valuable for leasing, but private beta can start with application review and manual lead capture. |
| 20 | `WF-TOUR-001` | Tour scheduling and follow-up | P1/P2 | 16 | Operator + applicant | Useful but not as core as applications, payments, and maintenance for first paid beta. |
| 21 | `WF-AUD-001` | Audit log and security event review | P1 | 16 | Operator/admin | Required for compliance and support investigations, but can start as backend capture before full UI. |
| 22 | `WF-SET-001` | Organization settings, roles, policies, and Stripe connected account setup | P1 | 16 | Operator/admin | Necessary for onboarding; small beta can rely on admin-assisted setup early. |
| 23 | `WF-NOTIF-001` | Notifications and preferences | P1 | 15 | Operator + tenant | Needed for polish and reliability; can follow core workflow events. |
| 24 | `WF-RENTREC-001` | Rent optimization and market recommendation | P2 | 15 | Operator | Differentiating AI feature, but not before lease/payment/renewal foundations. |
| 25 | `WF-LIST-001` | Listing syndication | P2 | 14 | Operator/applicant | Useful later; not a first private-beta blocker unless leasing growth is the primary launch wedge. |
| 26 | `WF-PRIV-001` | Privacy export/delete/retention workflows | P1/P2 | 14 | Operator/admin | Needs policy clarity; must exist where legally required, but can be operationally narrow at beta. |
| 27 | `WF-UTIL-001` | Utility billing | P2 | 12 | Operator + tenant | Post-core unless beta customers require it. |
| 28 | `WF-INSUR-001` | Tenant insurance tracking | P2 | 11 | Operator + tenant | Useful risk-control add-on after core tenancy workflows. |
| 29 | `WF-SMART-001` | Smart device monitoring and predictive alerts | Post-MVP | 10 | Operator | Strong future AI story, but hardware/integration complexity is not beta-efficient. |
| 30 | `WF-COMM-001` | Commercial property workflows | Post-MVP | 9 | Operator | User explicitly placed commercial post-MVP. |
| 31 | `WF-STR-001` | Short-term rental workflows | Post-MVP | 8 | Operator | User explicitly placed short-term rentals post-MVP. |

## 3. P0 Workflow Definitions

### `WF-CMD-001`: Operator Command Center And Decision Queue

Business outcome: every login answers "what needs my attention and why?"

Primary actors: property manager, owner, admin.

Trigger: operator login, scheduled daily briefing, new high-priority signal, SLA breach, compliance deadline, payment exception, application decision, maintenance escalation.

Canonical route ownership:

- Current read sources: `/api/dashboard/metrics`, `/api/briefing/daily`, `/api/feed`, `/api/policy/approval-tasks/pending`.
- Target owner: `/api/command-center`.
- Next.js first-port status: read-only surface started in `operator_app`.

Decision chain:

1. Detect signals from payments, maintenance, applications, inspections, schedule, accounting, and messages.
2. Attach evidence and affected entities.
3. Apply policy and compliance gates.
4. Rank by urgency, risk, amount, SLA, and confidence.
5. Present recommended action and alternatives.
6. Require approval for high-risk actions.
7. Execute approved action through the owning domain workflow.
8. Record decision and audit event.

AI role:

- Rank and explain signals.
- Summarize evidence.
- Draft recommended action text.
- Convert natural language into typed action intents.

Human approval required for:

- Legal notices.
- Adverse action.
- Payment plans, reversals, refunds, write-offs, and distributions.
- Vendor dispatch above threshold.
- Lease, renewal, non-renewal, and deposit decisions.

Next build step: define the canonical `/api/command-center` view model and contract tests, then replace the temporary multi-endpoint read model.

### `WF-PORT-001`: Portfolio, Property, And Unit Read Model

Business outcome: operators can see what they manage and understand unit status before acting.

Primary actors: property manager, owner, admin.

Trigger: operator opens portfolio, command center needs rollups, workflow needs property/unit context.

Canonical route ownership:

- `/api/properties`
- `/api/properties/:id`
- `/api/properties/:id/rollup`
- `/api/properties/:id/units`
- `/api/units/*` only where cross-property routes are needed.

Decision chain:

1. Load organization-scoped portfolio.
2. Show unit statuses and occupancy rollups.
3. Surface property blockers: vacancy, delinquency, maintenance, inspections, missing policy.
4. Link to workflows rather than allowing unaudited writes.

AI role:

- Summarize property blockers.
- Predict vacancy, maintenance risk, and renewal exposure later.

Next build step: keep read-only in Next.js, then add property detail and unit lifecycle once write contracts and audit events are stable.

### `WF-PAY-001`: Rent, Fee, Deposit, And Invoice Ledger Visibility

Business outcome: operators know what is due, paid, overdue, refunded, reversed, or in dispute.

Primary actors: property manager, accounting staff, owner, tenant.

Trigger: rent cycle, payment attempt, invoice generation, deposit collection, refund, reversal, owner close.

Canonical route ownership:

- `/api/payments`
- `/api/payments/history`
- `/api/payments/invoices`
- `/api/payments/payment-methods`
- `/api/billing`
- `/api/bookkeeping`

Decision chain:

1. Generate charges/invoices.
2. Record payment attempts and webhook results.
3. Post append-only ledger entries.
4. Reconcile payment provider state.
5. Surface exceptions and delinquency.
6. Gate reversals/refunds/write-offs through approval.
7. Emit audit event.

AI role:

- Explain balance changes.
- Detect anomalies.
- Recommend follow-up or payment-plan candidates.

Required controls:

- Idempotency keys.
- Append-only ledger.
- Stripe webhook replay safety.
- Org scoping.
- Approval for financial mutations.

Next build step: port read-only invoices, payment history, tenant ledger, and payment exceptions before enabling write actions.

### `WF-COL-001`: Delinquency, Payment Plans, And Kansas Notice Gate

Business outcome: reduce delinquency while avoiding premature or noncompliant legal action.

Primary actors: property manager, accounting staff, tenant.

Trigger: unpaid balance after due date, failed autopay, broken payment plan, manager review.

Canonical route ownership:

- `/api/payments/delinquency/*`
- `/api/payments/payment-plans`
- `/api/reporting/delinquency-report`
- `/api/policy`
- `/api/documents`
- `/api/messaging`

Decision chain:

1. Detect overdue balance.
2. Verify ledger and pending payments.
3. Check lease, organization policy, Kansas notice matrix, late fee settings, and payment-plan eligibility.
4. Recommend reminder, payment plan, hold, or notice packet.
5. Draft tenant communication and notice packet from structured facts.
6. Require approval before sending notice or legal-adjacent message.
7. Send, record, and schedule follow-up.

AI role:

- Prioritize accounts.
- Summarize tenant/payment history.
- Draft compliant messages for review.
- Recommend payment-plan terms within policy.

Required controls:

- Human approval for notices and payment-plan terms.
- Kansas compliance matrix reference.
- Audit of evidence, policy, approver, final content, and delivery.

Next build step: make delinquency queue a command-center decision type after ledger read contracts are stable.

### `WF-MNT-001`: Maintenance Intake, Triage, And SLA Risk Routing

Business outcome: reduce tenant friction and prevent missed urgent repair obligations.

Primary actors: tenant, property manager, maintenance coordinator, vendor.

Trigger: tenant request, manager-created request, inbound message, inspection finding.

Canonical route ownership:

- `/api/maintenance`
- `/api/vendors`
- `/api/messaging`
- `/api/documents`
- `/api/policy`

Decision chain:

1. Intake request with text, photos, property, unit, and tenant context.
2. Classify severity, trade, habitability/safety risk, and access needs.
3. Apply SLA and approval policy.
4. Recommend queue, escalation, vendor, inspection, or owner approval.
5. Auto-route low-risk requests to the right queue when allowed.
6. Require approval for emergency escalation, above-threshold dispatch, or tenant-entry notice.
7. Track assignment, status, completion, and tenant communication.

AI role:

- Classify severity/trade.
- Summarize photos/text.
- Detect emergency language.
- Draft tenant acknowledgement.
- Recommend vendor later.

Low-risk auto-execution candidates:

- Categorize request.
- Create draft task.
- Send approved acknowledgement template.

Next build step: port maintenance queue read-only, then triage decision cards with approval gates.

### `WF-APP-001`: Application Review, Screening Recommendation, And Disposition

Business outcome: reduce vacancy days while ensuring fair, consistent, auditable applicant decisions.

Primary actors: applicant, leasing agent, property manager.

Trigger: application submitted, application fee paid, screening data received, manager opens review.

Canonical route ownership:

- `/api/rental-applications`
- `/api/rental-applications/:id`
- `/api/rental-applications/:id/review-action`
- `/api/rental-applications/:id/policy-evaluation`
- `/api/screening`
- `/api/documents`
- `/api/messaging`

Decision chain:

1. Validate application completeness.
2. Gather applicant, household, income, documents, fees, and selected unit facts.
3. Apply published screening policy.
4. Generate recommendation: approve, conditional approve, waitlist, request info, or deny.
5. Require human review for all adverse or fair-housing-sensitive outcomes.
6. Generate adverse-action or approval communication from approved template.
7. Convert approved application to lease workflow where applicable.
8. Audit policy version, facts, recommendation, approver, and final disposition.

AI role:

- Extract and summarize application data.
- Explain policy fit.
- Draft applicant communications.
- Flag missing evidence or inconsistent facts.

Required controls:

- No silent denial.
- No unapproved adverse-action message.
- Store screening policy version.
- Avoid protected-class inference.

Next build step: port application review list/detail after route contracts and response envelopes are stable.

### `WF-LEASE-001`: Approved Application To Lease And Move-In Handoff

Business outcome: convert approved applicants into paying tenants with clean lease, deposit, and move-in state.

Primary actors: property manager, applicant/tenant, owner where approval required.

Trigger: application approved or conditional approval accepted.

Canonical route ownership:

- `/api/leases`
- `/api/rental-applications`
- `/api/documents`
- `/api/esignature`
- `/api/payments`
- `/api/properties/:id/units`

Decision chain:

1. Convert approved applicant to lease draft.
2. Prefill lease from property, unit, rent, deposits, dates, and applicant data.
3. Generate lease packet.
4. Route signatures.
5. Collect deposit and initial charges.
6. Update unit and tenant lifecycle.
7. Create move-in tasks and documents.
8. Audit template version, signer order, payments, and state transitions.

AI role:

- Lease abstraction and unusual clause detection later.
- Draft move-in checklist and tenant reminders.

Required controls:

- Human review of lease terms.
- E-signature audit.
- Payment idempotency.

Next build step: define lease handoff contract after application and document contracts are cleaned up.

### `WF-ACC-001`: Accounting Workspace And Double-Entry Ledger Foundation

Business outcome: the app can be the accounting system of record.

Primary actors: accounting staff, property manager, owner.

Trigger: payment, charge, refund, vendor bill, owner distribution, bank import, journal entry, month-end close.

Canonical route ownership:

- `/api/bookkeeping`
- `/api/billing`
- `/api/payments`
- `/api/quickbooks` as integration/export target only.

Decision chain:

1. Maintain chart of accounts and property accounting dimensions.
2. Convert operational events into balanced ledger entries.
3. Queue exceptions for review.
4. Reconcile bank/payment-provider activity.
5. Produce owner statements and distributions.
6. Export/sync to QuickBooks where configured.
7. Audit postings, approvals, adjustments, and sync errors.

AI role:

- Categorize transactions.
- Match bank lines to ledger events.
- Explain variance.
- Draft owner statement summaries.

Required controls:

- Balanced entries.
- Immutable posted ledger or reversal entries.
- Approval for final reconciliation, journal posting, and distributions.

Next build step: implement the accounting MVP gates defined in `docs/accounting-mvp-spec.md` before expanding payment writes.

### `WF-DOC-001`: Documents, Evidence, And Entity Linking

Business outcome: every decision can point to durable supporting evidence.

Primary actors: property manager, tenant, applicant, owner, vendor.

Trigger: upload, generated notice, lease packet, inspection photo, maintenance attachment, owner statement, e-signature result.

Canonical route ownership:

- `/api/documents`
- `/api/documents/:id`
- `/api/documents/:id/download`
- `/api/esignature`

Decision chain:

1. Upload or generate document.
2. Classify type and link to entity.
3. Store metadata, permissions, and retention.
4. Make download/share behavior explicit.
5. Reference documents from decisions, audit logs, messages, and workflows.

AI role:

- Classify document.
- Extract facts.
- Summarize contents.
- Support grounded Q&A later.

Required controls:

- Resolve duplicate document controllers.
- Distinguish metadata responses from raw file streams.
- Org scoping and permissions.

Next build step: merge document contracts before porting document UI.

### `WF-POL-001`: Approval Tasks, Policy Evaluation, And Decision Audit

Business outcome: high-risk workflow actions are governed, explainable, and auditable.

Primary actors: property manager, owner, admin, accounting staff.

Trigger: any workflow proposes a high-risk action or policy threshold is crossed.

Canonical route ownership:

- `/api/policy`
- `/api/audit-logs`
- future `/api/command-center/decisions`

Decision chain:

1. Receive action intent with source workflow and evidence.
2. Evaluate role, property policy, legal/compliance gates, and thresholds.
3. Create approval task where required.
4. Allow approve, edit, reject, defer, or delegate.
5. Execute only approved action.
6. Record decision, actor, policy version, evidence, and result.

AI role:

- Explain why approval is required.
- Draft rationale and recommended action.
- Detect missing evidence.

Required controls:

- Approval gate before high-risk action.
- Immutable decision record.
- Evidence references.
- Policy versioning.

Next build step: use approval tasks as the shared action model for command-center cards.

## 4. Recommended Port Order

The Next.js operator app should continue in this order:

| Order | Workflow | Port Type | Reason |
| ---: | --- | --- | --- |
| 1 | `WF-CMD-001` Command center | Read-only first, then approvals | Already started; validates the product thesis early. |
| 2 | `WF-PORT-001` Portfolio/property/unit | Read-only first | Already started; provides entity context for every workflow. |
| 3 | `WF-PAY-001` Ledger/payment visibility | Read-only | Highest cash value; avoid writes until ledger/idempotency tests are strong. |
| 4 | `WF-MNT-001` Maintenance queue | Read-only plus triage actions | High frequency, high AI leverage, lower financial risk than payments. |
| 5 | `WF-APP-001` Application review | Review actions with approval | Revenue-critical and compliance-sensitive. |
| 6 | `WF-COL-001` Delinquency queue | Decision cards and approval-gated notices | Direct cash impact and Kansas compliance differentiator. |
| 7 | `WF-DOC-001` Documents | Read/upload/download after merge | Needed as evidence substrate. |
| 8 | `WF-POL-001` Approval tasks | Shared action layer | Turns read-only surfaces into governed execution. |
| 9 | `WF-LEASE-001` Lease handoff | Guided workflow | Depends on applications, docs, payments, and e-signature. |
| 10 | `WF-ACC-001` Accounting workspace | Read/review, then postings | Must be correct before owner distributions. |

## 5. AI Automation Posture By Workflow

| Workflow | AI Allowed In Beta | Human Approval Required |
| --- | --- | --- |
| Command center | Rank, summarize, explain, draft action intents | Any state-changing action except allowlisted low-risk routing. |
| Portfolio | Summarize blockers and risk | Property/unit writes, policy changes. |
| Payments/ledger | Explain balance, detect anomalies, draft follow-up | Payments, refunds, reversals, write-offs, payment plans, postings. |
| Delinquency | Recommend next action, draft notice/message | Notices, legal-adjacent messages, payment-plan terms. |
| Maintenance | Classify severity/trade, draft acknowledgement, route low-risk queue items | Emergency escalation, vendor dispatch above threshold, tenant-entry notice. |
| Applications/screening | Extract, summarize, policy-fit explanation | Approval, conditional approval, denial, adverse action, waitlist decision. |
| Lease handoff | Draft checklist, summarize terms, detect missing fields | Lease terms, signer routing, generated lease approval. |
| Accounting | Categorize/match to review queue, explain variance | Journal posting, reconciliation finalization, owner distributions. |
| Documents | Classify/extract/summarize | Deletion, sharing sensitive documents, generated legal document sending. |
| Messaging | Draft replies and classify intent | Bulk send, fair-housing-sensitive, legal, adverse, eviction-adjacent messages. |

## 6. Workflow Contract Requirements

Before a workflow moves beyond read-only in Next.js, it must have:

- Canonical route ownership documented in `docs/api-route-ownership.md`.
- OpenAPI generated type coverage.
- Contract tests for canonical route existence and deprecated alias rejection.
- Auth and role tests.
- Organization scoping tests.
- Standard success envelope: `{ data, meta, errors }`.
- Standard error envelope.
- Validation failure shape.
- Pagination shape for list surfaces.
- Audit event for any state change.
- Idempotency for financial, document, workflow-action, webhook, and integration writes.
- Approval task for high-risk actions.

## 7. Immediate Backlog From This Inventory

1. Define `/api/command-center` contract as the canonical replacement for temporary dashboard/briefing/feed aggregation.
2. Add P0 workflow IDs to command-center decision cards and audit records.
3. Create typed operator API modules by workflow: `command-center`, `portfolio`, `payments`, `maintenance`, `applications`, `policy`, `documents`, `accounting`.
4. Extend contract tests from route existence to response envelope and pagination for P0 read models.
5. Build read-only payments ledger and maintenance queue next.
6. Define accounting MVP in a separate spec before enabling payment/accounting write actions. Done: `docs/accounting-mvp-spec.md`.
7. Convert the Kansas compliance matrix into policy gates for `WF-APP-001` and `WF-COL-001`.
