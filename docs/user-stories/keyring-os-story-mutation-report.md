# Keyring OS Story Mutation Report

## A. Coverage Summary

- Files reviewed: 5
- Files updated: 5
- Files created: 0 user story files
- Files flagged as conflicting: 1
- Files flagged as duplicate/overlapping: 0
- Code alignment status: policy runtime and first workflow producers wired in backend
- TypeScript build status: passing via `npx tsc --noEmit -p tenant_portal_backend/tsconfig.json`

### Files Reviewed
- `docs/user-stories/tenant-portal-web.md`
- `docs/user-stories/ai-prescreening.md`
- `docs/user-stories/backend-services.md`
- `docs/user-stories/contracts.md`
- `docs/user-stories/rent-optimization-ml.md`

### Code-Level Closure Update

The repository now includes a code-level implementation layer that closes major workflow gaps previously tracked only in story artifacts.

#### Backend Areas Updated
- `tenant_portal_backend/src/policy/`
- `tenant_portal_backend/src/rental-application/rental-application.service.ts`
- `tenant_portal_backend/src/jobs/scheduled-jobs.service.ts`
- `tenant_portal_backend/src/payments/payments.service.ts`
- `tenant_portal_backend/src/payments/payments.controller.ts`
- `tenant_portal_backend/src/lease/lease.service.ts`
- `tenant_portal_backend/src/maintenance/maintenance.service.ts`
- `tenant_portal_backend/prisma/schema.prisma`

#### Code-Level Outcomes Now Present
- Policy bundles, workflow events, rule evaluations, approvals, action logs, attorney referrals, service-proof placeholders, and monthly close persistence models exist.
- `application.scored`, `late_fee.check`, and `attorney.referral.check` producers are wired from persisted service-layer mutations rather than controllers.
- Pending workflow events can now be processed asynchronously and immediately when required.
- Approval-gated policy results now create executable approval tasks instead of silently stopping at evaluation.
- Rule actions now execute real side effects for:
  - denial-document communication logging
  - late-fee ledger posting and `LateFee` creation
  - attorney referral creation, communication logging, tenant notification, and lease-history tracking
- Supported policy transitions now mutate persisted workflow state for `RentalApplication` and record lifecycle events.
- Where the schema has no canonical state column, transitions are recorded in audit/history and explicitly marked as skipped rather than fabricated.

#### Remaining Code-Constrained Gaps
- Waitlist still has no canonical persisted `ApplicationStatus` value, so waitlist transitions are audited but not stored as a first-class application status.
- Delinquency/legal progression still relies on lease history and related artifacts instead of a dedicated delinquency-case state model.
- Notice service-proof enforcement and formal legal document packaging remain partial relative to the broader policy design.
- Listing syndication remains unresolved at the product/integration level and is still treated as conflicting in repo.

### Unresolved Gaps Count by Taxonomy

| Gap Type | Count |
|---|---:|
| `MISSING_BUSINESS_RULE` | 23 |
| `MISSING_LEGAL_RULE` | 8 |
| `MISSING_APPROVAL_GATE` | 2 |
| `MISSING_AUDIT_REQUIREMENT` | 5 |
| `MISSING_STATE_TRANSITION` | 0 |
| `MISSING_NOTIFICATION_RULE` | 3 |
| `MISSING_DATA_MAPPING` | 9 |
| `MISSING_EXTERNAL_INTEGRATION_SPEC` | 11 |
| `MISSING_ROLE_PERMISSION_RULE` | 5 |
| `MISSING_EXCEPTION_PATH` | 3 |
| `CONFLICTING_EXISTING_STORIES` | 1 |
| `DUPLICATE_STORY_OVERLAP` | 0 |
| `ABSENT_REPORTING_REQUIREMENT` | 1 |
| `ABSENT_ANALYTICS_REQUIREMENT` | 3 |
| `ABSENT_DOWNSTREAM_HANDOFF` | 1 |

---

## B. Story-by-Story Change Log

### `docs/user-stories/tenant-portal-web.md`
- Action taken: `updated`
- Workflow domain: onboarding, move-in, inspections, maintenance, communications, dashboard/calendar
- What changed:
  - Replaced aspirational UX-heavy narratives with normalized operational stories `ONB-004`, `ONB-005`, `MIN-001`, `MIN-002`, `MNT-001`, `MNT-002`, `DSH-001`, `COM-001`
  - Added required sections: trigger, preconditions, alternate/exception flows, permissions, audit requirements, state transitions, dependencies, and explicit downstream handoffs
  - Added gap taxonomy labels for unresolved policy and integration assumptions
- Why it changed:
  - Existing stories were incomplete operationally and lacked explicit transitions, approval rules, and exception paths
- What remains unresolved:
  - Move-in conflict rules
  - Welcome package content/SMS policy
  - Inspection deadline/checklist policy
  - Maintenance taxonomy and after-hours dispatch
  - Dashboard role visibility details
  - Physical-delivery proof workflow

### `docs/user-stories/ai-prescreening.md`
- Action taken: `updated`
- Workflow domain: applications, AI screening, denials, waitlist, onboarding, lease drafting/signature handoff
- What changed:
  - Normalized the application-to-decision lifecycle into stories `LSG-001` to `LSG-005`, `ONB-001` to `ONB-003`
  - Added explicit denial/no-onboarding rule, waitlist handoff, onboarding provisioning, lease prefill, and signature workflow
  - Preserved advanced verification/fraud concepts behind manual-review gates instead of overclaiming automation
- Why it changed:
  - Existing stories were rich conceptually but did not fully model approvals, downstream consequences, or source-of-truth mapping requirements
- What remains unresolved:
  - Underwriting thresholds
  - Adverse-action compliance content
  - Waitlist ranking/cadence
  - Identity verification policy
  - Lease field mapping and template versioning
  - Signer ordering and guarantor rules
  - Biometric/privacy and provider-contract details

### `docs/user-stories/backend-services.md`
- Action taken: `updated`
- Workflow domain: ledger, reminders, delinquency, late fees, payment plans, notices, legal escalation, reporting, accounting, auditability
- What changed:
  - Rebuilt the file around canonical stories `PAY-001` to `PAY-005`, `LEG-001` to `LEG-003`, `ACC-001`, `RPT-001`, `SYS-001`, `INF-001`
  - Added explicit ledger effects, operator notifications, approval gates, reporting handoffs, and legal progression state transitions
  - Added payment-plan outcome tracking and anomaly-hold language for accounting sync
- Why it changed:
  - Original file mixed platform claims with incomplete business workflows and lacked end-to-end delinquency/legal/reporting continuity
- What remains unresolved:
  - Refund/reversal policy
  - Reminder cadence
  - Role-specific operator notifications
  - Jurisdiction-specific late-fee and notice rules
  - Payment-plan criteria/default policy
  - Attorney communication contract
  - Accounting mapping schema and sync mode
  - Audit retention/tamper policy

### `docs/user-stories/contracts.md`
- Action taken: `updated`
- Workflow domain: deposit escrow, lease evidence integrity, cleared-rent allocation, fractional payment responsibility, optional governance
- What changed:
  - Reframed the file into operational stories `ESC-001`, `LEG-005`, `PAY-007`, `PAY-008`, `GOV-001`
  - Bound escrow and settlement logic to move-out closeout, ledger, and reporting workflows
  - Replaced unsupported certainty around chain/court/banking behavior with auditable state-tracking language
- Why it changed:
  - Original contract stories were concept-heavy but lacked safe operational boundaries and explicit dependencies
- What remains unresolved:
  - Deposit timing and deduction rules by jurisdiction
  - Court e-filing integration
  - Settlement finality timing and destination account mapping
  - Legal treatment of fractional default
  - Cap-table/governance source-of-truth

### `docs/user-stories/rent-optimization-ml.md`
- Action taken: `updated`
- Workflow domain: renewals, retention offers, churn analytics, vacancy pricing, owner analytics
- What changed:
  - Normalized the module into stories `REN-001`, `REN-002`, `REN-003`, `LST-001`, `RPT-002`
  - Added explicit approval gates before pricing/offer automation
  - Added lifecycle handoffs into renewal execution, move-out planning, and listing workflows
  - Explicitly flagged conflict between prior scraping-heavy claims and current unsupported-integration reality
- Why it changed:
  - Existing stories implied autonomous pricing behavior without enough data-contract or approval detail to preserve correctness
- What remains unresolved:
  - Recipient rules for reminders
  - Offer approval boundaries
  - Required feature set/model-governance for churn scoring
  - Market data source/provider contract
  - Autopilot approval policy

---

## C. Gap Register

The canonical repo-verification traceability artifact is now [keyring-os-traceability-matrix.md](/c:/Users/plabr/Dev/pms-master/docs/user-stories/keyring-os-traceability-matrix.md). `Repo Status` values in that matrix are authoritative for traceability verification. The gap register below remains the canonical unresolved-decision and audit-risk register.

| Gap ID | Story/File | Related Matrix Story ID(s) | Gap Type | Description | Why it cannot be safely resolved | What decision/input is needed |
|---|---|---|---|---|---|---|
| GAP-001 | `LSG-001` / `ai-prescreening.md` | `LSG-001` | `MISSING_BUSINESS_RULE` | Co-applicant and guarantor handling | missing business decision | Application-party policy and required data model |
| GAP-002 | `LSG-001` / `ai-prescreening.md` | `LSG-001` | `MISSING_EXTERNAL_INTEGRATION_SPEC` | Verification provider contract not fixed | missing dependency/integration contract | Provider selection and interface contract |
| GAP-003 | `LSG-002` / `ai-prescreening.md` | `LSG-002` | `MISSING_BUSINESS_RULE` | Hard underwriting thresholds undefined | missing business decision | Threshold matrix and override policy |
| GAP-004 | `LSG-003` / `ai-prescreening.md` | `LSG-003` | `MISSING_LEGAL_RULE` | Denial/adverse-action content varies by jurisdiction | missing compliance/jurisdiction rule | Jurisdictional notice requirements |
| GAP-005 | `LSG-004` / `ai-prescreening.md` | `LSG-004` | `MISSING_BUSINESS_RULE` | Waitlist ranking and cadence undefined | missing business decision | Waitlist ordering and communication policy |
| GAP-006 | `ONB-001` / `ai-prescreening.md` | `ONB-001` | `MISSING_DATA_MAPPING` | Application-to-tenant field mapping incomplete | missing source-of-truth mapping | Canonical applicant/tenant mapping spec |
| GAP-007 | `ONB-002` / `ai-prescreening.md` | `ONB-002` | `MISSING_DATA_MAPPING` | Lease-prefill mapping and template versioning undefined | missing source-of-truth mapping | Lease field map and template governance |
| GAP-008 | `ONB-003` / `ai-prescreening.md` | `ONB-003` | `MISSING_BUSINESS_RULE` | Signer order and guarantor workflow unresolved | missing business decision | Signature routing and signer-role policy |
| GAP-009 | `LSG-005` / `ai-prescreening.md` | `LSG-001`, `LSG-002` | `MISSING_LEGAL_RULE` | Biometric/privacy deletion obligations unclear | missing compliance/jurisdiction rule | Privacy-retention and biometric handling rules |
| GAP-010 | `ONB-004` / `tenant-portal-web.md` | `ONB-004` | `MISSING_ROLE_PERMISSION_RULE` | Calendar visibility/scheduling rights incomplete | insufficient detail to preserve correctness | Role/permission matrix |
| GAP-011 | `ONB-005` / `tenant-portal-web.md` | `ONB-005` | `MISSING_NOTIFICATION_RULE` | Welcome package channel/content policy incomplete | missing business decision | Required package contents and channels |
| GAP-012 | `MIN-001` / `tenant-portal-web.md` | `MIN-001` | `MISSING_DATA_MAPPING` | Required move-in checklist structure undefined | requirement references behavior not modeled elsewhere | Canonical inspection checklist schema |
| GAP-013 | `MIN-002` / `tenant-portal-web.md` | `MIN-002` | `MISSING_EXCEPTION_PATH` | Tenant/manager inspection dispute process missing | missing business decision | Dispute adjudication workflow |
| GAP-014 | `MNT-001` / `tenant-portal-web.md` | `MNT-001` | `MISSING_DATA_MAPPING` | Maintenance taxonomy missing | missing source-of-truth mapping | Category/status taxonomy |
| GAP-015 | `MNT-002` / `tenant-portal-web.md` | `MNT-002` | `MISSING_EXTERNAL_INTEGRATION_SPEC` | After-hours dispatch not modeled | missing dependency/integration contract | Dispatch provider/process contract |
| GAP-016 | `COM-001` / `tenant-portal-web.md` | `COM-001`, `COM-002` | `MISSING_AUDIT_REQUIREMENT` | Physical delivery proof not defined | missing compliance/jurisdiction rule | Proof-of-service/posting workflow |
| GAP-017 | `PAY-003` / `backend-services.md` | `PAY-003` | `MISSING_EXCEPTION_PATH` | Refund/reversal and duplicate reconciliation incomplete | missing business decision | Ledger reversal/reconciliation policy |
| GAP-018 | `PAY-004` / `backend-services.md` | `PAY-004` | `MISSING_LEGAL_RULE` | Late-fee limits vary by jurisdiction | missing compliance/jurisdiction rule | Jurisdictional fee constraints |
| GAP-019 | `PAY-005` / `backend-services.md` | `PAY-005`, `PAY-006` | `ABSENT_REPORTING_REQUIREMENT` | Payment-plan outcome reporting format unspecified | insufficient detail to preserve correctness | Reporting fields and audience |
| GAP-020 | `LEG-001` / `backend-services.md` | `LEG-001` | `MISSING_AUDIT_REQUIREMENT` | Notice service proof undefined | missing compliance/jurisdiction rule | Delivery/service proof requirements |
| GAP-021 | `LEG-002` / `backend-services.md` | `LEG-002` | `MISSING_EXTERNAL_INTEGRATION_SPEC` | Attorney handoff mechanism loose | missing dependency/integration contract | Attorney referral transport and packet standard |
| GAP-022 | `LEG-003` / `backend-services.md` | `LEG-003` | `MISSING_ROLE_PERMISSION_RULE` | Legal-stop sign-off actors not fixed | missing business decision | Authorized sign-off role list |
| GAP-023 | `ACC-001` / `backend-services.md` | `ACC-001` | `MISSING_DATA_MAPPING` | Accounting/QuickBooks mapping undefined | missing source-of-truth mapping | Chart-of-accounts mapping spec |
| GAP-024 | `RPT-001` / `backend-services.md` | `RPT-001` | `MISSING_BUSINESS_RULE` | Close rules and final output format undefined | missing business decision | Reporting format and close calendar |
| GAP-025 | `SYS-001` / `backend-services.md` | `SYS-001`, `COM-002` | `MISSING_AUDIT_REQUIREMENT` | Audit retention and tamper-resistance missing | missing compliance/jurisdiction rule | Retention and tamper-evidence policy |
| GAP-026 | `ESC-001` / `contracts.md` | `MOV-003` | `MISSING_LEGAL_RULE` | Deposit deduction/release timing undefined | missing compliance/jurisdiction rule | Jurisdictional deposit return/deduction policy |
| GAP-027 | `PAY-007` / `contracts.md` | `ACC-001` | `MISSING_DATA_MAPPING` | Destination allocation account model incomplete | missing source-of-truth mapping | Account routing model and identifiers |
| GAP-028 | `PAY-008` / `contracts.md` | `PAY-003`, `PAY-006` | `MISSING_LEGAL_RULE` | Fractional default legal treatment unresolved | missing compliance/jurisdiction rule | Household vs individual enforcement rule |
| GAP-029 | `GOV-001` / `contracts.md` | `ACC-001` | `MISSING_DATA_MAPPING` | Governance cap-table source not modeled | requirement references behavior not modeled elsewhere | Cap-table/governance entity model |
| GAP-030 | `REN-002` / `rent-optimization-ml.md` | `REN-002` | `MISSING_BUSINESS_RULE` | Offer approval boundaries undefined | missing business decision | Approval matrix for offer generation/sending |
| GAP-031 | `REN-003` / `rent-optimization-ml.md` | `RPT-002` | `ABSENT_ANALYTICS_REQUIREMENT` | Churn model governance and thresholds undefined | insufficient detail to preserve correctness | Analytics governance spec |
| GAP-032 | `LST-001` / `rent-optimization-ml.md` | `LST-001` | `CONFLICTING_EXISTING_STORIES` | Prior scraping-first story conflicts with unsupported integration assumptions | conflicting stories already in repo | Decision on supported data-provider strategy |
| GAP-033 | `RPT-002` / `rent-optimization-ml.md` | `RPT-002` | `MISSING_EXTERNAL_INTEGRATION_SPEC` | External comparable-source contract undefined | missing dependency/integration contract | Supported data source/API contract |

---

## D. Traceability Reference

The canonical traceability register for the current repository is [keyring-os-traceability-matrix.md](/c:/Users/plabr/Dev/pms-master/docs/user-stories/keyring-os-traceability-matrix.md).

Use that matrix for:

- per-story `Repo Status`
- authoritative upstream/downstream workflow verification
- source story file mapping
- auditability of missing, partial, conflicting, and verified coverage

### Current Interpretation

After the backend policy/runtime implementation pass, the matrix should be read as:

- `Partially Verified in Repo`: story intent is now backed by meaningful runtime code, but open policy/jurisdiction/integration/schema gaps still prevent a safe claim of full closure.
- `Conflicting in Repo`: still reserved for workflows such as listing syndication where the repository contains unresolved product/integration conflict.

The matrix is intentionally conservative and should not be “upgraded” to `Verified in Repo` until the remaining unresolved decisions are either modeled safely in code and schema or explicitly resolved by product/legal input.
