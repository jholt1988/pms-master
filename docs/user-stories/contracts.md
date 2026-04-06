# User Stories: Ledger & Smart Contracts System

**Module:** `contracts`  
**Normalized Scope:** escrow/deposit states, lease evidence integrity, programmable settlement/sweeps, and governed financial state transitions.  
**Canonical Lifecycle Domains:** lease execution support, move-out closeout support, payment allocation, auditability.

## File-Level Notes
- This file preserves the escrow and programmable settlement intent but normalizes it into operational stories.
- Advanced blockchain language from the original file is retained only where it maps to traceable evidence or governed state transitions.
- This file does not assume external chains, courts, or banking rails behave in real time unless explicitly stated.

---

## Story ID: ESC-001
**Title:** Security deposit escrow state is tracked transparently through lease closeout  
**Primary Actor:** Tenant  
**Business Goal:** Keep deposit funds isolated and make state changes visible through move-out and closeout.

**Trigger:** Security deposit is funded for a lease and later processed during lease termination/closeout.  
**Preconditions:** Lease exists; deposit amount and linked lease context are recorded; move-out/closeout workflow exists.  
**Main Flow:**
1. System links deposit funding to the lease context.
2. System tracks deposit through explicit escrow states.
3. During move-out closeout, deposit state updates based on inspection, damages, offsets, and release/dispute decisions.
4. Final release or dispute outcome is reflected to the tenant and linked to final charges.

**Alternate Flows:**
- Deposit remains held while damage review or dispute is open.
- Deposit is partially offset by final charges when those charges are approved and posted.

**Failure / Exception Flows:**
- Missing closeout evidence blocks release automation.
- Conflicting final-charge and deposit-offset records hold the deposit in review.

**Data Captured / Affected:** Deposit amount, lease linkage, escrow state, move-out closeout references, offset amounts, release/dispute outcome.  
**Notifications:** Deposit funded confirmation; deposit release/dispute/offset communications when configured.  
**Permissions / Approval Gates:** Operator approval required where deposit offsets or disputes are applied; tenant cannot unilaterally change state.  
**Audit Log Requirements:** Funding event, escrow state changes, approval actor, offset application, release/dispute timestamp, linked move-out and charge records.  
**State Transitions:** Escrow `Funded -> Held -> Disputed/Released`; supports Applicant-to-Tenant end state and move-out closeout workflows.  
**Dependencies:** Lease ledger, move-out inspections, final charges, communications, audit trail.

**Acceptance Criteria:**
- Deposit funds are linked to the specific lease context.
- Escrow states are visible and auditable.
- Deposit offsets/releases tie to move-out closeout records.
- Final state has downstream handoff into former-tenant financial closeout.

**Open Gaps / Unresolved Decisions:**
- `MISSING_LEGAL_RULE`: Statutory timing and jurisdiction-specific deposit rules are not defined.
- `MISSING_APPROVAL_GATE`: Exact sign-off path for deposit deductions is not fully modeled.

---

## Story ID: LEG-005
**Title:** Lease evidence and state transitions are preserved as a tamper-evident record  
**Primary Actor:** Property manager  
**Business Goal:** Preserve a defensible history of lease state changes, signatures, and supporting documents.

**Trigger:** Lease state changes, legal packet generation is requested, or an evidentiary record is needed for downstream legal workflow.  
**Preconditions:** Lease versions, signatures, and communication artifacts exist in the system of record.  
**Main Flow:**
1. System records lease state transitions with linked signature/document references.
2. System preserves version lineage and authenticity metadata.
3. When required for legal workflow, system compiles the evidence packet from existing records.

**Alternate Flows:**
- Evidence packet can be generated for audit/review before formal filing.

**Failure / Exception Flows:**
- Missing or inconsistent evidence artifacts block safe packet generation.
- External court filing is not assumed and remains outside this story.

**Data Captured / Affected:** Lease versions, PDF/document hashes or authenticity markers, signature events, evidence packet metadata.  
**Notifications:** Optional operator notice when packet is ready or incomplete.  
**Permissions / Approval Gates:** Authorized manager/legal operator access required to generate legal evidence packets.  
**Audit Log Requirements:** State transition evidence recorded with actor, timestamp, linked artifact references, packet generation events.  
**State Transitions:** Lease lifecycle evidence supports `Lease Drafted -> Lease Sent -> Lease Signed` and downstream legal escalation workflows.  
**Dependencies:** Lease document store, signature workflow, communications archive, legal escalation workflow.

**Acceptance Criteria:**
- Lease state transitions preserve authenticity/evidence metadata.
- Signature and document references remain linked and reviewable.
- Evidence packet generation is traceable and auditable.
- Missing evidence blocks completion rather than generating unsafe packets.

**Open Gaps / Unresolved Decisions:**
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: Automated court e-filing is not defined.
- `MISSING_AUDIT_REQUIREMENT`: Formal tamper-resistance standard is not specified beyond evidentiary intent.

---

## Story ID: PAY-007
**Title:** Cleared rent can be allocated by rule into management fee, reserve, and owner yield buckets  
**Primary Actor:** Property owner  
**Business Goal:** Route settled rent according to configured allocation rules instead of manual end-of-month settlement.

**Trigger:** Rent payment is confirmed as cleared and eligible for post-settlement allocation.  
**Preconditions:** Allocation rules exist; clearing event is final enough to permit allocation; linked accounts are configured.  
**Main Flow:**
1. System detects cleared rent.
2. System applies allocation rules such as management fee and reserve contribution.
3. System records resulting split amounts in the financial ledger/state model.
4. Downstream owner reporting and accounting sync consume the allocation results.

**Alternate Flows:**
- Allocation may remain queued if external disbursement rail is deferred or batched.

**Failure / Exception Flows:**
- Missing rules or account mapping block automated allocation.
- Duplicate settlement events must not trigger double allocation.

**Data Captured / Affected:** Cleared payment reference, allocation rules/version, resulting split amounts, destination account references, idempotency marker.  
**Notifications:** Optional owner/operator notice on successful or failed allocation.  
**Permissions / Approval Gates:** Rule changes require authorized operator; automated execution follows approved rules.  
**Audit Log Requirements:** Allocation trigger, rules applied, split amounts, destination references, failure/duplicate suppression events.  
**State Transitions:** Cleared payment state into allocated financial buckets; downstream handoff to reporting and accounting sync.  
**Dependencies:** Payment clearing signal, rule engine, ledger, accounting sync/export, owner reporting.

**Acceptance Criteria:**
- Cleared rent can be split by configured rules.
- Management fee/reserve/owner-yield components are recorded.
- Duplicate settlement retries do not double-allocate funds.
- Allocation events are auditable and available to reporting/accounting workflows.

**Open Gaps / Unresolved Decisions:**
- `MISSING_EXTERNAL_INTEGRATION_SPEC`: ACH/instant rail implementation details are not defined.
- `MISSING_DATA_MAPPING`: Destination account mapping model is not defined.
- `MISSING_BUSINESS_RULE`: Exact timing for allocation relative to settlement finality is not fully defined.

---

## Story ID: PAY-008
**Title:** Fractional rent responsibility can be tracked without collapsing household payment state  
**Primary Actor:** Tenant with roommates  
**Business Goal:** Preserve individual responsibility context when multiple residents contribute to one lease obligation.

**Trigger:** Multi-party rent arrangement is configured and payments are posted against a shared lease.  
**Preconditions:** Lease supports multi-party responsibility records; resident/obligation mapping exists.  
**Main Flow:**
1. System records each resident’s fractional responsibility.
2. System posts incoming payments against household and individual obligation context.
3. System distinguishes full household satisfaction from unresolved individual deficiency.
4. Downstream delinquency actions can target the appropriate context without losing whole-lease visibility.

**Alternate Flows:**
- Household reaches full payment even if contributions are uneven but agreed.

**Failure / Exception Flows:**
- Missing resident-to-obligation mapping blocks accurate allocation.
- Partial household cure without agreed allocation rules leaves the case in review.

**Data Captured / Affected:** Resident obligation matrix, posted fragments, individual deficiency context, household payment state.  
**Notifications:** Notices/reminders can be targeted to the relevant delinquent party when policy supports it.  
**Permissions / Approval Gates:** Multi-party lease setup requires authorized operator approval.  
**Audit Log Requirements:** Obligation setup, payment fragment posting, delinquent-party targeting logic, operator overrides.  
**State Transitions:** Payment lifecycle may remain `Partially Paid` while preserving individual deficiency context; downstream handoff to notices/delinquency.  
**Dependencies:** Lease party model, ledger, delinquency workflow, notifications.

**Acceptance Criteria:**
- Individual obligations can be tracked within the shared lease.
- Payment fragments preserve both household and individual context.
- Downstream delinquency targeting remains traceable.
- All allocation mutations are auditable.

**Open Gaps / Unresolved Decisions:**
- `MISSING_BUSINESS_RULE`: Legal treatment of fractional default is not defined.
- `MISSING_LEGAL_RULE`: Notice strategy for individual vs whole-household delinquency is not defined.

---

## Story ID: GOV-001
**Title:** Governance-controlled fund release remains optional and approval-gated  
**Primary Actor:** Portfolio syndicate owner  
**Business Goal:** Preserve optional owner-governance workflows without overstating current operational completeness.

**Trigger:** Major capital expenditure requires governance decision under a syndicate-owned asset model.  
**Preconditions:** Ownership cap table and spending-governance rules exist.  
**Main Flow:**
1. Authorized operator opens a governance decision request.
2. System records votes/approvals against the relevant spending request.
3. If threshold is met, funds become eligible for release under the governance rule.

**Alternate Flows:**
- Request fails threshold and funds remain locked.

**Failure / Exception Flows:**
- Missing cap-table or governance rule blocks safe execution.

**Data Captured / Affected:** Governance request, cap-table reference, approval/vote records, resulting fund-release eligibility.  
**Notifications:** Decision request and outcome notices to eligible governance participants.  
**Permissions / Approval Gates:** Governance threshold is itself the approval gate; operator cannot bypass it.  
**Audit Log Requirements:** Poll/request creation, votes/approvals, threshold result, fund-release eligibility event.  
**State Transitions:** Optional governance workflow; downstream handoff to standard accounting/procurement once approved.  
**Dependencies:** Ownership model, governance rules, fund-hold records, accounting workflows.

**Acceptance Criteria:**
- Governance decision request can be recorded.
- Approval/vote trail is auditable.
- Approved requests hand off into normal financial execution.
- Failed requests preserve locked status.

**Open Gaps / Unresolved Decisions:**
- `MISSING_DATA_MAPPING`: Cap-table model is not specified in the current repo story set.
- `MISSING_BUSINESS_RULE`: Governance thresholds and fund-release policy are not fully defined.
