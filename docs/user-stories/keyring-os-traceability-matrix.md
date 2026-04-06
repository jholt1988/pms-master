# Traceability Matrix — Keyring OS

**Purpose:** Canonical repo-verification matrix for Keyring OS user stories. This artifact is designed for both human review and agent use and is the authoritative traceability layer for current repository story coverage.

## Verification Status Definitions

- `Verified in Repo`: matching normalized story exists in the current repo and the required traceability fields are materially represented.
- `Partially Verified in Repo`: matching normalized story exists, but one or more matrix fields are unresolved, gap-labeled, implied rather than explicit, or only partially aligned.
- `Not Found in Repo`: no valid current home exists in the normalized module story files.
- `Conflicting in Repo`: a workflow is present but explicitly contradicted by another repo story or by a conflict marker in the normalized corpus.

## Verification Method

Each row is verified against the normalized module story files using these checks:

- story ID exists
- trigger exists
- upstream state exists
- downstream handoff exists
- core data objects are represented
- notifications are present or explicitly not applicable
- approval gate is present or explicitly none
- audit events are present
- dependencies are present

Canonical repo story homes used for this matrix:

- leasing, screening, onboarding: [ai-prescreening.md](/c:/Users/plabr/Dev/pms-master/docs/user-stories/ai-prescreening.md)
- move-in, maintenance, communications, dashboard: [tenant-portal-web.md](/c:/Users/plabr/Dev/pms-master/docs/user-stories/tenant-portal-web.md)
- payments, legal, reporting, accounting, audit: [backend-services.md](/c:/Users/plabr/Dev/pms-master/docs/user-stories/backend-services.md)
- escrow, settlement, governance: [contracts.md](/c:/Users/plabr/Dev/pms-master/docs/user-stories/contracts.md)
- renewals, listing-price analytics: [rent-optimization-ml.md](/c:/Users/plabr/Dev/pms-master/docs/user-stories/rent-optimization-ml.md)

## Code Alignment Update

As of `2026-04-06`, the repository now includes a working policy-execution spine and supporting workflow mutations in backend code. This matrix remains the authoritative story-traceability layer, but the following code-level closures now materially support story execution:

- `application.scored` is emitted from persisted application screening, processed through the policy engine, and can update `RentalApplication` state plus `ApplicationLifecycleEvent` history.
- `late_fee.check` is emitted from scheduled delinquency evaluation, processed through the policy engine, and can create idempotent ledger-side late-fee effects plus `LateFee` records.
- `attorney.referral.check` is emitted from legal escalation evaluation, processed through the policy engine, and can create approval-gated attorney referrals, communications, notifications, and lease-history tracking.
- approval-gated policy outcomes now create executable `ApprovalTask` records and can be resolved through policy endpoints.
- supported policy state transitions now mutate persisted workflow state where the current schema has a canonical state home; unsupported transitions are explicitly audited as skipped rather than guessed.
- the backend TypeScript build currently passes with `npx tsc --noEmit -p tenant_portal_backend/tsconfig.json`.

`Repo Status` values below are still intentionally conservative. Rows remain `Partially Verified in Repo` wherever jurisdictional rules, policy bundles, integration contracts, or missing schema-level state homes still prevent a safe claim of full closure.

---

## A. Leasing, Screening, Onboarding

| Story ID | Workflow Domain | Business Outcome | Primary Actor | Trigger | Upstream State | Downstream Handoff | Core Data Objects | Notifications | Approval Gate | Audit Events | Dependencies | Repo Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `LSG-001` | Application Submission | Applicant submits valid application and fee | Applicant | Public application opened and submitted | None / Prospect | AI screening | Application, Applicant, Property, Unit, Payment | Submission confirmation, new application alert | None required unless business adds review-before-submit | Submission time, fee result, selected unit snapshot | Public form, payment integration, persistence | `Partially Verified in Repo` |
| `LSG-002` | AI Screening | Application receives score and recommendation | System / Manager | Application reaches submitted state | Submitted | Approve / Deny / Waitlist decision | Application, Screening Score, Risk Profile | Optional manager alert | Manager override if needed | Scoring run, model/rules version, override | Screening engine, application completeness | `Partially Verified in Repo` |
| `LSG-003` | Denial | Denied applicant receives formal response | Manager / System | Denial decision finalized | AI Scored / Under Review | Denial closed | Application, Communication Record | Denial email | Possibly manager approval before send | Denial decision, send event, template used | Template engine, communication channel | `Partially Verified in Repo` |
| `LSG-004` | Waitlist | Approved applicant retained without onboarding | Manager / System | Approved but no unit available | AI Scored / Approved | Onboarding when released from waitlist | Application, Waitlist Record, Unit Availability | Waitlist status notice | Manager release from waitlist | Waitlist entry, expiry/release | Inventory status, waitlist policy | `Partially Verified in Repo` |
| `ONB-001` | Onboarding | Approved applicant becomes onboarding tenant | Manager / System | Approval finalized | Approved Applicant | Portal provisioning, lease drafting | Applicant Profile, Tenant Profile, Onboarding Record | Approval/onboarding start notice | Approval already occurred | Onboarding start, account provisioning request | Identity model, tenant portal | `Partially Verified in Repo` |
| `ONB-002` | Lease Drafting | Lease prefilled from applicant data | Manager | Onboarding begins | Onboarding Started | Lease sent for signature | Lease, Applicant Data, Tenant Data | Optional internal notice | Manager review before send | Field mapping, edits made, template version | Lease template, mapping logic | `Partially Verified in Repo` |
| `ONB-003` | Signature Collection | Lease/documents signed digitally | Tenant, Manager | Lease packet sent | Lease Drafted / Lease Sent | Move-in scheduling | Lease, Signature Packet, Supporting Docs | Signature requests, completion notices | Required for final execution | Sent time, signed time, incomplete/failure events | E-signature integration | `Partially Verified in Repo` |
| `ONB-004` | Move-In Scheduling | Move-in date appears on shared calendar | Manager / Owner | Lease fully executed or ready | Lease Signed | Welcome package, unit prep | Calendar Event, Lease, Tenant, Unit | Move-in event notice | Manager scheduling | Event creation, edits, cancellations | Calendar/dashboard system | `Partially Verified in Repo` |
| `ONB-005` | Welcome Package | Tenant receives pre-move-in guidance | System / Manager | Move-in event created | Move-In Scheduled | Move-in inspection and key handoff | Welcome Package, Tenant, Lease, Unit | Email/app welcome package | Optional manager approval | Package sent, delivery attempts | Email/app messaging | `Partially Verified in Repo` |

---

## B. Move-In, Inspections, Maintenance

| Story ID | Workflow Domain | Business Outcome | Primary Actor | Trigger | Upstream State | Downstream Handoff | Core Data Objects | Notifications | Approval Gate | Audit Events | Dependencies | Repo Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `MIN-001` | Move-In Inspection | Tenant documents unit condition at move-in | Tenant | Move-in completed / inspection window open | Active Tenant / Move-In Scheduled | Manager review | Inspection, Photos, Notes, Unit, Tenant | Submission confirmation | None at submission | Draft/save/submit timestamps | Inspection UI, media upload | `Partially Verified in Repo` |
| `MIN-002` | Inspection Review | Manager validates tenant move-in inspection | Manager | Inspection submitted | Inspection Submitted | Repair generation or closure | Inspection, Review Decision | Approval/rejection notice if configured | Manager approval required | Approve/reject/request changes | Inspection review UI | `Partially Verified in Repo` |
| `MIN-003` | Initial Repair Trigger | Approved issues become repair scope | Manager / System | Inspection approved with actionable findings | Inspection Approved | Maintenance workflow | Repair Estimate, Timeline, Work Item | Tenant/internal notices as configured | Manager approval already done | Estimate generation, schedule creation | Estimation logic, work-order system | `Partially Verified in Repo` |
| `MNT-001` | Maintenance Intake | Tenant submits maintenance request | Tenant | Tenant creates request | Active Tenant | Review and triage | Maintenance Request, Photos, Description, Unit | Submission confirmation | None at intake | Request created, attachments added | Web/mobile request UI | `Partially Verified in Repo` |
| `MNT-002` | Emergency Escalation | Emergency issues bypass normal queue | System / Manager | Emergency flag set on request | Request Submitted | Rapid review / scheduling | Request Priority, Escalation Event | Immediate manager/owner notice | Manager may confirm emergency handling | Escalation time, recipients notified | Alerting rules, SLA logic | `Partially Verified in Repo` |
| `MNT-003` | Maintenance Planning | Approved maintenance gets estimate/schedule/assignment | Manager | Request approved | Under Review / Approved | In-progress work | Work Order, Estimate, Schedule, Assignment | Assignment/status notices | Manager approval required | Work order created, assigned, rescheduled | Vendor/internal assignment model | `Partially Verified in Repo` |
| `MNT-004` | Maintenance Closure | Manager closes completed work | Manager | Work marked completed | Completed | Closed record and analytics | Work Order, Completion Summary | Tenant completion notice | Manager sign-off required | Sign-off timestamp, closure summary | Maintenance status system | `Partially Verified in Repo` |

---

## C. Communications and Audit

| Story ID | Workflow Domain | Business Outcome | Primary Actor | Trigger | Upstream State | Downstream Handoff | Core Data Objects | Notifications | Approval Gate | Audit Events | Dependencies | Repo Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `COM-001` | Multi-Channel Communications | Operational messages can use proper channel mix | Manager / System | Any communication-worthy event | Workflow-dependent | Delivery status and follow-up | Message Template, Channel Rules, Recipient | Email, SMS, app, physical marker | Depends on message type | Send/fail/delivery attempts | Messaging providers, print markers | `Partially Verified in Repo` |
| `COM-002` | Audit Logging | All communications and critical actions are reconstructable | System | Any tracked action or communication | Any | Reporting, legal defense, analytics | Audit Entry, Actor, Object, Event Metadata | Not directly user-facing | None | All critical transitions and message events | Central audit subsystem | `Partially Verified in Repo` |
| `SYS-001` | Global Auditability | End-to-end platform state is auditable | System | Any critical mutation | Any | Analytics, disputes, compliance | Audit Log, Entity References | N/A | N/A | Before/after changes, actor, timestamp | Persistent audit store | `Partially Verified in Repo` |

---

## D. Payments, Delinquency, Legal

| Story ID | Workflow Domain | Business Outcome | Primary Actor | Trigger | Upstream State | Downstream Handoff | Core Data Objects | Notifications | Approval Gate | Audit Events | Dependencies | Repo Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `PAY-001` | Rent Reminders | Tenant gets reminders before due date | System | Upcoming rent due date | Upcoming | Payment or missed-payment logic | Ledger, Rent Schedule, Reminder Rule | Email, SMS, app | None unless business requires review | Reminder sent, channel results | Scheduler, messaging | `Partially Verified in Repo` |
| `PAY-002` | Missed Payment Alerting | Operator side learns of missed payment after threshold | System / Manager | Payment still unpaid after threshold | Due / Partially Paid | Late fee or outreach | Ledger, Delinquency Event | Email/app to operator side | None | Missed-payment detection, notice time | Ledger accuracy, scheduler | `Partially Verified in Repo` |
| `PAY-003` | Unified Ledger | All payment types affect single balance model | Manager / System | Payment, charge, adjustment, manual entry | Any financial state | Reporting, delinquency logic | Ledger Entry, Payment, Charge, Tenant, Unit | Receipts and internal notices as configured | Manual-entry permissions | Ledger mutation history | Stripe, Plaid, manual payment UI | `Partially Verified in Repo` |
| `PAY-004` | Late Fee Application | Late fees assessed after grace period | System / Manager | Grace period expires with balance due | Late | Notice eligibility / continued collections | Ledger, Fee Policy, Lease | Tenant notice optional; operator notice optional | Manager override if allowed | Fee applied, override, policy version | Lease terms, fee logic | `Partially Verified in Repo` |
| `PAY-005` | Payment Plan Proposal | System suggests plan before harder escalation | System / Manager | Tenant risk or delinquency threshold met | Late / At Risk | Plan offer / legal deferral | Payment Plan Proposal, Ledger, Risk Score | Offer to operator, possibly tenant after approval | Manager approval required | Proposal generated, accepted/declined | Payment plan rules | `Partially Verified in Repo` |
| `PAY-006` | Delinquency Analytics | Repeat lateness and partial-payment patterns become measurable | Manager / Owner | Sufficient payment history exists | Any payment state | Reporting and predictive models | Ledger History, Delinquency Metrics | Internal analytics only | None | Metric calculations and refresh times | Reporting/analytics layer | `Partially Verified in Repo` |
| `LEG-001` | Three-Day Notice | Formal notice generated from lease + delinquency | Manager | Delinquency crosses notice threshold | Notice Eligible | Notice issued or held | Notice, Lease, Ledger Snapshot | Notice delivery event | Manager approval required | Notice generated, approved, issued | Notice template, legal rules | `Partially Verified in Repo` |
| `LEG-002` | Attorney Referral | Escalated nonpayment package sent to attorney | Manager | Notice period fails and legal chosen | Notice Issued | Court tracking | Lease, Notice, Account Context, Referral Packet | Attorney email or handoff | Manager approval required | Referral creation, packet contents | Attorney process, document packaging | `Partially Verified in Repo` |
| `LEG-003` | Legal Halt on Resolution | Legal escalation can stop after accepted payment | Manager | Payment resolves issue before court | Attorney Referred / Legal Pending | Resolved / payment plan monitoring | Ledger, Legal Case, Resolution Record | Internal and maybe tenant notice | Sign-off required | Cancellation, reason, who approved | Legal workflow state model | `Partially Verified in Repo` |
| `LEG-004` | Court Tracking | Court dates visible operationally | Manager / Owner / System | Court date received | Attorney Referred | Calendar/dashboard preparation | Court Event, Case Record | Calendar/event notices | Usually attorney or manager enters | Event created/updated | Calendar/dashboard system | `Partially Verified in Repo` |

---

## E. Renewal, Move-Out, Turn

| Story ID | Workflow Domain | Business Outcome | Primary Actor | Trigger | Upstream State | Downstream Handoff | Core Data Objects | Notifications | Approval Gate | Audit Events | Dependencies | Repo Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `REN-001` | Renewal Reminders | Expiring leases surface early | System | 90-day and 30-day thresholds reached | Active Tenant | Renewal offer or move-out flow | Lease, Reminder Schedule, Tenant, Property | Tenant + landlord/manager reminders | None | Reminder timestamps and channels | Lease date tracking, messaging | `Partially Verified in Repo` |
| `REN-002` | Retention Offers | Good tenants can receive renewal incentives | Manager / Owner | Renewal review initiated | Renewal Pending | Renewal execution or move-out | Retention Offer, Lease Renewal Terms | Offer notice to tenant | Likely manager/owner approval | Offer created, sent, accepted/declined | Renewal workflow | `Partially Verified in Repo` |
| `MOV-001` | Tenant Move-Out Inspection | Tenant documents unit condition before departure | Tenant | Move-out process initiated | Move-Out Pending | Manager inspection | Inspection, Photos, Notes | Submission confirmation | None at submission | Submit timestamp, attachments | Inspection UI | `Partially Verified in Repo` |
| `MOV-002` | Manager Move-Out Inspection | Operator defines damage/cleaning/turn scope | Manager / Staff | Tenant move-out complete or scheduled | Awaiting Move-Out Inspection | Turn work and charges | Inspection, Estimate, Turn Timeline, Unit Turn State | Internal assignment notices | Manager/staff review | Inspection results, turn scope created | Turn workflow, estimation logic | `Partially Verified in Repo` |
| `MOV-003` | Final Charges and Closeout | Former tenant receives financial breakdown | Manager | Turn/damage charges finalized | Former Tenant / Closeout Pending | Collection or closure | Ledger Charges, Deposit Offset, Statement | Email/app breakdown | Manager finalization | Charges posted, statement sent | Ledger, messaging | `Partially Verified in Repo` |

---

## F. Property, Units, Listings, Media

| Story ID | Workflow Domain | Business Outcome | Primary Actor | Trigger | Upstream State | Downstream Handoff | Core Data Objects | Notifications | Approval Gate | Audit Events | Dependencies | Repo Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `PRP-001` | Property CRUD | Operator can maintain property record | Manager / Owner | Property create/edit action | None / Existing Property | Unit management, listing, reporting | Property, Address, Geo, Mortgage Metadata, Amenities, Media | Optional internal notices | Role-based edit permission | Create/update history | Property form, permissions | `Partially Verified in Repo` |
| `UNT-001` | Unit CRUD | Operator can maintain unit record | Manager / Owner | Unit create/edit action | Property exists | Listings, leasing, ops workflows | Unit, Status, Amenities, Layouts, Media | Optional internal notices | Role-based edit permission | Create/update/status changes | Unit form, permissions | `Partially Verified in Repo` |
| `LST-001` | Listing Syndication | Vacant/rent-ready units can be marketed externally | Manager | Publish listing action or eligible status | Available / Rent Ready | Applicant flow | Listing Record, Property Data, Unit Data, Media | Publication status notices | Role-based publish permission | Publish/unpublish/sync results | Channel integrations | `Conflicting in Repo` |

---

## G. Dashboard, Reporting, Accounting

| Story ID | Workflow Domain | Business Outcome | Primary Actor | Trigger | Upstream State | Downstream Handoff | Core Data Objects | Notifications | Approval Gate | Audit Events | Dependencies | Repo Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `DSH-001` | Operational Dashboard | Login gives immediate visibility into deadlines and events | Manager / Owner | User logs in | Authenticated | Action on payments, inspections, move-ins, court, etc. | Dashboard ViewModel, Calendar Events, Alerts | In-app surfaced alerts | Role-based view filtering | Dashboard data refreshes where logged | Calendar and event aggregation | `Partially Verified in Repo` |
| `RPT-001` | Monthly Financial Reporting | Property economics summarized monthly | Manager / Owner | Reporting period closes or report requested | Financial data exists | Accounting review / decisions | Ledger, Expense Records, Mortgage, Tax, Rent | Optional email/report delivery | None unless restricted exports | Report generation, export events | Reporting layer | `Partially Verified in Repo` |
| `RPT-002` | Ops Analytics | Maintenance and communication performance becomes measurable | Manager / Owner | Analytics refresh / report request | Event data exists | Optimization, predictive models | Audit Log, Communication Log, Work Orders | Internal reports | None | Metric computation runs | Analytics layer | `Partially Verified in Repo` |
| `ACC-001` | Accounting Sync/Export | Finance data leaves ops system cleanly | Manager / Owner / System | Sync/export requested or scheduled | Ledger/reporting data exists | External accounting records | Export Batch, Accounting Mapping, Source References | Sync success/failure notices | Role-based access | Export/sync result, failed records | QuickBooks/export integration | `Partially Verified in Repo` |

---

## Gap Register Template for the Agent

Use this exact structure after repo mutation or audit:

| Gap ID | Story ID / File | Gap Type | Description | Why Not Safely Resolvable Yet | Needed Decision / Input |
|---|---|---|---|---|---|
| `GAP-001` | `LSG-002` | `MISSING_BUSINESS_RULE` | AI screening thresholds not defined | Any threshold chosen would invent underwriting policy | Provide threshold rules or scoring interpretation model |
| `GAP-002` | `LEG-001` | `MISSING_LEGAL_RULE` | Three-day notice content/jurisdiction not defined | Legal wording varies and cannot be guessed safely | Provide jurisdiction-specific notice requirements |
| `GAP-003` | `ONB-002` | `MISSING_DATA_MAPPING` | Lease prefill field mappings not specified | Could mis-map applicant data into legal document fields | Provide source-to-lease field map |
| `GAP-004` | `PAY-005` | `MISSING_BUSINESS_RULE` | Payment plan generation logic undefined | Installment logic affects collections and legal posture | Define plan calculation policy |
| `GAP-005` | `ACC-001` | `MISSING_EXTERNAL_INTEGRATION_SPEC` | QuickBooks mapping not defined | Export without mapping risks accounting corruption | Provide chart-of-accounts / mapping schema |
