# UAT Test Scenarios

**Date:** November 29, 2025  
**Purpose:** User Acceptance Testing scenarios for internal UAT  
**Task:** GAP-007

---

## Overview

This document provides comprehensive test scenarios for User Acceptance Testing (UAT) using dummy data. All scenarios are designed to validate that the foundational non-AI components work as intended.

---

## Test Environment Setup

### Prerequisites
- Backend running on `http://localhost:3001`
- Frontend running on `http://localhost:3000`
- Database seeded with dummy data
- Test users created:
  - Property Manager: `pm@test.com` / `Test123!@#`
  - Tenant: `tenant@test.com` / `Test123!@#`

### Test Data
- Properties: 5 properties with 2-4 units each
- Leases: Active leases for all units
- Users: 2 property managers, 5 tenants
- Maintenance requests: 10 requests in various states
- Payments: 20 invoices, 15 payments

---

## Scenario 1: Authentication & User Management

### 1.1 User Login
**Actor:** Any user  
**Priority:** Critical

**Steps:**
1. Navigate to `/login`
2. Enter valid credentials
3. Click "Sign In"

**Expected Results:**
- ✅ User redirected to role-appropriate dashboard
- ✅ JWT token stored in localStorage
- ✅ User data displayed in navigation
- ✅ No console errors

**Error Cases:**
- Invalid credentials → Error message displayed
- Network error → Error boundary catches error

---

### 1.2 User Registration
**Actor:** New user  
**Priority:** High

**Steps:**
1. Navigate to `/signup`
2. Fill registration form
3. Submit form

**Expected Results:**
- ✅ User created successfully
- ✅ Redirected to login
- ✅ Password validation enforced
- ✅ DTO validation working

**Error Cases:**
- Duplicate email → Error code displayed
- Weak password → Validation error shown
- Missing fields → Field-level errors shown

---

### 1.3 Password Reset
**Actor:** User who forgot password  
**Priority:** Medium

**Steps:**
1. Navigate to `/forgot-password`
2. Enter email address
3. Check email for reset link
4. Click reset link
5. Enter new password
6. Submit

**Expected Results:**
- ✅ Email sent (or logged in dev mode)
- ✅ Reset link works
- ✅ Password updated successfully
- ✅ Can login with new password

---

## Scenario 2: Property Management

### 2.1 View Properties
**Actor:** Property Manager  
**Priority:** Critical

**Steps:**
1. Login as property manager
2. Navigate to `/properties`
3. View properties list

**Expected Results:**
- ✅ Properties displayed correctly
- ✅ Pagination works
- ✅ Search/filter works
- ✅ No errors in console

---

### 2.2 Create Property
**Actor:** Property Manager  
**Priority:** High

**Steps:**
1. Navigate to `/properties`
2. Click "Add Property"
3. Fill property form
4. Submit

**Expected Results:**
- ✅ Property created successfully
- ✅ DTO validation working
- ✅ Property appears in list
- ✅ Error codes displayed for validation errors

---

### 2.3 Add Unit to Property
**Actor:** Property Manager  
**Priority:** High

**Steps:**
1. Navigate to property details
2. Click "Add Unit"
3. Fill unit form
4. Submit

**Expected Results:**
- ✅ Unit created successfully
- ✅ Unit appears in property
- ✅ Validation errors shown if invalid

---

## Scenario 3: Lease Management

### 3.1 View Leases
**Actor:** Property Manager  
**Priority:** Critical

**Steps:**
1. Navigate to `/lease-management`
2. View leases list

**Expected Results:**
- ✅ Leases displayed correctly
- ✅ Filters work (status, property, etc.)
- ✅ Pagination works
- ✅ No errors

---

### 3.2 Create Lease
**Actor:** Property Manager  
**Priority:** High

**Steps:**
1. Navigate to `/lease-management`
2. Click "Create Lease"
3. Fill lease form
4. Submit

**Expected Results:**
- ✅ Lease created successfully
- ✅ DTO validation working
- ✅ Lease appears in list
- ✅ Error codes for validation errors

---

### 3.3 Tenant Views Lease
**Actor:** Tenant  
**Priority:** Critical

**Steps:**
1. Login as tenant
2. Navigate to `/my-lease`
3. View lease details

**Expected Results:**
- ✅ Lease details displayed correctly
- ✅ Payment history shown
- ✅ Lease documents accessible
- ✅ Error boundary catches errors if any

---

## Scenario 4: Maintenance Requests

### 4.1 Tenant Creates Request
**Actor:** Tenant  
**Priority:** Critical

**Steps:**
1. Login as tenant
2. Navigate to `/maintenance`
3. Click "New Request"
4. Fill request form
5. Submit

**Expected Results:**
- ✅ Request created successfully
- ✅ Request appears in list
- ✅ Status shows as "PENDING"
- ✅ DTO validation working
- ✅ Error codes displayed for errors

---

### 4.2 Property Manager Views Requests
**Actor:** Property Manager  
**Priority:** Critical

**Steps:**
1. Login as property manager
2. Navigate to `/maintenance-management`
3. View requests list

**Expected Results:**
- ✅ Requests displayed correctly
- ✅ Filters work (status, priority, etc.)
- ✅ Can assign to technician
- ✅ Can update status
- ✅ Error boundaries catch errors

---

### 4.3 Update Request Status
**Actor:** Property Manager  
**Priority:** High

**Steps:**
1. Navigate to maintenance request
2. Click "Update Status"
3. Select new status
4. Submit

**Expected Results:**
- ✅ Status updated successfully
- ✅ Status change reflected immediately
- ✅ Error codes for invalid transitions

---

## Scenario 5: Payments

### 5.1 Tenant Views Invoices
**Actor:** Tenant  
**Priority:** Critical

**Steps:**
1. Login as tenant
2. Navigate to `/payments`
3. View invoices list

**Expected Results:**
- ✅ Invoices displayed correctly
- ✅ Due dates shown
- ✅ Amounts correct
- ✅ Status indicators work
- ✅ Error boundary catches errors

---

### 5.2 Create Payment Plan
**Actor:** Tenant  
**Priority:** High

**Steps:**
1. Navigate to invoice
2. Click "Create Payment Plan"
3. Fill payment plan form:
   - Installments: 3
   - Amount per installment: 500.00
   - Total amount: 1500.00
4. Submit

**Expected Results:**
- ✅ Payment plan created successfully
- ✅ DTO validation working (CreatePaymentPlanDto)
- ✅ Installments scheduled correctly
- ✅ Validation errors shown for invalid inputs:
  - Installments > 60 → Error
  - Amount < 0 → Error
  - Missing fields → Error

**Error Cases:**
- Invalid installments (100) → Validation error
- Invalid amounts (negative) → Validation error
- Missing required fields → Field errors

---

### 5.3 Make Payment
**Actor:** Tenant  
**Priority:** Critical

**Steps:**
1. Navigate to invoice
2. Click "Pay Now"
3. Enter payment method
4. Submit payment

**Expected Results:**
- ✅ Payment processed successfully
- ✅ Invoice status updated
- ✅ Payment history updated
- ✅ Error codes displayed for errors

---

## Scenario 6: Rent Optimization

### 6.1 Generate Recommendations
**Actor:** Property Manager  
**Priority:** High

**Steps:**
1. Navigate to `/rent-optimization`
2. Select units
3. Click "Generate Recommendations"
4. View recommendations

**Expected Results:**
- ✅ Recommendations generated successfully
- ✅ DTO validation working (GenerateRecommendationsDto)
- ✅ Recommendations displayed with details
- ✅ Error codes displayed:
  - Empty unitIds array → INVALID_INPUT
  - Invalid unit IDs → UNIT_NOT_FOUND

**Error Cases:**
- Empty unitIds → Error code: INVALID_INPUT
- Invalid unit IDs → Error code: UNIT_NOT_FOUND
- ML service down → Error code: RENT_RECOMMENDATION_ML_SERVICE_ERROR

---

### 6.2 View Statistics
**Actor:** Property Manager  
**Priority:** Medium

**Steps:**
1. Navigate to `/rent-optimization`
2. View statistics dashboard

**Expected Results:**
- ✅ Statistics displayed correctly
- ✅ Total, pending, accepted, rejected counts
- ✅ Average confidence shown
- ✅ Potential revenue calculated

---

### 6.3 Accept Recommendation
**Actor:** Property Manager  
**Priority:** High

**Steps:**
1. View recommendation
2. Click "Accept"
3. Confirm action

**Expected Results:**
- ✅ Recommendation status → ACCEPTED
- ✅ Error codes for invalid transitions:
  - Already accepted → RENT_RECOMMENDATION_ALREADY_ACCEPTED
  - Already rejected → RENT_RECOMMENDATION_ALREADY_REJECTED

---

### 6.4 Apply Recommendation to Lease
**Actor:** Property Manager  
**Priority:** **CRITICAL**

**Steps:**
1. View accepted recommendation
2. Click "Apply to Lease"
3. Confirm action

**Expected Results:**
- ✅ Lease rent amount updated
- ✅ Before/after comparison shown
- ✅ Audit trail logged
- ✅ Error codes for failures:
  - Not accepted → RENT_RECOMMENDATION_INVALID_STATUS_TRANSITION
  - No active lease → UNIT_NO_ACTIVE_LEASE
  - Apply failed → RENT_RECOMMENDATION_APPLY_FAILED

**Error Cases:**
- Recommendation not accepted → Error code displayed
- No active lease → Error code displayed
- Database error → Error code displayed

---

### 6.5 Update Recommendation
**Actor:** Property Manager  
**Priority:** Medium

**Steps:**
1. View pending recommendation
2. Click "Update"
3. Modify recommended rent
4. Submit

**Expected Results:**
- ✅ Recommendation updated successfully
- ✅ DTO validation working (UpdateRecommendationDto)
- ✅ Confidence intervals recalculated
- ✅ Error codes for invalid inputs:
  - Invalid rent (< 0) → RENT_RECOMMENDATION_INVALID_RENT_AMOUNT
  - Not pending → RENT_RECOMMENDATION_INVALID_STATUS_TRANSITION

---

## Scenario 7: Messaging

### 7.1 View Conversations
**Actor:** Any user  
**Priority:** High

**Steps:**
1. Navigate to `/messaging`
2. View conversations list

**Expected Results:**
- ✅ Conversations displayed correctly
- ✅ Unread indicators work
- ✅ Error boundary catches errors
- ✅ No console errors

---

### 7.2 Send Message
**Actor:** Any user  
**Priority:** High

**Steps:**
1. Select conversation
2. Type message
3. Click "Send"

**Expected Results:**
- ✅ Message sent successfully
- ✅ Message appears in conversation
- ✅ Real-time update (if implemented)
- ✅ Error handling works

---

### 7.3 Bulk Messaging (Property Manager)
**Actor:** Property Manager  
**Priority:** Medium

**Steps:**
1. Navigate to messaging
2. Scroll to "Bulk Messaging" section
3. Create bulk message
4. Select recipients
5. Send

**Expected Results:**
- ✅ Bulk message created
- ✅ Delivery status tracked
- ✅ Error handling works

---

## Scenario 8: Error Handling

### 8.1 Error Codes Displayed
**Actor:** Any user  
**Priority:** Critical

**Steps:**
1. Trigger various error scenarios:
   - Invalid input
   - Resource not found
   - Unauthorized access
   - Server error

**Expected Results:**
- ✅ Error codes displayed in error messages
- ✅ User-friendly messages shown
- ✅ Error details available (dev mode)
- ✅ Retryable errors allow retry

**Error Codes to Verify:**
- `INVALID_INPUT` - Validation errors
- `RESOURCE_NOT_FOUND` - 404 errors
- `AUTH_UNAUTHORIZED` - 401 errors
- `FORBIDDEN_RESOURCE` - 403 errors
- `UNKNOWN_ERROR` - 500 errors

---

### 8.2 Error Boundaries Work
**Actor:** Any user  
**Priority:** High

**Steps:**
1. Navigate to pages with error boundaries
2. Simulate component errors

**Expected Results:**
- ✅ PageErrorBoundary catches errors
- ✅ Error UI displayed
- ✅ "Try Again" button works
- ✅ App doesn't crash

**Pages to Test:**
- `/payments` - PaymentsPage
- `/messaging` - MessagingPage
- `/maintenance` - MaintenancePage
- `/my-lease` - MyLeasePage

---

## Scenario 9: Routing

### 9.1 Route Navigation
**Actor:** Any user  
**Priority:** Critical

**Steps:**
1. Navigate through all routes
2. Test role-based routing
3. Test legacy redirects

**Expected Results:**
- ✅ All routes accessible
- ✅ Role-based access enforced
- ✅ Legacy routes redirect correctly
- ✅ 404 page for invalid routes

**Routes to Test:**
- `/dashboard` - Role-based dashboard
- `/properties` - Property Manager only
- `/payments` - All authenticated users
- `/messaging` - All authenticated users
- `/my-lease` - Tenant only
- `/rent-optimization` - Property Manager only

---

## Scenario 10: Data Integrity

### 10.1 Create-Read-Update-Delete Operations
**Actor:** Property Manager  
**Priority:** Critical

**Steps:**
1. Create resource (property, lease, etc.)
2. Read resource
3. Update resource
4. Delete resource (if allowed)

**Expected Results:**
- ✅ All CRUD operations work
- ✅ Data persists correctly
- ✅ Validation prevents invalid data
- ✅ Error codes for failures

---

## Test Execution Checklist

### Pre-Testing
- [ ] Test environment set up
- [ ] Dummy data seeded
- [ ] Test users created
- [ ] Backend running
- [ ] Frontend running
- [ ] Database accessible

### Testing
- [ ] Scenario 1: Authentication (3 test cases)
- [ ] Scenario 2: Property Management (3 test cases)
- [ ] Scenario 3: Lease Management (3 test cases)
- [ ] Scenario 4: Maintenance (3 test cases)
- [ ] Scenario 5: Payments (3 test cases)
- [ ] Scenario 6: Rent Optimization (5 test cases)
- [ ] Scenario 7: Messaging (3 test cases)
- [ ] Scenario 8: Error Handling (2 test cases)
- [ ] Scenario 9: Routing (1 test case)
- [ ] Scenario 10: Data Integrity (1 test case)

### Post-Testing
- [ ] All scenarios executed
- [ ] Results documented
- [ ] Issues logged
- [ ] Pass/fail status recorded

---

## Success Criteria

✅ **All Critical Scenarios Pass:**
- Authentication works
- Core CRUD operations work
- Error handling works
- Error codes displayed
- DTO validation works

✅ **No Critical Bugs:**
- No data loss
- No security issues
- No broken flows
- No console errors

✅ **User Experience:**
- UI responsive
- Error messages clear
- Loading states shown
- Error boundaries catch errors

---

## Known Issues

_To be filled during UAT_

---

## Test Results Summary

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Authentication | ⏳ Pending | |
| 2. Property Management | ⏳ Pending | |
| 3. Lease Management | ⏳ Pending | |
| 4. Maintenance | ⏳ Pending | |
| 5. Payments | ⏳ Pending | |
| 6. Rent Optimization | ⏳ Pending | |
| 7. Messaging | ⏳ Pending | |
| 8. Error Handling | ⏳ Pending | |
| 9. Routing | ⏳ Pending | |
| 10. Data Integrity | ⏳ Pending | |

---

**Last Updated:** November 29, 2025  
**Owner:** QA Team  
**Estimated Time:** 4 hours

