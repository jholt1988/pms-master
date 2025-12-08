# E-Signature Lifecycle Documentation

## Overview

The e-signature system manages the complete lifecycle of document signing from creation to completion, with support for multiple recipients, status tracking, reminders, and webhook-based updates.

---

## Lifecycle Stages

### 1. **Envelope Creation** (`CREATED` → `SENT`)

**Trigger:** Property manager creates a signature request for a lease

**Process:**
1. Property manager calls `POST /api/esignature/leases/{leaseId}/envelopes`
2. System validates lease exists and user has permission
3. Creates envelope in provider (DocuSign/HelloSign) via `dispatchProviderEnvelope()`
4. Creates `EsignEnvelope` record in database with status `CREATED` or `SENT`
5. Creates `EsignParticipant` records for each recipient with status `SENT`
6. Sends notification alerts to all recipients (`REQUESTED` event)

**Database State:**
- `EsignEnvelope.status`: `CREATED` or `SENT`
- `EsignParticipant.status`: `SENT` (for each recipient)
- `providerEnvelopeId`: ID from e-signature provider
- `providerStatus`: Raw status from provider

**Key Methods:**
- `createEnvelope()` - Main creation method
- `dispatchProviderEnvelope()` - Calls provider API
- `sendSignatureAlert()` - Sends notifications

---

### 2. **Envelope Delivery** (`SENT` → `DELIVERED`)

**Trigger:** Provider delivers the envelope to recipients (via email/SMS)

**Process:**
1. Provider sends envelope to recipients
2. Webhook received from provider (`handleProviderWebhook()`)
3. System updates envelope status to `DELIVERED`
4. Updates participant statuses if provided

**Database State:**
- `EsignEnvelope.status`: `DELIVERED`
- `EsignParticipant.status`: `SENT` or `VIEWED` (if recipient opened)

**Key Methods:**
- `handleProviderWebhook()` - Processes provider webhooks

---

### 3. **Recipient Viewing** (`VIEWED`)

**Trigger:** Tenant clicks "Sign Lease" button in frontend

**Process:**
1. Tenant calls `POST /api/esignature/envelopes/{envelopeId}/recipient-view`
2. System validates user is authorized (tenant or participant)
3. Finds matching participant by `userId` or `email`
4. Calls provider API to get signing URL (`requestRecipientView()`)
5. Updates participant status to `VIEWED`
6. Returns signing URL to frontend
7. Frontend opens URL in new window

**Database State:**
- `EsignParticipant.status`: `VIEWED`
- `EsignParticipant.recipientUrl`: Signing URL stored

**Key Methods:**
- `createRecipientView()` - Main method for getting signing URL
- `requestRecipientView()` - Calls provider API
- `validateReturnUrl()` - Ensures return URL is safe

**Provider API Call:**
```
POST /accounts/{accountId}/envelopes/{envelopeId}/views/recipient
Body: { recipientId, returnUrl }
```

---

### 4. **Signing Process** (`VIEWED` → `SIGNED`)

**Trigger:** Recipient signs document in provider's interface

**Process:**
1. Recipient signs document in DocuSign/HelloSign interface
2. Provider processes signature
3. Provider sends webhook to backend
4. System updates participant status to `SIGNED`
5. If all participants have signed, envelope moves to `COMPLETED`

**Database State:**
- `EsignParticipant.status`: `SIGNED`
- `EsignEnvelope.status`: `SENT` or `DELIVERED` (until all sign)

**Key Methods:**
- `handleProviderWebhook()` - Processes signing webhooks

---

### 5. **Envelope Completion** (`DELIVERED` → `COMPLETED`)

**Trigger:** All recipients have signed the document

**Process:**
1. Provider sends webhook with `status: COMPLETED`
2. System updates envelope status to `COMPLETED`
3. Downloads signed PDF and audit trail from provider
4. Saves documents to database via `attachFinalDocuments()`
5. Links documents to envelope (`signedPdfDocument`, `auditTrailDocument`)
6. Sends completion notifications to all participants

**Database State:**
- `EsignEnvelope.status`: `COMPLETED`
- `EsignEnvelope.signedPdfDocumentId`: Link to signed PDF
- `EsignEnvelope.auditTrailDocumentId`: Link to audit trail
- All `EsignParticipant.status`: `SIGNED`

**Key Methods:**
- `handleProviderWebhook()` - Processes completion webhook
- `attachFinalDocuments()` - Downloads and saves documents

**Documents Created:**
- **Signed PDF**: The final signed lease document
- **Audit Trail**: Certificate of completion with signature details

---

### 6. **Reminders** (Background Process)

**Trigger:** Scheduled job runs periodically (configurable)

**Process:**
1. Finds envelopes in `SENT` or `DELIVERED` status
2. Checks if envelope hasn't been updated in X days (default: 3)
3. Finds participants who haven't signed or declined
4. Checks reminder count hasn't exceeded max (default: 3)
5. Sends reminder notifications (`REQUESTED` event)
6. Updates reminder count in metadata

**Configuration:**
- `ESIGN_REMINDER_ENABLED`: Enable/disable reminders (default: true)
- `ESIGN_REMINDER_INTERVAL_DAYS`: Days between reminders (default: 3)
- `ESIGN_MAX_REMINDERS`: Maximum reminders per envelope (default: 3)

**Key Methods:**
- `sendRemindersForPendingEnvelopes()` - Main reminder method

---

### 7. **Envelope Voiding** (`VOIDED`)

**Trigger:** Property manager voids an envelope

**Process:**
1. Property manager calls `PATCH /api/esignature/envelopes/{envelopeId}/void`
2. System validates envelope can be voided (not already `COMPLETED` or `VOIDED`)
3. Calls provider API to void envelope
4. Updates envelope status to `VOIDED`
5. Sends void notifications to all participants

**Database State:**
- `EsignEnvelope.status`: `VOIDED`
- `EsignEnvelope.providerStatus`: `VOIDED`
- Metadata includes: `voidedAt`, `voidedBy`, `voidReason`

**Key Methods:**
- `voidEnvelope()` - Main voiding method

**Restrictions:**
- Cannot void `COMPLETED` envelopes
- Cannot void already `VOIDED` envelopes

---

### 8. **Status Refresh** (Manual Update)

**Trigger:** User manually refreshes envelope status

**Process:**
1. User calls `POST /api/esignature/envelopes/{envelopeId}/refresh`
2. System calls provider API to get current status
3. Updates envelope and participant statuses
4. Returns updated envelope

**Key Methods:**
- `refreshEnvelopeStatus()` - Polls provider for current status

**Provider API Call:**
```
GET /accounts/{accountId}/envelopes/{envelopeId}
```

---

## Status Enums

### Envelope Statuses (`EsignEnvelopeStatus`)

| Status | Description | Next Possible States |
|--------|-------------|---------------------|
| `CREATED` | Envelope created but not sent | `SENT`, `VOIDED`, `ERROR` |
| `SENT` | Envelope sent to recipients | `DELIVERED`, `COMPLETED`, `VOIDED`, `DECLINED`, `ERROR` |
| `DELIVERED` | Envelope delivered to recipients | `COMPLETED`, `VOIDED`, `DECLINED`, `ERROR` |
| `COMPLETED` | All recipients have signed | (Final state) |
| `DECLINED` | Envelope was declined | (Final state) |
| `VOIDED` | Envelope was voided | (Final state) |
| `ERROR` | An error occurred | `SENT`, `VOIDED` |

### Participant Statuses (`EsignParticipantStatus`)

| Status | Description | Next Possible States |
|--------|-------------|---------------------|
| `CREATED` | Participant created | `SENT` |
| `SENT` | Invitation sent to participant | `VIEWED`, `SIGNED`, `DECLINED`, `ERROR` |
| `VIEWED` | Participant opened signing interface | `SIGNED`, `DECLINED`, `ERROR` |
| `SIGNED` | Participant signed the document | (Final state) |
| `DECLINED` | Participant declined to sign | (Final state) |
| `ERROR` | An error occurred | `SENT`, `VIEWED` |

---

## Webhook Events

The system receives webhooks from the e-signature provider for:

1. **Envelope Status Changes**
   - `CREATED` → `SENT` → `DELIVERED` → `COMPLETED`
   - Status changes trigger database updates

2. **Participant Status Changes**
   - `SENT` → `VIEWED` → `SIGNED`
   - Individual participant updates

3. **Document Completion**
   - When envelope is `COMPLETED`, provider sends signed PDF and audit trail
   - Documents are downloaded and stored

**Webhook Endpoint:**
```
POST /webhooks/esignature
```

**Key Methods:**
- `handleProviderWebhook()` - Processes all webhook events

---

## Notification Events

The system sends notifications at key lifecycle points:

| Event | Trigger | Recipients |
|-------|---------|------------|
| `REQUESTED` | Envelope created or reminder sent | All participants |
| `COMPLETED` | All signatures complete | All participants |
| `VOIDED` | Envelope voided | All participants |

**Key Methods:**
- `sendSignatureAlert()` - Sends notifications via NotificationsService

---

## Error Handling

### Fallback Behavior

If the e-signature provider is not configured or API calls fail:

1. **Envelope Creation**: Creates mock envelope with UUID
2. **Recipient View**: Returns fallback URL pointing back to frontend
3. **Status Updates**: Works locally but doesn't sync with provider

### Error States

- `ERROR` status indicates a problem occurred
- Errors are logged for debugging
- System continues to function with fallback behavior

---

## API Endpoints

### Property Manager Endpoints

- `POST /api/esignature/leases/{leaseId}/envelopes` - Create envelope
- `GET /api/esignature/leases/{leaseId}/envelopes` - List envelopes
- `GET /api/esignature/envelopes/{envelopeId}` - Get envelope details
- `PATCH /api/esignature/envelopes/{envelopeId}/void` - Void envelope
- `POST /api/esignature/envelopes/{envelopeId}/refresh` - Refresh status
- `POST /api/esignature/envelopes/{envelopeId}/resend` - Resend notifications

### Tenant Endpoints

- `POST /api/esignature/envelopes/{envelopeId}/recipient-view` - Get signing URL
- `GET /api/esignature/envelopes/{envelopeId}/documents/signed` - Download signed PDF
- `GET /api/esignature/envelopes/{envelopeId}/documents/certificate` - Download audit trail

### Webhook Endpoint

- `POST /webhooks/esignature` - Provider webhook handler

---

## Configuration

### Environment Variables

```env
# Provider Configuration
ESIGN_PROVIDER=DOCUSIGN                    # or HELLOSIGN
ESIGN_PROVIDER_BASE_URL=https://demo.docusign.net/restapi/v2.1
ESIGN_PROVIDER_API_KEY=your_api_key
ESIGN_PROVIDER_ACCOUNT_ID=your_account_id

# Reminder Configuration
ESIGN_REMINDER_ENABLED=true
ESIGN_REMINDER_INTERVAL_DAYS=3
ESIGN_MAX_REMINDERS=3

# Frontend URL (for return URLs)
FRONTEND_URL=http://localhost:3000
```

---

## Data Flow Diagram

```
┌─────────────────┐
│ Property Manager│
└────────┬────────┘
         │ Creates Envelope
         ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ Backend Service │────▶│ DocuSign API │────▶│  Database   │
└────────┬────────┘     └──────┬───────┘     └─────────────┘
         │                     │
         │ Sends Notifications │ Sends Webhooks
         ▼                     ▼
┌─────────────────┐     ┌──────────────┐
│   Recipients    │◀────│  Webhook     │
│   (Tenants)     │     │  Handler     │
└────────┬────────┘     └──────────────┘
         │
         │ Requests Signing URL
         ▼
┌─────────────────┐
│ Provider Signing│
│    Interface    │
└────────┬────────┘
         │
         │ Signs Document
         ▼
┌─────────────────┐
│  Webhook Updates│
│  Status to COMPLETED│
└─────────────────┘
```

---

## Best Practices

1. **Always check envelope status** before allowing actions
2. **Handle webhooks asynchronously** to avoid blocking
3. **Validate recipient authorization** before providing signing URLs
4. **Store provider metadata** for debugging and audit trails
5. **Use reminders** to improve completion rates
6. **Monitor error states** and handle gracefully
7. **Test with provider sandbox** before production

---

## Troubleshooting

### Common Issues

1. **404 Error on Recipient View**
   - Check account ID is in URL path
   - Verify envelope is in `SENT` or `DELIVERED` status
   - Ensure recipient ID matches provider records

2. **Webhooks Not Received**
   - Verify webhook URL is configured in provider dashboard
   - Check webhook endpoint is publicly accessible
   - Review webhook logs for errors

3. **Status Not Updating**
   - Manually refresh status via API
   - Check provider webhook configuration
   - Review database for status inconsistencies

4. **Documents Not Downloading**
   - Verify envelope is `COMPLETED`
   - Check document IDs are linked
   - Review provider API response

---

## Related Documentation

- [E-Signature Configuration Guide](../setup/esignature-configuration.md)
- [API Documentation](../../tenant_portal_backend/src/esignature/esignature.controller.ts)
- [Service Implementation](../../tenant_portal_backend/src/esignature/esignature.service.ts)

