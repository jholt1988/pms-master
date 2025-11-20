Lease Lifecycle Upgrade Plan
============================

Current State
-------------
- Schema: `Lease` model only stores basic dates/amounts with strict one-to-one tenant/unit constraints; no lifecycle metadata (status, deposits, move-in/out tracking) or linked history tables.
- Backend: `LeaseService` exposes create/read/update without validation, status gating, or downstream automation; no renewal/termination workflows, deposit management, or audit logging.
- Frontend: Manager `LeaseManagementPage.tsx` focuses on billing schedules/autopay; tenant `MyLeasePage.tsx` shows static lease data without renewal actions or notices.
- Integrations: Billing schedules exist but aren't synchronized with lease changes; no notifications or maintenance hooks when leases approach renewal or termination.

Objectives
----------
1. Support full lease lifecycle: draft, active, renewal, termination, closed, holdover.
2. Automate recurring billing updates, deposit tracking, and compliance notices.
3. Provide managers and tenants with proactive workflows (renewal decisions, move-out checklists, document handling).
4. Maintain audit history for amendments and status changes to satisfy compliance and reporting.

Schema Enhancements (Prisma)
---------------------------
- Expand `Lease` model:
  - `status` (`LeaseStatus` enum: DRAFT, PENDING_APPROVAL, ACTIVE, RENEWAL_PENDING, NOTICE_GIVEN, TERMINATING, TERMINATED, HOLDOVER, CLOSED).
  - `noticePeriodDays`, `moveInAt`, `moveOutAt`, `autoRenew`, `autoRenewLeadDays`, `depositAmount`, `depositHeldAt`, `depositReturnedAt`, `depositDisposition` (`DepositDisposition` enum: HELD, PARTIAL_RETURN, FORFEITED, RETURNED).
  - `renewalOfferedAt`, `renewalDueAt`, `renewalAcceptedAt`, `terminationReason`, `terminationRequestedBy` (`LeaseTerminationParty` enum: MANAGER, TENANT, SYSTEM), `terminationEffectiveAt`.
  - `rentEscalationPercent`, `rentEscalationEffectiveAt`, `billingAlignment` (enum for PRORATE, FULL_CYCLE).
  - `currentBalance` (numeric snapshot for dashboard).
- New supporting models:
  - `LeaseHistory` capturing status transitions, rent changes, deposit events, actor metadata.
  - `LeaseDocument` linking uploaded files (lease contract, addenda, move-in inspection).
  - `LeaseRenewalOffer` storing proposed terms, escalation, response state.
  - `LeaseNotice` for notices (move-out, rent increase) with delivery method and acknowledgement.
- Update relations:
  - Link `MaintenanceRequest` optionally to leases for move-out inspections.
  - Tie `Invoice`/`RecurringInvoiceSchedule` to lease statuses (e.g., disable when terminated).

Backend Service Upgrades
------------------------
- Validation & lifecycle gating:
  - Draft creation requires unit availability check; enforce tenant/unit exclusivity with helpful errors.
  - Activation ensures deposit received, move-in date set, recurring billing created.
  - Status transitions (renewal pending, termination) require required fields (notice period, termination reason).
- Workflows:
  - Renewal pipeline: auto-generate offer N days before end, manager edits terms, tenant accepts/declines, escalate to holdover if no response.
  - Termination pipeline: capture notice, compute prorations, freeze autopay, trigger move-out checklist (maintenance/inspection).
  - Deposit ledger: on move-out finalize charges, schedule refund/forfeit, log in `LeaseHistory`.
- Automation & integrations:
  - Schedule jobs (Nest cron) to monitor leases expiring within lead window, send notifications (email/SMS placeholders). ✅ Initial cron scaffolding flags renewals and auto-closes completed terminations.
  - Sync billing: update recurring schedules when rent escalates or lease closes; prevent invoicing after termination.
  - Emit `SecurityEvent` entries for major actions (renewal offer, notice to vacate, deposit disposition).

API Surface Adjustments
-----------------------
- Manager endpoints:
  - `POST /leases/draft`, `PUT /leases/:id/approve`, `PUT /leases/:id/renewal-offer`, `PUT /leases/:id/terminate`, `PUT /leases/:id/deposit`.
  - Bulk queries: `/leases/upcoming-renewals`, `/leases/ending-soon`, filters by status/property.
- Tenant endpoints:
  - `GET /leases/current` (existing), `POST /leases/:id/renewal-response`, `POST /leases/:id/notice`, `GET /leases/:id/documents`.
- Notifications:
  - Expose queue endpoints for upcoming tasks (renewal responses due, move-out checklist items).
- DTO/validation: introduce typed DTOs for each action, enforce date/rent validation and cross-field constraints.

Frontend Enhancements
---------------------
- Manager `LeaseManagementPage.tsx`:
  - Replace static list with status board (columns by lifecycle stage).
  - Renewals panel showing offers, responses, automated reminders.
  - Deposit ledger view (amount held, itemized deductions, refund status).
  - Timeline component summarizing lease history and upcoming milestones.
- Tenant `MyLeasePage.tsx`:
  - Display renewal offer details with Accept/Decline flow.
  - Show move-in/out checklist, documents, deposit balance.
  - Alert banners for approaching end date or pending actions.
- Shared components:
  - Lease status badges, timeline, document upload modal, rent escalation calculator.

Testing & Quality
-----------------
- Unit tests:
  - Service methods for status transitions, deposit handling, billing sync.
  - Prisma tests for unique constraints and cascades (e.g., no overlapping leases on the same unit).
- Integration tests:
  - Renewal flow from offer creation to acceptance, ensuring invoices update.
  - Termination/move-out scenario verifying deposit ledger and maintenance hook.
- E2E (Cypress/Playwright):
  - Tenant acceptance of renewal, manager approval, autopay continuity.
  - Manager issues notice; UI shows checklists, invoices halt after termination.

Rollout Considerations
----------------------
- Migration strategy:
  - Create enums/models with `prisma migrate`.
  - Backfill existing leases with default status (ACTIVE) and derived notice/move-in/out info.
  - Set default deposit amounts to 0 to avoid null calculations.
- Data quality:
  - Identify overlapping tenant/unit leases; enforce cleanup before migration.
  - Map manual notes to `LeaseHistory` if available.
- Feature flag:
  - Consider toggling renewal workflow for pilot properties while data stabilizes.
- Cross-team comms:
  - Align with accounting on deposit disposition process.
  - Train property managers on new dashboards and required fields.

Implementation Phases
---------------------
1. Schema migration & seed updates (statuses, history tables, enums) – run `npx prisma migrate dev --name lease_lifecycle_upgrade` locally and `prisma migrate deploy` in staging/prod.
2. Backend service refactor covering lifecycle guards and renewal/termination pipelines.
3. Billing sync & automation jobs (renewal reminders, termination actions).
4. Frontend manager dashboard redesign with lifecycle views.
5. Tenant portal updates for renewals/checklists/documents.
6. Notification integrations and final testing/QA pass.

Frontend & QA Checklist (next up)
---------------------------------
- Manager UI
  - ~~Replace `LeaseManagementPage.tsx` list with lifecycle board (columns: Draft, Active, Renewal Pending, Terminating, Closed) and embed renewal offer modal.~~
  - ~~Surface deposit ledger, status timeline (drawn from `LeaseHistory`), and auto-renew toggles.~~
  - ~~Add actions for creating renewal offers, recording notices, and viewing history/notes.~~
- Tenant UI
  - ~~Extend `MyLeasePage.tsx` to show renewal offer cards, move-out notice submission, and deposit summary.~~
  - Provide checklist UI (move-in/out tasks) and document download/upload integration.
- Testing
  - API integration tests for new endpoints (`/leases/:id/status`, `/renewal-offers`, `/notices`, `/history`).
  - E2E coverage: renewal offer acceptance flow, automated status transitions, notice capture.
  - Snapshot/unit tests for React components (status board, timelines, modals).

Implementation Progress (November update)
----------------------------------------
- Manager lifecycle dashboard now live (`tenant_portal_app/src/LeaseManagementPage.tsx`):
  - Kanban-style columns with status controls, renewal offer composer, notice logger, and history feed.
  - Billing/autopay summaries surfaced per card; state reset hooks keep forms in sync after updates.
- Tenant portal lease view (`tenant_portal_app/src/MyLeasePage.tsx`):
  - Displays deposit posture, autopay enrollment, renewal offers with accept/decline workflow, and move-out notice form.
  - Frontend now powered by tenant APIs for renewal responses and notices (see backend update below) and returns refreshed lease payloads for immediate UI sync.
  - Recent activity panel surfaces the latest portal submissions using lease history metadata (renewal decisions, notice requests, notes).
- Backend additions (`tenant_portal_backend/src/lease`):
  - Added `POST /leases/:id/renewal-offers/:offerId/respond` for tenants to accept/decline offers with optional notes and automatic status/history updates.
  - Added `POST /leases/:id/tenant-notices` so tenants can log move-out intent directly from the portal.
  - Lease history now captures structured metadata (decision, messages, requested move-out dates) to support analytics/compliance exports.

Testing Log
-----------
- `npm run build` (tenant portal) – completed successfully prior to final edits; later reruns hit CLI timeout, so `npx tsc --noEmit` executed to confirm type safety.
- `npm run build` (backend) – compiles cleanly after new tenant endpoints.
- UI smoke tests still pending: need Cypress/Playwright coverage for lifecycle transitions, tenant renewal acceptance, and notice submission.

Open Follow-ups
---------------
- ~~Add tenant-facing API endpoints:
  1. `POST /leases/:id/renewal-offers/:offerId/respond` → validates decision, updates offer status, logs history, and returns refreshed lease include graph.
  2. `POST /leases/:id/tenant-notices` → records move-out intent (likely wraps existing notice logic but relaxes role guard).~~
- Extend backend integration tests to cover new tenant workflows once endpoints exist.
- Add reporting coverage that exercises new lease history metadata (renewal decisions, move-out request payloads).
- Tenant UI checklist/documents section still outstanding; wire into maintenance/move-out artifacts when ready.
