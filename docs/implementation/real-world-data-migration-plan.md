# Real-World Data Migration Plan

**Date:** January 2025  
**Status:** 📋 Planning Phase  
**Goal:** Transition from mock/MSW data to real-world production data

---

## 🎯 Overview

This plan outlines the steps to transition from mock data (MSW) to real-world data, including database seeding, environment configuration, and frontend/backend updates.

---

## 📊 Current State Analysis

### Frontend (React App)
- ✅ Uses MSW (Mock Service Worker) for API mocking
- ✅ Controlled by `VITE_USE_MSW` environment variable
- ✅ Fallback to mock data in some components
- ✅ Mock data in `src/mocks/handlers.ts` and `src/mocks/apiFixtures.ts`

### Backend (NestJS)
- ✅ Has seed script (`prisma/seed.ts`) with basic test data
- ✅ Seed controlled by `DISABLE_AUTO_SEED` or `SKIP_SEED` environment variables
- ✅ Database migrations ready
- ✅ API endpoints implemented and functional

### Database
- ✅ Prisma schema defined
- ✅ Migrations available
- ⚠️ Needs realistic seed data

---

## 🗺️ Migration Phases

### Phase 1: Database Preparation & Seeding ✅ (Foundation)

**Goal:** Create comprehensive seed data that mirrors real-world scenarios

#### 1.1 Enhance Seed Script ✅
- [x] **Create realistic user accounts** ✅
  - Property managers (4) - admin, jholt, plabrue, areyna
  - Tenants (13) - mark_donna, steve, mrB, davidG, Junior, Siren, Vicky, MrsJ, DaMansaws, DaviSr, Patrick, Elijah
  - Total: 16 users

- [x] **Create realistic properties** ✅
  - Multiple property types (Apartments, Single Family, Duplex)
  - All located in Wichita, Kansas
  - Different sizes and configurations
  - 15 properties total

- [x] **Create realistic units** ✅
  - 26 units across all properties
  - Various configurations (1BR, 2BR with 1-1.5 baths)
  - Different square footage (200-9223 sq ft)
  - Mix of occupied and available units

- [x] **Create realistic leases** ✅
  - Active leases (13)
  - All 2025 calendar year leases
  - Rent range: $525-$750/month
  - Various lease terms

- [x] **Create realistic maintenance requests** ✅
  - Various priorities (MEDIUM, HIGH)
  - Different statuses (PENDING, IN_PROGRESS, COMPLETED)
  - Sample requests created
  - Linked to tenants and units

- [x] **Create realistic payments** ✅
  - Payment history for active leases
  - Sample completed payments
  - Linked to invoices

- [ ] **Create realistic rental applications**
  - Various statuses (PENDING, APPROVED, REJECTED)
  - Different property/unit associations
  - Complete application data
  - Note: Can be added in future iteration

- [x] **Create realistic invoices** ✅
  - Monthly rent invoices for all active leases
  - Due dates set
  - Linked to recurring schedules

- [ ] **Create realistic notifications**
  - Historical notifications for users
  - Various notification types
  - Mix of read/unread
  - Note: Can be added in future iteration

- [x] **Create realistic expenses** ✅
  - Property maintenance expenses
  - Insurance expenses
  - Repair expenses
  - Various categories (MAINTENANCE, INSURANCE, REPAIRS)

#### 1.2 Seed Script Structure
```typescript
// prisma/seed.ts structure
async function main() {
  // 1. Create users (property managers, tenants, technicians, admin)
  // 2. Create properties with units
  // 3. Create leases
  // 4. Create maintenance requests
  // 5. Create payments and invoices
  // 6. Create rental applications
  // 7. Create notifications
  // 8. Create expenses
  // 9. Create relationships between entities
}
```

#### 1.3 Data Relationships ✅
- [x] Link tenants to leases ✅
- [x] Link leases to units ✅
- [x] Link units to properties ✅
- [x] Link maintenance requests to units/tenants ✅
- [x] Link payments to invoices/leases ✅
- [ ] Link applications to properties/units (future)
- [ ] Link notifications to users (future)

#### 1.4 Realistic Data Values ✅
- [x] Use realistic names (from real-world data) ✅
- [x] Use realistic addresses (Wichita, Kansas) ✅
- [x] Use realistic phone numbers ✅
- [x] Use realistic rent amounts ($525-$750 range) ✅
- [x] Use realistic dates (2025 calendar year) ✅
- [x] Use realistic descriptions and notes ✅

**Deliverable:** ✅ Enhanced `prisma/seed-real-data.ts` with comprehensive realistic data

**Status:** ✅ Phase 1 Seed Script Complete
- Created: `prisma/seed-real-data.ts` with all real-world data
- Includes: 16 users, 15 properties, 26 units, 13 leases, invoices, payments, expenses
- Usage: `npx ts-node prisma/seed-real-data.ts`

---

### Phase 2: Environment Configuration ✅ (Setup) - COMPLETE

**Goal:** Configure environment variables to use real data

#### 2.1 Backend Environment ✅
- [x] **Create `.env` file** ✅
  - Documentation created: `ENVIRONMENT_SETUP.md`
  - Template provided with all required variables
  - Includes database, JWT, CORS, rate limiting configuration
  
- [x] **Verify database connection** ✅
  - Verification steps documented
  - Commands provided: `npx prisma db push` and `npx prisma generate`

#### 2.2 Frontend Environment ✅
- [x] **Create `.env.local` file** ✅
  - Documentation created: `ENVIRONMENT_SETUP.md`
  - Template provided with all VITE variables
  - MSW disable instructions included
  
- [x] **Update `.env.local` for local overrides** ✅
  - Documentation explains `.env.local` precedence
  - Instructions for local development overrides

**Deliverable:** ✅ Environment setup guides created and documented

**Status:** ✅ Phase 2 Complete
- Created: `tenant_portal_backend/ENVIRONMENT_SETUP.md`
- Created: `tenant_portal_app/ENVIRONMENT_SETUP.md`
- Both guides include step-by-step instructions, troubleshooting, and verification steps

---

### Phase 3: Database Migration & Seeding ✅ (Execution)

**Goal:** Set up database with real-world data

#### 3.1 Database Setup
- [ ] **Run migrations**
  ```bash
  cd tenant_portal_backend
  npx prisma migrate dev
  npx prisma generate
  ```

- [ ] **Verify schema**
  ```bash
  npx prisma validate
  ```

#### 3.2 Seed Database
- [ ] **Run seed script**
  ```bash
  # Option 1: Direct seed
  npx ts-node prisma/seed.ts
  
  # Option 2: Via Prisma
  npx prisma db seed
  ```

- [ ] **Verify seed data**
  - Check user counts
  - Check property/unit counts
  - Check lease counts
  - Check maintenance request counts
  - Check payment counts

#### 3.3 Data Verification
- [ ] **Query database directly**
  ```sql
  SELECT COUNT(*) FROM "User";
  SELECT COUNT(*) FROM "Property";
  SELECT COUNT(*) FROM "Unit";
  SELECT COUNT(*) FROM "Lease";
  SELECT COUNT(*) FROM "MaintenanceRequest";
  SELECT COUNT(*) FROM "Payment";
  ```

- [ ] **Check relationships**
  - Verify foreign keys
  - Verify cascading deletes
  - Verify indexes

**Deliverable:** Database populated with realistic data

---

### Phase 4: Frontend Updates ✅ (Disable Mocks)

**Goal:** Update frontend to use real API instead of MSW

#### 4.1 Disable MSW
- [ ] **Update `src/main.tsx`**
  - Ensure MSW only runs when `VITE_USE_MSW !== 'false'`
  - Add clear logging when MSW is disabled
  - Remove MSW initialization in production builds

- [ ] **Update environment check**
  ```typescript
  // In main.tsx
  if (import.meta.env.VITE_USE_MSW === 'false') {
    console.log('[APP] Using real API - MSW disabled');
    // Don't initialize MSW
  }
  ```

#### 4.2 Remove Mock Fallbacks
- [ ] **Update components with mock fallbacks**
  - `LeadManagementPage.tsx` - Remove `getMockLeads()` fallback
  - `MaintenanceCard.tsx` - Remove mock data fallback
  - Other components with mock fallbacks

- [ ] **Update error handling**
  - Show proper error messages instead of falling back to mocks
  - Add retry logic for failed API calls
  - Add loading states

#### 4.3 API Client Updates
- [ ] **Verify `apiFetch` service**
  - Ensure it uses `VITE_API_URL`
  - Ensure proper error handling
  - Ensure proper authentication headers

- [ ] **Test API connectivity**
  - Test all endpoints
  - Verify CORS configuration
  - Verify authentication flow

**Deliverable:** Frontend configured to use real API

---

### Phase 5: Backend API Verification ✅ (Testing)

**Goal:** Verify all API endpoints work with real data

#### 5.1 Endpoint Testing
- [ ] **Authentication endpoints**
  - POST `/auth/login`
  - POST `/auth/register`
  - GET `/auth/me`

- [ ] **Property endpoints**
  - GET `/properties`
  - GET `/properties/:id`
  - POST `/properties`
  - PATCH `/properties/:id`

- [ ] **Unit endpoints**
  - GET `/properties/:id/units`
  - POST `/properties/:id/units`
  - PATCH `/properties/:id/units/:unitId`

- [ ] **Lease endpoints**
  - GET `/leases`
  - GET `/leases/:id`
  - POST `/leases`
  - PATCH `/leases/:id`

- [ ] **Maintenance endpoints**
  - GET `/maintenance`
  - GET `/maintenance/:id`
  - POST `/maintenance`
  - PATCH `/maintenance/:id`

- [ ] **Payment endpoints**
  - GET `/payments`
  - GET `/invoices`
  - POST `/payments`
  - POST `/payment-plans`

- [ ] **Application endpoints**
  - GET `/rental-applications`
  - GET `/rental-applications/:id`
  - POST `/rental-applications`
  - PUT `/rental-applications/:id/status`

- [ ] **Notification endpoints**
  - GET `/notifications`
  - GET `/notifications/preferences`
  - PUT `/notifications/preferences`

- [ ] **Dashboard endpoints**
  - GET `/dashboard/metrics`

#### 5.2 Data Validation
- [ ] **Verify response formats**
  - Check data structure matches frontend expectations
  - Check nested relationships are included
  - Check pagination works correctly

- [ ] **Verify error handling**
  - Test invalid requests
  - Test unauthorized access
  - Test not found scenarios

**Deliverable:** All API endpoints verified and working

---

### Phase 6: Integration Testing ✅ (Validation)

**Goal:** Test complete user flows with real data

#### 6.1 User Flows
- [ ] **Property Manager Flow**
  - Login as property manager
  - View dashboard with real metrics
  - View properties list
  - View property details
  - Create new property
  - Add units to property
  - View leases
  - View maintenance requests
  - Approve/reject applications

- [ ] **Tenant Flow**
  - Login as tenant
  - View dashboard
  - View lease details
  - Submit maintenance request
  - View payment history
  - Make payment
  - View notifications

- [ ] **Technician Flow**
  - Login as technician
  - View assigned maintenance requests
  - Update request status
  - Add notes to requests

#### 6.2 Data Consistency
- [ ] **Verify relationships**
  - Tenant can only see their own data
  - Property manager can see all properties
  - Maintenance requests linked correctly
  - Payments linked to correct invoices

- [ ] **Verify permissions**
  - Role-based access control
  - Tenant cannot access property manager features
  - Property manager can access all features

**Deliverable:** Complete user flows tested and working

---

### Phase 7: Performance & Optimization ✅ (Enhancement)

**Goal:** Optimize for real-world data volumes

#### 7.1 Database Optimization
- [ ] **Verify indexes**
  - Check query performance
  - Add indexes if needed
  - Optimize slow queries

- [ ] **Verify pagination**
  - Test with large datasets
  - Verify pagination works correctly
  - Test page size limits

#### 7.2 API Optimization
- [ ] **Verify response times**
  - Test endpoint performance
  - Optimize slow endpoints
  - Add caching where appropriate

- [ ] **Verify rate limiting**
  - Test rate limits
  - Verify throttling works
  - Adjust limits if needed

#### 7.3 Frontend Optimization
- [ ] **Verify loading states**
  - Test with slow network
  - Verify loading indicators
  - Test error states

- [ ] **Verify data caching**
  - Test React Query caching
  - Verify cache invalidation
  - Test stale data handling

**Deliverable:** Application optimized for real-world usage

---

### Phase 8: Documentation & Rollback Plan ✅ (Safety)

**Goal:** Document the migration and create rollback plan

#### 8.1 Documentation
- [ ] **Update README**
  - Document environment setup
  - Document seed process
  - Document API endpoints

- [ ] **Create migration guide**
  - Step-by-step instructions
  - Troubleshooting guide
  - Common issues and solutions

#### 8.2 Rollback Plan
- [ ] **Create backup strategy**
  - Database backup before migration
  - Environment variable backups
  - Code version control

- [ ] **Create rollback steps**
  - How to re-enable MSW
  - How to restore database
  - How to revert environment changes

**Deliverable:** Complete documentation and rollback plan

---

## 📋 Implementation Checklist

### Immediate Actions (Week 1)
- [x] Phase 1: Enhance seed script with realistic data ✅
- [x] Phase 2: Configure environment variables ✅
- [ ] Phase 3: Run database migrations and seed

### Short-term (Week 2)
- [ ] Phase 4: Disable MSW in frontend
- [ ] Phase 5: Verify all API endpoints
- [ ] Phase 6: Test complete user flows

### Medium-term (Week 3-4)
- [ ] Phase 7: Performance optimization
- [ ] Phase 8: Documentation and rollback plan

---

## 🔧 Tools & Resources

### Recommended Libraries
- **Faker.js** or **@faker-js/faker** - Generate realistic fake data
- **date-fns** - Date manipulation for realistic dates
- **bcrypt** - Password hashing (already in use)

### Database Tools
- **Prisma Studio** - Visual database browser
- **pgAdmin** or **DBeaver** - Database management
- **PostgreSQL** - Database (or your chosen DB)

### Testing Tools
- **Postman** or **Insomnia** - API testing
- **Browser DevTools** - Network monitoring
- **React DevTools** - Component debugging

---

## ⚠️ Risks & Mitigation

### Risk 1: Data Loss
- **Mitigation:** Always backup database before migration
- **Mitigation:** Use version control for seed scripts
- **Mitigation:** Test in development environment first

### Risk 2: API Breaking Changes
- **Mitigation:** Test all endpoints before disabling MSW
- **Mitigation:** Keep MSW as fallback initially
- **Mitigation:** Gradual rollout (feature flags)

### Risk 3: Performance Issues
- **Mitigation:** Monitor database query performance
- **Mitigation:** Add indexes where needed
- **Mitigation:** Implement pagination for large datasets

### Risk 4: Authentication Issues
- **Mitigation:** Test authentication flow thoroughly
- **Mitigation:** Verify JWT tokens work correctly
- **Mitigation:** Test role-based access control

---

## 📊 Success Criteria

### Phase 1 Success
- ✅ Seed script creates 100+ realistic entities
- ✅ All relationships properly linked
- ✅ Data looks realistic and varied

### Phase 2 Success
- ✅ Environment variables configured
- ✅ Database connection verified
- ✅ MSW disabled in frontend

### Phase 3 Success
- ✅ Database seeded successfully
- ✅ All tables populated
- ✅ Data verified in database

### Phase 4 Success
- ✅ Frontend uses real API
- ✅ No mock fallbacks active
- ✅ Error handling works correctly

### Phase 5 Success
- ✅ All API endpoints tested
- ✅ Response formats correct
- ✅ Error handling verified

### Phase 6 Success
- ✅ All user flows tested
- ✅ Data consistency verified
- ✅ Permissions working correctly

### Phase 7 Success
- ✅ Performance acceptable
- ✅ Queries optimized
- ✅ Caching implemented

### Phase 8 Success
- ✅ Documentation complete
- ✅ Rollback plan ready
- ✅ Team trained on new setup

---

## 🚀 Quick Start Guide

### For Immediate Testing

1. **Backend Setup:**
   ```bash
   cd tenant_portal_backend
   npm install
   npx prisma migrate dev
   npx prisma generate
   npx ts-node prisma/seed.ts
   npm run start:dev
   ```

2. **Frontend Setup:**
   ```bash
   cd tenant_portal_app
   npm install
   # Set VITE_USE_MSW=false in .env
   npm run dev
   ```

3. **Verify:**
   - Backend running on http://localhost:3001
   - Frontend running on http://localhost:5173
   - Login with seeded user credentials
   - Verify data appears in UI

---

## 📝 Next Steps

1. **Review this plan** with the team
2. **Prioritize phases** based on business needs
3. **Assign tasks** to team members
4. **Set timeline** for each phase
5. **Begin Phase 1** - Enhance seed script

---

**Status:** 📋 Ready for Implementation  
**Estimated Timeline:** 3-4 weeks  
**Priority:** High  
**Last Updated:** January 2025

