# GO / NO-GO Note — Post P2 (P0+P1+P2)

Date: 2026-03-06  
Reference checklist: `reports/SMOKE_CHECKLIST_POST_P2.md`

## Scope considered shipped
- P0-1 Stripe Pay Now checkout session flow
- P0-2 Tenant maintenance immediate list refresh after create
- P0-3 Maintenance photo multipart upload
- P1-1 PM/Admin maintenance create from management UI
- P1-2 Inspection Manager navigation availability
- P1-3 Messaging start-thread flow
- P2 Inspection request approval workflow (tenant submit, PM decision, tenant gated start)

---

## Mandatory technical gate before GO

### Migration gate (P2)
`inspection_request` migration **must** be applied before smoke sign-off:

```bash
cd tenant_portal_backend
npx prisma migrate deploy
npx prisma generate
```

Required migration id:
- `20260306040500_inspection_request_approval_workflow`

If migration is missing or partially applied: **NO-GO**.

---

## Exact high-risk checks to confirm

### Tenant critical checks
- Route `/payments` + API `POST /api/payments/stripe/checkout-session`
- Route `/maintenance` + APIs:
  - `POST /api/maintenance`
  - `POST /api/maintenance/:id/photos` (multipart `files[]`)
- Routes `/tenant/inspections` and `/tenant/inspections/:id` + APIs:
  - `POST /api/inspections/requests`
  - `POST /api/inspections/start` (must be blocked unless approved)
- Route `/messaging` + API `POST /api/messaging/threads`

### PM/Admin critical checks
- Route `/maintenance-management` + API `POST /api/maintenance`
- Route `/inspection-management` (and `/inspections` redirect)
- Route `/inspection-management` + APIs:
  - `GET /api/inspections/requests`
  - `PATCH /api/inspections/requests/:id/decision`
- Route `/messaging` + API `POST /api/messaging/threads`

### Cross-role P2 workflow check
- Tenant submit request → PM/Admin approve/deny → tenant start only when approved.

---

## Decision rubric

## GO when all are true
- Migration applied and verified.
- Smoke checklist passes for all P0+P1+P2 scoped items.
- Approval gating works: unapproved/denied requests cannot start.
- No P0 regressions and no repeated 5xx errors in smoke logs.

## NO-GO triggers
- Any P0 failure (payments, maintenance list immediacy, or photo upload).
- P2 gate bypass (tenant can start without approval).
- P2 decision endpoint or request list broken for PM/Admin.
- Migration not applied or data model mismatch causing runtime errors.

---

## Current recommendation
**Status:** CONDITIONAL GO (pending smoke execution using checklist).  

- If checklist passes end-to-end with migration confirmed: **GO**.
- If any NO-GO trigger occurs: **NO-GO** until fixed + re-smoked.
