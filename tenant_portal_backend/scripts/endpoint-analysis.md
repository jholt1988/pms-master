# Backend Endpoint Analysis

## Issues Found

### 1. ⚠️ Webhook Routes May Have Prefix Issues

**Location**: `src/index.ts` lines 33-44

**Issue**: The global prefix exclusion list includes:
- `'esignature'`
- `'esignature/(.*)'`

But the webhook controller uses:
- `@Controller('webhooks/esignature')`

**Current Behavior**:
- `EsignatureController` with `@Controller(['esignature'])` → `/esignature/*` (excluded, no `/api` prefix)
- `EsignatureWebhookController` with `@Controller('webhooks/esignature')` → `/api/webhooks/esignature` (has `/api` prefix)

**Potential Problem**: 
- If webhooks should be excluded from `/api` prefix (like the main esignature routes), the exclusion pattern needs to include `'webhooks/esignature'`
- OR if webhooks should have `/api` prefix, then it's correct as-is

**Recommendation**: 
- Check if DocuSign webhook URL is configured with or without `/api` prefix
- If without: Add `'webhooks/esignature'` to exclusion list
- If with: Keep as-is

### 2. ⚠️ Duplicate QuickBooks Controllers

**Location**: 
- `src/quickbooks/quickbooks.controller.ts`
- `src/quickbooks/quickbooks-minimal.controller.ts`

**Issue**: Both controllers use `@Controller('quickbooks')`, which could cause conflicts if both are registered.

**Current Routes**:
- `GET /api/quickbooks/auth-url`
- `GET /api/quickbooks/callback`
- `GET /api/quickbooks/status`
- `POST /api/quickbooks/sync`
- `POST /api/quickbooks/disconnect`
- `GET /api/quickbooks/test-connection`

**Recommendation**: 
- Check `quickbooks.module.ts` to see which controller is actually registered
- Remove or rename the unused controller

### 3. ⚠️ Route Path Inconsistencies

**Multiple Controllers with Similar Paths**:

1. **Inspections**:
   - `src/inspections/inspections.controller.ts` → `@Controller('inspections')`
   - `src/inspection/inspection.controller.ts` → `@Controller('api/inspections')`
   
   **Routes**:
   - `/api/inspections` (from inspections.controller.ts)
   - `/api/inspections` (from inspection.controller.ts) - **DUPLICATE!**

2. **Messaging**:
   - `src/messaging/messaging.controller.ts` → `@Controller('messaging')`
   - `src/legacy/messaging-legacy.controller.ts` → `@Controller('messaging')`
   
   **Potential Conflict**: Both use same base path

3. **Maintenance**:
   - `src/maintenance/maintenance.controller.ts` → `@Controller('maintenance')`
   - `src/legacy/maintenance-legacy.controller.ts` → `@Controller('api')`
   
   **Routes**:
   - `/api/maintenance-requests` (legacy)
   - `/api/maintenance` (current)

### 4. ⚠️ Leasing Routes Excluded from Global Prefix

**Location**: `src/index.ts` lines 35-38

**Excluded Routes**:
- `'leasing'`
- `'leasing/(.*)'`
- `'api/leasing'`
- `'api/leasing/(.*)'`

**Controller**: `src/leasing/leasing.controller.ts` uses `@Controller(['api/leasing', 'leasing'])`

**Result**: Routes are accessible at both:
- `/leasing/*` (excluded from prefix)
- `/api/leasing/*` (excluded from prefix)

This is intentional for backward compatibility, but could cause confusion.

### 5. ✅ E-signature Routes Correctly Excluded

**Location**: `src/index.ts` lines 39-42

**Excluded Routes**:
- `'esignature'`
- `'esignature/(.*)'`
- `'api/esignature'`
- `'api/esignature/(.*)'`

**Controller**: `src/esignature/esignature.controller.ts` uses `@Controller(['esignature'])`

**Result**: Routes accessible at `/esignature/*` (no `/api` prefix) ✅

## Recommendations

1. **Verify Webhook URL Configuration**:
   - Check if DocuSign webhook is configured with `/api/webhooks/esignature` or `/webhooks/esignature`
   - Update exclusion list if needed

2. **Resolve Duplicate Controllers**:
   - Remove unused QuickBooks controller
   - Remove or consolidate duplicate inspection controllers

3. **Document Route Exclusions**:
   - Add comments explaining why certain routes are excluded
   - Document the intended URL structure

4. **Test All Endpoints**:
   - Run the endpoint test script: `npm run test:endpoints`
   - Verify all routes are accessible
   - Check for 404s or routing conflicts

## Route Summary

### Excluded from `/api` Prefix:
- `/leasing/*`
- `/esignature/*`
- `/webhooks/esignature` (if exclusion added)

### With `/api` Prefix:
- `/api/auth/*`
- `/api/properties/*`
- `/api/leases/*`
- `/api/maintenance/*`
- `/api/payments/*`
- `/api/messaging/*`
- `/api/webhooks/stripe`
- `/api/webhooks/esignature` (currently)

### Special Routes:
- `/api/docs` - Swagger documentation
- `/health` - Health check (no prefix)
- `/api/monitoring/performance/*` - Performance monitoring


