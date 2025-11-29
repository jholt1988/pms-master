# API Endpoint Integration Testing Guide

**Date:** November 29, 2025  
**Purpose:** Comprehensive guide for testing all API endpoints  
**Task:** GAP-005

---

## Overview

This guide provides a systematic approach to testing all API endpoints in the Property Management Suite. The backend has **256+ endpoints** across **38 controller files**.

---

## Testing Strategy

### 1. Test Categories

- **Authentication & Authorization** - Verify JWT and role-based access
- **Request Validation** - Test DTO validation and error codes
- **Business Logic** - Verify correct data processing
- **Error Handling** - Test error responses with error codes
- **Data Integrity** - Verify database operations

### 2. Testing Tools

**Recommended:**
- **Postman** - For manual testing and collection management
- **curl** - For quick command-line testing
- **Swagger UI** - Available at `http://localhost:3001/api/docs`
- **Jest E2E Tests** - Automated integration tests

---

## Priority Endpoints (Test First)

### Authentication Endpoints ✅

All auth endpoints verified in FIX-004. Test to confirm:

| Endpoint | Method | Status | Test Focus |
|----------|--------|--------|------------|
| `/auth/login` | POST | ✅ | Valid/invalid credentials, error codes |
| `/auth/register` | POST | ✅ | Validation, duplicate users, error codes |
| `/auth/me` | GET | ✅ | JWT validation, user data |
| `/auth/profile` | GET | ✅ | JWT validation, user data |
| `/auth/forgot-password` | POST | ✅ | Email sending, error codes |
| `/auth/reset-password` | POST | ✅ | Token validation, error codes |
| `/auth/mfa/prepare` | POST | ✅ | QR code generation |
| `/auth/mfa/activate` | POST | ✅ | Code validation, error codes |
| `/auth/mfa/disable` | POST | ✅ | Code validation, error codes |

**Test Script:**
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!@#"}'

# Get profile
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer <token>"
```

---

### Rent Optimization Endpoints (Newly Added)

**Priority:** HIGH - Recently added endpoints with error codes

| Endpoint | Method | Test Focus |
|----------|--------|------------|
| `/api/rent-recommendations/stats` | GET | Statistics aggregation |
| `/api/rent-recommendations/recent?limit=N` | GET | Query parameter validation |
| `/api/rent-recommendations/pending` | GET | Status filtering |
| `/api/rent-recommendations/accepted` | GET | Status filtering |
| `/api/rent-recommendations/rejected` | GET | Status filtering |
| `/api/rent-recommendations/property/:propertyId` | GET | Property filtering |
| `/api/rent-recommendations/comparison/:unitId` | GET | Historical data |
| `/api/rent-recommendations/generate` | POST | DTO validation (unitIds array) |
| `/api/rent-recommendations/bulk-generate/property/:propertyId` | POST | Bulk operations |
| `/api/rent-recommendations/bulk-generate/all` | POST | Bulk operations |
| `/api/rent-recommendations/:id/accept` | POST | Status transitions |
| `/api/rent-recommendations/:id/reject` | POST | Status transitions |
| `/api/rent-recommendations/:id/apply` | POST | **CRITICAL** - Lease updates |
| `/api/rent-recommendations/:id/update` | PUT | DTO validation, status checks |
| `/api/rent-recommendations/:id` | DELETE | Status checks, error codes |

**Test Script:**
```bash
# Get stats
curl -X GET http://localhost:3001/api/rent-recommendations/stats \
  -H "Authorization: Bearer <token>"

# Generate recommendations (with DTO validation)
curl -X POST http://localhost:3001/api/rent-recommendations/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"unitIds":[1,2,3]}'

# Test error code response (invalid unitIds)
curl -X POST http://localhost:3001/api/rent-recommendations/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"unitIds":[]}'
# Expected: 400 with errorCode: INVALID_INPUT
```

---

### Payments Endpoints (With New DTOs)

**Priority:** HIGH - Recently added DTO validation

| Endpoint | Method | Test Focus |
|----------|--------|------------|
| `/api/payments/payment-plans` | POST | **NEW DTO** - CreatePaymentPlanDto validation |
| `/api/payments/invoices` | POST | CreateInvoiceDto validation |
| `/api/payments` | POST | CreatePaymentDto validation |
| `/api/payments/:id` | GET | Error codes (NOT_FOUND) |
| `/api/payments/invoices/:id` | GET | Error codes (NOT_FOUND) |

**Test Script:**
```bash
# Create payment plan (with DTO validation)
curl -X POST http://localhost:3001/api/payments/payment-plans \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": 1,
    "installments": 3,
    "amountPerInstallment": 500.00,
    "totalAmount": 1500.00
  }'

# Test validation (invalid installments)
curl -X POST http://localhost:3001/api/payments/payment-plans \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": 1,
    "installments": 100,
    "amountPerInstallment": 500.00,
    "totalAmount": 1500.00
  }'
# Expected: 400 with validation error
```

---

## Core Endpoint Categories

### Properties (`/properties`)
- ✅ GET `/properties` - List with pagination
- ✅ GET `/properties/:id` - Get single property
- ✅ POST `/properties` - Create with DTO validation
- ✅ PATCH `/properties/:id` - Update with DTO validation
- ✅ GET `/properties/search` - Search functionality
- ✅ POST `/properties/:id/units` - Add unit

### Leases (`/leases`)
- ✅ GET `/leases` - List leases
- ✅ GET `/leases/my-lease` - Tenant's lease
- ✅ POST `/leases` - Create lease
- ✅ PUT `/leases/:id` - Update lease
- ✅ PUT `/leases/:id/status` - Status transitions
- ✅ POST `/leases/:id/renewal-offers` - Create renewal

### Maintenance (`/maintenance`)
- ✅ GET `/maintenance` - List requests
- ✅ POST `/maintenance` - Create request
- ✅ PATCH `/maintenance/:id/status` - Update status
- ✅ PATCH `/maintenance/:id/assign` - Assign technician

### Payments (`/payments`)
- ✅ GET `/payments` - List payments
- ✅ POST `/payments` - Create payment
- ✅ GET `/payments/invoices` - List invoices
- ✅ POST `/payments/invoices` - Create invoice
- ✅ POST `/payments/payment-plans` - **NEW** Create plan

### Rental Applications (`/rental-applications`)
- ✅ POST `/rental-applications` - Submit application
- ✅ GET `/rental-applications` - List applications
- ✅ PUT `/rental-applications/:id/status` - Update status
- ✅ POST `/rental-applications/:id/screen` - Run screening

---

## Error Code Testing

All endpoints should return structured error responses:

```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "errorCode": "RENT_RECOMMENDATION_NOT_FOUND",
  "details": {
    "recommendationId": "uuid-here"
  },
  "retryable": false,
  "timestamp": "2025-11-29T12:00:00.000Z"
}
```

**Test Cases:**
1. **404 Not Found** - Verify `errorCode` field present
2. **400 Bad Request** - Verify validation error codes
3. **401 Unauthorized** - Verify `AUTH_UNAUTHORIZED` code
4. **403 Forbidden** - Verify `FORBIDDEN_RESOURCE` code
5. **500 Internal Error** - Verify `UNKNOWN_ERROR` code

---

## DTO Validation Testing

### Test Invalid Inputs

**Rent Optimization:**
```bash
# Empty unitIds array
curl -X POST .../generate -d '{"unitIds":[]}'
# Expected: 400, errorCode: INVALID_INPUT

# Invalid rent amount
curl -X PUT .../update -d '{"recommendedRent":-100}'
# Expected: 400, validation error
```

**Payment Plans:**
```bash
# Invalid installments (too many)
curl -X POST .../payment-plans -d '{"installments":100,...}'
# Expected: 400, Max(60) validation error

# Invalid amounts
curl -X POST .../payment-plans -d '{"amountPerInstallment":0,...}'
# Expected: 400, Min(0.01) validation error
```

---

## Integration Test Checklist

### Authentication Flow
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (verify error code)
- [ ] Access protected endpoint without token (verify 401)
- [ ] Access protected endpoint with invalid token (verify 401)
- [ ] Access role-restricted endpoint with wrong role (verify 403)

### CRUD Operations
- [ ] Create resource (POST)
- [ ] Read resource (GET)
- [ ] Update resource (PUT/PATCH)
- [ ] Delete resource (DELETE)
- [ ] List resources with pagination (GET with query params)

### Error Scenarios
- [ ] 404 - Resource not found (verify errorCode)
- [ ] 400 - Invalid input (verify validation errors)
- [ ] 401 - Unauthorized (verify AUTH_UNAUTHORIZED)
- [ ] 403 - Forbidden (verify FORBIDDEN_RESOURCE)
- [ ] 500 - Server error (verify UNKNOWN_ERROR)

### Business Logic
- [ ] Status transitions (e.g., PENDING → ACCEPTED)
- [ ] Business rules (e.g., can't delete ACCEPTED recommendations)
- [ ] Data relationships (e.g., lease requires property)

---

## Test Execution Plan

### Phase 1: Critical Endpoints (2 hours)
1. Authentication endpoints (9 endpoints)
2. Rent optimization endpoints (18 endpoints)
3. Payment endpoints with new DTOs (5 endpoints)

### Phase 2: Core Endpoints (2 hours)
1. Properties (13 endpoints)
2. Leases (12 endpoints)
3. Maintenance (12 endpoints)

### Phase 3: Supporting Endpoints (2 hours)
1. Rental applications (10 endpoints)
2. Notifications (7 endpoints)
3. Messaging (8 endpoints)
4. Documents (5 endpoints)

### Phase 4: Specialized Endpoints (1 hour)
1. Inspections (20+ endpoints)
2. eSignature (4 endpoints)
3. Reporting (5 endpoints)
4. Health checks (3 endpoints)

---

## Test Results Template

```markdown
## Endpoint: POST /api/rent-recommendations/generate

**Status:** ✅ PASS / ❌ FAIL

**Test Cases:**
- [x] Valid request returns 200
- [x] Invalid unitIds (empty array) returns 400 with errorCode
- [x] Invalid unitIds (non-numeric) returns 400
- [x] Missing unitIds returns 400
- [x] Unauthorized request returns 401

**Error Codes Verified:**
- ✅ INVALID_INPUT (empty array)
- ✅ AUTH_UNAUTHORIZED (no token)

**Issues Found:**
- None / [List issues]

**Notes:**
- DTO validation working correctly
- Error codes present in responses
```

---

## Automated Testing

### Using Jest E2E Tests

```bash
cd tenant_portal_backend
npm run test:e2e
```

**Test Files:**
- `test/auth.e2e.spec.ts` - Authentication
- `test/payments.e2e.spec.ts` - Payments
- `test/lease.e2e.spec.ts` - Leases
- `test/property.e2e.spec.ts` - Properties
- `test/maintenance.e2e.spec.ts` - Maintenance
- `test/messaging.e2e.spec.ts` - Messaging

### Adding New Tests

```typescript
describe('Rent Recommendations API', () => {
  it('should return error code for invalid input', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/rent-recommendations/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ unitIds: [] })
      .expect(400);

    expect(response.body).toHaveProperty('errorCode');
    expect(response.body.errorCode).toBe('INVALID_INPUT');
  });
});
```

---

## Swagger UI Testing

1. Start backend: `npm run start:dev`
2. Navigate to: `http://localhost:3001/api/docs`
3. Click "Authorize" and enter JWT token
4. Test endpoints directly in browser
5. Verify request/response schemas

---

## Postman Collection

**Recommended Structure:**
```
Property Management API
├── Authentication
│   ├── Login
│   ├── Register
│   └── Profile
├── Rent Optimization
│   ├── Get Stats
│   ├── Generate Recommendations
│   └── Apply Recommendation
├── Payments
│   ├── Create Invoice
│   ├── Create Payment Plan
│   └── List Payments
└── ...
```

**Environment Variables:**
- `base_url`: `http://localhost:3001/api`
- `token`: JWT token (set after login)

---

## Success Criteria

✅ **All endpoints tested:**
- Valid requests return expected data
- Invalid requests return proper error codes
- DTO validation working correctly
- Error responses include `errorCode` field
- Authentication/authorization working

✅ **Documentation updated:**
- API inventory reflects all endpoints
- Error codes documented
- DTOs documented

✅ **Issues documented:**
- Failing tests listed
- Error code issues noted
- Validation issues noted

---

## Next Steps

After completing GAP-005:
1. **GAP-008:** Final integration check (frontend ↔ backend)
2. **GAP-006:** Update API documentation
3. **GAP-007:** Create UAT test scenarios

---

**Last Updated:** November 29, 2025  
**Owner:** QA Team  
**Estimated Time:** 6 hours

