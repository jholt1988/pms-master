# DocuSign Webhook Fix Summary

## Issue
DocuSign webhooks were failing with 400 Bad Request errors due to DTO validation mismatch.

## Root Cause
The `ProviderWebhookDto` expected a flat structure:
```json
{
  "envelopeId": "...",
  "status": "..."
}
```

But DocuSign sends a nested structure:
```json
{
  "event": "envelope-created",
  "apiVersion": "v2.1",
  "uri": "/restapi/v2.1/accounts/.../envelopes/...",
  "retryCount": 8,
  "configurationId": 21982677,
  "generatedDateTime": "2025-12-02T00:40:00.9100000Z",
  "data": {
    "accountId": "...",
    "userId": "...",
    "envelopeId": "...",
    "envelopeSummary": {
      "status": "created",
      "envelopeId": "...",
      ...
    }
  }
}
```

## Changes Made

### 1. Updated `provider-webhook.dto.ts`
- Added `DocuSignEnvelopeSummaryDto` class for envelope summary structure
- Added `DocuSignWebhookDataDto` class for webhook data structure
- Updated `ProviderWebhookDto` to match DocuSign's actual webhook format
- Kept legacy fields (`envelopeId`, `status`) as optional for backward compatibility
- Made all DocuSign-specific fields optional with `any` type to accept DocuSign's full payload

### 2. Updated `esignature-webhook.controller.ts`
- Added custom `ValidationPipe` with `whitelist: false` and `forbidNonWhitelisted: false`
- This allows DocuSign to send any additional fields without validation errors
- Critical fix: The global validation pipe rejects extra properties, but DocuSign sends many fields

### 3. Updated `handleProviderWebhook` in `esignature.service.ts`
- Extracts envelope ID from `payload.data.envelopeId` (with fallback to `payload.envelopeId`)
- Extracts status from `payload.data.envelopeSummary.status` (with fallback to `payload.status`)
- Logs the webhook event type for better debugging
- Triggers automatic status refresh if webhook doesn't include participant data
- Fixed property name from `createdBy` to `createdById`
- Uses `JSON.parse(JSON.stringify())` for proper type conversion to `JsonValue`

## Testing
The webhook endpoint should now accept DocuSign's webhook format without validation errors.

### Test with curl:
```bash
curl -X POST http://localhost:3001/webhooks/esignature \
  -H "Content-Type: application/json" \
  -d '{
    "event": "envelope-sent",
    "apiVersion": "v2.1",
    "uri": "/restapi/v2.1/accounts/test/envelopes/test",
    "retryCount": 0,
    "configurationId": 12345,
    "generatedDateTime": "2025-12-02T00:00:00Z",
    "data": {
      "accountId": "test-account",
      "userId": "test-user",
      "envelopeId": "test-envelope-id",
      "envelopeSummary": {
        "status": "sent",
        "envelopeId": "test-envelope-id"
      }
    }
  }'
```

## DocuSign Webhook Events
Common events you'll receive:
- `envelope-created` - Envelope created in draft
- `envelope-sent` - Envelope sent to recipients
- `envelope-delivered` - Envelope delivered to recipient
- `envelope-completed` - All recipients have signed
- `envelope-declined` - Recipient declined to sign
- `envelope-voided` - Envelope was voided
- `recipient-completed` - Individual recipient completed signing

## Next Steps
1. ✅ Webhook validation now works with DocuSign format
2. ⏭️ Add webhook signature validation (X-DocuSign-Signature header)
3. ⏭️ Test all webhook event types
4. ⏭️ Monitor webhook logs for any issues

## Related Files
- `tenant_portal_backend/src/esignature/dto/provider-webhook.dto.ts`
- `tenant_portal_backend/src/esignature/esignature.service.ts`
- `tenant_portal_backend/src/esignature/esignature-webhook.controller.ts`

