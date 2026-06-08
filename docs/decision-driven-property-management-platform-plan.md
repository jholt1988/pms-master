# Decision-Driven Property Management Platform Plan

Date: 2026-06-04

Updated with product constraints from owner feedback: 2026-06-04

## 1. Purpose

Build a decision-driven property management platform that helps operators manage the full lifecycle of a property management business: portfolio setup, leasing, applications, tenants, payments, collections, maintenance, inspections, vendors, owners, accounting, compliance, documents, communications, reporting, and AI-assisted operations.

The product should not behave like a passive dashboard. Its core job is to detect important operating signals, explain why they matter, recommend the next action, execute approved work, update canonical state, and measure outcomes.

## 2. Current Codebase Context

The `pms-master` project already contains substantial property management functionality:

- Backend: NestJS, TypeScript, Prisma, PostgreSQL, Redis/Bull queues, Stripe, QuickBooks, DocuSign, OpenAI, Sentry, Prometheus, RabbitMQ support, and many domain modules.
- Frontend: Vite, React, TypeScript, React Router, NextUI, Tailwind, Playwright, Vitest.
- Domains already represented: auth, organizations, properties, units, leases, applications, tenant portal, payments, ledger, maintenance, inspections, vendors, documents, e-signature, notifications, messaging, owner portal, bookkeeping, QuickBooks, rent optimization, reporting, workflows, AI/copilot, and Property OS contracts.
- AI/ML assets already present: rent optimization, AI prescreening, chatbot/orchestrator, maintenance triage concepts, repair estimator concepts, bookkeeping agent concepts, and LLM platform evaluation.
- Planning and implementation docs are extensive, but some are stale, status-oriented, or partially overlapping.

The codebase has breadth, but the efficient path is not to keep every existing surface as-is. The recommended strategy is:

- Keep the NestJS/Prisma backend as the starting domain platform.
- Keep useful domain models, migrations, integrations, tests, and contracts.
- Consolidate frontend experiences into a clearer operator-first app, with tenant/owner/vendor portals treated as focused companion surfaces.
- Replace scattered AI/chatbot concepts with a governed decision engine and agent runtime.
- Standardize API contracts, workflow state machines, audit trails, and event schemas before expanding UI.

## 3. Product Vision

The app should become the daily operating system for a property management company.

Initial market:

- Mixed customer segment: solo landlords, small property managers, and mid-size property managers.
- Initial portfolio size: up to 250 units per customer.
- Initial property types: long-term residential plus student and affordable residential variants; selected light commercial use cases are post-MVP.
- Initial geography: Kansas first.
- Launch goal: production SaaS, not merely an internal tool or prototype.
- Paid launch scope: private beta.
- Private beta customer size: about 30 units per customer.
- Affordable housing launch scope: operational workflows only; program-specific compliance reporting is post-MVP.
- Timeline posture: as soon as possible with a small 2-4 person team.
- Differentiation: predictive AI plus decision-driven workflow execution.

Primary users:

- Property managers and leasing agents.
- Maintenance coordinators.
- Accounting and finance staff.
- Owners and asset managers.
- Tenants and applicants.
- Vendors and technicians.
- System administrators.

Primary business outcomes:

- Fewer missed deadlines.
- Faster leasing and renewals.
- Better collections and lower delinquency.
- Faster maintenance triage and vendor dispatch.
- Cleaner owner reporting and accounting close.
- Better tenant communication.
- Auditable decisions for legal, financial, and compliance-sensitive workflows.

## 4. Core Product Principle

Every meaningful workflow should follow one common decision chain:

1. Signal: detect that something needs attention.
2. Evidence: collect the facts behind the signal.
3. Policy: apply property, organization, lease, legal, or accounting rules.
4. Recommendation: propose the next best action with confidence and rationale.
5. Approval: let the right human approve, edit, reject, defer, or delegate.
6. Execution: perform the action through a backend workflow or integration.
7. State change: update the canonical domain object.
8. Audit: record the inputs, recommendation, decision, actor, and result.
9. Measurement: track cycle time, outcome, exception rate, and business impact.

If a feature cannot complete this chain, it should be labeled as informational or draft-only rather than presented as automation.

## 5. Planned Functionality

### 5.1 Operator Command Center

This should be the default first screen for property managers.

Core functionality:

- Daily portfolio briefing.
- Ranked decision queue by urgency, risk, deadline, amount, SLA, and confidence.
- Portfolio health metrics: occupancy, delinquency, renewal exposure, maintenance SLA, cash position, owner distributions, open approvals, and compliance deadlines.
- Explainable decision cards with evidence, policy references, recommended action, alternatives, and approval controls.
- Natural-language action composer for constrained, tool-backed operations.
- Universal search across properties, tenants, leases, ledgers, work orders, inspections, documents, messages, owners, and vendors.

AI enhancements:

- Summarize portfolio changes since last login.
- Rank what needs attention today.
- Explain why a work item is urgent.
- Draft approved communications.
- Convert natural-language requests into safe, typed workflow intents.

### 5.2 Portfolio, Properties, Units, and Owners

Core functionality:

- Organization, portfolio, property, building, unit, owner, and staff hierarchy.
- Unit lifecycle: vacant, listed, applied, approved, lease drafted, signed, move-in ready, occupied, notice given, turnover, maintenance hold, inactive.
- Owner records, ownership splits, reserves, management agreements, tax forms, and statement preferences.
- Property policy configuration for fees, screening, notices, maintenance approval thresholds, renewals, payment plans, and owner approval rules.
- Asset records, warranties, appliances, utilities, insurance, inspections, and compliance tasks.

AI enhancements:

- Detect rising property risk.
- Summarize property blockers.
- Recommend unit readiness actions.
- Predict vacancy, maintenance load, and renewal risk.

### 5.3 Leasing, Listings, Tours, Applications, and Screening

Core functionality:

- Listing syndication and lead capture.
- Tour scheduling and follow-up.
- Applicant portal and rental application workflow.
- Document upload, identity capture, income verification hooks, screening review, approval, conditional approval, adverse action, and denial workflow.
- Lease generation, e-signature, move-in orchestration, deposit handling, and handoff to tenant lifecycle.

AI enhancements:

- Lead scoring and next-best follow-up.
- Application extraction and summary.
- Policy-grounded screening recommendation.
- Draft adverse action and approval communications for human review.
- Lease abstraction and unusual clause detection.

### 5.4 Tenant Portal

Core functionality:

- Application submission.
- Lease and document access.
- Rent payments, payment methods, autopay, receipts, and ledger.
- Maintenance requests with photos and status updates.
- Messages, notifications, inspections, renewal responses, move-out notices, and profile updates.

AI enhancements:

- Guided maintenance intake.
- Lease/policy-grounded tenant question answering.
- Message drafting and routing.
- Automatic classification of requests into workflow types.

### 5.5 Payments, Ledger, Collections, and Delinquency

Core functionality:

- Charges, invoices, rent, fees, credits, refunds, reversals, manual adjustments, payment plans, and receipts.
- Tenant, lease, unit, property, organization, and owner ledger views.
- Stripe payment processing and webhook reconciliation.
- Delinquency queue, notices, payment plans, attorney referral tracking, and court date tracking where applicable.
- Idempotent payment and ledger operations.

AI enhancements:

- Prioritize collection actions.
- Suggest payment plans within policy.
- Draft tenant notices and messages.
- Detect payment anomalies and reconciliation mismatches.

### 5.6 Maintenance, Repairs, Vendors, and Inspections

Core functionality:

- Tenant and manager maintenance intake.
- Severity, trade, SLA, assignment, scheduling, vendor dispatch, estimates, approvals, completion, quality review, and billing.
- Vendor directory with licenses, insurance, specialties, service areas, availability, pricing history, and ratings.
- Inspections with rooms, checklists, photos, signatures, findings, action items, and repair estimate generation.
- Emergency handling path for habitability and safety issues.

AI enhancements:

- Classify severity, trade, and emergency risk from text and photos.
- Recommend vendors by availability, price, location, quality, and policy.
- Estimate repair cost ranges with confidence and source factors.
- Detect repeat issues and possible root causes.
- Summarize work order history.

### 5.7 Renewals, Retention, Move-Out, and Turnover

Core functionality:

- Renewal windows, rent recommendations, offer generation, tenant response, negotiation, signing, non-renewal, and move-out orchestration.
- Turnover checklist, inspection, deposit disposition, repairs, cleaning, listing readiness, and vacancy tracking.

AI enhancements:

- Renewal risk scoring.
- Rent recommendation with supporting factors.
- Draft renewal offers and negotiation responses.
- Turnover cost and timeline prediction.

### 5.8 Financials, Bookkeeping, QuickBooks, and Owner Accounting

Core functionality:

- Chart of accounts mapping.
- Bank transaction import.
- Reconciliation.
- Journal entries.
- Property-level P&L.
- Owner statements, reserves, draws, distributions, and scheduled delivery.
- QuickBooks sync with error review and retry.

AI enhancements:

- Categorize transactions.
- Match receipts, invoices, payments, and bank transactions.
- Detect expense anomalies.
- Explain financial variance.
- Draft owner statement summaries.

### 5.9 Documents, Compliance, Legal Controls, and Audit

Core functionality:

- Document store linked to entities.
- Templates for leases, notices, work orders, statements, owner messages, and vendor scopes.
- E-signature workflows.
- Jurisdiction-aware document rules where required.
- Comprehensive audit log for approvals, generated documents, overrides, communications, workflow transitions, payment events, and integration callbacks.

AI enhancements:

- Document classification.
- Lease abstraction.
- Clause comparison.
- Grounded document Q&A.
- Notice drafting from structured facts and templates.

### 5.10 Communications and Omnichannel Inbox

Core functionality:

- Unified inbox across tenants, applicants, owners, vendors, and staff.
- Email, SMS, in-app, and push notification support.
- Templates, preferences, delivery status, opt-in/opt-out, attachments, and thread linking to business objects.
- Bulk messaging with segmentation and approval controls.

AI enhancements:

- Draft replies.
- Summarize long threads.
- Detect sentiment, urgency, legal risk, and maintenance intent.
- Convert messages into tasks, work orders, notices, or approvals.

## 6. AI Strategy

AI should be implemented as a governed decision-support layer, not an unconstrained autonomous chatbot.

Recommended AI capabilities:

- Retrieval augmented generation over leases, policies, documents, ledgers, maintenance history, messages, and property records.
- Structured extraction from PDFs, images, applications, leases, invoices, receipts, emails, and inspection reports.
- Classification for maintenance severity, message intent, payment exceptions, document type, applicant risk, renewal risk, and workflow routing.
- Forecasting for delinquency, renewal, vacancy, maintenance SLA, repair cost, and cash flow.
- Draft generation for notices, owner updates, tenant replies, renewal offers, denial letters, vendor scopes, and maintenance summaries.
- Tool calling for approved backend actions.

AI guardrails:

- Human approval required for legal notices, adverse action, lease terms, payment reversals, owner distributions, policy overrides, vendor dispatch above threshold, and anything with fair housing or eviction risk.
- Deterministic rule engines enforce policy; AI explains, extracts, ranks, drafts, and recommends.
- AI outputs must cite source facts for high-risk workflows.
- No silent state changes.
- Every AI recommendation stores input facts, retrieved evidence, model output, confidence, approval decision, final action, and result.
- Redact or minimize sensitive PII before model calls when possible.
- Treat AI agents as typed tools behind permission checks, not as free-form actors.
- Low-risk auto-execution is allowed only for explicitly allowlisted actions with reversible or low-impact outcomes, strong audit logging, and customer-configurable thresholds.

Low-risk auto-execution candidates:

- Categorize non-sensitive inbound messages.
- Route maintenance requests to a queue by likely trade and severity.
- Create draft tasks from messages.
- Generate internal summaries.
- Send routine status acknowledgements from approved templates.
- Flag duplicate records or possible data issues.
- Match low-confidence bookkeeping items to a review queue rather than posting them.

Actions that require human approval in MVP:

- Adverse action, denial, legal notice, eviction-related communication, or fair-housing-sensitive message.
- Lease terms, rent increase, renewal offer, non-renewal, deposit disposition, and payment plan terms.
- Payment reversal, refund, write-off, owner distribution, journal posting, or bank reconciliation finalization.
- Vendor dispatch above threshold, emergency escalation, or tenant access notice.
- Any action based on uncertain jurisdictional rules.

Recommended AI agent set:

- Property Ops Orchestrator: routes requests to specialist workflows.
- Maintenance Triage Agent: classifies urgency, trade, safety, and next action.
- Repair Estimator Agent: produces scoped cost ranges and confidence.
- Tenant Communications Agent: drafts grounded tenant/applicant/owner/vendor messages.
- Lease-Up Agent: handles leads, tours, listing recommendations, and application follow-up.
- Bookkeeping Agent: categorizes, matches, reconciles, and explains accounting items.
- Decision Explainer: turns evidence, policy, and workflow state into concise rationale.

## 7. Recommended Architecture

### 7.1 Architecture Pattern

Use a modular monolith first, with strong domain boundaries, event-driven workflows, and contract-first APIs. Split services only when scaling, compliance, or team ownership justifies the cost.

This is the fastest and safest path because the existing backend is already a broad NestJS modular monolith with Prisma, queues, integrations, and tests.

### 7.2 Core Components

Frontend apps:

- Operator web app: property manager, leasing, maintenance, accounting, admin.
- Tenant portal: focused tenant and applicant workflows.
- Owner portal: statements, documents, approvals, portfolio performance.
- Vendor portal or lightweight vendor links: assignments, estimates, status updates, invoices.
- Mobile-responsive web first; native mobile companion is post-MVP.

Backend:

- NestJS API modular monolith.
- Prisma data access layer.
- PostgreSQL canonical database.
- Redis/BullMQ for background jobs.
- Event bus for domain events.
- Workflow/state-machine layer for long-running operations.
- AI gateway and agent runtime.
- Integration adapters for Stripe, QuickBooks, DocuSign, email/SMS, market data, screening, listing syndication, and document storage.

Data and analytics:

- PostgreSQL for transactional data.
- Object storage for documents/photos.
- Vector store for document and message retrieval. Use pgvector first unless retrieval scale requires a dedicated vector database.
- Event log for audit, analytics, and AI evaluation.
- Optional warehouse later for BI and model training.

Infrastructure:

- Docker Compose for local development.
- Managed Postgres, Redis, object storage, and queue in production.
- OpenTelemetry/Sentry/Prometheus for tracing, errors, and metrics.
- CI with lint, typecheck, unit, integration, e2e, schema, and security checks.

### 7.3 Domain Modules

Recommended backend domains:

- Identity and organization.
- Portfolio/property/unit.
- Leasing and applications.
- Lease lifecycle.
- Tenant lifecycle.
- Payments and ledger.
- Collections.
- Maintenance.
- Inspections.
- Vendors.
- Documents and e-signature.
- Communications.
- Owner accounting.
- Bookkeeping and QuickBooks.
- Reporting and analytics.
- Policy and approvals.
- Workflow engine.
- AI decision engine.
- Audit and security events.

### 7.4 API Strategy

Adopt one standard API contract:

- Response envelope: `{ data, meta, errors }`.
- Error envelope: stable code, message, field errors, correlation ID.
- Pagination: cursor-based for operational feeds and large lists.
- Idempotency keys for payments, webhooks, workflow actions, document generation, and external integration writes.
- OpenAPI generated from backend contracts.
- Frontend client generated or typed from OpenAPI/Zod schemas.
- Contract tests for critical flows.

The current repo already has Property OS contracts. Use them as the seed for a formal contract package, but simplify or replace any contracts that do not match the actual product workflow.

### 7.5 Workflow and Decision Engine

Create a first-class workflow engine inside the backend before adding more UI.

Required primitives:

- WorkflowDefinition.
- WorkflowInstance.
- WorkflowStep.
- StateTransition.
- ApprovalTask.
- ActionIntent.
- DecisionRecord.
- EvidenceReference.
- PolicyEvaluation.
- ExecutionResult.
- AuditEvent.

Every high-value workflow should use these primitives:

- Application review.
- Lease generation and signing.
- Renewal offer.
- Delinquency notice.
- Payment plan.
- Maintenance dispatch.
- Estimate approval.
- Owner distribution.
- QuickBooks sync exception.
- Move-out and turnover.

### 7.6 Data Model Priorities

Keep the existing Prisma schema where it is coherent, but refactor around these canonical aggregates:

- Organization.
- User and Role.
- Property.
- Unit.
- Lease.
- TenantProfile.
- Applicant/Application.
- LedgerAccount and LedgerEntry.
- PaymentAttempt.
- MaintenanceRequest.
- WorkOrder.
- Inspection.
- Vendor.
- Owner.
- Document.
- MessageThread.
- ApprovalTask.
- DecisionRecord.
- AuditEvent.
- IntegrationConnection.

Immediate model cleanup priorities:

- Normalize organization scoping on all business entities.
- Add optimistic locking or version fields on mutable financial and workflow records.
- Standardize timestamps and actor attribution.
- Separate tenant PII from operational user records where practical.
- Ensure payment ledger writes are append-only.
- Ensure AI and approval records reference source evidence.

### 7.7 Frontend Strategy

The current React/Vite app should be treated as a migration reference. The operator experience will move to Next.js and should be rebuilt around decision workflows rather than page inventory.

Recommended frontend approach:

- Use React + TypeScript.
- Use Next.js for the new operator web app.
- Build one operator shell with dense operational navigation.
- Keep tenant, owner, and vendor portals focused and separate.
- Use a shared design token system, but allow domain-specific components.
- Build a reusable decision card, approval panel, evidence drawer, activity timeline, entity search, and workflow timeline.
- Avoid generic dashboards that do not lead to executable decisions.

Critical UX surfaces:

- Command center.
- Decision queue.
- Entity detail pages with timeline and related work.
- Workflow execution panels.
- Unified inbox.
- Ledger and reconciliation views.
- Maintenance dispatch board.
- Application review surface.
- Owner statement review.

## 8. Recommended Stack

Keep or adopt:

- Language: TypeScript.
- Backend: NestJS.
- Database: PostgreSQL.
- ORM: Prisma, with careful migration discipline.
- Queue/jobs: BullMQ on Redis.
- Frontend: Next.js, React, and TypeScript for the operator app; keep the existing Vite app only as a reference until migrated workflows are retired.
- UI: Tailwind plus a small owned component system. Use NextUI only where it does not fight product-specific workflows.
- Auth: JWT/session hybrid with refresh tokens, MFA for admins/operators, RBAC and organization scoping.
- Payments: Stripe.
- Payment/banking standard: Stripe is final for MVP.
- Accounting: QuickBooks Online integration.
- E-signature: DocuSign or provider adapter.
- AI: Azure OpenAI/OpenAI-compatible gateway with provider abstraction.
- Retrieval: pgvector first.
- Documents/photos: S3-compatible object storage.
- Observability: Sentry, OpenTelemetry, Prometheus/Grafana.
- Testing: Jest, Vitest, Playwright, Supertest, contract tests.
- Infrastructure: Docker for local, managed cloud services for production.

Avoid for now:

- Microservices for every domain.
- Blockchain/smart contract features unless there is a concrete legal/business use case.
- Autonomous AI execution without approvals.
- Multiple overlapping frontend apps for the same user role.
- Building a custom workflow engine so abstract that it slows the first release.

## 9. Implementation Roadmap

### Phase 0: Product and Architecture Decisions

Duration: 1 to 2 weeks.

Goals:

- Confirm the Kansas MVP legal/compliance scope.
- Move the operator app to Next.js; do not port unaudited/stale Vite pages.
- Freeze domain vocabulary and canonical workflow list.
- Identify which existing code stays, gets wrapped, gets rewritten, or gets retired.
- Decide the minimal app-owned accounting boundary for production SaaS.

Deliverables:

- Final PRD.
- Architecture decision record.
- Canonical domain model.
- Workflow inventory: `docs/canonical-workflow-inventory.md`.
- API contract standard, informed by `docs/operator-contract-audit.md` and `docs/api-route-ownership.md`.
- Data risk and compliance checklist.
- Kansas compliance matrix for fair housing, adverse action, notices, deposits, late fees, payment plans, and eviction-adjacent workflows: `docs/kansas-compliance-matrix.md`.
- Accounting MVP scope: chart of accounts, double-entry ledger, bank reconciliation, owner statements, distributions, and QuickBooks export/sync position. Detailed in `docs/accounting-mvp-spec.md`.

### Phase 1: Platform Foundation

Duration: 3 to 5 weeks.

Goals:

- Standardize API responses, errors, auth, organization scoping, audit events, and idempotency.
- Establish workflow/approval/decision primitives.
- Harden CI, test data, local environment, and seed flows.
- Create typed API client for frontend.

Deliverables:

- Contract-first API package.
- Workflow engine v1.
- DecisionRecord and AuditEvent models.
- ApprovalTask model and UI.
- Event envelope standard.
- Critical smoke tests.

### Phase 2: Operator Command Center MVP

Duration: 4 to 6 weeks.

Goals:

- Ship a useful operator home screen.
- Connect real backend signals to decision cards.
- Add approval and execution for selected workflows.

MVP decision types:

- Delinquency follow-up.
- Maintenance triage.
- Application review.
- Renewal review.
- Payment exception.
- Inspection action item.

Deliverables:

- Command center.
- Decision queue.
- Evidence drawer.
- Approval panel.
- Workflow timeline.
- Daily briefing endpoint.
- Audit trail for approved actions.

### Phase 3: Core Operational Workflows

Duration: 8 to 12 weeks.

Goals:

- Make the system operationally useful end to end.

Workflows:

- Property and unit setup.
- Tenant application to lease.
- Lease signing.
- Tenant payment and reconciliation.
- Maintenance request to vendor dispatch.
- Inspection to repair estimate.
- Renewal offer to signed renewal or move-out.
- Owner statement review.

Deliverables:

- Integrated operator workflows.
- Tenant portal workflows.
- Owner statement workflow.
- Vendor dispatch workflow.
- Stripe and DocuSign production hardening.
- QuickBooks exception handling.

### Phase 4: AI Decision Layer

Duration: 6 to 10 weeks, overlapping with Phase 3 where safe.

Goals:

- Add AI where it materially reduces work or improves decisions.

Deliverables:

- AI gateway.
- RAG indexing for documents, leases, policies, messages, and work history.
- Orchestrator and first specialist agents.
- Maintenance classifier.
- Communication drafter.
- Lease/application summarizer.
- Repair estimator.
- Bookkeeping categorizer.
- AI evaluation harness and audit log.

### Phase 5: Production Hardening

Duration: 4 to 8 weeks.

Goals:

- Prepare for real customer data and production operation.

Deliverables:

- Security review.
- MFA enforcement for operators/admins.
- PII handling policy.
- Dependency vulnerability cleanup.
- Load tests for search, payments, work orders, and command center.
- Webhook replay and idempotency tests.
- Backup/restore drill.
- Monitoring dashboards and alerts.
- Accessibility pass for critical flows.

### Phase 6: Scale and Differentiation

Duration: ongoing.

Goals:

- Expand beyond MVP into deeper automation and optimization.

Potential work:

- Advanced rent optimization.
- Predictive maintenance.
- Owner portfolio analytics.
- Mobile field inspection app.
- Vendor bid marketplace.
- Jurisdiction-specific compliance packs.
- Automated monthly close assistant.
- Data warehouse and BI.

## 10. MVP Recommendation

The most efficient MVP is not "all property management features." It is a decision-driven operating loop around the highest-frequency, highest-value workflows.

MVP constraints:

- Production SaaS for solo landlords, small property managers, and mid-size property managers.
- Designed for customers managing up to 250 units.
- Kansas first, with compliance controls treated as first-class product requirements.
- Long-term residential plus student and affordable residential variants.
- Commercial and short-term rentals are post-MVP.
- Private beta paid launch.
- Private beta designed around roughly 30 units per customer.
- Affordable housing compliance reporting is post-MVP.
- Mobile-responsive web first; native mobile apps are post-MVP.
- App-owned accounting, with QuickBooks treated as an integration/export target rather than the source of truth.
- Stripe is the final MVP payment processor.
- Low-risk AI auto-execution allowed only through explicit guardrails and allowlists.

Recommended MVP:

- Operator command center.
- Portfolio/property/unit foundation.
- Tenant/applicant records.
- Applications and lease lifecycle.
- Payments: rent, fees, deposits, partial payments, payment plans, refunds, reversals, and owner distributions.
- App-owned accounting: chart of accounts, double-entry ledger, bank transaction import, reconciliation queue, journal entries, owner statements, reserves, and distributions.
- Maintenance request and triage.
- Inspections and repair estimates.
- Messaging and notifications.
- Documents and e-signature.
- Owner portal basics.
- Compliance workflows for fair housing, adverse action, legal notices, late fees, deposits, and eviction-adjacent escalation.
- AI-assisted drafting, summarization, classification, recommendations, prediction, and guarded low-risk auto-execution.

Defer:

- Advanced mobile features.
- Native mobile apps.
- Complex vendor marketplace.
- Multi-state legal automation.
- Commercial property workflows.
- Short-term rental operations.
- Fully automated legal/compliance decisions.
- Fully autonomous AI.
- Smart contracts/Web3.
- Enterprise-scale features for 1,000+ or 10,000+ unit portfolios.

## 11. Success Metrics

Operational:

- Time from tenant maintenance request to triage.
- Time from triage to vendor assignment.
- Time from application submission to decision.
- Renewal offers sent before deadline.
- Delinquency actions completed on schedule.
- Payment reconciliation exception rate.
- Owner statement close time.

Financial:

- Delinquency percentage.
- Collection recovery rate.
- Vacancy days.
- Renewal retention.
- Maintenance cost variance.
- Owner distribution accuracy.

AI:

- Recommendation acceptance rate.
- Draft edit distance.
- Classification accuracy.
- Human override rate.
- Hallucination or unsupported-claim rate.
- Cost per resolved workflow.

Reliability:

- p95 API latency for critical flows.
- Webhook processing lag.
- Queue backlog.
- Error rate.
- Test coverage for critical workflow paths.
- Audit completeness.

## 12. Key Risks

- Breadth over depth: the app already has many modules, but decision workflow quality matters more than feature count.
- Frontend drift: multiple UI patterns can dilute operator efficiency.
- API mismatch: existing docs mention response shape mismatches; fix contract coherence early.
- AI trust: AI must be grounded, auditable, and constrained.
- Payment and accounting correctness: financial operations require idempotency, append-only ledgers, and reconciliation.
- Compliance: screening, adverse action, notices, fair housing, privacy, and payment rules require human review and audit trails.
- Data quality: AI and reporting will fail without normalized, organization-scoped, timestamped, actor-attributed data.

## 13. Owner Decisions Captured

The following decisions are now part of the product plan:

1. Target customer: mixed segment covering solo landlords, small property managers, and mid-size property managers.
2. Initial portfolio size target: up to 250 units.
3. Property types: mixed, with residential workflows prioritized first.
4. Geography: Kansas first.
5. Compliance posture: fair housing, adverse action, and legal notices are first-class MVP requirements.
6. Payments: support rent, fees, partial payments, payment plans, deposits, refunds, and owner distributions.
7. Accounting: the app should own accounting.
8. AI tolerance: allow low-risk auto-execution with guardrails.
9. Differentiator: predictive AI and decision-driven workflow.
10. Launch goal: production SaaS.
11. Codebase direction: evolve `pms-master` and merge useful `keyring-os` concepts when cleaner and easier.
12. Timeline: as soon as possible.
13. Team constraint: small team of 2-4 people.
14. Commercial and short-term rentals: post-MVP.
15. Payments: Stripe is final.
16. Initial Kansas launch property scope: long-term residential plus student and affordable residential variants.
17. Paid launch scope: private beta.
18. First release platform scope: mobile-responsive web is enough; native mobile apps are post-MVP.
19. Private beta customer size: about 30 units per customer.
20. Affordable housing compliance reporting: post-MVP; launch support is operational workflow only.

Still needed:

1. Number of private beta customers to onboard first.
2. Preferred beta success threshold: revenue, retained users, completed workflows, or operational time saved.

## 14. Immediate Next Steps

1. Review `docs/kansas-compliance-matrix.md` with Kansas counsel and convert approved controls into backlog issues.
2. Define the smallest private beta scope that can ship with a 2-4 person team.
3. Start the Next.js operator app migration from audited, contract-clean workflows only.
4. Use `docs/operator-contract-audit.md` to retire, wrap, or fix existing backend/frontend contracts before porting features.
5. Create the canonical workflow inventory and rank workflows by business value. Done: `docs/canonical-workflow-inventory.md`.
6. Define the accounting MVP in detail before expanding payment flows. Done: `docs/accounting-mvp-spec.md`.
7. Define the AI auto-execution allowlist and approval thresholds.
8. Implement Phase 1 foundations before adding more product surface.
