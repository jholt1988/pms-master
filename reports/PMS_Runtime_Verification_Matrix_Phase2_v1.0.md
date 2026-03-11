# PMS Runtime Verification Matrix — Phase 2

Environment: existing shared dev  
Repo: `/workspace/clawdbot_remote/pms-master`  
Evidence rule: every case must capture request/response or screenshot + DB state check.

## Status Legend
- **Not Started**
- **Verified**
- **Partial**
- **Blocked**
- **Failed**

---

## A) Inspections (Priority 1)

| ID | Workflow | Role(s) | Preconditions | Steps | Expected Result | Evidence Required | Status |
|---|---|---|---|---|---|---|---|
| INS-01 | Tenant creates inspection request | Tenant | Tenant linked to lease/unit | Submit request from tenant UI | Request appears `PENDING` in PM queue | UI screenshot + DB row in `InspectionRequest` | Not Started |
| INS-02 | PM approves request | Admin/PM | Existing `PENDING` request | Approve in inspection management | Request becomes `APPROVED` + `decidedAt` set | UI screenshot + API response + DB state | Not Started |
| INS-03 | Tenant starts approved inspection | Tenant | `APPROVED` request | Open tenant inspection and start | Request `STARTED`, `startedInspectionId` set | UI screenshot + DB check | Not Started |
| INS-04 | Auto-seeded rooms/checklist exists on start | Tenant | Started inspection | Open detail page | Rooms + checklist items visible (non-empty) | UI screenshot + room/item count query | Not Started |
| INS-05 | Tenant marks item needs attention without photo | Tenant | Started inspection with checklist item | Set requiresAction=Yes and save | Save blocked with validation message | UI + API 4xx evidence | Not Started |
| INS-06 | Tenant uploads photo then saves actionable item | Tenant | Actionable item | Upload photo URL + save | Save succeeds | UI + API success + DB photo row | Not Started |
| INS-07 | Tenant completes inspection | Tenant | Required fields satisfied | Complete inspection | Status transitions to `COMPLETED` | UI + API + DB state | Not Started |
| INS-08 | PM sees completed inspection and findings | Admin/PM | Completed inspection | View in PM inspection detail | Completed state + data visible | UI screenshot + API payload | Not Started |

---

## B) Applications (Priority 2)

| ID | Workflow | Role(s) | Preconditions | Steps | Expected Result | Evidence Required | Status |
|---|---|---|---|---|---|---|---|
| APP-01 | Tenant submits rental application | Tenant | Public/applicant route accessible | Fill required fields + submit | Application created | UI + API + DB row in `RentalApplication` | Not Started |
| APP-02 | Admin views submitted applications list | Admin | Existing submitted app | Open rental applications page | New application appears | UI + API payload | Not Started |
| APP-03 | Admin updates status | Admin | Existing application | Change status (review/approved/denied path) | Status persists across refresh | UI + API + DB state | Not Started |
| APP-04 | Validation behavior | Tenant | Application form | Submit missing required fields | Clear validation errors shown, no create | UI + network evidence | Not Started |
| APP-05 | Error handling on backend failures | Admin | Force one invalid action | Trigger invalid update | User gets actionable error, no silent fail | UI + backend logs | Not Started |

---

## C) Leasing (Priority 3)

| ID | Workflow | Role(s) | Preconditions | Steps | Expected Result | Evidence Required | Status |
|---|---|---|---|---|---|---|---|
| LEA-01 | Create or ingest leasing lead | Admin/PM | Leasing page accessible | Create lead | Lead appears in list/detail | UI + API + DB row | Not Started |
| LEA-02 | Lead messaging/inquiry handoff | Admin/PM | Existing lead | Send message/inquiry | Timeline updates and persists | UI + API payload | Not Started |
| LEA-03 | Lead status transitions | Admin/PM | Existing lead | Move status across funnel | Status updates persist | UI + API + DB state | Not Started |
| LEA-04 | Property search and match from lead | Admin/PM | Properties seeded | Search properties from lead context | Results show and can be linked | UI + API evidence | Not Started |

---

## D) Payments (Sandbox-only controlled checks)

| ID | Workflow | Role(s) | Preconditions | Steps | Expected Result | Evidence Required | Status |
|---|---|---|---|---|---|---|---|
| PAY-01 | Verify sandbox/test config active | Admin | Access to env + backend logs | Check Stripe key mode + config markers | Explicit test-mode evidence | env snippet/log evidence | Not Started |
| PAY-02 | Safe payment page access | Tenant | Logged-in tenant | Open payment page | Page loads without runtime errors | UI screenshot + console/network | Not Started |
| PAY-03 | Initiation path (non-destructive) | Tenant | sandbox verified | Start checkout/setup intent | Returns expected sandbox payload | API response evidence | Not Started |
| PAY-04 | Duplicate submit protection | Tenant | Initiation available | Double-submit action | Single authoritative attempt or guarded error | UI + API evidence | Not Started |

---

## E) MIL Runtime Touchpoints (Priority after domain checks)

| ID | Check | Domain | Preconditions | Steps | Expected Result | Evidence Required | Status |
|---|---|---|---|---|---|---|---|
| MIL-01 | Flag reality check | All | Backend running | Inspect effective flag values | Flags resolved as expected in shared dev | env + startup logs | Not Started |
| MIL-02 | MIL in priority workflows | Inspections/Apps/Leasing | Executed workflows | Trace requests/logs for MIL gates | Confirm real influence vs none | logs + code pointer + runtime trace | Not Started |
| MIL-03 | Auditability path | All | Trigger model-related flow | Check audit/log artifacts | Durable evidence exists or gap documented | DB/log evidence | Not Started |

---

## Seeded Accounts / Data Setup Checklist

- [ ] Admin account seeded and org-linked
- [ ] PM account seeded and org-linked (if separate from admin)
- [ ] Tenant account seeded and lease-linked
- [ ] At least 1 property with units
- [ ] At least 1 active lease tied to tenant
- [ ] Baseline inspection request seed data
- [ ] Baseline application data

---

## Evidence Bundle Paths

- `reports/audit-evidence/phase2/screenshots/*`
- `reports/audit-evidence/phase2/api/*`
- `reports/audit-evidence/phase2/db/*`
- `reports/audit-evidence/phase2/logs/*`

