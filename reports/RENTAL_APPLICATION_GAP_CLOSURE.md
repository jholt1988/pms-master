# Rental Application Gap Closure Report (WS1.1 + WS1.2 + WS1.3)

Source-of-truth workflow: `OpenLoops/01_Strategy/Property_Suite/Rental-Application.md`  
Traceability baseline: `reports/RENTAL_APPLICATION_TRACEABILITY_MATRIX.md`

## Scope Completed
- Closed backend workflow parity gaps for PM review actions (approve / deny / request info / schedule interview workflow handling).
- Hardened payments lease-context org scoping for PM access paths where invoice context is absent.
- Added focused backend tests for both areas.

---

## Requirement-by-Requirement Closure Status

| Requirement | Status | Evidence (code/tests) | Notes |
|---|---|---|---|
| PM can approve application | ✅ Closed | `tenant_portal_backend/src/rental-application/dto/review-action.dto.ts`; `tenant_portal_backend/src/rental-application/rental-application.controller.ts` (`POST /rental-applications/:id/review-action`); `tenant_portal_backend/src/rental-application/rental-application.service.ts` (`performReviewAction`, `APPROVE`) | Uses lifecycle transitions and optional approval note logging. |
| PM can deny application with reason | ✅ Closed | Same files as above (`DENY` path), note/audit capture in `performReviewAction` | Denial reason persisted as internal note when provided. |
| PM can request more information | ✅ Closed | `performReviewAction` (`REQUEST_INFO`) transitions to `DOCUMENTS_REVIEW` using valid transition pathing and creates note with details/deadline | Supports response deadline + structured note capture. |
| PM can schedule interview workflow | ✅ Closed (backend) | `performReviewAction` (`SCHEDULE_INTERVIEW`) transitions to `INTERVIEW` via path and creates schedule event through `ScheduleService.createEvent(...)`; module wiring in `rental-application.module.ts` | Uses schedule event type `TOUR` as interview slot surrogate and records linked note/event id. |
| Lease-context robustness in payments for PM role | ✅ Closed | `tenant_portal_backend/src/payments/payments.service.ts` (`getPaymentById`) now checks org via `invoice.lease.unit.property.organizationId` **or** `payment.lease.unit.property.organizationId`; include graph updated to load lease->unit->property | Prevents broken PM flow when payment lacks invoice relation. |

---

## Test Evidence

### Added tests
- `tenant_portal_backend/src/rental-application/rental-application.review-actions.spec.ts`
  - REQUEST_INFO transitions + note creation
  - SCHEDULE_INTERVIEW requires `scheduledAt`
  - SCHEDULE_INTERVIEW creates schedule event
- `tenant_portal_backend/src/payments/payments.lease-context.spec.ts`
  - PM access allowed from payment lease org context without invoice
  - PM access denied for cross-org context

### Command executed
From `tenant_portal_backend/`:

```bash
npm test -- --runInBand src/payments/payments.lease-context.spec.ts src/rental-application/rental-application.review-actions.spec.ts
```

### Result
- Test Suites: **2 passed**
- Tests: **5 passed**
- Failures: **0**

---

## Gaps Closed vs Baseline Matrix

Closed items from prior `PARTIAL` state:
1. PM review actions parity (approve/deny/request-info/schedule workflow handling) — backend endpoint + action orchestration added.
2. Payments lease-context role robustness for PM read flow — org scoping now resilient when invoice relation missing.

---

## Remaining Blockers / Dependencies

1. **PM dashboard UI wiring for new explicit review-action endpoint**  
   - Dependency: frontend integration in `tenant_portal_app/src/RentalApplicationsManagementPage.tsx` (currently status dropdown driven; no dedicated action UX for request-info/interview scheduling payload fields).
2. **Calendar-grade interview invites (external calendar integration)**  
   - Dependency: integration layer beyond current internal schedule event creation (Google/Microsoft calendar bridge not in this WS).
3. **Auto-save draft and applicant self-service tracking (from source doc future enhancements)**  
   - Dependency: separate product scope (frontend + persistence + auth/portal routing decisions).

---

## Files Changed (this WS)

- `tenant_portal_backend/src/rental-application/dto/review-action.dto.ts` (new)
- `tenant_portal_backend/src/rental-application/rental-application.controller.ts`
- `tenant_portal_backend/src/rental-application/rental-application.service.ts`
- `tenant_portal_backend/src/rental-application/rental-application.module.ts`
- `tenant_portal_backend/src/rental-application/rental-application.review-actions.spec.ts` (new)
- `tenant_portal_backend/src/payments/payments.service.ts`
- `tenant_portal_backend/src/payments/payments.lease-context.spec.ts` (new)
- `reports/RENTAL_APPLICATION_GAP_CLOSURE.md` (new)
