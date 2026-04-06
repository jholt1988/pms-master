# User Stories: Backend Services & API Ecosystem

**Module:** `tenant_portal_backend`  
**Normalized Scope:** ledger, payments, delinquency, notices, accounting sync/export, reporting, auditability, and platform service guardrails.  
**Canonical Lifecycle Domains:** payments, delinquency, payment plans, notices, legal escalation support, reporting, accounting, audit logging.

## File-Level Notes
- This file now carries the operational backend stories that underpin finance, delinquency, sync, and auditability.
- Listing syndication remains in scope only as an integration workflow, not as a claim of specific partner behavior.
- Infrastructure resilience is preserved as a platform story but is not allowed to substitute for missing business workflows.

---

## Story ID: PAY-003
**Title:** Ledger supports full, partial, manual, and third-party payments  
**Primary Actor:** Property manager  
**Business Goal:** Keep tenant balances accurate regardless of payment source or posting method.

**Trigger:** Payment or adjustment is posted from Stripe, Plaid, cash, money order, or manual operator action.  
**Preconditions:** Lease ledger exists; tenant and unit/property linkage are valid.  
**Main Flow:**
1. System ingests a payment or adjustment event.
2. System posts the event to the ledger with a source reference.
3. System recalculates outstanding balance.
4. Downstream reporting, reminders, delinquency, and accounting processes consume the updated ledger state.

**Alternate Flows:**
- Partial payment leaves residual balance due and transitions account to `Partially Paid`.
- Manual adjustment posts with explicit operator attribution.

**Failure / Exception Flows:**
- Duplicate or ambiguous posting is held for reconciliation review.
- Invalid tenant or lease linkage blocks ledger mutation.

**Data Captured / Affected:** Amount, source, payment method, tenant, lease, unit/property, before/after balance, origin reference, manual adjustment reason.  
**Notifications:** Payment receipt or posting confirmation when configured; operator alert for reconciliation exception.  
**Permissions / Approval Gates:** Manual adjustments require authorized operator permissions.  
**Audit Log Requirements:** Every ledger mutation records actor/system source, timestamp, amount, method, before/after balance, linked records, and reconciliation exception if applicable.  
**State Transitions:** Payment lifecycle `Due -> Partially Paid -> Paid` as applicable; downstream handoff to reminders, late fees, reporting, and accounting sync.  
**Dependencies:** Payment integrations, ledger service, reconciliation workflow, reporting pipeline, accounting sync.

**Acceptance Criteria:**
- Stripe, Plaid, cash, money order, and manual adjustments are supported.
- Partial payments are reflected in outstanding balance.
- Every ledger mutation is auditable.
- Each entry is linked to tenant and unit/property context.
- Ledger updates have downstream handoffs into reporting and delinquency workflows.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Refund/reversal workflow is not defined.
- `MISSING_EXCEPTION_PATH`: Duplicate payment reconciliation policy is not defined.

---

## Story ID: PAY-001
**Title:** Tenant receives rent reminders via email, SMS, and in-app messaging  
**Primary Actor:** Tenant  
**Business Goal:** Reduce missed payments by issuing reminders before due date.

**Trigger:** Lease payment reaches configured pre-due reminder threshold.  
**Preconditions:** Active lease, due schedule, and available contact channels.  
**Main Flow:**
1. System identifies upcoming due payments.
2. System schedules reminder deliveries by configured channels.
3. System sends reminders and records outcomes.
4. Reminder state remains linked to the current charge period.

**Alternate Flows:**
- Contact preferences alter channel selection where preferences are allowed.

**Failure / Exception Flows:**
- Channel failure is logged and surfaced; failed delivery does not mark the reminder complete.
- Missing due-date data blocks reminder generation and surfaces data-quality issue.

**Data Captured / Affected:** Due date, reminder cadence, channel selection, delivery outcomes, linked ledger period.  
**Notifications:** Reminder notifications by email, SMS, and in-app messaging.  
**Permissions / Approval Gates:** Automated by policy; operator can manually resend when authorized.  
**Audit Log Requirements:** Reminder trigger, channels attempted, timestamps, send/fail outcomes, linked tenant and charge period.  
**State Transitions:** Payment lifecycle `Upcoming -> Due`; downstream handoff to missed-payment and delinquency logic if unpaid.  
**Dependencies:** Notification service, payment schedule service, preference service, audit logging.

**Acceptance Criteria:**
- Reminders can be scheduled before due date.
- Email, SMS, and in-app channels are supported.
- Reminder events are auditable.
- Preferences/rules can be applied when allowed.

**Open Gaps / Unresolved Decisions:**
- `MISSING_NOTIFICATION_RULE`: Reminder cadence is not fully specified.

---

## Story ID: PAY-002
**Title:** Missed payments notify operator side after threshold  
**Primary Actor:** Property manager or owner  
**Business Goal:** Surface delinquency quickly when rent remains unpaid.

**Trigger:** Payment remains unpaid after configured missed-payment threshold.  
**Preconditions:** Ledger status is current and due date has passed.  
**Main Flow:**
1. System evaluates whether due payment is unpaid or partially paid after the threshold.
2. System computes current status accurately.
3. System notifies manager/owner through operator channels.
4. Workflow hands off into late-fee and notice eligibility logic when still unresolved.

**Alternate Flows:**
- Partial payment produces `Partially Paid` rather than `Paid`.

**Failure / Exception Flows:**
- Data inconsistency blocks status calculation and surfaces operational exception instead of sending wrong notices.

**Data Captured / Affected:** Due amount, paid amount, threshold date, current payment state, notification result.  
**Notifications:** Operator-side missed-payment notifications by email and app.  
**Permissions / Approval Gates:** Automated by policy; role-specific visibility applies to owners/managers.  
**Audit Log Requirements:** Status calculation run, threshold used, resulting state, notification delivery result.  
**State Transitions:** Payment lifecycle `Due -> Late` or `Due -> Partially Paid`; downstream handoff to late fee, payment plan, and notices.  
**Dependencies:** Ledger service, delinquency rules, notification service, role visibility.

**Acceptance Criteria:**
- Notification can trigger two days after a missed due date.
- Email and app notifications are supported.
- Full and partial payment states are computed correctly.
- Event is logged and traceable.

**Open Gaps / Unresolved Decisions:**
- `MISSING_ROLE_PERMISSION_RULE`: Owner notification rules by property/role are not fully defined.

---

## Story ID: PAY-004
**Title:** Late fees are applied automatically after grace period  
**Primary Actor:** Property manager  
**Business Goal:** Apply delinquency policy consistently and traceably.

**Trigger:** Account remains unpaid or underpaid past configured grace period.  
**Preconditions:** Late-fee policy exists; grace period has ended.  
**Main Flow:**
1. System evaluates grace-period expiration.
2. System calculates late fee based on policy.
3. System posts fee to ledger.
4. Operator can review/override only if policy explicitly permits.

**Alternate Flows:**
- Manual override occurs with documented justification when allowed.

**Failure / Exception Flows:**
- Invalid fee configuration blocks automatic posting and surfaces policy error.
- Jurisdiction uncertainty prevents safe automatic enforcement if local rule is unknown.

**Data Captured / Affected:** Fee policy reference, grace period, fee amount, ledger entry, override reason and actor if used.  
**Notifications:** Optional tenant notice of late fee; operator alert for configuration error or manual review.  
**Permissions / Approval Gates:** Policy-driven automation; manual override requires authorized operator.  
**Audit Log Requirements:** Fee calculation, policy used, post event, override actor/reason, linked lease and ledger period.  
**State Transitions:** Payment lifecycle `Late -> Late Fee Applied`; downstream handoff to payment plan or notice eligibility if unresolved.  
**Dependencies:** Policy engine, ledger service, communications service, compliance guidance.

**Acceptance Criteria:**
- Grace period is configurable.
- Fee application is policy-driven.
- Fee appears on ledger.
- Manager review/override path exists when allowed.

**Open Gaps / Unresolved Decisions:**
- `MISSING_LEGAL_RULE`: Jurisdiction-specific fee constraints are not defined.

---

## Story ID: PAY-005
**Title:** System proposes payment plans before legal escalation  
**Primary Actor:** Property manager or owner  
**Business Goal:** Offer a structured cure path before legal escalation.

**Trigger:** Delinquency reaches payment-plan threshold before notice/legal progression.  
**Preconditions:** Tenant is delinquent; legal escalation has not passed the point where a plan can no longer be offered.  
**Main Flow:**
1. System generates a recommended installment structure.
2. Manager reviews and approves the proposal.
3. Tenant accepts or rejects the plan.
4. Accepted plans are tracked through completion or default.
5. Plan outcome feeds reporting and future delinquency logic.

**Alternate Flows:**
- Manager declines to send the plan and delinquency proceeds through standard path.
- Tenant rejects the plan and account remains in delinquency path.

**Failure / Exception Flows:**
- Accepted plan later defaults and the account returns to delinquency progression with preserved history.
- Missing operator approval blocks plan issuance.

**Data Captured / Affected:** Proposal terms, approval metadata, acceptance status, installment schedule, completion/default outcomes.  
**Notifications:** Plan offer, acceptance confirmation, installment reminders, missed-installment notices.  
**Permissions / Approval Gates:** Manager approval required before offer issuance.  
**Audit Log Requirements:** Proposal generation, approval, tenant decision, installment events, completion/default outcomes.  
**State Transitions:** Payment lifecycle `Late Fee Applied -> Payment Plan Proposed -> Payment Plan Active`; downstream handoff to resolved or notice eligibility depending on outcome.  
**Dependencies:** Payment plan engine, ledger service, notifications, reporting pipeline, delinquency workflow.

**Acceptance Criteria:**
- System can recommend installment structure.
- Manager approval is required before offer is issued.
- Plan acceptance and completion/default are tracked.
- Proposed plan logic and outcome trail are auditable.
- Payment plan outcomes feed reporting/analytics.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Plan generation criteria are not defined.
- `MISSING_EXCEPTION_PATH`: Modification/default policy is not fully defined.
- `ABSENT_REPORTING_REQUIREMENT`: Reporting format for payment-plan outcomes is not specified, though tracking is required.

---

## Story ID: PAY-006
**Title:** Delinquency analytics track repeat lateness and partial-payment patterns  
**Primary Actor:** Property manager or owner  
**Business Goal:** Make delinquency trends measurable for reporting, intervention, and predictive models.

**Trigger:** Payment-history analytics refresh runs or an authorized operator requests delinquency analytics.  
**Preconditions:** Sufficient payment history exists across the relevant lease, tenant, property, or portfolio scope.  
**Main Flow:**
1. System aggregates historical payment events, partial-payment behavior, and delinquency frequency.
2. System computes repeat-lateness and partial-payment metrics.
3. Metrics become available to reporting and predictive workflows.
4. Analytics remain linked back to the source ledger history.

**Alternate Flows:**
- Metrics can be generated at tenant, unit, property, or portfolio level where the source data supports it.

**Failure / Exception Flows:**
- Missing or inconsistent ledger history blocks complete metric generation and surfaces a data-quality warning instead of silently omitting records.

**Data Captured / Affected:** Ledger history, delinquency metrics, partial-payment metrics, rollup scope, analytics refresh timestamp.  
**Notifications:** Internal analytics/report refresh notice only when configured.  
**Permissions / Approval Gates:** Authorized manager/owner access required to view generated analytics.  
**Audit Log Requirements:** Analytics refresh run, source period, scope evaluated, metric generation timestamp, data-quality exception events.  
**State Transitions:** No direct lifecycle state change; downstream handoff to reporting, dashboard, and predictive-model consumers.  
**Dependencies:** Ledger history, analytics layer, reporting pipeline, dashboard consumers.

**Acceptance Criteria:**
- Repeat lateness can be measured.
- Partial-payment patterns can be measured.
- Metrics can roll up by tenant, unit, property, or portfolio where relevant.
- Analytics remain linked to source ledger history.

**Open Gaps / Unresolved Decisions:**
- `ABSENT_ANALYTICS_REQUIREMENT`: Final thresholding and intervention logic for delinquency analytics are not defined.
- `MISSING_DATA_MAPPING`: Exact metric definitions and rollup formulas are not fully specified.

---

## Story ID: LEG-001
**Title:** Manager can generate three-day notice from delinquency state  
**Primary Actor:** Property manager  
**Business Goal:** Progress unresolved delinquency into formal notice using current lease and ledger context.

**Trigger:** Account reaches `Notice Eligible`.  
**Preconditions:** Lease and balance context are current; manager review is available.  
**Main Flow:**
1. System generates notice draft from lease and ledger context.
2. Manager reviews and approves issuance.
3. System records issuance and preserves the contextual snapshot used.
4. Delinquency workflow advances into formal notice stage.

**Alternate Flows:**
- Notice remains in draft until manager approval.

**Failure / Exception Flows:**
- Missing lease/balance context blocks notice generation.
- Delivery failure leaves notice generated but not completed, requiring follow-up.

**Data Captured / Affected:** Notice template/version, lease snapshot, balance snapshot, issuance timestamp, delivery metadata.  
**Notifications:** Formal notice to tenant; operator confirmation of issuance or delivery failure.  
**Permissions / Approval Gates:** Manager approval required before issuance.  
**Audit Log Requirements:** Draft generation, approval actor, issuance time, delivery result, preserved lease and balance context.  
**State Transitions:** Payment lifecycle `Notice Eligible -> Notice Issued`; downstream handoff to legal review if unresolved.  
**Dependencies:** Ledger, lease data, communications service, notice templates.

**Acceptance Criteria:**
- Notice is generated from current ledger and lease context.
- Notice requires manager approval.
- Issuance is logged with timestamp and actor.
- Source lease and balance context are preserved.

**Open Gaps / Unresolved Decisions:**
- `MISSING_LEGAL_RULE`: Jurisdiction-specific notice template logic is not defined.
- `MISSING_AUDIT_REQUIREMENT`: Service/delivery proof workflow is not defined.

---

## Story ID: LEG-002
**Title:** Manager can initiate attorney referral after notice failure  
**Primary Actor:** Property manager  
**Business Goal:** Hand off unresolved delinquency into legal review with the correct packet.

**Trigger:** Post-notice nonpayment persists beyond cure threshold.  
**Preconditions:** Notice has been issued; cure window has expired or otherwise failed.  
**Main Flow:**
1. System assembles referral packet from lease, notice, and account context.
2. Manager reviews and approves referral.
3. System records referral and links it to court-tracking workflow.

**Alternate Flows:**
- Referral remains pending until packet is complete.

**Failure / Exception Flows:**
- Missing packet components block referral.
- Attorney delivery failure preserves legal-review-pending state.

**Data Captured / Affected:** Referral packet contents, approval metadata, linked legal matter, communication status.  
**Notifications:** Attorney referral communication; operator confirmation/failure notice.  
**Permissions / Approval Gates:** Manager approval required before referral.  
**Audit Log Requirements:** Packet generation, approval, referral event, linked legal matter creation.  
**State Transitions:** Payment lifecycle `Notice Issued -> Legal Review Pending -> Attorney Referred`; downstream handoff to court tracking.  
**Dependencies:** Notice workflow, document packet generation, legal case tracking, communications.

**Acceptance Criteria:**
- Referral packages lease, notice, and account context.
- Manager approval is required.
- Referral event is audit logged.
- Referred matter links to court-tracking workflow.

**Open Gaps / Unresolved Decisions:**
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: Attorney communication mechanism is only loosely defined.
- `MISSING_BUSINESS_RULE`: Packet completeness checklist is not formalized.

---

## Story ID: LEG-003
**Title:** Accepted payment can terminate legal progression with sign-off  
**Primary Actor:** Property manager  
**Business Goal:** Stop unnecessary legal escalation when delinquency is cured.

**Trigger:** Payment or cure event resolves delinquency before court progression becomes irreversible.  
**Preconditions:** Legal progression is active and cancellation is still allowed.  
**Main Flow:**
1. System detects cure or accepted payment.
2. Authorized operator signs off on halting legal progression.
3. System updates legal status, tenant status, and ledger context.
4. Workflow transitions to resolved state.

**Alternate Flows:**
- Partial cure does not stop legal progression and remains in active path.

**Failure / Exception Flows:**
- Missing required sign-off blocks cancellation even if payment is present.
- Ledger or legal-state mismatch blocks resolution.

**Data Captured / Affected:** Resolution amount/context, sign-off actor, reason, updated legal and payment status.  
**Notifications:** Internal legal cancellation notice; tenant communication if policy requires.  
**Permissions / Approval Gates:** Sign-off required by authorized role.  
**Audit Log Requirements:** Resolution trigger, sign-off, reason, resulting state change across legal and ledger records.  
**State Transitions:** Payment lifecycle `Legal Review Pending` or `Attorney Referred -> Resolved`; downstream handoff out of legal progression.  
**Dependencies:** Ledger resolution logic, legal workflow, approval roles, communications.

**Acceptance Criteria:**
- Legal progression can be cancelled prior to court where allowed.
- Cancellation requires sign-off.
- Resolution reason is logged.
- Tenant/legal/ledger states update consistently.

**Open Gaps / Unresolved Decisions:**
- `MISSING_ROLE_PERMISSION_RULE`: Exact sign-off actor set is not fully locked.

---

## Story ID: LEG-004
**Title:** Court dates are tracked and surfaced operationally  
**Primary Actor:** Property manager or owner  
**Business Goal:** Keep legal milestones visible so teams can prepare for court obligations.

**Trigger:** Court date is received or updated for an active legal matter.  
**Preconditions:** Legal matter exists and has already reached court-tracking stage.  
**Main Flow:**
1. System records the court date and linked case context.
2. Court event is surfaced to operational calendar/dashboard views.
3. Relevant parties are notified when configured.
4. Updated court information remains linked to the underlying legal matter.

**Alternate Flows:**
- Existing court event is updated when schedule changes.

**Failure / Exception Flows:**
- Missing case linkage blocks court-event creation.
- Invalid or incomplete court details prevent the event from being marked operationally ready.

**Data Captured / Affected:** Court event, legal case reference, scheduled date/time, operational calendar linkage, update history.  
**Notifications:** Calendar/event notices to relevant internal parties when configured.  
**Permissions / Approval Gates:** Authorized operator entry/update required; external attorney-originated data does not bypass local validation.  
**Audit Log Requirements:** Court event creation, update history, actor/source, linked case, notification send events.  
**State Transitions:** Payment/legal lifecycle `Attorney Referred -> Court Scheduled`; downstream handoff to operational dashboard/calendar and later legal resolution.  
**Dependencies:** Legal workflow state model, calendar/dashboard system, notification service.

**Acceptance Criteria:**
- Court dates can be recorded against legal matters.
- Court events surface operationally on calendar/dashboard views.
- Updates are auditable.
- Court tracking has a downstream handoff into operational preparation and legal resolution workflows.

**Open Gaps / Unresolved Decisions:**
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: Attorney-to-system data handoff contract is not defined.
- `MISSING_ROLE_PERMISSION_RULE`: Exact data-entry ownership between attorney, manager, and internal staff is not fully defined.

---

## Story ID: ACC-001
**Title:** System exports or syncs financial data to accounting tools  
**Primary Actor:** Property manager or owner  
**Business Goal:** Keep operational financial events aligned with accounting systems.

**Trigger:** Accounting export/sync runs on schedule or in response to ledger events.  
**Preconditions:** Accounting connection and record mappings exist.  
**Main Flow:**
1. System gathers rent, charges, repairs, taxes, mortgage-related items, and other mapped events.
2. System exports or syncs them to the accounting tool.
3. System records success/failure and preserves origin references.
4. Failed syncs remain visible for operator review.

**Alternate Flows:**
- Batch export is used instead of real-time sync when configured.

**Failure / Exception Flows:**
- Sync failure results in visible failed state instead of silent drop.
- Statistical anomaly triggers review hold before posting to external accounting system.

**Data Captured / Affected:** Sync batch metadata, origin references, mapped accounting payloads, failure state, anomaly flags.  
**Notifications:** Optional operator alerts for failure or anomaly hold.  
**Permissions / Approval Gates:** Automated sync may run by policy; anomaly release requires authorized accountant/operator review.  
**Audit Log Requirements:** Sync start/end, actor or scheduler, records included, failure reason, anomaly hold/release event.  
**State Transitions:** No direct tenant lifecycle transition; downstream handoff to monthly financial reporting and accounting reconciliation.  
**Dependencies:** Accounting integration, mapping store, anomaly detection, reporting services.

**Acceptance Criteria:**
- Rent, charges, repairs, taxes, and mortgage-related items can be exported/synced.
- Sync/export events are auditable.
- Failed sync states are visible.
- Origin references are preserved.
- Anomalous sync payloads can be held for review before posting.

**Open Gaps / Unresolved Decisions:**
- `MISSING_DATA_MAPPING`: QuickBooks/chart-of-accounts mapping schema is not defined.
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: Real-time sync vs batch export is not decided.

---

## Story ID: RPT-001
**Title:** Monthly financial summaries aggregate property economics  
**Primary Actor:** Property manager or owner  
**Business Goal:** Evaluate property performance using monthly operational finance data.

**Trigger:** Monthly reporting cycle runs or authorized operator requests report generation.  
**Preconditions:** Ledger, expense, tax, mortgage, and repair data are available.  
**Main Flow:**
1. System aggregates rent, repairs, taxes, mortgage, and other expenses.
2. Report rolls up by property and unit where relevant.
3. Source ledger provenance is preserved.
4. Report output is made available for review/export.

**Alternate Flows:**
- On-demand report generation reuses the same monthly aggregation logic.

**Failure / Exception Flows:**
- Missing source data produces completeness warning rather than silent omission.

**Data Captured / Affected:** Reporting period, property/unit rollups, revenue/expense totals, provenance references.  
**Notifications:** Optional report-ready notification.  
**Permissions / Approval Gates:** Authorized manager/owner access required.  
**Audit Log Requirements:** Report generation event, actor or scheduler, period, data-source references.  
**State Transitions:** No domain lifecycle change; downstream handoff into owner review and accounting reconciliation.  
**Dependencies:** Ledger reporting pipeline, expense categorization, accounting sync/export, dashboard/reporting UI.

**Acceptance Criteria:**
- Reports include rent, repairs, taxes, mortgage, and other expenses.
- Rollups are available by property and unit where relevant.
- Source provenance is preserved.
- Missing data is surfaced instead of hidden.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Final report output format is not selected.
- `MISSING_BUSINESS_RULE`: Accounting close rules are not defined.

---

## Story ID: MOV-003
**Title:** Final charges and closeout are posted and communicated to the former tenant  
**Primary Actor:** Property manager  
**Business Goal:** Turn approved closeout charges into an auditable statement and collection/closure path.

**Trigger:** Turn, damage, deposit-offset, or closeout charges are finalized for a former tenant.  
**Preconditions:** Former-tenant closeout context exists; charge amounts and offsets have been reviewed/finalized by an authorized operator.  
**Main Flow:**
1. System posts final charges and offsets to the ledger.
2. System creates a closeout statement showing charges, credits, and deposit treatment.
3. System communicates the statement to the former tenant.
4. Resulting balance is handed off into collection or account closure workflow.

**Alternate Flows:**
- Zero-balance closeout still generates an archival statement when required.
- Deposit offsets appear as credits against posted charges when deposit workflow supports them.

**Failure / Exception Flows:**
- Missing charge finalization or incomplete offset data blocks statement generation.
- Delivery failure does not roll back the ledger posting and must remain visible for follow-up.

**Data Captured / Affected:** Final ledger charges, offsets/credits, former-tenant statement, delivery outcome, closeout balance state.  
**Notifications:** Email/app closeout statement to former tenant; optional internal alert on failed delivery.  
**Permissions / Approval Gates:** Manager finalization required before posting or sending the final statement.  
**Audit Log Requirements:** Charge posting, offset application, statement generation, send result, finalization actor, resulting balance state.  
**State Transitions:** Applicant-to-Tenant `Move-Out Pending -> Former Tenant`; downstream handoff to collection workflow or account closure.  
**Dependencies:** Ledger, messaging, deposit-offset handling, closeout workflow.

**Acceptance Criteria:**
- Final charges can be posted to the ledger.
- Offset/credit handling can be reflected in the statement.
- Former tenant receives a detailed statement through supported channels.
- Finalized closeout has a downstream handoff into collection or closure.

**Open Gaps / Unresolved Decisions:**
- `MISSING_LEGAL_RULE`: Statement-format and required closeout disclosures may vary by jurisdiction.
- `MISSING_AUDIT_REQUIREMENT`: Proof-of-delivery requirements for final charge statements are not fully defined.

---

## Story ID: COM-002
**Title:** Communication and critical-action records remain reconstructable through central audit logging  
**Primary Actor:** System  
**Business Goal:** Make communications and critical operational actions searchable for reporting, legal defense, and dispute reconstruction.

**Trigger:** A tracked communication or critical workflow action occurs.  
**Preconditions:** Source event exists and is emitted by a tracked workflow.  
**Main Flow:**
1. System captures communication and critical-action metadata in the central audit store.
2. Audit records remain linked to the source tenant, unit, property, lease, payment, or work-order context where available.
3. Authorized operators can query records for reporting, legal defense, or dispute review.

**Alternate Flows:**
- Manual communications are recorded with human actor attribution.
- System-generated communications/actions are marked distinctly from human-originated ones.

**Failure / Exception Flows:**
- Partial metadata does not prevent base event capture.
- Audit-store failure surfaces an operational alert instead of silently dropping the event when avoidable.

**Data Captured / Affected:** Audit entry, source object references, message metadata, human/system actor, timestamps, related workflow context.  
**Notifications:** Not directly user-facing; optional operator alert on audit-ingestion failure.  
**Permissions / Approval Gates:** No separate approval gate for event capture; read access is role-controlled.  
**Audit Log Requirements:** Communication send/fail/delivery states, manual communication records, critical workflow transitions, before/after context where applicable.  
**State Transitions:** Cross-cutting audit layer; downstream handoff to reporting, legal defense, analytics, and dispute review.  
**Dependencies:** Central audit subsystem, event propagation, reporting/search surfaces, role-based access controls.

**Acceptance Criteria:**
- Communication records are centrally captured and queryable.
- Human and system actions are distinguishable.
- Related workflow/entity context is preserved when available.
- Audit capture failures are surfaced rather than silently ignored.

**Open Gaps / Unresolved Decisions:**
- `MISSING_AUDIT_REQUIREMENT`: Immutable-vs-editable audit policy is not fully defined.
- `MISSING_AUDIT_REQUIREMENT`: Communication-record retention period is not fully defined.

---

## Story ID: SYS-001
**Title:** System preserves end-to-end auditability  
**Primary Actor:** Operator, owner, or reviewer  
**Business Goal:** Ensure disputes, compliance, and analytics are supportable across backend workflows.

**Trigger:** Any critical action, communication, financial mutation, or legal/payment state transition occurs.  
**Preconditions:** Domain object and event context exist.  
**Main Flow:**
1. System records critical action with actor/system source, timestamp, object, and action.
2. Where appropriate, before/after values are captured.
3. Audit records remain queryable across tenant, property, unit, lease, payment, notice, and work-order contexts.

**Alternate Flows:**
- System-generated events are marked differently from human-generated events.

**Failure / Exception Flows:**
- Audit persistence failure surfaces as an operational defect and must not silently pass where avoidable.

**Data Captured / Affected:** Actor, object, action, timestamp, before/after state, workflow correlation ID.  
**Notifications:** Optional operator alert on audit-persistence failure.  
**Permissions / Approval Gates:** Read access to audit data is role-controlled.  
**Audit Log Requirements:** This story defines the minimum audit envelope for all critical backend mutations.  
**State Transitions:** Cross-cutting requirement across all backend workflows.  
**Dependencies:** Central audit service, event propagation, query surfaces, role access controls.

**Acceptance Criteria:**
- All critical workflow transitions are logged.
- Logs include actor, timestamp, object, action, and before/after where appropriate.
- Human and system actions are distinguishable.
- Audit data is queryable across core operating objects.

**Open Gaps / Unresolved Decisions:**
- `MISSING_AUDIT_REQUIREMENT`: Retention/archival policy is not defined.
- `MISSING_AUDIT_REQUIREMENT`: Tamper-resistance requirements are not defined.

---

## Story ID: INF-001
**Title:** Platform services apply resilience controls without obscuring business workflow outcomes  
**Primary Actor:** DevOps / systems engineer  
**Business Goal:** Protect core API workflows from abuse and third-party outages.

**Trigger:** Traffic spikes, rate-limit thresholds, or third-party instability affect backend service health.  
**Preconditions:** Rate limiting, circuit breaker, and telemetry infrastructure are configured.  
**Main Flow:**
1. System applies rate limiting to high-volume endpoints.
2. Circuit breakers fail fast on unstable external dependencies.
3. Telemetry captures degraded behavior for operator review.
4. Business workflows surface degraded-state outcomes instead of silently succeeding.

**Alternate Flows:**
- Cached or fallback behavior is used when external systems are unavailable.

**Failure / Exception Flows:**
- Excess load returns explicit error state such as `429`.
- Third-party dependency failure downgrades the workflow and records fallback mode.

**Data Captured / Affected:** Traffic-state metrics, rate-limit decisions, fallback mode, circuit breaker state.  
**Notifications:** Operational alerts to monitoring tools.  
**Permissions / Approval Gates:** Operational controls owned by platform/admin roles.  
**Audit Log Requirements:** Degraded-mode entry/exit, fallback decisions, rate-limit events where materially relevant.  
**State Transitions:** Infrastructure `Normal -> RateLimited/Degraded`; downstream handoff back into affected business workflows for retry or manual intervention.  
**Dependencies:** Rate limiter, telemetry, circuit breaker, caching/fallback mechanisms.

**Acceptance Criteria:**
- Rate limiting exists for high-volume endpoints.
- Third-party failures can fail fast with fallback behavior.
- Real-time tracing/telemetry is emitted.
- Degraded states are explicit and do not hide business workflow failure.

**Open Gaps / Unresolved Decisions:**
- `ABSENT_DOWNSTREAM_HANDOFF`: Some workflow-specific fallback behaviors are not modeled in the source stories.
