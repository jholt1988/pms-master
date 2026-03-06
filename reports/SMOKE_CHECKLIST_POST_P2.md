# Post-P2 Smoke Checklist (P0 + P1 + P2)

Date: 2026-03-06  
Scope baseline: shipped items in
- P0-1 Stripe Pay Now checkout
- P0-2 Tenant maintenance instant list refresh
- P0-3 Maintenance photo upload (multipart)
- P1-1 PM/Admin create maintenance request
- P1-2 Inspection Manager navigation
- P1-3 Start message thread
- P2 Inspection approval workflow (tenant request + PM decision + tenant start gate)

---

## 0) Environment + Migration Gate (must pass first)

### 0.1 Backend/frontend up
- [ ] Backend running (`tenant_portal_backend`) and healthy
  - Check: `GET /api/health` → `200`
- [ ] Frontend running (`tenant_portal_app`) and login possible for:
  - [ ] Tenant user
  - [ ] PM/Admin user

### 0.2 **P2 migration applied** (`inspection_request` workflow)
- [ ] Run migration in backend:
  ```bash
  cd tenant_portal_backend
  npx prisma migrate deploy
  npx prisma generate
  ```
- [ ] Confirm migration `20260306040500_inspection_request_approval_workflow` is present in DB (`_prisma_migrations`).
- [ ] Sanity check new workflow endpoints respond (not 404):
  - [ ] `POST /api/inspections/requests`
  - [ ] `PATCH /api/inspections/requests/:id/decision`
  - [ ] `POST /api/inspections/start`
  - [ ] `GET /api/inspections/requests`

---

## 1) Tenant smoke checks (exact route + API mapping)

### T1 — P0-1 Pay Now flow
- **Route:** `/payments`
- **API:** `POST /api/payments/stripe/checkout-session`
- Steps:
  1. Login as tenant with at least one unpaid invoice.
  2. Open `/payments`.
  3. Click **Pay Now** on unpaid invoice.
- Expected:
  - [ ] Request made to `/api/payments/stripe/checkout-session` with `{ invoiceId, successUrl, cancelUrl }`
  - [ ] Response includes `checkoutUrl`, `sessionId`, `invoiceId`
  - [ ] Browser redirects to `checkoutUrl`
  - [ ] No UI crash; button shows loading/disabled while request is in flight

### T2 — P0-2 Maintenance request appears immediately
- **Route:** `/maintenance`
- **APIs:** `POST /api/maintenance`, `GET /api/maintenance`
- Steps:
  1. Login as tenant.
  2. Submit new maintenance request.
- Expected:
  - [ ] Request posts to `/api/maintenance`
  - [ ] New ticket appears immediately in list (optimistic insert)
  - [ ] Follow-up list fetch (`/api/maintenance`) reconciles canonical data
  - [ ] Sorting remains newest-first

### T3 — P0-3 Maintenance photo upload multipart
- **Route:** `/maintenance`
- **API:** `POST /api/maintenance/:id/photos` (multipart)
- Steps:
  1. Create or open a request.
  2. Attach image files (jpg/png/webp/heic/heif).
  3. Submit with optional caption.
- Expected:
  - [ ] Multipart request contains `files[]` (+ optional `caption`)
  - [ ] Backend returns `uploaded[]` and `count`
  - [ ] Uploaded file URLs are usable (e.g., `/uploads/maintenance/...`)
  - [ ] Validation works (rejects invalid mime/oversize)

### T4 — P2 Tenant inspection request submit
- **Route:** `/tenant/inspections`
- **API:** `POST /api/inspections/requests`
- Steps:
  1. Login as tenant with active lease.
  2. Submit MOVE_IN or MOVE_OUT request.
- Expected:
  - [ ] `POST /api/inspections/requests` returns created request with `PENDING` status
  - [ ] Request/status visible on tenant inspections list page

### T5 — P2 Tenant start gate enforcement
- **Route:** `/tenant/inspections/:id`
- **API:** `POST /api/inspections/start`
- Steps:
  1. Open inspection detail before PM decision.
  2. Try to start inspection.
  3. After PM approves, try again.
- Expected:
  - [ ] Start is blocked/hidden unless request status is `APPROVED`
  - [ ] Once approved, start call succeeds via `/api/inspections/start`
  - [ ] Resulting inspection status transitions to `IN_PROGRESS`

### T6 — P1-3 Tenant messaging thread creation
- **Route:** `/messaging`
- **API:** `POST /api/messaging/threads`
- Steps:
  1. Open messaging page.
  2. Click **New thread**.
  3. Pick PM recipient and send initial message.
- Expected:
  - [ ] Thread creation request sent to `/api/messaging/threads`
  - [ ] New thread appears in conversation list and auto-selects
  - [ ] Initial message visible in thread

---

## 2) PM/Admin smoke checks (exact route + API mapping)

### P1 — P1-1 PM/Admin create maintenance request
- **Route:** `/maintenance-management`
- **API:** `POST /api/maintenance`
- Steps:
  1. Login as PM/Admin.
  2. Open **New Request** modal.
  3. Submit with title/description/priority (+ optional property/unit/lease/due date).
- Expected:
  - [ ] Request accepted by `/api/maintenance`
  - [ ] Optional fields (`leaseId`, `dueDate`) accepted when provided
  - [ ] New ticket appears in list immediately

### P2 — P1-2 Inspection Manager navigation visibility
- **Routes:** `/inspection-management`, `/inspections` (redirect)
- Steps:
  1. Login as PM/Admin.
  2. Confirm nav item **Inspection Manager** exists.
  3. Click nav item.
  4. Visit `/inspections` directly.
- Expected:
  - [ ] Nav item visible in PM/Admin navigation
  - [ ] `/inspection-management` loads Inspection Management screen
  - [ ] `/inspections` redirects to `/inspection-management`

### P3 — P1-3 PM/Admin messaging thread creation
- **Route:** `/messaging`
- **API:** `POST /api/messaging/threads`
- Steps:
  1. Open messaging page as PM/Admin.
  2. Start new thread to tenant.
- Expected:
  - [ ] `/api/messaging/threads` succeeds
  - [ ] Thread + initial message are present in UI

### P4 — P2 PM/Admin request decision flow
- **Route:** `/inspection-management`
- **APIs:** `GET /api/inspections/requests`, `PATCH /api/inspections/requests/:id/decision`
- Steps:
  1. Open pending queue.
  2. Approve one request; deny another.
- Expected:
  - [ ] Pending requests fetched from `/api/inspections/requests`
  - [ ] Decision calls sent to `/api/inspections/requests/:id/decision` with `APPROVED`/`DENIED`
  - [ ] Only `PENDING` requests are decisionable
  - [ ] Status updates reflected in PM/Admin queue and tenant view

---

## 3) Cross-role E2E approval workflow (must pass)

1. [ ] Tenant submits request (`POST /api/inspections/requests`) → `PENDING`
2. [ ] PM/Admin approves (`PATCH /api/inspections/requests/:id/decision`) → `APPROVED`
3. [ ] Tenant starts (`POST /api/inspections/start`) → request `STARTED`, inspection `IN_PROGRESS`
4. [ ] Negative path: denied request cannot be started

---

## 4) Exit criteria for release

- [ ] All tenant checks T1–T6 pass
- [ ] All PM/Admin checks P1–P4 pass
- [ ] Cross-role workflow passes (including denied negative case)
- [ ] No P0/P1 regressions observed in changed flows
- [ ] No 5xx errors in backend logs during smoke run

If any P0 fails: **NO-GO**  
If only P2 edge-case fails with safe rollback available: decision at release lead discretion.
