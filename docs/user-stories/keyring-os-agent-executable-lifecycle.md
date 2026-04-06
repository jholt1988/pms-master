# Keyring OS: Agent-Executable User Stories with Gap Detection

**Version:** Draft v1  
**Purpose:** Transform workflow intent into implementable, testable, mutation-safe user stories for the complete property management lifecycle.

## Agent Execution Contract

### Objective
Update, create, or normalize user story coverage so the platform supports a complete end-to-end lifecycle across leasing, onboarding, payments, maintenance, inspections, renewals, move-out, legal escalation, accounting/reporting, dashboard visibility, and auditability.

### Mutation Rules
- Preserve existing valid business logic unless it conflicts with explicit requirements in this document.
- Prefer editing existing user story files over inventing parallel stories.
- Create new stories only when a workflow requirement has no valid home in the existing module stories.
- Explicitly mark unresolved gaps instead of fabricating policy.
- Never imply a feature is complete if acceptance criteria or workflow coverage is missing.
- Ensure each story can be executed start to finish with trigger, actor, system behavior, outputs, edge conditions, audit requirements, and acceptance criteria.

## Canonical Lifecycle State Models

### Application Lifecycle
`Draft -> Submitted -> Fee Pending -> Under Review -> AI Scored -> Approved -> Denied -> Waitlisted -> Expired -> Withdrawn`

### Applicant-to-Tenant Lifecycle
`Applicant -> Approved Applicant -> Onboarding Started -> Portal Provisioned -> Lease Drafted -> Lease Sent -> Lease Signed -> Move-In Scheduled -> Active Tenant -> Renewal Pending -> Move-Out Pending -> Former Tenant`

### Maintenance Request Lifecycle
`Submitted -> Under Review -> Approved -> Estimate Generated -> Scheduled -> In Progress -> Awaiting Parts/Vendor -> Completed -> Manager Signed Off -> Closed -> Cancelled -> Escalated Emergency`

### Inspection Lifecycle
`Scheduled -> In Progress -> Submitted -> Under Manager Review -> Approved -> Repair Actions Generated -> Closed`

### Payment/Delinquency Lifecycle
`Upcoming -> Due -> Partially Paid -> Paid -> Late -> Late Fee Applied -> Payment Plan Proposed -> Payment Plan Active -> Notice Eligible -> Notice Issued -> Legal Review Pending -> Attorney Referred -> Court Scheduled -> Resolved`

### Unit Turn Lifecycle
`Occupied -> Notice to Vacate -> Move-Out Scheduled -> Awaiting Move-Out Inspection -> Turn Scope Defined -> Turn Work Scheduled -> Turn In Progress -> Rent Ready -> Listed -> Available -> Leased`

---

## Epic 1: Public Application & Screening

### Story ID: LSG-001
**Title:** Applicant submits rental application  
**Primary actor:** Prospective tenant  
**Business goal:** Capture a complete application for a specific property or unit.

**Trigger:** Applicant opens the public application link.  
**Preconditions:** Property or unit is accepting applications; application form is active; fee settings exist if fee is required.  
**Lifecycle transitions:** `Draft -> Submitted` or `Draft -> Fee Pending -> Submitted`

**Main flow**
1. Applicant opens the application.
2. System displays required identity, contact, employment, income, consent, and unit-selection fields.
3. Applicant enters data and submits.
4. If a fee is required, system attempts fee collection.
5. System stores the submission as an immutable application snapshot and marks it `Submitted`.

**Alternate flows**
- No fee required: system skips fee collection and submits directly.
- Save draft enabled: system stores the application as `Draft` for later completion.

**Failure/exception flows**
- Payment fails: application remains `Fee Pending` and applicant is prompted to retry.
- Required fields missing: submission is rejected with validation errors.
- Unit unavailable before completion: system blocks submission and records availability conflict.

**Data captured:** Applicant identity, contact information, employment and income, selected property and unit, consent artifacts, fee status, submission snapshot.  
**Notifications:** Submission confirmation to applicant; new application alert to manager or owner if configured.  
**Audit log requirements:** Submitted by, submission timestamp, fee attempt and result, property and unit selected at submit time, immutable payload hash or snapshot reference.

**Acceptance criteria**
- Application cannot be finalized with missing required fields.
- Payment result is persisted for every fee attempt.
- Application is linked to a property and, when applicable, a unit.
- Submission generates an immutable record of what was submitted.

**Dependencies:** Public application UI, payment integration, application persistence.  
**Open questions / unresolved gaps:** Document upload requirements undefined; co-applicant and guarantor policy undefined; duplicate application policy undefined.

### Story ID: LSG-002
**Title:** System runs AI pre-screening  
**Primary actor:** Property manager  
**Business goal:** Produce a fast, reviewable recommendation on a submitted application.

**Trigger:** Application enters `Submitted` with required screening inputs present.  
**Preconditions:** Application is complete; screening logic is configured.  
**Lifecycle transitions:** `Submitted -> AI Scored`

**Main flow**
1. System ingests application data.
2. AI or rules engine calculates score and risk profile.
3. System stores a recommendation of `Approve`, `Deny`, or `Waitlist`.
4. Application moves to `AI Scored`.
5. Manager reviews the score and recommendation.

**Alternate flows**
- Manual override changes the recommendation with explicit justification.
- Screening unavailable routes application to manual review.

**Failure/exception flows**
- Screening service error creates a reviewable failure state and does not silently pass.
- Missing scoring inputs blocks automated scoring and queues manual review.

**Data captured:** Score, recommendation, risk factors, scoring inputs used, model or rules version, override metadata if used.  
**Notifications:** Optional manager review notification when AI score is ready.  
**Audit log requirements:** Scoring timestamp, model or rules version, inputs used, recommendation returned, override event with actor and reason.

**Acceptance criteria**
- Recommendation is persisted, reviewable, and auditable.
- Score generation does not silently fail.
- Manager can see whether the result is automated or manually overridden.

**Dependencies:** Screening engine, application data normalization, manager review UI.  
**Open questions / unresolved gaps:** Hard underwriting thresholds undefined; adverse action explanation logic undefined; fairness and compliance review criteria undefined.

### Story ID: LSG-003
**Title:** Denial triggers formal communication  
**Primary actor:** Property manager  
**Business goal:** Communicate denial consistently without starting onboarding.

**Trigger:** Manager or automated workflow places application into `Denied`.  
**Preconditions:** Application has a denial decision and required denial template context.  
**Lifecycle transitions:** `AI Scored -> Denied` or `Under Review -> Denied`

**Main flow**
1. System prepares a standardized denial notice template.
2. Manager reviews or system auto-sends based on policy.
3. System delivers the notice and logs the communication.
4. System confirms no onboarding or lease artifacts are created.

**Alternate flows**
- Manual approval gate requires manager review before send.

**Failure/exception flows**
- Delivery failure leaves denial status intact and surfaces retry needs.

**Data captured:** Denial reason, communication template used, delivery channel, delivery outcome.  
**Notifications:** Denial notice to applicant; optional internal review confirmation.  
**Audit log requirements:** Denial timestamp, actor, template version, channel used, send or failure status.

**Acceptance criteria**
- Denied status can trigger a template email.
- Denial communication is logged.
- Manager can review or send if an approval gate is required.
- Denial does not create onboarding artifacts.

**Dependencies:** Notification templates, communications service, denial workflow.  
**Open questions / unresolved gaps:** Automatic vs manager-approved sending not locked; jurisdiction-specific regulatory content may vary.

### Story ID: LSG-004
**Title:** Approved applicant enters waitlist when no unit is available  
**Primary actor:** Property manager  
**Business goal:** Retain approved applicants when inventory is unavailable without prematurely starting tenancy.

**Trigger:** Applicant is approved but no releasable unit is available.  
**Preconditions:** Approval decision exists; inventory is unavailable.  
**Lifecycle transitions:** `AI Scored -> Waitlisted` or `Approved -> Waitlisted`

**Main flow**
1. System places approved applicant into waitlist state.
2. System records hold duration and release conditions.
3. Manager can later release applicant into onboarding when inventory becomes available.

**Alternate flows**
- Waitlist hold expires and application is marked `Expired`.

**Failure/exception flows**
- Inventory release mismatch blocks onboarding until unit assignment is valid.

**Data captured:** Waitlist start date, hold duration, release reason, assigned property preferences.  
**Notifications:** Waitlist notification to applicant; release or expiration notice when applicable.  
**Audit log requirements:** Waitlist entry, expiration, removal, release actor, related inventory state.

**Acceptance criteria**
- Waitlisted applicants are clearly distinct from denied applicants.
- Waitlisted applicants do not enter onboarding until released.
- Configurable hold duration exists.
- Expiration and removal events are logged.

**Dependencies:** Inventory availability logic, application workflow, notification service.  
**Open questions / unresolved gaps:** Waitlist rank ordering undefined; communication cadence during waitlist undefined.

---

## Epic 2: Approval, Onboarding, Lease Execution

### Story ID: ONB-001
**Title:** Approval provisions tenant onboarding  
**Primary actor:** Property manager  
**Business goal:** Move approved applicants into onboarding without duplicate entry.

**Trigger:** Application becomes `Approved`.  
**Preconditions:** Applicant has an approvable unit path and is not waitlisted.  
**Lifecycle transitions:** `Approved Applicant -> Onboarding Started -> Portal Provisioned`

**Main flow**
1. System creates an onboarding record from approved applicant data.
2. System maps applicant fields into tenant profile fields.
3. System provisions or prepares tenant portal access.

**Alternate flows**
- Portal provisioning can be delayed until manager review if policy requires.

**Failure/exception flows**
- Provisioning failure leaves onboarding open and alerts staff for retry.

**Data captured:** Onboarding record, mapped profile fields, portal provisioning status.  
**Notifications:** Onboarding start notice to applicant; internal alert if provisioning fails.  
**Audit log requirements:** Approval-to-onboarding handoff, data mapping event, portal provisioning attempt and result.

**Acceptance criteria**
- Approval creates an onboarding record.
- Tenant portal account can be provisioned.
- Applicant data is mapped into tenant profile fields.
- Waitlisted applicants do not start onboarding.

**Dependencies:** Application service, identity and user service, portal provisioning.  
**Open questions / unresolved gaps:** Identity verification step not specified; portal activation timing not fully defined.

### Story ID: ONB-002
**Title:** Lease draft is pre-populated from application data  
**Primary actor:** Property manager  
**Business goal:** Reduce repeated data entry and keep lease drafting auditable.

**Trigger:** Onboarding reaches lease drafting stage.  
**Preconditions:** Approved applicant has a valid tenant profile and assigned unit.  
**Lifecycle transitions:** `Portal Provisioned -> Lease Drafted`

**Main flow**
1. System generates a draft lease from the configured template.
2. System pre-populates mapped fields from application and tenant data.
3. Manager edits draft values if needed.

**Alternate flows**
- Manual field overrides are allowed before sending.

**Failure/exception flows**
- Missing required mapping or template data blocks sending and surfaces validation issues.

**Data captured:** Template version, mapped fields, manager overrides, effective lease terms.  
**Notifications:** Optional internal notice that lease draft is ready.  
**Audit log requirements:** Draft creation time, source data mappings, edited values, actor performing edits.

**Acceptance criteria**
- Mapped fields populate automatically.
- Manager can edit before sending.
- Source-of-truth mappings are defined.
- Changed values are audited.

**Dependencies:** Lease template service, application-to-lease mappings, lease persistence.  
**Open questions / unresolved gaps:** Formal field mapping spec absent; lease template versioning requirements undefined.

### Story ID: ONB-003
**Title:** Lease and related documents are sent for signature  
**Primary actor:** Property manager  
**Business goal:** Complete digital execution of lease-related documents.

**Trigger:** Manager sends a lease packet.  
**Preconditions:** Lease draft and required documents are ready.  
**Lifecycle transitions:** `Lease Drafted -> Lease Sent -> Lease Signed`

**Main flow**
1. System packages lease and related documents.
2. System sends packet for digital signature.
3. System tracks completion status across required signers.
4. Tenancy activation remains blocked until all required signatures complete.

**Alternate flows**
- Partial completion keeps packet in `Lease Sent` until remaining signers complete.

**Failure/exception flows**
- Signature provider failure or expired packet surfaces retry path and blocks activation.

**Data captured:** Document set, signature provider metadata, signer completion status, final signed artifacts.  
**Notifications:** Signature requests, reminders, completion confirmation.  
**Audit log requirements:** Packet sent time, recipients, completion timestamps, document versions, signature completion events.

**Acceptance criteria**
- Multiple required documents can be included.
- Signature completion is tracked.
- Incomplete signatures block activation of tenancy.
- Completion events are logged.

**Dependencies:** E-signature provider, lease document management, onboarding workflow.  
**Open questions / unresolved gaps:** Signer order unspecified; guarantor and co-signer flows undefined.

### Story ID: ONB-004
**Title:** Move-in date is scheduled and visible on shared calendar  
**Primary actor:** Property manager or owner  
**Business goal:** Make move-in operationally visible across the team.

**Trigger:** Lease is fully signed and move-in is scheduled.  
**Preconditions:** Executed lease exists; move-in date is provided.  
**Lifecycle transitions:** `Lease Signed -> Move-In Scheduled`

**Main flow**
1. System creates a move-in event.
2. Event is linked to tenant, unit, and lease.
3. Relevant roles can view the event on the dashboard and calendar.

**Alternate flows**
- Manager updates the move-in date and system versions the event change.

**Failure/exception flows**
- Scheduling conflict or invalid date prevents save and surfaces conflict details if configured.

**Data captured:** Move-in date, linked tenant, unit, lease, visibility metadata.  
**Notifications:** Calendar event notifications to relevant roles.  
**Audit log requirements:** Created date, changed date, actor, prior and new values.

**Acceptance criteria**
- Move-in event appears on dashboard or calendar.
- Visibility is shared with relevant roles.
- Event links to tenant, unit, and lease.
- Date changes are versioned in audit logs.

**Dependencies:** Calendar service, lease service, dashboard event rendering.  
**Open questions / unresolved gaps:** Calendar permission model undefined; conflict detection rules undefined.

### Story ID: ONB-005
**Title:** Welcome package is sent after move-in is scheduled  
**Primary actor:** Newly approved tenant  
**Business goal:** Provide clear next steps before occupancy.

**Trigger:** Move-in is scheduled and prerequisite onboarding steps are complete.  
**Preconditions:** Required lease execution and scheduling prerequisites are satisfied.  
**Lifecycle transitions:** No new lifecycle state; follows `Move-In Scheduled`

**Main flow**
1. System composes a welcome package.
2. System sends the package through allowed channels.
3. System records the send outcome.

**Alternate flows**
- Delivery can occur via email or in-app when configured.

**Failure/exception flows**
- Delivery failure is logged and surfaced for retry.

**Data captured:** Package template, delivery channels, send timestamp, delivery outcome.  
**Notifications:** Welcome package to tenant.  
**Audit log requirements:** Trigger condition, send event, package version, channel, delivery outcome.

**Acceptance criteria**
- Welcome package can be delivered via email or app.
- Send event is logged.
- Package content is configurable.
- Sending is triggered only after required prerequisites are met.

**Dependencies:** Notification service, onboarding prerequisites, configurable content templates.  
**Open questions / unresolved gaps:** Package contents unspecified; SMS inclusion undecided.

---

## Epic 3: Move-In Inspection & Initial Repair Workflow

### Story ID: MIN-001
**Title:** Tenant completes move-in inspection in app or web  
**Primary actor:** Tenant  
**Business goal:** Record pre-existing unit condition at move-in.

**Trigger:** Move-in inspection window opens.  
**Preconditions:** Active tenancy or scheduled move-in exists; inspection is available.  
**Lifecycle transitions:** `Scheduled -> In Progress -> Submitted`

**Main flow**
1. Tenant opens move-in inspection.
2. Tenant adds checklist responses, notes, and photos.
3. Tenant submits the inspection.
4. System time-stamps and locks the submission record.

**Alternate flows**
- Draft mode persists incomplete inspections if enabled.

**Failure/exception flows**
- Submission without required elements is blocked when policy requires completeness.

**Data captured:** Inspection checklist responses, notes, photos, unit and tenancy linkage, draft and submit timestamps.  
**Notifications:** Submission confirmation; manager review notification.  
**Audit log requirements:** Draft saves, final submission, actor, timestamps, locked record reference.

**Acceptance criteria**
- Tenant can submit notes and photos.
- Inspection links to unit and tenancy.
- Submission locks a time-stamped record.
- Incomplete inspection can remain draft if enabled.

**Dependencies:** Inspection UI, media handling, tenancy linkage.  
**Open questions / unresolved gaps:** Post-move-in deadline undefined; required checklist structure undefined.

### Story ID: MIN-002
**Title:** Manager reviews and approves move-in inspection  
**Primary actor:** Property manager  
**Business goal:** Validate move-in findings and convert valid issues into action.

**Trigger:** Tenant submits move-in inspection.  
**Preconditions:** Inspection is in `Submitted`.  
**Lifecycle transitions:** `Submitted -> Under Manager Review -> Approved`

**Main flow**
1. Manager reviews tenant-submitted inspection.
2. Manager approves, rejects, or requests follow-up.
3. Approved findings generate repair candidates as needed.

**Alternate flows**
- Request follow-up returns inspection to tenant or internal review queue.

**Failure/exception flows**
- Rejection requires reason and preserves the original submission.

**Data captured:** Review outcome, reasons, approved findings, generated repair candidates.  
**Notifications:** Review outcome to tenant when configured; internal task for follow-up.  
**Audit log requirements:** Review action, actor, reason, approval event, generated repair candidate links.

**Acceptance criteria**
- Manager can approve, reject, or request follow-up.
- Approval generates repair candidates where needed.
- Approval event is logged.
- Rejection requires reason.

**Dependencies:** Inspection review UI, maintenance candidate generation, audit logging.  
**Open questions / unresolved gaps:** Tenant and manager disagreement adjudication flow undefined.

### Story ID: MIN-003
**Title:** Approved move-in issues generate estimates and timelines  
**Primary actor:** Property manager  
**Business goal:** Convert approved findings into scoped work quickly.

**Trigger:** Move-in inspection issues are approved for action.  
**Preconditions:** Approved findings exist.  
**Lifecycle transitions:** Inspection `Approved -> Repair Actions Generated`; maintenance `Submitted -> Estimate Generated -> Scheduled`

**Main flow**
1. System creates repair or replacement estimate candidates from approved findings.
2. System produces an expected completion timeline.
3. System assigns work items or queues them for assignment.

**Alternate flows**
- Tenant progress notifications are issued when configured.

**Failure/exception flows**
- Estimate generation failure creates a visible exception task for manual scoping.

**Data captured:** Repair candidates, estimates, timelines, assignment metadata.  
**Notifications:** Optional tenant progress notices; internal assignment notifications.  
**Audit log requirements:** Estimate generation, assignment, timeline creation, notification sends.

**Acceptance criteria**
- Approved findings can generate repair or replacement estimates.
- Timeline is produced for completion.
- Work items can be assigned.
- Tenant can be notified of progress if required.

**Dependencies:** Estimate engine, work assignment workflow, notification service.  
**Open questions / unresolved gaps:** Estimate methodology undefined; vendor bidding workflow undefined.

---

## Epic 4: Ongoing Maintenance Requests

### Story ID: MNT-001
**Title:** Tenant submits maintenance request with photo and description  
**Primary actor:** Tenant  
**Business goal:** Initiate repair workflows from web or mobile.

**Trigger:** Tenant reports an issue.  
**Preconditions:** Tenant has access to the unit and maintenance intake channel.  
**Lifecycle transitions:** `Submitted`

**Main flow**
1. Tenant enters issue details and uploads photos.
2. Tenant optionally flags the issue as emergency.
3. System creates and links the maintenance request.
4. System shows and records submission confirmation.

**Alternate flows**
- Request can be categorized or reclassified later during review.

**Failure/exception flows**
- Invalid or oversized attachments are rejected with clear error messaging.

**Data captured:** Description, photos, emergency flag, tenant, unit, property, timestamps.  
**Notifications:** Submission confirmation to tenant; manager intake alert if configured.  
**Audit log requirements:** Submitted by, timestamp, linked tenancy and unit, attachments added.

**Acceptance criteria**
- Request supports description and photos.
- Request is linked to tenant, unit, and property.
- Emergency flag can be set.
- Submission confirmation is shown and logged.

**Dependencies:** Maintenance intake API, media storage, tenant and unit linkage.  
**Open questions / unresolved gaps:** Video and audio support undefined; category taxonomy undefined.

### Story ID: MNT-002
**Title:** Emergency maintenance auto-escalates  
**Primary actor:** Property manager or owner  
**Business goal:** Prevent urgent requests from sitting in standard queues.

**Trigger:** Maintenance request is emergency-tagged or classified as emergency.  
**Preconditions:** Emergency flag or policy threshold is met.  
**Lifecycle transitions:** `Submitted -> Escalated Emergency`

**Main flow**
1. System raises request priority immediately.
2. System notifies owner or manager immediately.
3. System starts an SLA timer if configured.

**Alternate flows**
- Staff can downgrade the request with justification if it was misclassified.

**Failure/exception flows**
- Notification delivery failure is logged and surfaced as operational risk.

**Data captured:** Escalation reason, priority level, SLA start time, dispatch metadata when available.  
**Notifications:** Immediate escalation notices to owner or manager.  
**Audit log requirements:** Escalation trigger, actor or rule, SLA timer start, notification attempts.

**Acceptance criteria**
- Emergency flag raises priority automatically.
- Owner or manager are notified immediately.
- Request enters escalated state.
- SLA timer can start automatically.

**Dependencies:** Maintenance prioritization rules, notification service, SLA timer service.  
**Open questions / unresolved gaps:** Emergency definition undefined; after-hours vendor dispatch logic undefined.

### Story ID: MNT-003
**Title:** Maintenance requests produce estimate, schedule, and assignment  
**Primary actor:** Property manager  
**Business goal:** Move requests from intake to executable work.

**Trigger:** Request is approved for work.  
**Preconditions:** Review completed and request approved.  
**Lifecycle transitions:** `Under Review -> Approved -> Estimate Generated -> Scheduled`

**Main flow**
1. System creates an estimate.
2. System schedules work.
3. System assigns work to internal staff or vendor.
4. System exposes status progression visibly and auditably.

**Alternate flows**
- Work may enter `Awaiting Parts/Vendor` before active execution.

**Failure/exception flows**
- Scheduling or assignment failure leaves request pending and visible for intervention.

**Data captured:** Estimate, schedule, assignee, vendor or staff type, status changes.  
**Notifications:** Assignment and scheduling notices to staff, vendor, and optionally tenant.  
**Audit log requirements:** Approval, estimate creation, schedule change, assignment change, status updates.

**Acceptance criteria**
- Estimate can be generated.
- Schedule can be assigned.
- Work can be assigned to internal staff or vendor.
- Status changes are visible and auditable.

**Dependencies:** Estimation service, scheduling service, assignment workflow, status tracking.  
**Open questions / unresolved gaps:** Assignment optimization logic undefined; material procurement workflow undefined.

### Story ID: MNT-004
**Title:** Manager sign-off closes maintenance work  
**Primary actor:** Property manager  
**Business goal:** Ensure formal closure and frozen completion records.

**Trigger:** Assigned maintenance work is marked completed.  
**Preconditions:** Work order has completion details.  
**Lifecycle transitions:** `Completed -> Manager Signed Off -> Closed`

**Main flow**
1. Work completion is submitted.
2. Manager reviews the result.
3. Manager signs off to close the job.
4. System freezes the final work summary and completion date.

**Alternate flows**
- Manager rejects closure and returns the work to active remediation.

**Failure/exception flows**
- Missing completion data blocks sign-off.

**Data captured:** Actual completion date, completion summary, sign-off decision, tenant notification outcome.  
**Notifications:** Tenant completion notice when configured.  
**Audit log requirements:** Completion event, sign-off actor, closure timestamp, frozen summary reference.

**Acceptance criteria**
- Only manager sign-off closes the job.
- Closure records actual completion date.
- Closure freezes final work summary.
- Tenant can be notified that work is complete.

**Dependencies:** Work completion workflow, manager approval UI, notification service.  
**Open questions / unresolved gaps:** Optional tenant satisfaction feedback undefined.

---

## Epic 5: Communications & Audit Trail

### Story ID: COM-001
**Title:** System supports multi-channel communications  
**Primary actor:** Property manager  
**Business goal:** Deliver operational messages through appropriate channels.

**Trigger:** Operational event requires outbound communication.  
**Preconditions:** Recipient and channel configuration exist.  
**Lifecycle transitions:** Not state-driven; applies across workflows.

**Main flow**
1. System determines allowed channels per event.
2. System attempts delivery via email, SMS, app, and physical markers where applicable.
3. System records each channel attempt and outcome.

**Alternate flows**
- Channel fallback applies when primary delivery fails.

**Failure/exception flows**
- All-channel failure surfaces delivery exception without deleting the outbound record.

**Data captured:** Message type, target, selected channels, delivery attempts, failure reasons.  
**Notifications:** Outbound message itself.  
**Audit log requirements:** Actor, event source, channels attempted, sent or failed status, physical delivery markers when supported.

**Acceptance criteria**
- Per-event channel rules are configurable.
- Channel delivery attempts are logged.
- Failures are visible.
- Notices can support physical delivery markers when required.

**Dependencies:** Notification orchestration, channel providers, message templates.  
**Open questions / unresolved gaps:** Print workflow undefined; mailbox or door-posting proof workflow undefined.

### Story ID: COM-002
**Title:** All operational communications are audit logged  
**Primary actor:** Property manager or owner  
**Business goal:** Preserve communication history for disputes and compliance.

**Trigger:** Any operational communication is sent, fails, or is manually recorded.  
**Preconditions:** Communication event exists.  
**Lifecycle transitions:** Cross-cutting audit capability.

**Main flow**
1. System records sent, failed, or delivered metadata when available.
2. Manual communications can be added to the audit trail.
3. Records remain searchable by tenant, unit, property, and workflow.

**Alternate flows**
- Delivery confirmation updates the existing log entry when providers support it.

**Failure/exception flows**
- Partial provider metadata does not prevent logging of the base event.

**Data captured:** Actor, timestamp, message type, channels, target, delivery state, search keys.  
**Notifications:** None beyond the source communication.  
**Audit log requirements:** Searchable immutable or controlled-edit communication record linked to relevant entities.

**Acceptance criteria**
- Sent, failed, and delivered status is logged when available.
- Log contains actor, timestamp, message type, channels, and target.
- Manual communications can also be recorded.
- Records are searchable by tenant, unit, property, and workflow.

**Dependencies:** Communications service, audit store, search indexing.  
**Open questions / unresolved gaps:** Retention period undefined; immutable vs editable log policy undefined.

---

## Epic 6: Payments, Delinquency, and Payment Plans

### Story ID: PAY-001
**Title:** Tenant receives rent reminders via email, SMS, and app  
**Primary actor:** Tenant  
**Business goal:** Reduce missed rent payments through proactive reminders.

**Trigger:** Rent due date approaches.  
**Preconditions:** Lease and payment schedule are active.  
**Lifecycle transitions:** `Upcoming -> Due`

**Main flow**
1. System schedules reminders before the due date.
2. System sends reminders across supported channels.
3. System records reminder events and outcomes.

**Alternate flows**
- Preferences can alter channels or cadence when policy allows.

**Failure/exception flows**
- Delivery failures are logged and visible.

**Data captured:** Due date, channels, reminder schedule, delivery outcomes.  
**Notifications:** Reminder notifications to tenant.  
**Audit log requirements:** Reminder trigger, channel, send outcome, related lease and ledger period.

**Acceptance criteria**
- Reminders can be scheduled before due date.
- Email, SMS, and app channels are supported.
- Reminder events are auditable.
- Preferences or rules can be configured if allowed.

**Dependencies:** Payment schedule service, notification providers, preferences service.  
**Open questions / unresolved gaps:** Reminder cadence not fully specified.

### Story ID: PAY-002
**Title:** Missed payments notify manager or owner after threshold  
**Primary actor:** Property manager or owner  
**Business goal:** Surface delinquency quickly after a missed due date.

**Trigger:** Payment remains unpaid beyond configured threshold after due date.  
**Preconditions:** Ledger status calculation is current.  
**Lifecycle transitions:** `Due -> Late`

**Main flow**
1. System evaluates payment status after the due date threshold.
2. System distinguishes full vs partial payment.
3. System notifies manager or owner.

**Alternate flows**
- Partial payments move account into `Partially Paid` without incorrectly marking it current.

**Failure/exception flows**
- Status computation issue raises an internal exception rather than sending incorrect notices.

**Data captured:** Due amount, paid amount, threshold date, computed status, notification outcome.  
**Notifications:** Missed-payment notification by email and app.  
**Audit log requirements:** Status computation time, threshold used, notification event, actor if manually triggered.

**Acceptance criteria**
- Notification can trigger two days after missed due date.
- Email and app notifications are supported.
- Payment status is computed correctly for full and partial payments.
- Event is logged.

**Dependencies:** Ledger calculation, notification service, delinquency rules.  
**Open questions / unresolved gaps:** Owner notification rules by role or property undefined.

### Story ID: PAY-003
**Title:** Ledger supports full, partial, manual, and third-party payments  
**Primary actor:** Property manager  
**Business goal:** Keep balances accurate regardless of payment source.

**Trigger:** A payment or manual adjustment is posted.  
**Preconditions:** Tenant, lease, and property or unit linkage exist.  
**Lifecycle transitions:** `Due -> Partially Paid -> Paid` as applicable

**Main flow**
1. System accepts payment entries from Stripe, Plaid, cash, money order, or manual adjustments.
2. System posts entries to a single ledger.
3. Outstanding balance updates in real time.

**Alternate flows**
- Partial payments leave residual balance due.

**Failure/exception flows**
- Duplicate or inconsistent postings are flagged for review if reconciliation cannot be completed.

**Data captured:** Source, amount, method, balance impact, tenant, lease, property, unit, adjustment metadata.  
**Notifications:** Receipt or payment posting notice when configured.  
**Audit log requirements:** Every ledger mutation with actor or system source, timestamp, before and after balance, origin reference.

**Acceptance criteria**
- Supports Stripe, Plaid, cash, money order, and manual adjustments.
- Partial payments are reflected in outstanding balance.
- Every ledger mutation is audited.
- Each entry is linked to tenant and unit or property.

**Dependencies:** Payment integrations, ledger service, reconciliation logic.  
**Open questions / unresolved gaps:** Reversal and refund workflow undefined; duplicate payment reconciliation undefined.

### Story ID: PAY-004
**Title:** Late fees are applied automatically after grace period  
**Primary actor:** Property manager  
**Business goal:** Apply delinquency policy consistently.

**Trigger:** Account remains delinquent past grace period.  
**Preconditions:** Late-fee policy exists and grace period has ended.  
**Lifecycle transitions:** `Late -> Late Fee Applied`

**Main flow**
1. System evaluates grace period expiration.
2. System calculates late fee from policy.
3. System posts fee to ledger.
4. Manager can review or override if policy allows.

**Alternate flows**
- Override path exists when policy explicitly permits manual review.

**Failure/exception flows**
- Invalid policy configuration blocks automatic posting and surfaces a configuration issue.

**Data captured:** Grace period, fee policy used, fee amount, ledger entry, override metadata.  
**Notifications:** Optional fee notice to tenant and internal alert to manager.  
**Audit log requirements:** Fee calculation, policy reference, ledger posting, override event.

**Acceptance criteria**
- Grace period is configurable.
- Fee application is policy-driven.
- Fee entries appear on ledger.
- Manager can review if policy allows override.

**Dependencies:** Delinquency policy engine, ledger service, notification service.  
**Open questions / unresolved gaps:** Jurisdiction-specific fee constraints undefined.

### Story ID: PAY-005
**Title:** System proposes payment plans before legal escalation  
**Primary actor:** Property manager or owner  
**Business goal:** Reduce avoidable legal escalation for at-risk tenants.

**Trigger:** Delinquency reaches plan-proposal threshold before legal escalation.  
**Preconditions:** Tenant is delinquent and not yet in irreversible legal stage.  
**Lifecycle transitions:** `Late Fee Applied -> Payment Plan Proposed -> Payment Plan Active`

**Main flow**
1. System recommends an installment structure.
2. Manager reviews and approves the proposed plan.
3. Tenant accepts or rejects the offer.
4. Plan performance is tracked through completion or default.

**Alternate flows**
- Manager declines to offer a plan and continues delinquency workflow.

**Failure/exception flows**
- Accepted plan that later defaults transitions back into delinquency with preserved audit history.

**Data captured:** Proposal terms, approval metadata, acceptance status, scheduled installments, completion or default history.  
**Notifications:** Plan offer, acceptance confirmation, missed installment notices.  
**Audit log requirements:** Proposal generation, manager approval, tenant decision, installment events, default events.

**Acceptance criteria**
- System can recommend installment structure.
- Manager must approve before offer is issued.
- Plan acceptance and completion are tracked.
- Proposed plan logic is auditable.

**Dependencies:** Payment-plan engine, ledger service, manager approval workflow, notifications.  
**Open questions / unresolved gaps:** Plan generation criteria undefined; modification and default handling undefined.

### Story ID: PAY-006
**Title:** Delinquency analytics track partial payments and repeat lateness  
**Primary actor:** Property manager or owner  
**Business goal:** Identify risk patterns early.

**Trigger:** Delinquency and payment behavior data is refreshed for analytics.  
**Preconditions:** Historical payment and delinquency data exists.  
**Lifecycle transitions:** Cross-cutting analytics over payment lifecycle.

**Main flow**
1. System aggregates repeat lateness and partial-payment behavior.
2. System rolls metrics up by tenant, unit, and property.
3. Analytics are made available for reporting and predictive models.

**Alternate flows**
- Metrics can feed risk scoring or operational dashboards.

**Failure/exception flows**
- Data quality issues are surfaced instead of silently excluding delinquency records.

**Data captured:** Late counts, partial-payment counts, rollups by entity, reporting extract metadata.  
**Notifications:** Optional internal analytics alerts only.  
**Audit log requirements:** Analytics generation time, source dataset range, model or report consumer if applicable.

**Acceptance criteria**
- Repeated lateness is trackable.
- Partial-payment behavior is trackable.
- Delinquency metrics can roll up by tenant, unit, and property.
- Data is available for reporting and predictive models.

**Dependencies:** Ledger analytics pipeline, reporting store, risk-model consumers.  
**Open questions / unresolved gaps:** Thresholds and red flags intentionally not fixed yet.

---

## Epic 7: Notices, Legal Escalation, and Court Tracking

### Story ID: LEG-001
**Title:** Manager can generate three-day notice from delinquency state  
**Primary actor:** Property manager  
**Business goal:** Generate a compliant formal notice from current lease and ledger context.

**Trigger:** Delinquency reaches notice eligibility.  
**Preconditions:** Lease and ledger context are current; manager approval is required.  
**Lifecycle transitions:** `Notice Eligible -> Notice Issued`

**Main flow**
1. System builds notice content from tenant, lease, and balance data.
2. Manager reviews and approves issuance.
3. System issues the notice and preserves the contextual snapshot.

**Alternate flows**
- Notice can be held in draft until manager approval.

**Failure/exception flows**
- Missing lease or balance context blocks generation and surfaces a validation issue.

**Data captured:** Notice template, balance context, lease context, issuance timestamp, delivery metadata.  
**Notifications:** Formal notice to tenant and internal issuance confirmation.  
**Audit log requirements:** Generated by, approved by, issuance time, preserved source balance and lease snapshot.

**Acceptance criteria**
- Notice can be generated from current ledger and lease context.
- Notice requires manager approval before issuance.
- Issuance is logged with timestamp and actor.
- Associated lease and balance context are preserved.

**Dependencies:** Ledger, lease data, notice templates, communications service.  
**Open questions / unresolved gaps:** Jurisdiction-specific template logic undefined; service and delivery proof workflow undefined.

### Story ID: LEG-002
**Title:** Manager can initiate attorney referral after notice failure  
**Primary actor:** Property manager  
**Business goal:** Hand off legal review with the correct packet quickly.

**Trigger:** Post-notice nonpayment persists beyond escalation threshold.  
**Preconditions:** Notice has been issued and cure period has failed.  
**Lifecycle transitions:** `Notice Issued -> Legal Review Pending -> Attorney Referred`

**Main flow**
1. System compiles referral packet from lease, notice, and account context.
2. Manager reviews and approves referral.
3. System records referral and links it to court-tracking workflow.

**Alternate flows**
- Referral draft can remain pending until packet completeness is confirmed.

**Failure/exception flows**
- Missing required artifacts blocks referral and identifies packet gaps.

**Data captured:** Referral packet contents, approval metadata, linked legal matter or case, communication route.  
**Notifications:** Referral notification to attorney channel and internal legal review confirmation.  
**Audit log requirements:** Packet generation, approval, referral event, linked case creation.

**Acceptance criteria**
- Referral packages lease, notice, and relevant account context.
- Manager approval is required.
- Referral event is audit logged.
- Referred matter is linked to court-tracking workflow.

**Dependencies:** Notice workflow, document packet generation, legal tracking.  
**Open questions / unresolved gaps:** Attorney communication mechanism loosely defined as email; packet completeness checklist not formalized.

### Story ID: LEG-003
**Title:** Accepted payment can terminate legal progression with sign-off  
**Primary actor:** Property manager  
**Business goal:** Stop unnecessary legal escalation when delinquency resolves.

**Trigger:** Payment resolves delinquency before court progression is irreversible.  
**Preconditions:** Legal escalation is active and cancellation is allowed by policy.  
**Lifecycle transitions:** `Legal Review Pending` or `Attorney Referred -> Resolved`

**Main flow**
1. System detects a resolving payment or cure condition.
2. Sign-off authority reviews the stop-legal action.
3. System cancels legal progression and updates tenant and ledger context.

**Alternate flows**
- Partial resolution may still require continuing legal workflow.

**Failure/exception flows**
- Missing sign-off blocks cancellation even if payment is accepted.

**Data captured:** Resolution payment context, cancellation reason, sign-off actor, updated legal status.  
**Notifications:** Internal legal cancellation confirmation and tenant update if applicable.  
**Audit log requirements:** Resolution event, sign-off, reason, resulting tenant and legal state.

**Acceptance criteria**
- Legal track can be cancelled prior to court when allowed.
- Cancellation requires sign-off.
- Resolution reason is logged.
- Tenant status and ledger update correctly.

**Dependencies:** Ledger resolution logic, legal workflow, sign-off permissions.  
**Open questions / unresolved gaps:** Exact sign-off actors not fully locked.

### Story ID: LEG-004
**Title:** Court dates are tracked and surfaced operationally  
**Primary actor:** Property manager or owner  
**Business goal:** Keep the team prepared for court obligations.

**Trigger:** Court date is created or updated.  
**Preconditions:** Linked legal matter exists.  
**Lifecycle transitions:** `Attorney Referred -> Court Scheduled`

**Main flow**
1. System records court event details.
2. Event appears on calendar and dashboard.
3. Relevant parties are notified.

**Alternate flows**
- Event updates version the schedule and notify stakeholders.

**Failure/exception flows**
- Missing case linkage prevents event creation.

**Data captured:** Court date, time, location or virtual metadata, linked case context, recipients.  
**Notifications:** Court reminders and schedule-change notices.  
**Audit log requirements:** Event creation, event updates, actor, linked case, notification sends.

**Acceptance criteria**
- Court events appear on calendar or dashboard.
- Relevant parties are notified.
- Linked case context is accessible.
- Event changes are audited.

**Dependencies:** Legal case tracking, calendar service, notification service.  
**Open questions / unresolved gaps:** Attorney-to-system data handoff undefined.

---

## Epic 8: Renewals, Retention, and Move-Out

### Story ID: REN-001
**Title:** Renewal reminders trigger at 90 and 30 days  
**Primary actor:** Property manager or tenant  
**Business goal:** Start renewal or move-out planning early.

**Trigger:** Lease approaches 90-day and 30-day thresholds.  
**Preconditions:** Active lease with known end date.  
**Lifecycle transitions:** `Active Tenant -> Renewal Pending`

**Main flow**
1. System triggers renewal reminders at 90 days.
2. System triggers follow-up reminders at 30 days.
3. Reminders link recipients into the renewal workflow.

**Alternate flows**
- Role-specific recipient rules may narrow who receives reminders.

**Failure/exception flows**
- Missing lease end date blocks reminder generation and surfaces data-quality issue.

**Data captured:** Reminder cadence, recipients, linked lease, delivery outcomes.  
**Notifications:** Renewal reminders to tenant and landlord or manager as configured.  
**Audit log requirements:** Reminder timestamps, recipients, channels, workflow links.

**Acceptance criteria**
- 90-day reminder goes to tenant and landlord or manager.
- 30-day reminder also exists.
- Reminders are logged.
- Reminders link to renewal workflow.

**Dependencies:** Lease service, notification orchestration, renewal workflow.  
**Open questions / unresolved gaps:** Exact recipient set by role or property undefined.

### Story ID: REN-002
**Title:** System can present retention offer options  
**Primary actor:** Property manager or owner  
**Business goal:** Retain good tenants intentionally.

**Trigger:** Lease enters renewal decision window and retention action is desired.  
**Preconditions:** Lease is eligible for renewal offer.  
**Lifecycle transitions:** `Renewal Pending`

**Main flow**
1. System creates retention or renewal offer options.
2. Manager or owner presents an offer.
3. Offer decision is tracked.
4. Accepted offers flow into renewal execution; declined offers can move to move-out workflow.

**Alternate flows**
- Multiple offer variants can be presented if policy allows.

**Failure/exception flows**
- Offer missing required approvals cannot be sent.

**Data captured:** Offer terms, decision, approval status, linked renewal or move-out path.  
**Notifications:** Retention offer notices and decision confirmations.  
**Audit log requirements:** Offer creation, approval, presentation, decision event.

**Acceptance criteria**
- Retention offers can be created and presented.
- Offer decision is tracked.
- Accepted offers flow into renewal or lease update process.
- Declined offers can transition to move-out flow.

**Dependencies:** Renewal pricing logic, approval workflow, notification service.  
**Open questions / unresolved gaps:** Offer optimization logic undefined; approval boundaries undefined.

### Story ID: MOV-001
**Title:** Tenant performs move-out inspection  
**Primary actor:** Tenant  
**Business goal:** Record departure condition from the tenant perspective.

**Trigger:** Move-out inspection window opens.  
**Preconditions:** Tenant is in move-out process.  
**Lifecycle transitions:** Inspection `Scheduled -> Submitted`; tenant `Move-Out Pending`

**Main flow**
1. Tenant completes move-out inspection with notes and photos.
2. System time-stamps the submission.
3. Inspection enters manager review queue.

**Alternate flows**
- Drafts may be supported before final submission.

**Failure/exception flows**
- Submission validation blocks incomplete required inspection data.

**Data captured:** Notes, photos, linked unit and lease, submission timestamp.  
**Notifications:** Submission confirmation and manager review alert.  
**Audit log requirements:** Submission actor, timestamp, associated lease and unit.

**Acceptance criteria**
- Notes and photos are supported.
- Inspection is time-stamped.
- Inspection is linked to unit and lease.
- Submission enters manager review queue.

**Dependencies:** Inspection UI, media storage, move-out workflow.  
**Open questions / unresolved gaps:** None specified.

### Story ID: MOV-002
**Title:** Manager performs move-out inspection and generates turn scope  
**Primary actor:** Property manager or staff member  
**Business goal:** Define post-occupancy turn work and timeline.

**Trigger:** Tenant move-out occurs or move-out inspection window reaches manager review.  
**Preconditions:** Unit is entering turn process.  
**Lifecycle transitions:** Unit turn `Move-Out Scheduled -> Awaiting Move-Out Inspection -> Turn Scope Defined -> Turn Work Scheduled`

**Main flow**
1. Manager or staff performs formal move-out inspection.
2. System compares or coexists with tenant inspection data.
3. System generates repair and heavy-cleaning estimates.
4. System creates turn timeline and updates unit turn state.

**Alternate flows**
- Manager and tenant inspections may both be retained without forced merge.

**Failure/exception flows**
- Missing inspection evidence blocks final turn scope approval.

**Data captured:** Manager inspection findings, estimates, turn timeline, unit turn state.  
**Notifications:** Internal turn-work notifications and optional owner visibility notices.  
**Audit log requirements:** Inspection completion, estimate generation, turn timeline creation, unit state changes.

**Acceptance criteria**
- Manager inspection can coexist with tenant inspection.
- System can generate repair or heavy-cleaning estimates.
- Turn timeline is created.
- Unit turn state updates appropriately.

**Dependencies:** Inspection workflow, estimate generation, unit-turn status tracking.  
**Open questions / unresolved gaps:** Deposit deduction policy rules not explicitly modeled.

### Story ID: MOV-003
**Title:** Final charges are posted and communicated to former tenant  
**Primary actor:** Property manager  
**Business goal:** Make closeout charges transparent and collectible.

**Trigger:** Move-out financial closeout is finalized.  
**Preconditions:** Final charges and deposit offsets are computed.  
**Lifecycle transitions:** `Move-Out Pending -> Former Tenant`

**Main flow**
1. System posts final charges to ledger.
2. System records deposit offsets where applicable.
3. System sends a detailed breakdown to the former tenant.
4. Records are preserved for disputes.

**Alternate flows**
- Zero-balance closeout still produces an archived statement if policy requires.

**Failure/exception flows**
- Delivery failure does not remove or alter the posted closeout ledger entries.

**Data captured:** Final charges, deposit offsets, statement breakdown, delivery outcome.  
**Notifications:** Final charge statement by app or email.  
**Audit log requirements:** Posted charges, offsets, statement generation, send outcome, dispute references.

**Acceptance criteria**
- Charges can post to ledger.
- Deposit offsets can be recorded.
- Tenant receives detailed breakdown by app or email.
- Records are preserved for disputes.

**Dependencies:** Ledger service, deposit accounting, communications service.  
**Open questions / unresolved gaps:** Statement formatting and delivery proof undefined.

---

## Epic 9: Property, Unit, Listing, and Media Management

### Story ID: PRP-001
**Title:** Manager can create and edit properties  
**Primary actor:** Property manager or owner  
**Business goal:** Maintain accurate property records for operations, listings, and finance.

**Trigger:** Authorized user creates or edits a property.  
**Preconditions:** User has property-management permissions.  
**Lifecycle transitions:** Cross-cutting master data management.

**Main flow**
1. User creates or updates property metadata.
2. System validates and persists the record.
3. Property links remain available to units and financial workflows.

**Alternate flows**
- Financial metadata can be stored without immediate listing publication.

**Failure/exception flows**
- Role or validation failure blocks save and surfaces errors.

**Data captured:** Address, lat/long, age, mortgage data, amenities, media, linked units, financial metadata.  
**Notifications:** Optional internal change notifications only.  
**Audit log requirements:** Create and edit actor, timestamp, changed fields, prior and new values.

**Acceptance criteria**
- Property supports address, lat/long, age, mortgage data, amenities, and media.
- Edits are role-controlled and audited.
- Property links to units.
- Financial metadata can be stored.

**Dependencies:** Property CRUD, role permissions, audit logging.  
**Open questions / unresolved gaps:** Mortgage field validation undefined; owner-entity model unspecified.

### Story ID: UNT-001
**Title:** Manager can create and edit units  
**Primary actor:** Property manager or owner  
**Business goal:** Keep unit availability and operations accurate.

**Trigger:** Authorized user creates or edits a unit.  
**Preconditions:** Parent property exists.  
**Lifecycle transitions:** Unit lifecycle supports `Available`, `Leased`, and turn-related states

**Main flow**
1. User creates or edits unit-level details.
2. System persists beds, baths, amenities, media, layouts, and status.
3. Unit remains linked to its property.

**Alternate flows**
- Media can be published immediately if current requirement remains in effect.

**Failure/exception flows**
- Invalid status change or missing property linkage blocks save.

**Data captured:** Beds, baths, amenities, media, layouts, status, property linkage.  
**Notifications:** Optional internal change notices.  
**Audit log requirements:** Created or edited by, status transition history, changed fields.

**Acceptance criteria**
- Unit supports beds, baths, amenities, media, layouts, and status.
- Unit links to property.
- Status transitions are tracked.
- Media is immediately live per current requirement.

**Dependencies:** Unit CRUD, media management, status tracking.  
**Open questions / unresolved gaps:** Unit status taxonomy needs normalization; rent-ready vs available may need explicit modeling.

### Story ID: LST-001
**Title:** Listings can be published to third-party channels  
**Primary actor:** Property manager  
**Business goal:** Syndicate vacancies externally from internal property and unit data.

**Trigger:** Listing publication is requested for an available unit.  
**Preconditions:** Property and unit data are publication-ready.  
**Lifecycle transitions:** Unit turn `Rent Ready -> Listed -> Available -> Leased`

**Main flow**
1. System transforms property and unit data into listing outputs.
2. Photos and layouts are included.
3. Publication status is tracked per channel.

**Alternate flows**
- Listing stays internal-only until external publishing is initiated.

**Failure/exception flows**
- Channel publication failure leaves listing visible with failed status instead of silently dropping it.

**Data captured:** Listing payload, included media, partner status, publish timestamps.  
**Notifications:** Optional manager alerts on publication failure or success.  
**Audit log requirements:** Publish actor, timestamp, channels targeted, status changes, partner responses.

**Acceptance criteria**
- Property or unit data can feed listing outputs.
- Photos and layouts are included.
- Publication status is trackable.
- Publication events are logged.

**Dependencies:** Listing syndication service, media store, unit availability logic.  
**Open questions / unresolved gaps:** Exact listing partners and sync direction undefined; approval workflow intentionally omitted.

---

## Epic 10: Dashboard, Calendar, Reporting, and Analytics

### Story ID: DSH-001
**Title:** Dashboard shows key dates and operational calendar  
**Primary actor:** Property manager or owner  
**Business goal:** Provide an operational command view immediately after login.

**Trigger:** User logs in or dashboard data refreshes.  
**Preconditions:** Relevant workflow events exist.  
**Lifecycle transitions:** Cross-cutting visibility layer.

**Main flow**
1. System aggregates payments, inspections, move-ins, move-outs, court dates, and other major events.
2. Dashboard displays a role-appropriate calendar.
3. Entries link back to source workflows.

**Alternate flows**
- Live updates can refresh entries without manual reconciliation.

**Failure/exception flows**
- Source-event load failures show partial-data warnings rather than silent omission.

**Data captured:** Dashboard event projections, linked workflow identifiers, role visibility filters.  
**Notifications:** None beyond linked workflow notifications.  
**Audit log requirements:** Event refresh generation time and source linkage when operationally relevant.

**Acceptance criteria**
- Calendar shows payments, inspections, move-ins, move-outs, court dates, and other major events.
- Entries are linked to source workflows.
- Dashboard reflects role-appropriate visibility.
- Event changes appear without manual reconciliation.

**Dependencies:** Calendar aggregation, role visibility rules, workflow event projections.  
**Open questions / unresolved gaps:** Dashboard widget prioritization undefined; no color-coding rules required yet.

### Story ID: RPT-001
**Title:** Monthly financial summaries aggregate property economics  
**Primary actor:** Property manager or owner  
**Business goal:** Evaluate property performance using recurring summaries.

**Trigger:** Monthly reporting cycle runs or user requests summary.  
**Preconditions:** Ledger and expense data exist.  
**Lifecycle transitions:** Reporting layer over financial workflows.

**Main flow**
1. System aggregates rent, repairs, taxes, mortgage, and other expenses.
2. Reports roll up by property and unit when relevant.
3. Provenance to source ledger records is preserved.

**Alternate flows**
- Output format remains flexible until final reporting format is chosen.

**Failure/exception flows**
- Missing source data is surfaced in report completeness warnings.

**Data captured:** Revenue and expense rollups, period covered, source provenance metadata.  
**Notifications:** Optional report-ready notice.  
**Audit log requirements:** Report generation time, actor or scheduler, period, source dataset references.

**Acceptance criteria**
- Report can include rent, repairs, taxes, mortgage, and other expenses.
- Reporting can roll up by property and unit where relevant.
- Source ledger provenance is preserved.
- Outputs remain format-flexible for now.

**Dependencies:** Ledger reporting, expense categorization, report delivery.  
**Open questions / unresolved gaps:** Final output format undefined; accounting close rules undefined.

### Story ID: RPT-002
**Title:** Maintenance and communication analytics support optimization  
**Primary actor:** Property manager or owner  
**Business goal:** Measure operational response quality and identify improvement areas.

**Trigger:** Analytics job runs or user requests operational metrics.  
**Preconditions:** Maintenance and communication event history exists.  
**Lifecycle transitions:** Cross-cutting analytics layer.

**Main flow**
1. System calculates response time, completion time, communication latency, and escalation frequency.
2. Metrics are surfaced for operational review.
3. Data remains reusable for predictive maintenance later.

**Alternate flows**
- Metrics can feed dashboards, reports, or predictive models.

**Failure/exception flows**
- Incomplete timestamps are flagged as data-quality gaps instead of omitted silently.

**Data captured:** Response metrics, completion metrics, communication latency, escalation counts, reporting metadata.  
**Notifications:** Optional internal analytics alerting only.  
**Audit log requirements:** Analytics generation event, period, source data range.

**Acceptance criteria**
- Response time and completion time are measurable.
- Communication latency is measurable.
- Escalation frequency is measurable.
- Data is usable for predictive maintenance later.

**Dependencies:** Maintenance event history, communications audit log, analytics pipeline.  
**Open questions / unresolved gaps:** Redline thresholds intentionally deferred.

---

## Epic 11: Accounting Integrations

### Story ID: ACC-001
**Title:** System exports or syncs financial data to accounting tools  
**Primary actor:** Property manager or owner  
**Business goal:** Keep operational finance aligned with accounting systems.

**Trigger:** Sync or export cycle runs, or ledger events require accounting handoff.  
**Preconditions:** Accounting mappings and connection details exist.  
**Lifecycle transitions:** Accounting integration overlay on financial workflows.

**Main flow**
1. System exports or syncs rent, charges, repairs, taxes, mortgage-related items, and related records.
2. System preserves origin references for mapped records.
3. Failed sync states remain visible and reviewable.

**Alternate flows**
- Batch export can be used when real-time sync is not enabled.

**Failure/exception flows**
- Sync failure does not silently drop financial events and instead records retriable or reviewable failure state.

**Data captured:** Exported or synced event metadata, external references, mapping status, failure details.  
**Notifications:** Optional operator alerts for failed syncs.  
**Audit log requirements:** Sync start, sync end, actor or scheduler, mapped record references, failure visibility.

**Acceptance criteria**
- Rent, charges, repairs, taxes, and mortgage-related items can be exported or synced.
- Sync or export events are auditable.
- Failed sync states are visible.
- Mapped records preserve origin references.

**Dependencies:** Accounting integration service, mapping store, failure monitoring.  
**Open questions / unresolved gaps:** QuickBooks mapping schema undefined; real-time sync vs batch export undecided.

---

## Global Non-Functional Story

### Story ID: SYS-001
**Title:** System preserves end-to-end auditability  
**Primary actor:** Operator, owner, or reviewer  
**Business goal:** Make disputes, compliance, and analytics supportable.

**Trigger:** Any critical action, communication, financial mutation, or state transition occurs.  
**Preconditions:** Relevant domain object exists.  
**Lifecycle transitions:** Cross-cutting requirement across all workflows.

**Main flow**
1. System logs critical workflow transitions.
2. Log entries distinguish system-generated and human-generated actions.
3. Audit data remains queryable across tenant, unit, property, lease, payment, notice, and work order contexts.

**Alternate flows**
- Before and after values are captured where appropriate.

**Failure/exception flows**
- Logging failures are surfaced as operational defects and do not create silent blind spots where possible.

**Data captured:** Actor, timestamp, object, action, before and after state where appropriate, workflow correlation identifiers.  
**Notifications:** Optional operational alerts if audit persistence fails.  
**Audit log requirements:** Immutable or tamper-evident logging for all critical mutations and communications.

**Acceptance criteria**
- All critical workflow transitions are logged.
- Logs include actor, timestamp, object, action, and before or after where appropriate.
- System-generated and human-generated actions are distinguishable.
- Audit data is queryable across tenant, unit, property, lease, payment, notice, and work order.

**Dependencies:** Central audit service, domain event propagation, query surfaces.  
**Open questions / unresolved gaps:** Retention and archival policy undefined; tamper-resistance requirements undefined.

---

## Gap Detection Matrix

| Domain | Required capability | Story coverage present? | Acceptance criteria complete? | Critical gaps |
|---|---|---|---|---|
| Applications | Public submission + fee | Yes | Partial | Co-applicant, document upload, duplicate handling |
| Screening | AI score + recommendation | Yes | Partial | Thresholds, override rules, compliance criteria |
| Denials | Formal denial workflow | Yes | Partial | Jurisdictional compliance content |
| Waitlist | Approved/no inventory path | Yes | Partial | Expiration and ranking policy |
| Onboarding | Portal provisioning | Yes | Partial | Identity verification, activation timing |
| Lease | Application-to-lease mapping | Yes | Partial | Field map, template versioning |
| Signatures | Multi-document signing | Yes | Partial | Co-signer and signer order |
| Move-in | Scheduled event + welcome | Yes | Partial | Event permissions, conflict rules |
| Inspections | Tenant + manager flows | Yes | Partial | Dispute process, checklist policy |
| Maintenance | Photo-based requests | Yes | Partial | Category taxonomy, media support |
| Emergency | Auto-escalation | Yes | Partial | After-hours dispatch policy |
| Maintenance close | Manager sign-off | Yes | Partial | Tenant feedback policy |
| Communications | Email/SMS/app/physical | Yes | Partial | Proof of physical delivery |
| Audit | All actions logged | Yes | Partial | Retention and tamper policy |
| Payments | Stripe/Plaid/manual/partial | Yes | Partial | Refunds and reconciliation |
| Delinquency | Late fee + reminders | Yes | Partial | Jurisdiction-specific fee rules |
| Payment plans | Proposal + approval | Yes | Partial | Modification and default policy |
| Legal | Three-day notice + attorney referral | Yes | Partial | Service proof and jurisdiction templates |
| Court | Event tracking | Yes | Partial | Attorney sync workflow |
| Renewal | 90/30-day reminders | Yes | Partial | Role-specific notification rules |
| Move-out | Inspections + turn scope | Yes | Partial | Deposit deduction logic |
| Property/Unit | CRUD + metadata + media | Yes | Partial | Validation and normalized status taxonomy |
| Listings | Third-party syndication | Yes | Partial | Partner mappings and sync direction |
| Dashboard | Calendar-centric view | Yes | Partial | Widget priorities |
| Reporting | Monthly financials | Yes | Partial | Output format and close rules |
| Accounting | Export/sync | Yes | Partial | Chart-of-accounts mapping and sync mode |

## Definition of Done for Story Refactor

A user story corpus is not complete unless it includes:

- Structural completeness: actor, trigger, preconditions, main flow, alternate flow, exception flow.
- Operational completeness: notifications, audit logging, downstream effects, permissions or approval points.
- Business completeness: acceptance criteria, dependencies, unresolved decisions explicitly called out.
- System completeness: linked lifecycle transitions, affected data objects, and no orphan workflow steps.
