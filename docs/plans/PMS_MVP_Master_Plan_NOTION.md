# Property Management Suite (PMS) — Comprehensive Plan to MVP

Last updated: 2026-02-09

## TL;DR
You’re building a multi-tenant, role-based Property Management Suite with an AI-powered inspection→estimate/work-plan workflow and a maintenance system that reduces labor + friction.

MVP buyer: **Small PM (1–200 units)**
Property types: **single-family / multifamily / mixed / student**
Payments: **rent + fees + partial payments + autopay**
Comms: **in-app + email + SMS**
Inspections: **field staff (mobile-first)**

---

## 0) What this plan is
This is the feature-by-feature and workflow-by-workflow path from today’s repo to a demoable, sellable MVP.

It includes:
- product intent summary (from repo docs + work done)
- MVP workflows and acceptance criteria
- market comparison + stakeholder needs + pain points
- differentiation strategy
- final product (hypothetical) overview + user stories
- bite-sized task breakdown

---

## 1) Your intent (summary)
### 1.1 The product
A multi-tenant Property Management Suite with role-based experiences:
- Tenant portal (lease/docs, payments, maintenance, messaging)
- Property manager portal (properties/units, leasing, maintenance ops, inspections/estimates, reporting)
- Admin/back office (org/roles/security/monitoring)
- AI-assisted workflows (inspection→estimate/work-plan; maintenance triage; rent optimization; leasing agent)

### 1.2 The thesis
We’re not trying to be "feature complete" in a sloppy way. We’re trying to ship a product that feels:
- fast to adopt
- clean and predictable
- secure by default
- AI-powered only where it produces measurable ROI

---

## 2) Where we are today (gap to MVP)
### 2.1 Strengths
- broad module coverage
- modern stack (React/TS + NestJS/TS + Prisma/Postgres)
- strong structure for role-based UX

### 2.2 MVP killers (we must prevent)
- contract drift (API response envelopes mismatch)
- money-flow edge cases (payments/webhooks/partials)
- permission leaks (cross-org/cross-lease)
- unclear maintenance workflow states
- onboarding friction (seed/import/training)

---

## 3) Competitive landscape (who we’re compared to)
Incumbents: AppFolio, Buildium, Yardi Breeze (plus DoorLoop, TurboTenant, TenantCloud).

### Our stance
We don’t beat them on everything in V1.
We win by:
- faster adoption (lower setup pain)
- cleaner UX + explainability
- AI that reduces labor (not AI theater)
- strict permission boundaries + auditability

---

## 4) Stakeholders + what they want
Stakeholders:
- Owners/investors (control + approvals + transparency)
- PM staff (speed + fewer mistakes + fewer calls)
- Tenants (fast fixes + clear status)
- Vendors/techs (complete job info + scheduling)
- Accounting (clean ledger + reconciliation + exports)

Common pain points:
- reactive maintenance chaos
- fragmented communication with no history
- confusing ledgers/reporting
- payment friction (autopay/partials/fees/failures)
- onboarding pain (data migration, training, hidden costs)

---

## 5) What sets us apart (differentiation)
- Inspection → Estimate/Work Plan as a first-class workflow
- Explainable AI suggestions (rationale + confidence + fallback)
- Owner involvement model built-in (create + read + comment; not operational mutations)
- Contract coherence + test-first security boundaries

---

## 6) MVP definition (feature-by-feature, workflow-by-workflow)
### The MVP demo story (north star)
1) PM creates property + unit
2) PM assigns lease to tenant (docs visible)
3) Tenant pays rent (fees/partials/autopay)
4) Tenant submits maintenance request (photos)
5) PM triages/assigns/closes request + messages tenant
6) PM performs inspection in field → generates estimate/work plan
7) Owner views, comments, initiates maintenance request

### Feature areas
- Foundation (P0): contract coherence + auth/roles + org scoping + seed/demo + monitoring
- Properties/Units: CRUD + list/detail
- Leases/Docs: view + share + signing (minimal)
- Payments: methods + autopay + partials + receipts + webhooks
- Maintenance: request + photos + triage + assignment + status + notes + completion
- Messaging: tenant↔PM threads + attachments + audit history
- Inspections/Estimates: mobile capture + action items + deterministic-ish estimate range
- Notifications: email + SMS + in-app (MVP-lite)

---

## 7) Hypothetical final product overview (future)
Tenant:
- onboarding + insurance proof + notices
- lease lifecycle + renewals
- payments (split/partials/autopay/fees)
- guided maintenance troubleshooting + appointment windows

PM:
- portfolio dashboard
- leasing funnel end-to-end
- maintenance SLA + approvals + vendor performance
- inspections templates + mobile-first + work plan generation
- accounting + exports + QuickBooks

Owner:
- statements + docs + approvals-above-threshold
- transparency into maintenance costs/status

Admin:
- audit logs, org/roles, monitoring

---

## 8) User stories (examples)
Tenant:
- Pay rent in under 60 seconds
- Submit maintenance request with photos and track status

PM:
- Single queue with priority + SLA and assignment
- Generate explainable estimates from inspections

Owner:
- Stay in the loop and approve high-cost repairs

---

## 9) Bite-sized task breakdown to MVP
Track A (MVP demo path):
- define demo script + acceptance criteria
- contract coherence sweep
- payments happy path + webhooks + partials + autopay
- maintenance happy path + notifications
- messaging stability
- inspection→estimate demo path (mobile)
- owner portal minimum
- seed/demo data and 1-click startup

Track B (trust/security):
- permissions matrix
- expand E2E boundary tests
- audit log

Track C (sleek UX):
- consistent success/error toasts
- accessibility pass on core flows

Track D (AI ROI):
- maintenance triage + explainability
- inspection action items → suggested work plan

---

## 10) Open questions (to prevent wrong MVP)
- Which state(s) are we targeting first (for compliance, forms, fees)?
- Do we need cash payments (retail pay) in MVP?
- Do we need vendor portal in MVP or only PM/vendor assignment?

---

## 11) What happens next
I’ll translate this into strict tickets in `AGENT-BOARD.md`, assign the right sub-agents, review outputs, then I’ll implement/commit in main.
