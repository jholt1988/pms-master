# Complete Feature Execution Guide

**Goal:** Get all features and functions working with real-world data  
**Status:** 🚀 Ready for Execution  
**Date:** January 28, 2025

---

## Quick Start - Complete Setup

### Step 1: Environment Setup (5 minutes)

#### Backend Environment
```bash
cd tenant_portal_backend

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://user:password@localhost:5432/tenant_portal?schema=public"
DISABLE_AUTO_SEED=true
SKIP_SEED=true
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production-min-32-chars
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
RATE_LIMIT_ENABLED=true
EOF

# Update DATABASE_URL with your actual credentials
```

#### Frontend Environment
```bash
cd tenant_portal_app

# Create .env.local file
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3001/api
VITE_USE_MSW=false
VITE_USE_MOCK_DATA=false
VITE_USE_STRIPE_MOCK=false
EOF
```

### Step 2: Database Migration & Seeding (10 minutes)

#### Option A: Automated Script (Recommended)
```bash
cd tenant_portal_backend

# Windows PowerShell
.\scripts\migrate-and-seed.ps1

# Linux/Mac
bash scripts/migrate-and-seed.sh
```

#### Option B: Manual Steps
```bash
cd tenant_portal_backend

# 1. Validate schema
npx prisma validate

# 2. Generate Prisma client
npx prisma generate

# 3. Run migrations
npx prisma migrate deploy

# 4. Seed database
npx ts-node prisma/seed-real-data.ts

# 5. Verify data
npx ts-node scripts/verify-data.ts
```

### Step 3: Start Servers

#### Backend
```bash
cd tenant_portal_backend
npm run start:dev
# Server starts on http://localhost:3001
```

#### Frontend
```bash
cd tenant_portal_app
npm run dev
# App starts on http://localhost:5173
```

---

## Feature Verification Checklist

### ✅ Core Features

#### 1. Authentication & Authorization
- [ ] Login with seeded credentials
- [ ] JWT token generation
- [ ] Role-based access control
- [ ] Password reset flow
- [ ] MFA setup (if configured)

**Test Users:**
- Property Manager: `admin` / `admin123`
- Property Manager: `jholt` / `adminpass`
- Tenant: `mark_donna` / `tenantpass123`
- Tenant: `steve` / `tenantpass123`

**API Endpoints:**
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

#### 2. Property Management
- [ ] List all properties
- [ ] View property details
- [ ] Create new property
- [ ] Update property
- [ ] Delete property
- [ ] Property search/filter

**API Endpoints:**
- `GET /api/properties`
- `GET /api/properties/:id`
- `POST /api/properties`
- `PATCH /api/properties/:id`
- `DELETE /api/properties/:id`

#### 3. Unit Management
- [ ] List units for property
- [ ] View unit details
- [ ] Create new unit
- [ ] Update unit
- [ ] Unit availability status

**API Endpoints:**
- `GET /api/properties/:id/units`
- `GET /api/units/:id`
- `POST /api/properties/:id/units`
- `PATCH /api/units/:id`

#### 4. Lease Management
- [ ] List all leases
- [ ] View lease details
- [ ] Create new lease
- [ ] Update lease
- [ ] Lease renewal
- [ ] Lease termination

**API Endpoints:**
- `GET /api/leases`
- `GET /api/leases/:id`
- `POST /api/leases`
- `PATCH /api/leases/:id`
- `GET /api/leases/tenant/:tenantId`

#### 5. Maintenance Requests
- [ ] List maintenance requests
- [ ] Create maintenance request
- [ ] Update request status
- [ ] Assign technician
- [ ] Add notes/updates

**API Endpoints:**
- `GET /api/maintenance`
- `GET /api/maintenance/:id`
- `POST /api/maintenance`
- `PATCH /api/maintenance/:id`
- `GET /api/maintenance/tenant/:tenantId`

#### 6. Payments & Billing
- [ ] View invoices
- [ ] Make payment
- [ ] Payment history
- [ ] Payment methods
- [ ] Payment plans

**API Endpoints:**
- `GET /api/invoices`
- `GET /api/invoices/:id`
- `GET /api/payments`
- `POST /api/payments`
- `GET /api/payment-methods`
- `POST /api/payment-methods`

#### 7. Messaging System
- [ ] List conversations
- [ ] Send message
- [ ] View conversation thread
- [ ] Mark as read

**API Endpoints:**
- `GET /api/messaging/conversations`
- `GET /api/messaging/conversations/:id`
- `POST /api/messaging/conversations/:id/messages`
- `GET /api/messaging/conversations/:id/messages`

#### 8. Notifications
- [ ] List notifications
- [ ] Mark as read
- [ ] Notification preferences

**API Endpoints:**
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/notifications/preferences`
- `PUT /api/notifications/preferences`

#### 9. Documents Management
- [ ] Upload document
- [ ] List documents
- [ ] Download document
- [ ] Delete document

**API Endpoints:**
- `GET /api/documents`
- `POST /api/documents`
- `GET /api/documents/:id`
- `DELETE /api/documents/:id`

#### 10. Dashboard & Reporting
- [ ] Property manager dashboard
- [ ] Tenant dashboard
- [ ] Metrics and statistics
- [ ] Reports generation

**API Endpoints:**
- `GET /api/dashboard`
- `GET /api/dashboard/tenant`
- `GET /api/reporting/metrics`
- `GET /api/reporting/reports`

---

### ✅ Advanced Features

#### 11. Rental Applications
- [ ] Submit application
- [ ] View applications
- [ ] Approve/reject application
- [ ] Application status updates

**API Endpoints:**
- `GET /api/rental-applications`
- `POST /api/rental-applications`
- `GET /api/rental-applications/:id`
- `PUT /api/rental-applications/:id/status`

#### 12. Lead Management
- [ ] List leads
- [ ] Create lead
- [ ] Update lead status
- [ ] Lead search/filter

**API Endpoints:**
- `GET /api/leasing/leads`
- `POST /api/leasing/leads`
- `GET /api/leasing/leads/:id`
- `PATCH /api/leasing/leads/:id`

#### 13. Tour Scheduling
- [ ] Schedule tour
- [ ] List tours
- [ ] Update tour status
- [ ] Cancel tour

**API Endpoints:**
- `GET /api/tours`
- `POST /api/tours`
- `GET /api/tours/:id`
- `PATCH /api/tours/:id`

#### 14. Expense Tracking
- [ ] List expenses
- [ ] Create expense
- [ ] Expense categories
- [ ] Expense reports

**API Endpoints:**
- `GET /api/expenses`
- `POST /api/expenses`
- `GET /api/expenses/:id`

#### 15. Inspections System
- [ ] Create inspection
- [ ] List inspections
- [ ] Inspection templates
- [ ] Inspection reports

**API Endpoints:**
- `GET /api/inspections`
- `POST /api/inspections`
- `GET /api/inspections/:id`

#### 16. E-Signature Integration
- [ ] Create signature request
- [ ] View signature status
- [ ] Webhook handling

**API Endpoints:**
- `POST /api/esignature/requests`
- `GET /api/esignature/requests/:id`

#### 17. Listing Syndication
- [ ] Sync listings
- [ ] View syndicated listings
- [ ] Update listing status

**API Endpoints:**
- `GET /api/listing-syndication`
- `POST /api/listing-syndication/sync`

#### 18. Rent Optimization (ML)
- [ ] Get rent estimates
- [ ] Market analysis
- [ ] Optimization recommendations

**API Endpoints:**
- `POST /api/rent-optimization/estimate`
- `GET /api/rent-estimator/estimate`

#### 19. AI Chatbot
- [ ] Chat with bot
- [ ] Conversation history
- [ ] Context awareness

**API Endpoints:**
- `POST /api/chatbot/message`

#### 20. QuickBooks Integration
- [ ] QuickBooks connection
- [ ] Sync data
- [ ] View transactions

**API Endpoints:**
- `GET /api/quickbooks/status`
- `POST /api/quickbooks/connect`

#### 21. Workflow Engine
- [ ] View workflows
- [ ] Trigger workflow
- [ ] Workflow status

**API Endpoints:**
- `GET /api/workflows`
- `POST /api/workflows/:id/trigger`

---

## Complete API Endpoint Reference

### Authentication (`/api/auth`)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/mfa/activate` - Activate MFA
- `POST /auth/mfa/disable` - Disable MFA

### Properties (`/api/properties`)
- `GET /properties` - List all properties
- `GET /properties/:id` - Get property details
- `POST /properties` - Create property
- `PATCH /properties/:id` - Update property
- `DELETE /properties/:id` - Delete property
- `GET /properties/:id/units` - Get units for property

### Units (`/api/units`)
- `GET /units/:id` - Get unit details
- `POST /properties/:id/units` - Create unit
- `PATCH /units/:id` - Update unit

### Leases (`/api/leases`)
- `GET /leases` - List leases
- `GET /leases/:id` - Get lease details
- `POST /leases` - Create lease
- `PATCH /leases/:id` - Update lease
- `GET /leases/tenant/:tenantId` - Get tenant leases

### Maintenance (`/api/maintenance`)
- `GET /maintenance` - List requests
- `GET /maintenance/:id` - Get request details
- `POST /maintenance` - Create request
- `PATCH /maintenance/:id` - Update request
- `GET /maintenance/tenant/:tenantId` - Get tenant requests

### Payments (`/api/payments`)
- `GET /payments` - List payments
- `POST /payments` - Create payment
- `GET /invoices` - List invoices
- `GET /invoices/:id` - Get invoice
- `GET /payment-methods` - List payment methods
- `POST /payment-methods` - Add payment method

### Messaging (`/api/messaging`)
- `GET /messaging/conversations` - List conversations
- `GET /messaging/conversations/:id` - Get conversation
- `POST /messaging/conversations/:id/messages` - Send message
- `GET /messaging/conversations/:id/messages` - Get messages

### Notifications (`/api/notifications`)
- `GET /notifications` - List notifications
- `PATCH /notifications/:id/read` - Mark as read
- `GET /notifications/preferences` - Get preferences
- `PUT /notifications/preferences` - Update preferences

### Documents (`/api/documents`)
- `GET /documents` - List documents
- `POST /documents` - Upload document
- `GET /documents/:id` - Get document
- `DELETE /documents/:id` - Delete document

### Dashboard (`/api/dashboard`)
- `GET /dashboard` - Property manager dashboard
- `GET /dashboard/tenant` - Tenant dashboard

### Reporting (`/api/reporting`)
- `GET /reporting/metrics` - Get metrics
- `GET /reporting/reports` - Generate reports

### Rental Applications (`/api/rental-applications`)
- `GET /rental-applications` - List applications
- `POST /rental-applications` - Submit application
- `GET /rental-applications/:id` - Get application
- `PUT /rental-applications/:id/status` - Update status

### Leasing (`/api/leasing`)
- `GET /leasing/leads` - List leads
- `POST /leasing/leads` - Create lead
- `GET /leasing/leads/:id` - Get lead
- `PATCH /leasing/leads/:id` - Update lead

### Tours (`/api/tours`)
- `GET /tours` - List tours
- `POST /tours` - Schedule tour
- `GET /tours/:id` - Get tour
- `PATCH /tours/:id` - Update tour

### Expenses (`/api/expenses`)
- `GET /expenses` - List expenses
- `POST /expenses` - Create expense
- `GET /expenses/:id` - Get expense

### Inspections (`/api/inspections`)
- `GET /inspections` - List inspections
- `POST /inspections` - Create inspection
- `GET /inspections/:id` - Get inspection

### E-Signature (`/api/esignature`)
- `POST /esignature/requests` - Create request
- `GET /esignature/requests/:id` - Get request

### Listing Syndication (`/api/listing-syndication`)
- `GET /listing-syndication` - List listings
- `POST /listing-syndication/sync` - Sync listings

### Rent Optimization (`/api/rent-optimization`)
- `POST /rent-optimization/estimate` - Get estimate

### Rent Estimator (`/api/rent-estimator`)
- `GET /rent-estimator/estimate` - Get estimate

### Chatbot (`/api/chatbot`)
- `POST /chatbot/message` - Send message

### QuickBooks (`/api/quickbooks`)
- `GET /quickbooks/status` - Get status
- `POST /quickbooks/connect` - Connect account

### Workflows (`/api/workflows`)
- `GET /workflows` - List workflows
- `POST /workflows/:id/trigger` - Trigger workflow

---

## Testing Workflow

### 1. Authentication Test
```bash
# Login as property manager
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Save token from response, then test protected route
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Property Test
```bash
# Get all properties
curl http://localhost:3001/api/properties \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get specific property
curl http://localhost:3001/api/properties/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Verify Frontend Connection
1. Open `http://localhost:5173`
2. Login with seeded credentials
3. Check browser console for API calls
4. Verify data loads from backend (not MSW)

---

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Verify database exists

### Migration Issues
- Check Prisma schema is valid: `npx prisma validate`
- Regenerate client: `npx prisma generate`
- Reset database if needed: `npx prisma migrate reset`

### Seed Issues
- Check seed script exists: `ls prisma/seed-real-data.ts`
- Run seed manually: `npx ts-node prisma/seed-real-data.ts`
- Verify data: `npx ts-node scripts/verify-data.ts`

### API Connection Issues
- Verify backend is running on port 3001
- Check `VITE_API_URL` in frontend `.env.local`
- Verify `VITE_USE_MSW=false`
- Check CORS configuration in backend

### Frontend Issues
- Clear browser cache
- Restart dev server
- Check browser console for errors
- Verify environment variables loaded

---

## Next Steps

1. ✅ Complete environment setup
2. ✅ Run migrations and seed database
3. ⏳ Verify all endpoints work
4. ⏳ Test all user workflows
5. ⏳ Performance optimization

---

**Status:** 🚀 Ready for Complete Execution  
**All Features:** Ready to Test  
**Documentation:** Complete

