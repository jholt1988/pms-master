# P1-3: Start Message Thread Flow

## Summary
Implemented a new **start thread** flow across backend + frontend:

- Added backend endpoint: `POST /api/messaging/threads`
- Added atomic service operation to create:
  1. a conversation
  2. its participants
  3. the initial message
- Added frontend **New thread** action in messaging inbox
- Added/updated tests for controller and service behavior
- Updated MSW handlers for the new messaging APIs used by the UI

---

## Backend changes

### 1) New DTO
**File:** `tenant_portal_backend/src/messaging/dto/messaging.dto.ts`

Added `CreateThreadDto`:

- `participantIds?: string[]` (UUID v4 array)
- `recipientId?: string` (UUID v4)
- `content: string` (required, non-empty)
- `subject?: string`
- `attachmentUrls?: string[]`

### 2) New service method
**File:** `tenant_portal_backend/src/messaging/messaging.service.ts`

Added `createThread(dto, creatorId, orgId?)`:

- Normalizes recipients from `participantIds` + `recipientId`
- Removes creator from recipient list
- Validates that at least one recipient remains
- Validates all participants exist (and org scope when provided)
- Uses a **single Prisma transaction** to:
  - create conversation (optional `subject`)
  - create participants
  - create initial message (with attachment metadata support)
- Returns conversation + `initialMessage`

### 3) New endpoint
**File:** `tenant_portal_backend/src/messaging/messaging.controller.ts`

Added:

- `POST /messaging/threads` (mounted under `/api` globally)

Behavior:

- Calls `messagingService.createThread(...)`
- Records two audit log events:
  - `CONVERSATION_CREATED`
  - `MESSAGE_SENT`
- Returns thread payload (conversation + initial message)

---

## Frontend changes

### Messaging UI: New Thread flow
**File:** `tenant_portal_app/src/domains/shared/features/messaging/MessagingPage.tsx`

Added:

- `New thread` button in conversation panel header
- Expandable compose form with:
  - recipient select
  - optional subject
  - initial message body
- Recipient loading:
  - Property managers: `GET /messaging/tenants`
  - Non-managers (tenants): `GET /messaging/property-managers`
- Thread creation request:
  - `POST /messaging/threads`
- On success:
  - prepends thread to conversation list
  - auto-selects new thread
  - shows initial message in message pane

Also improved compatibility rendering for existing models:

- Participant name resolution now supports nested shape (`participant.user.username`)
- Message author resolution now supports `sender` in addition to legacy `author`

---

## Mock API updates (frontend test/dev compatibility)

**File:** `tenant_portal_app/src/mocks/handlers.ts`

Added handlers for:

- `POST /messaging/threads`
- `GET /messaging/property-managers`
- `GET /messaging/tenants`
- `POST /messaging/messages`
- `GET /messaging/conversations/:id`

This keeps local mock workflows aligned with updated frontend behavior.

---

## API contract

### Endpoint
`POST /api/messaging/threads`

### Request body
```json
{
  "recipientId": "uuid-v4",
  "participantIds": ["uuid-v4"],
  "subject": "optional subject",
  "content": "Required first message",
  "attachmentUrls": ["https://..."]
}
```

### Response (201)
```json
{
  "id": 123,
  "subject": "optional subject",
  "participants": [
    {
      "user": {
        "id": "uuid",
        "username": "user@example.com",
        "role": "TENANT"
      }
    }
  ],
  "initialMessage": {
    "id": 999,
    "conversationId": 123,
    "content": "Required first message",
    "sender": {
      "id": "uuid",
      "username": "sender@example.com",
      "role": "PROPERTY_MANAGER"
    }
  }
}
```

---

## Validation rules

- `content` is required and must be non-empty.
- At least one recipient is required (via `recipientId` and/or `participantIds`, excluding creator).
- Recipient and participant IDs must be valid UUID v4.
- All participants must exist.
- If org context is present, all participants must be scoped to the org.

Error examples:

- `400 Bad Request`: no recipients / invalid participant set / unknown participants
- `401/403`: auth/org-access restrictions enforced by existing guards + service checks

---

## Tests

### Added
- `tenant_portal_backend/src/messaging/messaging.service.spec.ts`
  - validates missing recipient failure
  - validates atomic create flow (conversation + initial message)

### Updated
- `tenant_portal_backend/src/messaging/messaging.controller.spec.ts`
  - includes thread creation coverage
  - verifies dual audit log recording

### Executed
In `tenant_portal_backend`:

- `npm test -- src/messaging/messaging.controller.spec.ts src/messaging/messaging.service.spec.ts --runInBand`
- Result: **PASS (5 tests)**

Note: frontend type-check currently has unrelated pre-existing errors:

- `src/App.tsx(170,69): 'user' is possibly 'null'`
- `src/PaymentsPage.tsx(114,62): Cannot find name 'NeedsAuthAttempt'`
