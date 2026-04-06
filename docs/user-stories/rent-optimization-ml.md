# User Stories: Rent Optimization & Yield Management

**Module:** `rent_optimization_ml`  
**Normalized Scope:** renewal offers, retention decisions, vacancy pricing, and owner-facing pricing analytics.  
**Canonical Lifecycle Domains:** renewals, retention offers, listings/availability handoff, dashboard analytics.

## File-Level Notes
- This file now anchors renewal and retention pricing workflows to the tenant lifecycle.
- Market automation remains explicitly bounded by unresolved data-provider and approval-policy gaps.
- This file does not replace the operational payment, listing, or accounting stories; it hands off into them.

---

## Story ID: REN-001
**Title:** Renewal reminders trigger at 90 and 30 days with pricing context  
**Primary Actor:** Property manager or tenant  
**Business Goal:** Surface renewal timing early enough to support retention, repricing, or move-out planning.

**Trigger:** Active lease reaches 90-day or 30-day pre-expiration threshold.  
**Preconditions:** Lease has valid end date; lease is eligible for renewal workflow.  
**Main Flow:**
1. System detects threshold crossing for active leases.
2. System generates reminder event and links it to renewal workflow.
3. Where pricing context exists, reminder can reference pending renewal options.
4. If no renewal is pursued, workflow hands off into move-out planning.

**Alternate Flows:**
- 90-day and 30-day reminders go to different recipient sets when property policy permits.

**Failure / Exception Flows:**
- Missing lease-end date blocks reminder generation and raises data-quality exception.

**Data Captured / Affected:** Lease end date, reminder threshold, recipient set, linked renewal workflow, pricing context reference if available.  
**Notifications:** Reminder notifications to tenant and manager/owner as configured.  
**Permissions / Approval Gates:** Automated reminder generation; role-based visibility determines recipients.  
**Audit Log Requirements:** Threshold crossing, reminder generation, recipients, channels, linked lease/workflow.  
**State Transitions:** Applicant-to-Tenant `Active Tenant -> Renewal Pending`; downstream handoff to retention offer or move-out workflow.  
**Dependencies:** Lease data, notification service, renewal workflow, role configuration.

**Acceptance Criteria:**
- 90-day reminder exists.
- 30-day reminder exists.
- Reminders are logged.
- Reminder links to renewal workflow and does not dead-end.

**Open Gaps / Unresolved Decisions:**
- `MISSING_ROLE_PERMISSION_RULE`: Exact recipient set by role/property is not fully defined.

---

## Story ID: REN-002
**Title:** System can generate dynamic lease-term pricing and retention offers  
**Primary Actor:** Property manager or owner  
**Business Goal:** Present structured renewal options that balance retention and vacancy economics.

**Trigger:** Lease enters renewal window and pricing generation is requested or scheduled.  
**Preconditions:** Lease is in good standing for renewal workflow; property accepts renewals; pricing inputs are available.  
**Main Flow:**
1. System generates renewal pricing options for allowed lease terms/end dates.
2. System records offer details and associated assumptions.
3. Manager/owner reviews and presents a retention offer to the tenant.
4. Accepted offer hands off into lease update/execution workflow.
5. Declined or expired offer hands off into move-out or marketing preparation.

**Alternate Flows:**
- Manager overrides generated pricing with documented justification.
- Offer remains internal until operator chooses to send.

**Failure / Exception Flows:**
- Missing pricing inputs blocks generation.
- Invalid override without operator attribution cannot be saved.

**Data Captured / Affected:** Generated pricing matrix, offer terms, assumptions, override metadata, tenant decision, linked lease.  
**Notifications:** Offer presentation notice to tenant; internal review notice when generation completes.  
**Permissions / Approval Gates:** Operator review/presentation required; pricing generation does not auto-bind the tenant.  
**Audit Log Requirements:** Generation event, assumptions used, override actor/reason, offer send event, tenant response.  
**State Transitions:** Applicant-to-Tenant `Renewal Pending`; downstream handoff to lease renewal execution or move-out workflow.  
**Dependencies:** Lease data, pricing engine, notification service, lease update/signature workflow, move-out workflow.

**Acceptance Criteria:**
- Dynamic pricing options can be generated.
- Retention offers can be created and presented.
- Override path is auditable.
- Accepted offers flow into renewal/lease update process.
- Declined offers can transition to move-out planning.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Offer-approval boundaries are not defined.
- `MISSING_BUSINESS_RULE`: Final lease-term option set per property is not defined.

---

## Story ID: REN-003
**Title:** Predictive churn analytics inform retention prioritization without bypassing approval  
**Primary Actor:** Asset manager or owner  
**Business Goal:** Identify likely non-renewals early enough to target retention action.

**Trigger:** Scheduled churn-analysis job evaluates leases approaching renewal.  
**Preconditions:** Sufficient historical tenant and property data exists.  
**Main Flow:**
1. System calculates churn/renewal-likelihood indicators.
2. System surfaces retention risk on dashboard/ops views.
3. Operators use the signal to prioritize retention offers or vacancy preparation.

**Alternate Flows:**
- Low-confidence models are surfaced as advisory only.

**Failure / Exception Flows:**
- Missing required historical data suppresses the score and logs the gap.

**Data Captured / Affected:** Churn score, input factors, linked lease/unit/property, suggested retention priority.  
**Notifications:** Optional internal retention-risk alerts.  
**Permissions / Approval Gates:** Analytics do not auto-issue offers or change tenant status.  
**Audit Log Requirements:** Scoring run, input range, resulting risk signal, operator overrides if converted into action.  
**State Transitions:** No direct lifecycle transition; downstream handoff into renewal offer or vacancy preparation.  
**Dependencies:** Tenant history, maintenance/payment signals, dashboard surfaces, renewal workflow.

**Acceptance Criteria:**
- Renewal/churn risk can be computed when sufficient data exists.
- Signal is visible for operator review.
- Analytics do not bypass human offer/review gates.
- Missing-data conditions are explicit.

**Open Gaps / Unresolved Decisions:**
- `ABSENT_ANALYTICS_REQUIREMENT`: Final model-governance and redline thresholds are not defined.
- `MISSING_DATA_MAPPING`: Required source-data feature set is not fully specified.

---

## Story ID: LST-001
**Title:** Market pricing can hand off into listing and vacancy workflows for available units  
**Primary Actor:** Property manager  
**Business Goal:** Adjust asking rent for vacant units while preserving operator control when autonomy is not explicitly approved.

**Trigger:** Vacant/available unit enters pricing review cycle.  
**Preconditions:** Unit is vacant or nearing listing availability; comparable pricing inputs are available.  
**Main Flow:**
1. System evaluates current market pricing inputs.
2. System proposes optimized asking rent for the available/listed unit.
3. If autopilot is enabled by policy, pricing update can be applied; otherwise it waits for operator approval.
4. Approved pricing hands off into listing syndication workflow.

**Alternate Flows:**
- Review-only mode requires explicit PM approval.

**Failure / Exception Flows:**
- Missing comparable data blocks recommendation.
- Unsupported data-provider or scraping failure suppresses automatic repricing.

**Data Captured / Affected:** Current ask, proposed ask, market inputs, approval mode, operator decision, linked unit/listing.  
**Notifications:** Optional operator alert when pricing proposal is ready or blocked.  
**Permissions / Approval Gates:** Review-only and autopilot modes are distinct; autopilot cannot be assumed unless explicitly configured.  
**Audit Log Requirements:** Pricing run, source inputs, proposed amount, approval/apply event, operator override.  
**State Transitions:** Unit lifecycle `Available/Listable` pricing support; downstream handoff to listing publication/syndication.  
**Dependencies:** Market data source, unit availability state, listing workflow, dashboard visibility.

**Acceptance Criteria:**
- Proposed optimized rent can be generated for a vacant unit.
- Approval mode is explicit.
- Pricing changes are auditable.
- Approved pricing hands off into listing workflow.

**Open Gaps / Unresolved Decisions:**
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: Comparable-market data source/provider is not locked.
- `MISSING_BUSINESS_RULE`: Autopilot approval policy is not fully defined.
- `CONFLICTING_EXISTING_STORIES`: Prior scraping-centric language conflicts with the requirement not to assume unsupported integrations as complete.

---

## Story ID: RPT-002
**Title:** Pricing and retention analytics support owner review without overstating financial finality  
**Primary Actor:** Property owner  
**Business Goal:** Give owners decision support on pricing, amenity value, and retention strategy while handing off final actions to operational systems.

**Trigger:** Owner requests pricing/yield analysis or system refreshes analytical views.  
**Preconditions:** Required internal and external data inputs exist for the requested analysis.  
**Main Flow:**
1. System generates analytical views such as renewal yield comparisons or amenity value estimates.
2. Owner reviews projected outcomes.
3. Approved business action hands off into pricing, retention, or capital planning workflows.

**Alternate Flows:**
- Analysis remains advisory-only with no direct state mutation.

**Failure / Exception Flows:**
- Missing market or internal data produces incomplete analysis warning.

**Data Captured / Affected:** Analysis request, source datasets, scenario outputs, owner review action.  
**Notifications:** Optional analysis-ready notice.  
**Permissions / Approval Gates:** Analytical access is role-controlled; analytical output does not auto-commit operational changes.  
**Audit Log Requirements:** Analysis generation event, data ranges, user access, downstream action initiation when taken.  
**State Transitions:** No direct lifecycle transition; downstream handoff into retention, listing, or capital planning workflows.  
**Dependencies:** Market data, internal property/unit history, owner portal/dashboard, downstream operational workflows.

**Acceptance Criteria:**
- Analytical outputs are distinguishable from committed operational changes.
- Missing data is surfaced.
- Owner review can hand off into a real downstream workflow.
- Analytical generation is auditable.

**Open Gaps / Unresolved Decisions:**
- `ABSENT_ANALYTICS_REQUIREMENT`: Final amenity-value methodology is not defined.
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: External comparable-source contract is not defined.
