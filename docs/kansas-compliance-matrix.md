# Kansas Compliance Matrix

Date: 2026-06-04

Purpose: define the Kansas-first compliance requirements that should shape the private beta of the decision-driven property management platform.

Important: this is a product and engineering planning artifact, not legal advice. Before production use, Kansas counsel should review notice templates, lease language, fee policies, screening rules, deposit workflows, adverse action workflows, and eviction-adjacent flows.

## 1. Launch Scope

Private beta scope:

- Geography: Kansas.
- Customer size: about 30 units per customer.
- Property types: long-term residential, student residential, and affordable residential operational workflows.
- Affordable housing compliance reporting: post-MVP.
- Commercial and short-term rentals: post-MVP.
- Platform: mobile-responsive web.
- Payment processor: Stripe.
- Accounting: app-owned ledger and owner accounting.
- AI mode: low-risk auto-execution only from explicit allowlists; human approval for legal, financial, compliance, and high-risk actions.

## 2. Compliance Principles

Product rules:

- Compliance-sensitive workflows must be state-aware, entity-aware, policy-aware, and auditable.
- The app should never let AI silently execute legal, adverse action, eviction, lease, deposit, payment reversal, owner distribution, or final accounting decisions.
- Every notice workflow needs source facts, template version, dates, delivery method, actor, approval, and immutable audit trail.
- Templates should be jurisdiction-scoped by state and optionally local jurisdiction.
- The app should support local overrides because city/county ordinances and subsidized housing rules can add requirements.

## 3. Matrix

| Area | Kansas Requirement / Rule To Encode | MVP Product Control | AI Policy | Priority | Sources |
| --- | --- | --- | --- | --- | --- |
| Fair housing protected classes | Federal fair housing prohibits discrimination in housing-related transactions based on protected classes. Kansas law also declares full and equal housing rights and includes housing discrimination protections for race, religion, color, sex, disability, national origin or ancestry, and familial status. | Add fair-housing review to listings, screening criteria, application decisions, messages, notices, rules, and AI-generated drafts. Store objective reason codes for decisions. | AI may flag risk and draft neutral language. Human approval required for applicant/tenant-facing decisions and adverse action. | P0 | HUD Fair Housing Act overview; K.S.A. 44-1001; K.S.A. 44-1015 |
| Discriminatory advertising/listings | Housing ads and listing content must avoid protected-class preference, limitation, or exclusion. | Add listing content scanner before publish. Require approval if protected-class language, occupancy language, family/student language, disability-related language, or source-of-income/local-rule terms appear. | AI can suggest neutral rewrite; cannot publish flagged listing automatically. | P0 | HUD Fair Housing Act overview; K.S.A. 44-1001 |
| Screening consistency | Screening criteria must be objective, consistently applied, and retained for audit. | Store screening policy version, criteria, raw application facts, third-party reports, decision reason codes, reviewer, timestamps, and exceptions. | AI can summarize and recommend; human approves final decision. | P0 | HUD Fair Housing Act overview; K.S.A. 44-1001 |
| Adverse action | Denials or conditional approvals based on credit/screening information require controlled adverse-action workflows. | Add adverse-action workflow with template versioning, source report references, decision facts, delivery log, and legal review gate. | AI draft-only. No auto-send. | P0 | Federal FCRA/adverse-action requirements should be reviewed by counsel; HUD Fair Housing Act overview |
| Reasonable accommodation / modification | Disability-related accommodation or modification requests are fair-housing-sensitive and require careful handling. | Add request intake, evidence log, interactive-process status, decision tracking, deadline reminders, and counsel/reviewer gate. | AI can classify and summarize; human approval required for all decisions and tenant communications. | P0 | HUD Fair Housing Act overview; K.S.A. 44-1002 disability definition; K.S.A. 44-1015 |
| Security deposit cap | Kansas limits security deposits: generally up to one month's rent for unfurnished units, up to 1.5 months for furnished units, plus up to 0.5 month's rent for pets. Municipal housing authority subsidized rent situations may have separate schedules. | Fee/deposit setup must validate cap by unit furnishing and pet policy. Store deposit type and statutory basis. | AI cannot override deposit cap. | P0 | K.S.A. 58-2550 |
| Security deposit holding and return | On termination, deposit may be applied to accrued rent and itemized damages. Remaining deposit and written itemization must be handled within statutory timing: within 14 days after determining deductions and no later than 30 days after termination/possession/demand rules as applicable. | Build move-out deposit workflow with possession date, forwarding address/demand, deduction itemization, evidence/photos, approval, deadline timer, and payout/refund task. | AI may draft itemization descriptions from approved charges; human approves deductions and refund. | P0 | K.S.A. 58-2550 |
| Deposit penalty risk | Failure to comply with deposit return rules can expose landlord to damages tied to wrongfully withheld amounts. | Add deadline alerts, blocked closeout if required itemization missing, and compliance exception dashboard. | AI can warn of missed deadline; cannot decide to withhold. | P0 | K.S.A. 58-2550 |
| Late fees | Kansas statutes do not provide one simple statewide late-fee formula in the landlord-tenant act. Fees should be lease-based, reasonable, disclosed, and counsel-reviewed. | Store fee policy per property/lease. Require fee schedule versioning and cap settings. Do not hardcode a universal Kansas late fee. | AI cannot invent late fees. It may explain configured policy only. | P0 | Counsel review required; Kansas Legal Services landlord handbook; Kansas landlord-tenant statutes |
| Rent nonpayment notice | For residential landlord-tenant act tenancies, Kansas allows termination if rent remains unpaid after written notice of nonpayment and intent to terminate and the tenant fails to pay within three days. | Collections workflow must generate Kansas nonpayment notice from verified ledger balance, lease grace period, property policy, and delivery method. Block notice if amount is unverified or payment is pending. | AI may draft plain-language cover message; statutory notice generation requires human approval. | P0 | K.S.A. 58-2564(b); Kansas Judicial Council eviction forms |
| Material lease breach notice | For material noncompliance other than rent, Kansas generally uses a written notice stating the breach and termination date at least 30 days after receipt, with opportunity to remedy within 14 days. | Add lease-violation workflow with breach type, evidence, cure deadline, termination date, template, delivery, and follow-up tasks. | AI may classify and draft; human approval required. | P0 | K.S.A. 58-2564(a) |
| Month-to-month termination | Month-to-month tenancy termination requires written notice stating termination on a periodic rent-paying date at least 30 days after receipt. Week-to-week uses at least seven days. | Lease lifecycle must compute valid termination dates from lease type, rent period, receipt date, and military exception flag. | AI can calculate candidate dates but must show source rule and require approval. | P0 | K.S.A. 58-2570 |
| Military tenant exception | Kansas month-to-month termination rule includes a shorter tenant notice pathway for military service when termination is necessitated by military orders. | Add military-orders flag and workflow for tenant move-out notices; route to human review. | AI can classify; no auto-decision. | P1 | K.S.A. 58-2570 |
| Landlord entry/access | Landlord may enter at reasonable hours after reasonable notice for inspections, repairs, services, or showing. Emergency entry is allowed for extreme hazards involving potential loss of life or severe property damage. Access may not be abused or used to harass. | Maintenance/inspection scheduling must record notice, purpose, time window, consent status, emergency reason, and delivery. Emergency bypass requires explicit safety reason. | AI can suggest notice text and classify emergency signal; human approval for emergency access unless configured emergency protocol applies. | P0 | K.S.A. 58-2557 |
| Habitability / landlord duties | Kansas landlord duties include compliance with applicable building/housing codes materially affecting health and safety and maintaining fit premises and required services/equipment. | Maintenance triage must classify habitability risk, safety risk, utility/service impact, and SLA. Escalate no heat, water, electrical, sewage, gas, lock/security, and active leak issues. | AI can auto-route to urgent queue and send approved acknowledgement; vendor dispatch above threshold requires human approval. | P0 | K.S.A. 58-2553; Kansas Legal Services landlord handbook |
| Tenant duties | Tenant duties include compliance with obligations affecting cleanliness, waste, safe use, legal conduct, and not damaging premises. | Lease violation workflows should map alleged conduct to tenant-duty categories, evidence, notice type, and cure opportunity. | AI can categorize; human approval for notices. | P1 | K.S.A. 58-2555; K.S.A. 58-2564 |
| Tenant rules and regulations | Landlord rules are enforceable only when they meet statutory constraints, are applied equally, are explicit, are not evasive of landlord obligations, and are noticed appropriately. Substantial post-lease modifications require tenant written consent. | Store property rule sets with effective dates, tenant acknowledgements, equal-application checks, and version history. | AI may flag vague or unequal rules; cannot enforce new substantial rule without consent record. | P1 | K.S.A. 58-2556 |
| Unlawful lockout/service interruption | Kansas prohibits unlawful removal/exclusion and willful interruption of essential services, with tenant remedies. | Block self-help eviction actions in workflows. Add warning banners for lock change, utility shutoff, access denial, and service interruption tasks. | AI must refuse instructions that appear to enable self-help eviction or unlawful service interruption and escalate to human/legal review. | P0 | K.S.A. 58-2563 |
| Eviction filing | Eviction requires court process after proper notice. Kansas Judicial Council provides forms and instructions. | App should stop at notice preparation, deadline tracking, evidence packet, and attorney/referral workflow unless court e-filing is later integrated and legally reviewed. | AI cannot file eviction or advise eviction strategy. | P0 | Kansas Judicial Council eviction and landlord-tenant forms; K.S.A. 58-2564 |
| Notice delivery evidence | Compliance depends on correct notice content, dates, and delivery/receipt facts. | Every notice must store recipient, address, delivery method, service date, receipt date if known, template version, attachments, and actor. | AI cannot mark notice delivered. | P0 | K.S.A. 58-2564; K.S.A. 58-2570; Kansas Judicial Council forms |
| Lease templates | Lease terms must not waive statutory rights or conflict with Kansas requirements. | Template manager must version leases by state, property type, owner policy, and counsel approval. Add blocked clauses list and review workflow. | AI can detect unusual clauses; cannot approve lease template changes. | P0 | Kansas Residential Landlord and Tenant Act; counsel review |
| Student housing variants | Student housing often introduces guarantors, roommate/bed leases, academic calendars, joint/several liability choices, and move-in/out batching. | Support guarantor records, occupant/roommate records, unit/bed labels, academic-term dates, parent/guarantor communications, and batch move-in/out workflows. | AI can draft routine communications; fair-housing and lease changes require review. | P1 | Product requirement; counsel review for lease forms |
| Affordable residential operational workflow | Launch support is operational only, not program-specific compliance reporting. | Track tenant, unit, lease, payments, maintenance, inspections, documents, and communications. Label affordable program metadata as informational until reporting is built. | AI must not represent program compliance as verified. | P1 | Product scope decision |
| Owner accounting/distributions | Owner distributions are financial decisions and must account for reserves, payables, deposits, trust/operating separation, and property-level ledger accuracy. | Owner statement and distribution workflow must require reconciliation state, available balance, reserve policy, approval, and audit. | AI can explain variance; cannot approve distributions. | P0 | Accounting control requirement; counsel/CPA review |
| Payment plans | Payment plans alter collections timing and may affect notice strategy. | Store plan terms, approvals, signatures/acknowledgement, payment schedule, missed-payment rules, and notice impact. | AI may suggest plan within configured policy; human approval required. | P0 | Product/legal control; K.S.A. 58-2564 interactions require review |
| Refunds/reversals/write-offs | These are high-risk financial actions. | Require approval, ledger impact preview, reason code, idempotency key, Stripe reference, and audit event. | AI cannot execute. | P0 | Accounting/payment control requirement |
| Privacy and sensitive data | Applications, screening, identity, payment, and accommodation records include sensitive data. | Role-based access, field-level controls for sensitive data, retention policy, audit access, encryption, and redaction for AI calls. | AI receives minimum necessary data; sensitive categories redacted unless explicitly needed and approved. | P0 | Product/security requirement; fair housing and privacy risk |
| Local jurisdiction variation | Kansas state law is not the only possible constraint; cities/counties and subsidized programs may add rules. | Add jurisdiction config layer: state, county, city, property program, lease template version. | AI must cite configured jurisdiction and warn when local config is missing. | P1 | Kansas Legal Services notes local ordinances may affect landlord/tenant issues |

## 4. MVP Workflow Requirements

### 4.1 Screening and Application Decision

Required data:

- Application facts.
- Screening report references.
- Screening policy version.
- Objective reason codes.
- Reviewer identity.
- Fair-housing risk flags.
- Adverse-action packet where applicable.

Required gates:

- No AI final decision.
- No denial or conditional approval without human approval.
- No adverse-action notice without template/version and delivery record.

### 4.2 Lease and Rules Setup

Required data:

- Kansas lease template version.
- Property policy version.
- Deposit cap calculation.
- Late fee policy.
- Pet/furnishing status.
- Student housing fields where applicable.
- Affordable workflow metadata where applicable.

Required gates:

- Counsel-approved template before use.
- Rules/rent/fees versioned and tenant-acknowledged.
- Substantial post-lease rule changes require written consent record.

### 4.3 Payments and Collections

Required data:

- Ledger balance.
- Stripe payment state.
- Lease grace period.
- Fee policy.
- Payment plan status.
- Prior notices.
- Delivery history.

Required gates:

- Nonpayment notice blocked if ledger balance is not finalized.
- Nonpayment notice blocked if unprocessed Stripe payment could change balance.
- Human approval required before notice generation/sending.

### 4.4 Maintenance and Access

Required data:

- Request text/photos.
- Habitability/safety classification.
- Entry purpose.
- Notice timestamp.
- Emergency basis if entry without consent.
- Vendor approval threshold.

Required gates:

- Emergency access must include explicit hazard reason.
- AI may auto-route urgent requests and send approved acknowledgement.
- Vendor dispatch above configured threshold needs approval.

### 4.5 Move-Out and Security Deposit

Required data:

- Lease end/termination date.
- Possession date.
- Forwarding address or demand status.
- Inspection report and photos.
- Rent owed.
- Itemized deductions.
- Refund calculation.
- Statutory deadline.

Required gates:

- Human approval for deductions.
- Deadline alerts at 7, 3, and 1 day before final deadline.
- Block closeout if itemization/refund is missing.

### 4.6 Notices and Eviction-Adjacent Workflow

Required data:

- Notice type.
- Statutory basis.
- Template version.
- Facts/evidence.
- Delivery method.
- Service/receipt date.
- Cure deadline.
- Expiration date.

Required gates:

- Human approval required.
- AI cannot file eviction or provide legal strategy.
- Attorney/referral workflow after notice expiration.

## 5. AI Auto-Execution Allowlist

Allowed in MVP when configured by customer:

- Route maintenance request to queue by severity/trade.
- Send approved acknowledgement for maintenance request received.
- Categorize inbound message intent.
- Create internal draft task from message.
- Generate internal daily briefing.
- Flag possible duplicate tenant/vendor/property records.
- Draft but not send tenant, applicant, owner, or vendor messages.

Not allowed in MVP:

- Send legal notices.
- Send adverse-action notices.
- Approve or deny applications.
- Modify lease terms.
- Approve payment plans.
- Reverse/refund/write off payments.
- Approve owner distributions.
- Dispatch vendor above threshold.
- Mark notice delivered.
- File eviction or provide legal strategy.

## 6. Engineering Backlog

P0:

- Add jurisdiction-aware compliance configuration for Kansas.
- Add NoticeTemplate, NoticeInstance, NoticeDelivery, and NoticeAudit models.
- Add DecisionRecord and EvidenceReference to screening, collections, maintenance, and deposit workflows.
- Add deposit cap validator.
- Add deposit return deadline engine.
- Add nonpayment notice workflow with ledger verification.
- Add lease violation 14/30 workflow.
- Add access notice workflow.
- Add self-help eviction guardrails.
- Add fair-housing content scanner for listings/messages/application decisions.
- Add adverse-action workflow shell.

P1:

- Add student housing fields: guarantor, bed/room assignment, academic term, batch move-in/out.
- Add affordable operational metadata without compliance reporting.
- Add local jurisdiction override layer.
- Add template counsel-approval state.
- Add accommodation/modification request workflow.

P2:

- Program-specific affordable housing compliance reporting.
- Native mobile inspection/field app.
- Court filing/e-filing integrations.
- Multi-state compliance packs.

## 7. Source References

- Kansas Residential Landlord and Tenant Act, Article 25: https://kslegislature.gov/li_2024s/b2023_24/statute/058_000_0000_chapter/058_025_0000_article/
- K.S.A. 58-2550, security deposits: https://www.kslegislature.gov/li_2014/b2013_14/statute/058_000_0000_chapter/058_025_0000_article/058_025_0050_section/058_025_0050_k/
- K.S.A. 58-2556, landlord rules and regulations: https://kslegislature.gov/li_2018/b2017_18/statute/058_000_0000_chapter/058_025_0000_article/058_025_0056_section/058_025_0056_k/
- K.S.A. 58-2557, landlord right of entry: https://www.kslegislature.gov/li/b2023_24/statute/058_000_0000_chapter/058_025_0000_article/058_025_0057_section/058_025_0057_k/
- K.S.A. 58-2563, unlawful removal/exclusion or diminished services: https://www.kslegislature.gov/li_2024/b2023_24/statute/058_000_0000_chapter/058_025_0000_article/058_025_0063_section/058_025_0063_k/
- K.S.A. 58-2564, tenant material noncompliance and nonpayment notice: https://www.kslegislature.gov/li/b2023_24/statute/058_000_0000_chapter/058_025_0000_article/058_025_0064_section/058_025_0064_k/
- K.S.A. 58-2570, tenancy termination notice: https://www.kslegislature.gov/archive/b2023_24/laws/058_000_0000_chapter/058_025_0000_article/058_025_0070_section/058_025_0070_k/
- Kansas Judicial Council eviction and landlord-tenant forms: https://www.kjc.ks.gov/legal-forms/evictions-landlord-tenant
- HUD Fair Housing Act overview: https://www.hud.gov/helping-americans/fair-housing-act-overview
- K.S.A. 44-1001, Kansas Act Against Discrimination policy: https://www.kslegislature.gov/archive/b2023_24/laws/044_000_0000_chapter/044_010_0000_article/044_010_0001_section/044_010_0001_k/
- K.S.A. 44-1002, disability definition and unlawful discriminatory practice definitions: https://www.kslegislature.gov/li_2024/b2023_24/statute/044_000_0000_chapter/044_010_0000_article/044_010_0002_section/044_010_0002_k/
- K.S.A. 44-1015, Kansas housing discrimination definitions: https://kslegislature.gov/li_2024s/b2023_24/statute/044_000_0000_chapter/044_010_0000_article/044_010_0015_section/044_010_0015_k/
- Kansas Legal Services landlord handbook: https://www.kansaslegalservices.org/node/275/landlord-handbook-and-rights-responsibilities

