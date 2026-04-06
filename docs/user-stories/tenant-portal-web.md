# User Stories: Web Portal (Tenant & Management)

**Module:** `tenant_portal_app`  
**Normalized Scope:** tenant-facing and manager-facing web workflows for onboarding, inspections, maintenance intake, communications, dashboard visibility, and owner reporting.  
**Canonical Lifecycle Domains:** onboarding, move-in, inspections, maintenance, communications, dashboard/calendar, analytics.

## File-Level Notes
- This file was normalized to match the Keyring OS lifecycle model.
- Where the original story described aspirational UX or AI behavior without an operational workflow, the workflow has been preserved but marked with explicit unresolved gaps.
- This file intentionally does not define legal or accounting policy beyond what is required for portal-facing workflows.

---

## Story ID: ONB-004
**Title:** Move-in date is scheduled and visible on shared calendar  
**Primary Actor:** Property manager or owner  
**Business Goal:** Make move-in operationally visible so staff can prepare the unit and handoff.

**Trigger:** Lease becomes fully signed and a move-in date is ready to schedule.  
**Preconditions:** Lease is executed; applicant has reached `Lease Signed`; unit assignment is valid.  
**Main Flow:**
1. Manager schedules a move-in date from the portal.
2. System creates a move-in calendar event linked to tenant, unit, property, and lease.
3. Relevant roles can view the event on the dashboard and calendar.
4. System keeps the event visible until move-in is completed or rescheduled.

**Alternate Flows:**
- Manager reschedules the move-in date and the system versions the change.
- Owner has read-only visibility when the role model permits.

**Failure / Exception Flows:**
- Invalid or conflicting date blocks save and surfaces the exception to the manager.
- Missing executed lease or invalid unit linkage blocks scheduling.

**Data Captured / Affected:** Move-in date, lease ID, tenant ID, unit ID, property ID, event visibility metadata, prior and new scheduled dates.  
**Notifications:** Calendar event notification to relevant roles; optional tenant move-in confirmation when enabled.  
**Permissions / Approval Gates:** Scheduling requires authorized manager or owner access; no tenant self-scheduling is assumed.  
**Audit Log Requirements:** Event creation, reschedule action, actor, timestamp, old/new date, linked lease and unit context.  
**State Transitions:** `Lease Signed -> Move-In Scheduled` within Applicant-to-Tenant lifecycle.  
**Dependencies:** Lease execution workflow, calendar service, dashboard event rendering, role visibility rules.

**Acceptance Criteria:**
- Move-in event appears on dashboard/calendar.
- Event links to tenant, unit, property, and lease.
- Visibility follows role-appropriate access.
- Date changes are auditable and versioned.
- Move-in scheduling has a downstream handoff into onboarding communication and move-in inspection workflows.

**Open Gaps / Unresolved Decisions:**
- `MISSING_ROLE_PERMISSION_RULE`: Calendar permission model is not fully defined.
- `MISSING_BUSINESS_RULE`: Conflict-detection policy for overlapping move-ins is not defined.

---

## Story ID: ONB-005
**Title:** Welcome package is sent after move-in is scheduled  
**Primary Actor:** Newly approved tenant  
**Business Goal:** Provide onboarding instructions and next steps before occupancy.

**Trigger:** Move-in reaches `Move-In Scheduled` and required onboarding prerequisites are satisfied.  
**Preconditions:** Lease is signed; move-in date exists; prerequisite onboarding steps are complete.  
**Main Flow:**
1. System composes a welcome package from configured content.
2. System sends the package through approved channels.
3. System records delivery attempts and results.
4. Tenant can access the package before move-in.

**Alternate Flows:**
- Delivery occurs by email, in-app, or both when configured.
- Manager may manually resend the package.

**Failure / Exception Flows:**
- Delivery failure leaves the onboarding state intact and surfaces a retry path.
- Missing required onboarding prerequisites blocks automatic send.

**Data Captured / Affected:** Package template/version, recipient, send timestamp, delivery channel, delivery outcome, linked tenant/lease/unit context.  
**Notifications:** Welcome package to tenant; optional manager notice if send fails.  
**Permissions / Approval Gates:** Automated send allowed only after prerequisite checks; manual resend requires authorized manager access.  
**Audit Log Requirements:** Trigger condition satisfied, send attempt, channel, delivery result, manual resend actor if applicable.  
**State Transitions:** No new lifecycle state; downstream handoff from `Move-In Scheduled` into move-in preparation.  
**Dependencies:** Notification service, content template configuration, onboarding prerequisite checks.

**Acceptance Criteria:**
- Welcome package can be delivered by email or in-app.
- Send event and delivery outcome are logged.
- Content is configurable.
- Welcome package is only triggered after required prerequisites are met.
- Failed delivery is visible and retriable.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Package contents are not specified.
- `MISSING_NOTIFICATION_RULE`: SMS inclusion is not decided.

---

## Story ID: MIN-001
**Title:** Tenant completes move-in inspection in app or web  
**Primary Actor:** Tenant  
**Business Goal:** Record unit condition at move-in so pre-existing issues are documented.

**Trigger:** Move-in inspection is made available after move-in scheduling.  
**Preconditions:** Tenant has portal access; inspection record exists in `Scheduled`; tenant is linked to the unit and lease.  
**Main Flow:**
1. Tenant opens the move-in inspection.
2. Tenant completes checklist items, adds notes, and uploads photos.
3. Tenant submits the inspection.
4. System locks the submitted inspection as a time-stamped record.
5. Inspection enters manager review.

**Alternate Flows:**
- Draft save is supported if enabled and inspection remains `In Progress`.
- Tenant returns later to finish a draft before submission deadline.

**Failure / Exception Flows:**
- Required fields or required photo evidence missing prevents submission.
- Attachment upload failure preserves draft state and surfaces retry options.

**Data Captured / Affected:** Checklist responses, notes, media attachments, draft timestamps, submit timestamp, tenant/unit/lease linkage.  
**Notifications:** Submission confirmation to tenant; manager review notification.  
**Permissions / Approval Gates:** Tenant can submit only their linked move-in inspection; manager approval occurs downstream.  
**Audit Log Requirements:** Draft save events, final submit event, actor, timestamps, lock event, linked tenancy/unit context.  
**State Transitions:** Inspection `Scheduled -> In Progress -> Submitted`; Applicant-to-Tenant lifecycle remains at `Move-In Scheduled` until occupancy activation.  
**Dependencies:** Inspection UI, media handling, tenancy linkage, manager review workflow.

**Acceptance Criteria:**
- Tenant can submit notes and photos.
- Inspection is linked to unit and tenancy.
- Submitted inspection becomes a locked time-stamped record.
- Draft mode is supported when enabled.
- Submission hands off into manager review with no dead-end state.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Deadline after move-in is not defined.
- `MISSING_DATA_MAPPING`: Required checklist structure is not defined.

---

## Story ID: MIN-002
**Title:** Manager reviews and approves move-in inspection  
**Primary Actor:** Property manager  
**Business Goal:** Validate move-in findings and create repair actions when appropriate.

**Trigger:** Move-in inspection enters `Submitted`.  
**Preconditions:** Tenant-submitted inspection exists; manager has access to linked unit/property context.  
**Main Flow:**
1. Manager reviews tenant notes and media.
2. Manager approves, rejects, or requests follow-up.
3. Approved findings generate repair candidates.
4. Inspection either advances to `Approved` or returns to a follow-up/review path.

**Alternate Flows:**
- Manager requests follow-up information instead of approving or rejecting.
- Manager approves only a subset of findings for repair action.

**Failure / Exception Flows:**
- Rejection requires reason and preserves original submitted record.
- Missing review evidence or inaccessible attachments blocks review completion.

**Data Captured / Affected:** Review decision, manager notes, rejection or follow-up reason, approved findings, generated repair candidates.  
**Notifications:** Review outcome to tenant when configured; internal maintenance intake notice for approved issues.  
**Permissions / Approval Gates:** Manager review required; tenant cannot self-approve findings.  
**Audit Log Requirements:** Review action, actor, timestamp, rationale, approved findings, repair-candidate generation event.  
**State Transitions:** Inspection `Submitted -> Under Manager Review -> Approved` or review exception path; downstream handoff to estimate/timeline workflow.  
**Dependencies:** Inspection review UI, repair candidate generation, audit logging.

**Acceptance Criteria:**
- Manager can approve, reject, or request follow-up.
- Rejection requires a reason.
- Approval creates repair candidates where needed.
- Review and approval events are auditable.
- Approved findings hand off into estimate and schedule generation.

**Open Gaps / Unresolved Decisions:**
- `MISSING_EXCEPTION_PATH`: Formal tenant/manager dispute adjudication is not defined.

---

## Story ID: MIN-003
**Title:** Approved move-in issues generate repair estimates and timelines  
**Primary Actor:** Property manager  
**Business Goal:** Convert approved move-in findings into scoped repair work without leaving inspection findings orphaned.

**Trigger:** Move-in inspection findings are approved for action.  
**Preconditions:** Inspection is in `Approved`; actionable findings exist; linked unit and tenancy context remain available.  
**Main Flow:**
1. System converts approved findings into repair candidates.
2. System creates repair estimates or estimate placeholders for each approved issue set.
3. System creates an expected completion timeline and links it to the approved findings.
4. Actionable repair scope is handed off into maintenance planning.

**Alternate Flows:**
- Manager groups multiple approved findings into a single repair scope when the same trade or visit can address them.
- Timeline remains provisional until vendor or internal assignment occurs.

**Failure / Exception Flows:**
- Missing estimate inputs or inaccessible repair evidence prevents estimate generation and creates an operator-visible exception.
- Approved findings with no valid work type mapping remain approved but unplanned until manually categorized.

**Data Captured / Affected:** Approved inspection findings, repair estimate records, target completion timeline, linked work-scope metadata, unit and tenancy references.  
**Notifications:** Internal repair-planning notification; tenant progress notification only when the source workflow is configured to notify.  
**Permissions / Approval Gates:** Manager approval already occurred upstream; estimate/timeline generation may be system-driven after approval.  
**Audit Log Requirements:** Repair estimate generation, timeline creation, grouped-scope decisions, exception events, linked inspection approval reference.  
**State Transitions:** Inspection `Approved -> Repair Actions Generated`; downstream handoff to maintenance `Submitted/Under Review -> Estimate Generated -> Scheduled`.  
**Dependencies:** Inspection review workflow, estimation logic, work-order system, maintenance planning workflow.

**Acceptance Criteria:**
- Approved findings can generate repair estimate records or placeholders.
- A completion timeline is created or explicitly held for planning.
- Repair scope remains linked to the originating inspection.
- Approved issues have a downstream handoff into maintenance planning rather than ending at inspection approval.

**Open Gaps / Unresolved Decisions:**
- `MISSING_DATA_MAPPING`: Work-type mapping from inspection finding to maintenance category is not fully defined.
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: Vendor bidding/estimate enrichment contract is not defined.

---

## Story ID: MNT-001
**Title:** Tenant submits maintenance request with photo and description  
**Primary Actor:** Tenant  
**Business Goal:** Let tenants initiate maintenance from the portal without losing unit or tenancy context.

**Trigger:** Tenant reports a maintenance issue from web or mobile-supported portal flows.  
**Preconditions:** Tenant has access to a unit under an active or pending occupancy relationship; maintenance intake is enabled.  
**Main Flow:**
1. Tenant enters issue description.
2. Tenant uploads one or more photos.
3. Tenant optionally flags the request as emergency.
4. System creates a maintenance request linked to tenant, unit, and property.
5. System confirms submission and places the request into intake workflow.

**Alternate Flows:**
- Tenant submits a non-emergency request that proceeds to normal review.
- Tenant submits a draft if draft maintenance intake is later enabled.

**Failure / Exception Flows:**
- Attachment validation failure blocks submission.
- Missing unit or tenancy linkage blocks request creation.

**Data Captured / Affected:** Description, photos, emergency flag, category placeholder, tenant ID, unit ID, property ID, timestamps.  
**Notifications:** Submission confirmation to tenant; manager intake notice when configured.  
**Permissions / Approval Gates:** Tenant can create only requests tied to their linked unit; approval happens downstream in maintenance review.  
**Audit Log Requirements:** Submission actor, timestamp, emergency flag, attachments, tenant/unit/property linkage.  
**State Transitions:** Maintenance `Submitted`; downstream handoff to review or emergency escalation.  
**Dependencies:** Maintenance intake API, media storage, tenant/unit/property linkage, maintenance review workflow.

**Acceptance Criteria:**
- Request supports description and photos.
- Request is linked to tenant, unit, and property.
- Emergency flag can be set.
- Submission confirmation is shown and logged.
- Request has a downstream handoff into maintenance review or escalation.

**Open Gaps / Unresolved Decisions:**
- `MISSING_DATA_MAPPING`: Category taxonomy is not defined.
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: Video/audio support is not defined.

---

## Story ID: MNT-002
**Title:** Emergency maintenance auto-escalates  
**Primary Actor:** Property manager or owner  
**Business Goal:** Prevent urgent issues from staying in the normal queue.

**Trigger:** Maintenance request is flagged or classified as emergency.  
**Preconditions:** Request exists; emergency flag or policy threshold is present.  
**Main Flow:**
1. System elevates request priority immediately.
2. System routes the request into emergency handling.
3. System notifies manager/owner immediately.
4. SLA timer starts automatically when configured.

**Alternate Flows:**
- Manager downgrades a false emergency with documented justification.

**Failure / Exception Flows:**
- Notification failure does not clear the escalation and must remain visible.
- Missing emergency policy leaves the request escalated but with unresolved dispatch logic.

**Data Captured / Affected:** Priority, emergency reason, escalation timestamp, SLA start, dispatch metadata if present.  
**Notifications:** Immediate owner/manager notification; optional vendor dispatch notification if supported.  
**Permissions / Approval Gates:** Auto-escalation may be automatic; manual downgrade requires authorized operator with justification.  
**Audit Log Requirements:** Escalation trigger, system or human actor, timestamp, SLA start, downgrade event and reason if applicable.  
**State Transitions:** Maintenance `Submitted -> Escalated Emergency`; downstream handoff to dispatch/scheduling.  
**Dependencies:** Maintenance rules, notification service, SLA timer, dispatch workflow.

**Acceptance Criteria:**
- Emergency flag raises priority automatically.
- Manager/owner are notified immediately.
- Request enters escalated state.
- SLA timer can start automatically.
- Escalated request has a downstream handoff into scheduling or dispatch.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Emergency definition/policy is not fully defined.
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: After-hours vendor dispatch logic is not defined.

---

## Story ID: MNT-003
**Title:** Approved maintenance gets estimate, schedule, and assignment  
**Primary Actor:** Property manager  
**Business Goal:** Move approved maintenance from intake into executable work.

**Trigger:** Maintenance request or approved repair scope is marked ready for planning.  
**Preconditions:** Maintenance item has reached `Under Review` or `Approved`; issue category and location context are available.  
**Main Flow:**
1. Manager or system creates an estimate for the approved work.
2. Work is scheduled into an available service window.
3. Assignment is made to internal staff or an external vendor.
4. Work order transitions into active execution with visible status updates.

**Alternate Flows:**
- Manager assigns to internal staff when supported capacity exists.
- External vendor assignment is used when in-house assignment is unavailable.
- Work may remain waiting for parts or vendor confirmation after initial scheduling.

**Failure / Exception Flows:**
- Missing category, scope, or unit-access details blocks scheduling/assignment.
- Scheduling conflict or unavailable assignee keeps the work in planning state and surfaces the exception.

**Data Captured / Affected:** Work order, estimate, schedule window, assignee or vendor reference, unit access notes, status history.  
**Notifications:** Assignment notices, schedule confirmations, status-change notifications to affected parties when configured.  
**Permissions / Approval Gates:** Manager approval required to move from intake into planned work; assignment changes require authorized operator access.  
**Audit Log Requirements:** Work-order creation, estimate creation, assignment decision, schedule changes, reassignment, status transitions.  
**State Transitions:** Maintenance `Under Review -> Approved -> Estimate Generated -> Scheduled -> In Progress` or `Awaiting Parts/Vendor`.  
**Dependencies:** Maintenance intake, estimation logic, scheduling workflow, vendor/internal assignment model, notification service.

**Acceptance Criteria:**
- Approved work can generate an estimate.
- Approved work can be scheduled.
- Approved work can be assigned to internal staff or vendor.
- Planning and assignment actions are auditable.
- Planned work transitions into active execution or explicit waiting state.

**Open Gaps / Unresolved Decisions:**
- `MISSING_ROLE_PERMISSION_RULE`: Exact assignment authority across manager/staff/vendor roles is not fully defined.
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: Vendor dispatch/availability integration is not defined.

---

## Story ID: MNT-004
**Title:** Manager sign-off closes completed maintenance work  
**Primary Actor:** Property manager  
**Business Goal:** Prevent work from closing without final operator review and a frozen closure record.

**Trigger:** Work order is marked completed by staff or vendor.  
**Preconditions:** Work order exists in `Completed`; completion summary and actual completion date are available.  
**Main Flow:**
1. Completed work is presented for manager review.
2. Manager validates completion details.
3. Manager signs off and closes the work order.
4. Final work summary is frozen for reporting and future disputes.

**Alternate Flows:**
- Manager returns the work to active remediation if completion is insufficient.
- Tenant completion notice is sent when the workflow is configured to notify.

**Failure / Exception Flows:**
- Missing completion summary or completion date blocks sign-off.
- Disputed completion keeps work out of `Closed` and requires follow-up.

**Data Captured / Affected:** Completion summary, actual completion date, sign-off actor, closure state, follow-up reason if returned.  
**Notifications:** Optional tenant completion notice; internal closure confirmation.  
**Permissions / Approval Gates:** Manager sign-off required to transition from `Completed` to `Closed`.  
**Audit Log Requirements:** Completion submitted, sign-off decision, closure timestamp, returned-for-follow-up decision, frozen closure summary reference.  
**State Transitions:** Maintenance `Completed -> Manager Signed Off -> Closed` or back to `In Progress`/follow-up path when rejected.  
**Dependencies:** Work-order status system, completion summary capture, notification service, reporting/analytics consumers.

**Acceptance Criteria:**
- Only manager sign-off closes the job.
- Closure records actual completion date and final summary.
- Closed work becomes a stable record for analytics and disputes.
- Rejected closure returns the work to a non-closed state with an auditable reason.

**Open Gaps / Unresolved Decisions:**
- `MISSING_NOTIFICATION_RULE`: Tenant completion-notice policy is not fully defined.
- `MISSING_EXCEPTION_PATH`: Formal customer satisfaction or dispute flow after closure is not defined.

---

## Story ID: MOV-001
**Title:** Tenant performs move-out inspection before departure  
**Primary Actor:** Tenant  
**Business Goal:** Capture the tenant’s view of unit condition before final closeout.

**Trigger:** Move-out process is initiated and move-out inspection window opens.  
**Preconditions:** Lease is in move-out workflow; tenant has access to the linked unit and move-out inspection record.  
**Main Flow:**
1. Tenant opens the move-out inspection.
2. Tenant adds notes and photos documenting unit condition.
3. Tenant submits the inspection.
4. Submitted inspection enters manager/staff review queue.

**Alternate Flows:**
- Draft save is supported if enabled before final submission.

**Failure / Exception Flows:**
- Missing required evidence blocks submission when the checklist requires it.
- Attachment failure preserves draft state and surfaces retry.

**Data Captured / Affected:** Move-out inspection, notes, photos, submit timestamp, linked lease/unit/tenant references.  
**Notifications:** Submission confirmation to tenant; manager/staff review notice.  
**Permissions / Approval Gates:** Tenant can submit only for their linked move-out inspection; manager review occurs downstream.  
**Audit Log Requirements:** Draft/save events, submit event, attachments added, linked move-out workflow context.  
**State Transitions:** Applicant-to-Tenant `Move-Out Pending`; inspection `Scheduled -> In Progress -> Submitted`; downstream handoff to manager move-out inspection.  
**Dependencies:** Inspection UI, media upload, move-out workflow, manager/staff inspection review.

**Acceptance Criteria:**
- Tenant can submit notes and photos for move-out.
- Submission is time-stamped and linked to unit and lease context.
- Submitted inspection enters manager/staff review queue.
- Move-out inspection has a downstream handoff rather than ending at submission.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Deadline for tenant move-out inspection submission is not defined.
- `MISSING_EXCEPTION_PATH`: Formal dispute path between tenant submission and manager assessment is not defined.

---

## Story ID: MOV-002
**Title:** Manager or staff move-out inspection creates turn scope and timeline  
**Primary Actor:** Property manager or staff member  
**Business Goal:** Define post-occupancy cleaning, repair, and turn work needed to return the unit to service.

**Trigger:** Move-out inspection review begins after tenant submission or scheduled vacancy walkthrough.  
**Preconditions:** Unit is entering turn workflow; move-out inspection context exists; manager/staff has access to unit history.  
**Main Flow:**
1. Manager or staff completes the formal move-out inspection.
2. System identifies damage, cleaning, and turn items.
3. Turn scope and timeline are created from the inspection results.
4. Resulting turn work is handed off into maintenance planning and closeout charging.

**Alternate Flows:**
- Manager/staff inspection proceeds even if no tenant inspection was submitted.
- Heavy-cleaning and repair items are grouped into separate turn work scopes where needed.

**Failure / Exception Flows:**
- Missing inspection evidence or inaccessible prior records blocks final turn approval.
- Turn scope cannot be finalized if required damage/cleaning categorization is incomplete.

**Data Captured / Affected:** Move-out inspection findings, repair/cleaning estimates or placeholders, turn scope, target turn timeline, unit turn state.  
**Notifications:** Internal assignment or turn-preparation notices; optional owner visibility notices when configured.  
**Permissions / Approval Gates:** Manager/staff review required; final turn scope approval requires authorized operator action.  
**Audit Log Requirements:** Manager/staff inspection results, turn scope creation, timeline creation, unit turn state change, follow-up changes.  
**State Transitions:** Unit turn `Move-Out Scheduled -> Awaiting Move-Out Inspection -> Turn Scope Defined -> Turn Work Scheduled`; downstream handoff to work execution and final charges.  
**Dependencies:** Inspection workflow, estimation logic, unit turn workflow, maintenance planning, closeout charging workflow.

**Acceptance Criteria:**
- Manager/staff move-out inspection can be completed with linked unit/lease context.
- Turn scope and target timeline can be created from findings.
- Resulting turn work is handed off into execution and closeout workflows.
- Unit turn state changes are auditable.

**Open Gaps / Unresolved Decisions:**
- `MISSING_LEGAL_RULE`: Deposit-deduction policy for damage vs normal wear is not defined.
- `MISSING_DATA_MAPPING`: Damage/heavy-cleaning categorization rules are not fully defined.

---

## Story ID: PRP-001
**Title:** Property records can be created and edited in the operations portal  
**Primary Actor:** Property manager or owner  
**Business Goal:** Keep property-level operational, geographic, and financial metadata current for downstream workflows.

**Trigger:** Authorized operator creates or edits a property record.  
**Preconditions:** Operator has property-management permissions.  
**Main Flow:**
1. Operator creates or updates a property record.
2. System stores operational metadata, geographic coordinates, amenities, media references, and mortgage-related metadata where supported.
3. Updated property record becomes available to unit, listing, and reporting workflows.

**Alternate Flows:**
- Media and amenities are updated independently of financial metadata.

**Failure / Exception Flows:**
- Permission failure blocks create/edit.
- Invalid property data blocks persistence and returns validation errors.

**Data Captured / Affected:** Property record, address, latitude/longitude, amenities, media references, mortgage metadata, audit history.  
**Notifications:** Optional internal change notification when configured.  
**Permissions / Approval Gates:** Role-based create/edit permissions required.  
**Audit Log Requirements:** Property create/update, actor, changed fields, prior/new values where applicable.  
**State Transitions:** No lifecycle state machine; downstream handoff to unit management, listing, and reporting workflows.  
**Dependencies:** Property form, permission model, media management, reporting consumers.

**Acceptance Criteria:**
- Property records support address, latitude/longitude, amenities, media references, and mortgage-related metadata.
- Authorized operators can create and edit property records.
- Property changes are auditable.
- Property records are usable by unit, listing, and reporting workflows.

**Open Gaps / Unresolved Decisions:**
- `MISSING_DATA_MAPPING`: Exact mortgage metadata schema is not fully defined.
- `MISSING_ROLE_PERMISSION_RULE`: Fine-grained owner vs manager edit boundaries are not fully defined.

---

## Story ID: UNT-001
**Title:** Unit records can be created and edited in the operations portal  
**Primary Actor:** Property manager or owner  
**Business Goal:** Maintain unit-level operational data for leasing, maintenance, and listing workflows.

**Trigger:** Authorized operator creates or edits a unit record under a property.  
**Preconditions:** Parent property exists; operator has unit-management permissions.  
**Main Flow:**
1. Operator creates or updates a unit record.
2. System stores status, amenities, layouts, media references, and unit attributes.
3. Updated unit record becomes available to leasing, listing, maintenance, and reporting workflows.

**Alternate Flows:**
- Unit status changes without editing other attributes.

**Failure / Exception Flows:**
- Missing property linkage blocks unit creation.
- Invalid status or required data blocks persistence.

**Data Captured / Affected:** Unit record, parent property reference, status, amenities, layout/media references, unit attributes, audit history.  
**Notifications:** Optional internal change notice when configured.  
**Permissions / Approval Gates:** Role-based create/edit permissions required.  
**Audit Log Requirements:** Unit create/update, actor, changed fields, status changes, prior/new values where applicable.  
**State Transitions:** Unit availability/operational status updates support downstream leasing, listing, maintenance, and turn workflows.  
**Dependencies:** Unit form, property linkage, permission model, media management, downstream ops workflows.

**Acceptance Criteria:**
- Unit records support status, amenities, layouts, and media references.
- Units remain linked to parent properties.
- Status changes are auditable.
- Unit data can be consumed by leasing, listing, maintenance, and reporting workflows.

**Open Gaps / Unresolved Decisions:**
- `MISSING_DATA_MAPPING`: Normalized unit status taxonomy is not fully defined.
- `TERMINOLOGY_MISMATCH`: Rent-ready, available, and listed state boundaries are not fully normalized across repo stories.

---

## Story ID: DSH-001
**Title:** Dashboard shows key dates and operational calendar  
**Primary Actor:** Property manager or owner  
**Business Goal:** Present role-appropriate operational obligations immediately after login.

**Trigger:** Authorized user logs in or dashboard data refreshes.  
**Preconditions:** Source workflows emit calendar-relevant events.  
**Main Flow:**
1. System loads payments, inspections, move-ins, move-outs, court dates, and other operational events.
2. Dashboard displays a calendar-centric view.
3. Each event links back to its source workflow.
4. Dashboard reflects live changes without manual reconciliation where event feeds exist.

**Alternate Flows:**
- Owner sees read-only or filtered views based on role.
- Dashboard can emphasize anomalies or action items when analytics are available.

**Failure / Exception Flows:**
- Partial source failure surfaces incomplete data warning instead of silently omitting events.

**Data Captured / Affected:** Calendar event aggregates, event links, visibility rules, refresh timestamps.  
**Notifications:** No direct outbound notification; dashboard displays upstream event data.  
**Permissions / Approval Gates:** Role-based visibility required.  
**Audit Log Requirements:** Dashboard data refresh generation time and source linkage audit where operationally relevant.  
**State Transitions:** No domain state change; visibility layer for downstream workflows.  
**Dependencies:** Calendar aggregation service, event sources from payments/inspections/move-in/move-out/legal flows, role visibility model.

**Acceptance Criteria:**
- Calendar shows payments, inspections, move-ins, move-outs, court dates, and other major events.
- Entries link to source workflows.
- Visibility is role-appropriate.
- Event changes appear without manual reconciliation where the underlying source emits updates.

**Open Gaps / Unresolved Decisions:**
- `ABSENT_ANALYTICS_REQUIREMENT`: Widget prioritization rules are not defined.
- `MISSING_ROLE_PERMISSION_RULE`: Fine-grained dashboard visibility model is not fully defined.

---

## Story ID: COM-001
**Title:** System supports multi-channel communications in the portal context  
**Primary Actor:** Property manager  
**Business Goal:** Reach tenants reliably through configured channels and preserve operational message history.

**Trigger:** A portal workflow requires outbound communication.  
**Preconditions:** Recipient exists; event supports one or more delivery channels.  
**Main Flow:**
1. System determines configured delivery channels for the event.
2. System attempts delivery through email, SMS, in-app, and physical markers where applicable.
3. Delivery attempts and outcomes are recorded.
4. Related workflow retains communication linkage for dispute reconstruction.

**Alternate Flows:**
- Channel fallback occurs when the primary channel fails.
- Manual communication can be recorded when sent outside the automated flow.

**Failure / Exception Flows:**
- All-channel failure remains visible and retriable.
- Physical delivery can be marked without proof artifacts when proof workflow is not defined.

**Data Captured / Affected:** Recipient, channel set, message type, attempt timestamps, delivery status, linked workflow objects.  
**Notifications:** The outbound communication itself.  
**Permissions / Approval Gates:** Manager approval required where the source workflow requires it; this story does not remove source approval gates.  
**Audit Log Requirements:** Actor or system source, timestamp, channel, message type, target, sent/failed/delivered state, manual communication records.  
**State Transitions:** No standalone lifecycle transition; communications attach to source workflows.  
**Dependencies:** Notification service, template configuration, audit logging, source workflow approval rules.

**Acceptance Criteria:**
- Email, SMS, in-app, and physical markers are supported where applicable.
- Delivery attempts are logged.
- Failures are visible.
- Manual communications can be recorded.
- Communication records are linkable to tenant, unit, property, and source workflow.

**Open Gaps / Unresolved Decisions:**
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: Print/mail workflow is not defined.
- `MISSING_AUDIT_REQUIREMENT`: Proof of mailbox/door posting is not defined.
