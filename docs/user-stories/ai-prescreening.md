# User Stories: AI-Powered Applicant Prescreening

**Module:** `ai_prescreening_service`  
**Normalized Scope:** application intake enrichment, AI screening, fairness controls, denial/waitlist handoffs, and applicant decision support.  
**Canonical Lifecycle Domains:** applications, AI screening, denials, waitlist, onboarding handoff.

## File-Level Notes
- This file now covers the application-to-decision workflow with explicit lifecycle transitions.
- Original biometric and forgery concepts are preserved as advanced screening options, not assumed defaults.
- Where legal/compliance detail is unresolved, the story marks the gap instead of converting it into fixed policy.

---

## Story ID: LSG-001
**Title:** Applicant submits rental application with optional verification inputs  
**Primary Actor:** Prospective tenant  
**Business Goal:** Submit a reviewable application that can feed automated and manual screening.

**Trigger:** Applicant opens the public application link and begins submission.  
**Preconditions:** Application form is active; property or unit is accepting applications; fee settings and optional verification integrations are configured if used.  
**Main Flow:**
1. Applicant enters required identity, contact, employment, income, and unit-selection data.
2. Applicant optionally completes supported verification steps such as bank-link or document upload.
3. Applicant submits the application.
4. System stores the application snapshot and routes it into review/scoring.

**Alternate Flows:**
- No external verification is used and application proceeds with standard data only.
- Draft save is supported if enabled by the application flow.

**Failure / Exception Flows:**
- Missing required fields blocks final submission.
- Verification integration failure routes the application to manual review rather than discarding it.
- Fee failure keeps application in `Fee Pending` when a fee is required.

**Data Captured / Affected:** Applicant identity, contact information, employment/income data, selected property/unit, consent artifacts, optional verification artifacts, fee status, immutable submission snapshot.  
**Notifications:** Submission confirmation to applicant; optional operator alert for newly submitted application.  
**Permissions / Approval Gates:** Applicant submits; operator review occurs downstream.  
**Audit Log Requirements:** Submission event, applicant actor, timestamp, fee attempt/result, verification attempt/result, property/unit at submission.  
**State Transitions:** Application `Draft -> Submitted` or `Draft -> Fee Pending -> Submitted`; downstream handoff to screening.  
**Dependencies:** Public application UI, payment integration, verification integrations when used, application persistence.

**Acceptance Criteria:**
- Application cannot be finalized with missing required fields.
- Payment result is persisted when a fee is required.
- Optional verification attempts are logged and do not silently delete the application on failure.
- Application is linked to property and, when applicable, unit.
- Submission creates an immutable application record.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Co-applicant and guarantor policy is not defined.
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: External verification providers are not locked.
- `MISSING_DATA_MAPPING`: Document upload requirements are not fully defined.

---

## Story ID: LSG-002
**Title:** System runs AI pre-screening and stores recommendation  
**Primary Actor:** Property manager  
**Business Goal:** Produce a fast recommendation that can be reviewed, overridden, and audited.

**Trigger:** Application enters `Submitted` with the minimum data required for scoring.  
**Preconditions:** Application is complete enough to score; screening logic is configured.  
**Main Flow:**
1. System ingests submitted application data.
2. System strips unsupported data from the scoring payload where fair-housing safeguards apply.
3. AI/rules engine computes score, recommendation, and supporting rationale.
4. System stores the result and moves the application to `AI Scored`.
5. Manager reviews automated output.

**Alternate Flows:**
- Score unavailable falls back to manual review.
- Manager manually overrides recommendation with required justification.

**Failure / Exception Flows:**
- Scoring service error creates visible manual review work and does not silently pass.
- Missing required inputs block automated scoring.

**Data Captured / Affected:** Screening inputs, sanitized scoring payload, score, recommendation, explanation, override metadata, model/rules version.  
**Notifications:** Optional manager notification when screening is complete.  
**Permissions / Approval Gates:** Automated recommendation does not remove manager review authority unless separate auto-approval policy is defined; override requires authorized operator.  
**Audit Log Requirements:** Scoring timestamp, inputs used, sanitized payload marker, model/rules version, recommendation, override actor/reason if changed.  
**State Transitions:** Application `Submitted -> AI Scored`; downstream handoff to approval, denial, or waitlist decision.  
**Dependencies:** Screening engine, fair-housing sanitization rules, application data normalization, manager review UI.

**Acceptance Criteria:**
- Recommendation is persisted, reviewable, and auditable.
- Score generation does not silently fail.
- Manager can distinguish automated vs overridden outcome.
- Screening handoff into approval/denial/waitlist is explicit.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Hard underwriting thresholds are not defined.
- `MISSING_LEGAL_RULE`: Adverse action explanation logic is not defined.
- `MISSING_LEGAL_RULE`: Fairness/compliance review criteria are not fully defined.

---

## Story ID: LSG-003
**Title:** Denial triggers formal communication and blocks onboarding  
**Primary Actor:** Property manager  
**Business Goal:** Ensure denied applicants receive a consistent notice without accidentally entering onboarding.

**Trigger:** Application is moved to `Denied` after review.  
**Preconditions:** Denial decision exists; denial communication template is available.  
**Main Flow:**
1. System prepares denial communication from the decision context.
2. Manager reviews or approves send when policy requires.
3. System sends or queues the denial notice.
4. System records the communication and ensures no onboarding artifacts are created.

**Alternate Flows:**
- Automatic send occurs when policy permits.
- Manual review gate holds the notice for operator approval.

**Failure / Exception Flows:**
- Delivery failure leaves denial intact and surfaces retry requirements.
- Missing required denial data blocks send and marks the case incomplete.

**Data Captured / Affected:** Denial reason, template/version, channel, delivery status, application decision metadata.  
**Notifications:** Denial notice to applicant; optional operator alert for failed delivery.  
**Permissions / Approval Gates:** Manager approval required if denial sends are not fully automated; this policy remains unresolved.  
**Audit Log Requirements:** Denial decision timestamp, decision actor, communication template, channel, send result, explicit no-onboarding handoff.  
**State Transitions:** Application `AI Scored -> Denied` or `Under Review -> Denied`; downstream handoff is terminal for applicant unless appeal/reapply policy exists.  
**Dependencies:** Decision workflow, communications service, template management, onboarding service guardrail.

**Acceptance Criteria:**
- Denied status can trigger a standardized notice.
- Denial communication is logged.
- Approval gate exists when policy requires operator review.
- Denial does not create onboarding or lease artifacts.

**Open Gaps / Unresolved Decisions:**
- `MISSING_APPROVAL_GATE`: Automatic vs manager-approved denial sending is not locked.
- `MISSING_LEGAL_RULE`: Jurisdiction-specific denial/adverse-action content is not defined.

---

## Story ID: LSG-004
**Title:** Approved applicant enters waitlist when no unit is available  
**Primary Actor:** Property manager  
**Business Goal:** Retain approved leads without prematurely starting tenancy.

**Trigger:** Application is approvable but inventory is unavailable.  
**Preconditions:** Approval decision exists; no unit is currently releasable.  
**Main Flow:**
1. System places the applicant into `Waitlisted`.
2. System records waitlist timing and release conditions.
3. Applicant remains outside onboarding until inventory is released.
4. Manager can later release the applicant into onboarding.

**Alternate Flows:**
- Waitlist expires after configured hold duration.
- Applicant withdraws before release.

**Failure / Exception Flows:**
- Invalid inventory linkage blocks release into onboarding.
- Missing hold-duration configuration leaves the applicant waitlisted but operationally ambiguous and must be flagged.

**Data Captured / Affected:** Waitlist start date, hold duration, release reason, property/unit preference context, expiration marker if used.  
**Notifications:** Waitlist placement notice; release or expiration notice where configured.  
**Permissions / Approval Gates:** Manager controls release from waitlist; applicant cannot self-release.  
**Audit Log Requirements:** Waitlist entry, expiration, removal, release actor, linked inventory context.  
**State Transitions:** Application `Approved -> Waitlisted`; downstream handoff to `Onboarding Started` only after release.  
**Dependencies:** Inventory state management, application workflow, onboarding workflow, notification service.

**Acceptance Criteria:**
- Waitlisted applicants are distinct from denied applicants.
- Waitlisted applicants do not start onboarding until released.
- Hold duration can be configured.
- Expiration/removal/release events are logged.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Waitlist ranking/order policy is not defined.
- `MISSING_NOTIFICATION_RULE`: Communication cadence during waitlist is not defined.

---

## Story ID: ONB-001
**Title:** Approved applicant proceeds into onboarding without duplicate entry  
**Primary Actor:** Property manager  
**Business Goal:** Move approved applicants into onboarding and portal provisioning using the application as the source record.

**Trigger:** Application reaches `Approved` and is not waitlisted.  
**Preconditions:** Approval exists; unit path is valid; applicant record can map into tenant onboarding fields.  
**Main Flow:**
1. System creates onboarding record from application data.
2. System maps applicant data into tenant profile fields.
3. System provisions or stages a portal account.
4. Workflow advances toward lease drafting.

**Alternate Flows:**
- Portal provisioning is delayed pending manual identity verification if required.

**Failure / Exception Flows:**
- Missing mapping fields block onboarding start.
- Portal provisioning failure keeps onboarding open and visible for operator retry.

**Data Captured / Affected:** Onboarding record, mapped tenant profile, portal provisioning status, linked application ID.  
**Notifications:** Onboarding start notification to applicant; internal alert on provisioning failure.  
**Permissions / Approval Gates:** Approval required upstream; onboarding activation is system-driven; manual identity review may be required if later defined.  
**Audit Log Requirements:** Approval-to-onboarding handoff, field mapping event, portal provisioning attempt/result.  
**State Transitions:** Applicant-to-Tenant `Approved Applicant -> Onboarding Started -> Portal Provisioned`; downstream handoff to `Lease Drafted`.  
**Dependencies:** Application service, identity/user service, portal provisioning, source-of-truth field mapping.

**Acceptance Criteria:**
- Approval creates an onboarding record.
- Applicant data maps into tenant profile fields.
- Portal account can be provisioned or staged.
- Waitlisted applicants do not enter onboarding.
- Onboarding hands off to lease drafting without duplicate data entry.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Identity verification step is not specified.
- `MISSING_DATA_MAPPING`: Source-of-truth field mapping is not fully defined.
- `MISSING_BUSINESS_RULE`: Portal activation timing is not fully defined.

---

## Story ID: ONB-002
**Title:** Lease draft is pre-populated from application data  
**Primary Actor:** Property manager  
**Business Goal:** Avoid repeated manual entry and preserve traceability from application to lease.

**Trigger:** Onboarding reaches lease preparation stage.  
**Preconditions:** Tenant profile exists; unit is assigned; lease template exists.  
**Main Flow:**
1. System generates draft lease from approved application and onboarding data.
2. System populates mapped fields automatically.
3. Manager reviews and edits where necessary.
4. Draft becomes ready for sending/signature workflow.

**Alternate Flows:**
- Manager manually edits one or more mapped fields before sending.

**Failure / Exception Flows:**
- Missing required field mapping blocks draft completion.
- Missing template version or template conflict prevents safe generation.

**Data Captured / Affected:** Template version, mapped fields, edited values, linked application/tenant/unit/lease records.  
**Notifications:** Optional internal notification that lease draft is ready.  
**Permissions / Approval Gates:** Draft editing requires authorized manager access.  
**Audit Log Requirements:** Draft creation, source mapping used, edited fields, actor, timestamp, prior/new values for changed mapped data.  
**State Transitions:** Applicant-to-Tenant `Portal Provisioned -> Lease Drafted`; downstream handoff to `Lease Sent`.  
**Dependencies:** Lease template service, application-to-lease field mapping, lease persistence.

**Acceptance Criteria:**
- Mapped fields populate automatically.
- Manager can edit before sending.
- Changed values are audited.
- Draft creation has a downstream handoff into signature workflow.

**Open Gaps / Unresolved Decisions:**
- `MISSING_DATA_MAPPING`: Formal field mapping specification is not defined.
- `MISSING_BUSINESS_RULE`: Lease template versioning requirements are not defined.

---

## Story ID: ONB-003
**Title:** Lease and related documents are sent for signature  
**Primary Actor:** Property manager  
**Business Goal:** Complete digital signature workflow without activating tenancy early.

**Trigger:** Lease draft is marked ready to send.  
**Preconditions:** Lease draft exists; required documents are assembled; signer set is known.  
**Main Flow:**
1. System packages lease and related documents.
2. System sends packet for signature.
3. System tracks signature completion state per required signer.
4. Workflow remains blocked from active tenancy until required signatures complete.

**Alternate Flows:**
- Multiple documents are included in a single packet.
- Partial completion keeps the workflow in `Lease Sent`.

**Failure / Exception Flows:**
- Signature service failure blocks progression and surfaces retry.
- Expired or incomplete signature package prevents move-in activation.

**Data Captured / Affected:** Document set, signer list, signature completion metadata, final signed artifacts, packet timestamps.  
**Notifications:** Signature requests, reminders, completion confirmation.  
**Permissions / Approval Gates:** Manager initiates sending; tenancy activation requires all required signatures.  
**Audit Log Requirements:** Packet creation, send event, recipients, reminder sends, completion timestamps, linked documents/version references.  
**State Transitions:** Applicant-to-Tenant `Lease Drafted -> Lease Sent -> Lease Signed`; downstream handoff to move-in scheduling.  
**Dependencies:** E-signature provider, document management, onboarding workflow, move-in scheduling workflow.

**Acceptance Criteria:**
- Multiple required documents can be included.
- Signature completion is tracked.
- Incomplete signatures block activation of tenancy.
- Completion events are logged.
- Fully executed packet hands off into move-in scheduling.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Signer order is not specified.
- `MISSING_BUSINESS_RULE`: Co-signer/guarantor flows are not defined.

---

## Story ID: LSG-005
**Title:** High-risk document review and advanced verification remain manual-review gated  
**Primary Actor:** Property manager  
**Business Goal:** Preserve fraud-detection intent without overclaiming automated certainty.

**Trigger:** Applicant submits uploaded verification documents or advanced verification artifacts.  
**Preconditions:** Manual document flow is enabled; uploaded document exists.  
**Main Flow:**
1. System stores the document for review/scanning.
2. Optional AI/ML analysis produces a risk signal when configured.
3. High-risk results route the application to manual review rather than direct denial.

**Alternate Flows:**
- Low-risk result allows application to continue through normal screening.

**Failure / Exception Flows:**
- Analysis service unavailable falls back to manual review.

**Data Captured / Affected:** Document metadata, optional forgery score, review queue flag, linked application context.  
**Notifications:** Optional operator alert for high-risk review queue item.  
**Permissions / Approval Gates:** Human-in-the-loop review required before permanent rejection on fraud grounds.  
**Audit Log Requirements:** Document upload, scan attempt/result, queue placement, review decision actor.  
**State Transitions:** Application remains in `Under Review` until manual resolution; downstream handoff back into scoring or denial path.  
**Dependencies:** Document storage, optional analysis integration, review queue.

**Acceptance Criteria:**
- High-risk documents can be routed to manual review instead of silent rejection.
- Analysis failure falls back to manual review.
- Queue placement and outcomes are auditable.

**Open Gaps / Unresolved Decisions:**
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: Forgery/biometric provider contract is not defined.
- `MISSING_LEGAL_RULE`: Biometric privacy/deletion rules are not sufficiently specified for implementation-safe completeness.
