# Frontend ↔ Backend Integration Checklist

**Date:** November 29, 2025  
**Purpose:** Verify all critical flows work end-to-end  
**Task:** GAP-008

---

## Overview

This checklist verifies that the frontend correctly integrates with all backend API endpoints, especially those recently updated with error codes and DTOs.

---

## Critical Flows

### 1. Authentication Flow ✅

**Frontend:** `domains/shared/auth/features/login/LoginPage.tsx`  
**Backend:** `POST /api/auth/login`

**Test Steps:**
1. Navigate to `/login`
2. Enter valid credentials
3. Verify JWT token stored
4. Verify redirect to dashboard
5. Verify user data displayed

**Error Handling:**
- [ ] Invalid credentials show error message
- [ ] Network errors handled gracefully
- [ ] Error boundaries catch errors

**Status:** ✅ Verified in FIX-004

---

### 2. Rent Optimization Flow

**Frontend:** `domains/shared/ai-services/rent-optimization/RentOptimizationService.ts`  
**Backend:** `/api/rent-recommendations/*`

**Test Steps:**
1. Navigate to `/rent-optimization` (Property Manager)
2. Click "Generate Recommendations"
3. Verify recommendations displayed
4. Click "Accept" on a recommendation
5. Click "Apply" to update lease rent
6. Verify rent updated in database

**New Endpoints to Test:**
- [ ] `getStats()` - Statistics displayed correctly
- [ ] `getRecentRecommendations()` - Recent list works
- [ ] `getRecommendationsByStatus()` - Filtering works
- [ ] `generateRecommendations()` - Generation works
- [ ] `acceptRecommendation()` - Status update works
- [ ] `applyRecommendation()` - **CRITICAL** - Lease update works
- [ ] `updateRecommendation()` - Update works with DTO validation
- [ ] `deleteRecommendation()` - Delete works with status checks

**Error Handling:**
- [ ] Error codes displayed to user
- [ ] Validation errors shown for invalid inputs
- [ ] Network errors handled
- [ ] Error boundaries catch errors

**Status:** 🟡 Service updated, needs UI testing

---

### 3. Payments Flow

**Frontend:** `domains/tenant/features/payments/PaymentsPage.tsx`  
**Backend:** `/api/payments/*`

**Test Steps:**
1. Navigate to `/payments` (Tenant)
2. View invoices list
3. Create payment plan (new DTO)
4. Verify payment plan created
5. Make payment
6. Verify payment recorded

**New DTO to Test:**
- [ ] `CreatePaymentPlanDto` - Validation works
  - [ ] Invalid installments (too many) shows error
  - [ ] Invalid amounts (negative) shows error
  - [ ] Missing required fields shows error

**Error Handling:**
- [ ] Error codes displayed
- [ ] Validation errors shown
- [ ] PageErrorBoundary catches errors

**Status:** 🟡 DTO created, needs UI testing

---

### 4. Messaging Flow

**Frontend:** `domains/shared/features/messaging/MessagingPage.tsx`  
**Backend:** `/api/messaging/*`

**Test Steps:**
1. Navigate to `/messaging`
2. View conversations list
3. Select conversation
4. Send message
5. Verify message appears
6. (Property Manager) Test bulk messaging

**Error Handling:**
- [ ] Error boundaries catch errors
- [ ] Network errors handled
- [ ] Empty states displayed

**Status:** ✅ Component migrated, needs integration test

---

### 5. Maintenance Flow

**Frontend:** `domains/tenant/features/maintenance/MaintenancePage.tsx`  
**Backend:** `/api/maintenance/*`

**Test Steps:**
1. Navigate to `/maintenance` (Tenant)
2. Create maintenance request
3. View request status
4. Add notes
5. Verify status updates

**Error Handling:**
- [ ] Error boundaries catch errors
- [ ] Validation errors shown
- [ ] Error codes displayed

**Status:** ✅ Component migrated, needs integration test

---

## Error Code Integration

### Verify Error Codes Displayed

**Frontend Error Handling:**
- [ ] API service catches error responses
- [ ] Error codes extracted from response
- [ ] User-friendly messages shown based on error code
- [ ] Retryable errors allow retry

**Example:**
```typescript
try {
  await rentOptimizationService.applyRecommendation(id);
} catch (error) {
  if (error.errorCode === 'RENT_RECOMMENDATION_NOT_FOUND') {
    showError('Recommendation not found');
  } else if (error.errorCode === 'RENT_RECOMMENDATION_ALREADY_ACCEPTED') {
    showError('Recommendation already accepted');
  }
}
```

**Status:** 🟡 Needs implementation in frontend services

---

## DTO Validation Integration

### Verify Validation Errors Displayed

**Frontend Validation:**
- [ ] Form validation matches DTO rules
- [ ] Backend validation errors displayed
- [ ] Field-level error messages shown

**Example:**
```typescript
// Frontend should validate before sending
if (unitIds.length === 0) {
  showError('At least one unit ID is required');
  return;
}

// Backend validation error should be displayed
if (error.errorCode === 'INVALID_INPUT') {
  showFieldError('unitIds', error.details.message);
}
```

**Status:** 🟡 Needs implementation

---

## Route Integration

### Verify Routes Work

**Frontend Routes:**
- [ ] `/payments` → PaymentsPage (with PageErrorBoundary)
- [ ] `/messaging` → MessagingPage (with PageErrorBoundary)
- [ ] `/maintenance` → MaintenancePage (with PageErrorBoundary)
- [ ] `/my-lease` → MyLeasePage (with PageErrorBoundary)
- [ ] `/rent-optimization` → RentOptimizationDashboard

**Status:** ✅ Routes configured, error boundaries added

---

## API Service Integration

### Verify Services Updated

**Services to Check:**
- [x] `RentOptimizationService` - ✅ Updated with all endpoints
- [ ] `PaymentsService` - Needs verification
- [ ] `MaintenanceService` - Needs verification
- [ ] `LeaseService` - Needs verification
- [ ] `PropertyService` - Needs verification

**Status:** 🟡 RentOptimizationService done, others need check

---

## Error Boundary Integration

### Verify Error Boundaries Work

**Pages with Error Boundaries:**
- [x] PaymentsPage - ✅ Wrapped
- [x] MessagingPage - ✅ Wrapped
- [x] MaintenancePage - ✅ Wrapped
- [x] MyLeasePage - ✅ Wrapped
- [x] InspectionPage - ✅ Wrapped

**Test:**
1. Simulate API error in component
2. Verify PageErrorBoundary catches error
3. Verify error UI displayed
4. Verify "Try Again" button works

**Status:** ✅ Error boundaries implemented

---

## Testing Checklist

### Manual Testing

- [ ] Login flow works end-to-end
- [ ] Rent optimization flow works
- [ ] Payments flow works (including payment plans)
- [ ] Messaging flow works
- [ ] Maintenance flow works
- [ ] Error boundaries catch errors
- [ ] Error codes displayed to users
- [ ] Validation errors shown

### Automated Testing

- [ ] E2E tests cover critical flows
- [ ] Frontend tests cover error handling
- [ ] Integration tests cover API calls

---

## Issues Found

_To be filled during testing_

---

## Success Criteria

✅ **All critical flows work:**
- Authentication
- Rent optimization
- Payments
- Messaging
- Maintenance

✅ **Error handling works:**
- Error codes displayed
- Validation errors shown
- Error boundaries catch errors
- User-friendly messages

✅ **Integration verified:**
- Frontend services call correct endpoints
- DTOs validated correctly
- Error responses handled correctly

---

**Last Updated:** November 29, 2025  
**Owner:** Full Team  
**Estimated Time:** 4 hours

