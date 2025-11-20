# Routing System

The Property Management Suite uses React Router v6 for client-side routing with comprehensive route guards and role-based access control.

## Overview

The routing system provides:
- **Role-based access control** with route guards
- **Authentication flow** with redirect-after-login support
- **Error handling** with custom 404 and 403 pages
- **Legacy route support** for backward compatibility
- **Centralized route constants** for maintainability

## Route Structure

### Public Routes
Routes accessible without authentication:

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `LoginPage` | User login with MFA support |
| `/signup` | `SignupPage` | New user registration |
| `/forgot-password` | `ForgotPasswordPage` | Password recovery |
| `/reset-password` | `PasswordResetPage` | Password reset completion |
| `/rental-application` | `ApplicationLandingPage` | Application process overview |
| `/rental-application/form` | `RentalApplicationFormPage` | Application form |
| `/rental-application/confirmation` | `ApplicationConfirmationPage` | Application success page |
| `/rent-estimator` | `RentEstimatorPage` | Rent estimation tool |

### Protected Routes (Authentication Required)

#### Tenant Routes
Requires `role: 'tenant'`

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `TenantDashboard` | Tenant overview and quick actions |
| `/my-lease` | `MyLeasePage` | Current lease details |
| `/maintenance` | `MaintenanceDashboard` | Maintenance requests |
| `/payments` | `PaymentsPage` | Rent payments and history |
| `/messages` | `MessagingPage` | Messaging center |
| `/inspections` | `InspectionManagementPage` | Property inspections |

#### Property Manager Routes
Requires `role: 'property_manager'`

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `PropertyManagerDashboard` | Manager overview and analytics |
| `/properties` | `PropertyListPage` | Property management |
| `/leases` | `LeaseManagementPage` | Lease administration |
| `/maintenance-dashboard` | `MaintenanceDashboard` | Maintenance queue management |
| `/payments-management` | `PaymentsPage` | Payment processing |
| `/rental-applications-management` | `RentalApplicationsManagementPage` | Application review |
| `/messages` | `MessagingPage` | Communication hub |
| `/expense-tracker` | `ExpenseTrackerPage` | Expense tracking |
| `/documents` | `DocumentManagementPage` | Document management |
| `/reports` | `ReportingPage` | Analytics and reporting |

#### Admin Routes
Requires `role: 'admin'`

| Route | Component | Description |
|-------|-----------|-------------|
| `/user-management` | `UserManagementPage` | User administration |
| `/audit-log` | `AuditLogPage` | System audit logs |

### Error Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/unauthorized` | `UnauthorizedPage` | 403 - Access denied with role context |
| `*` (404) | `NotFoundPage` | 404 - Page not found with suggestions |

## Route Guards

### RequireAuth
Checks if user is authenticated (has valid JWT token).

**Behavior:**
- If not authenticated → Redirects to `/login?redirect=/intended-path`
- If token expired → Redirects to `/login` with redirect parameter
- If authenticated → Allows access to protected route

**Example:**
```tsx
<Route element={<RequireAuth />}>
  <Route path="/dashboard" element={<TenantDashboard />} />
</Route>
```

### RequireRole
Checks if authenticated user has required role(s).

**Behavior:**
- If user lacks required role → Redirects to `/unauthorized` with location state
- If user has required role → Allows access to route

**Example:**
```tsx
<Route element={<RequireRole allowedRoles={['tenant']} />}>
  <Route path="/my-lease" element={<MyLeasePage />} />
</Route>
```

## Authentication Flow

### Login with Redirect
1. User attempts to access protected route (e.g., `/my-lease`)
2. `RequireAuth` guard detects no token
3. User redirected to `/login?redirect=/my-lease`
4. User completes login
5. `LoginPage` reads `redirect` query parameter
6. User automatically navigated to `/my-lease`

**Implementation:**
```tsx
// In LoginPage.tsx
const [searchParams] = useSearchParams();
const redirectUrl = searchParams.get('redirect') || '/';

// After successful login
navigate(redirectUrl);
```

## Rental Application Flow

The rental application process follows a 3-step flow:

### Step 1: Landing Page (`/rental-application`)
- Explains the 4-step application process
- Lists required documents
- Shows timeline (14 minutes total)
- Displays application fee ($50)
- CTA button to start application

### Step 2: Application Form (`/rental-application/form`)
- Multi-section form with validation
- Personal information
- Employment verification
- Rental history
- References
- Background check consent

### Step 3: Confirmation (`/rental-application/confirmation?id=xxx`)
- Displays confirmation code
- Shows "What happens next" timeline
- Explains 1-3 business day review period
- Offers account creation for status tracking

**Flow Implementation:**
```tsx
// In ApplicationPage.tsx (form submission)
const data = await res.json();
const applicationId = data.id || 'APP-' + Date.now().toString().slice(-6);
navigate(`/rental-application/confirmation?id=${applicationId}`);
```

## Legacy Route Support

For backward compatibility, legacy routes automatically redirect:

| Legacy Route | Redirects To | Type |
|--------------|--------------|------|
| `/lease` | `/my-lease` | Permanent |
| `/rental-applications` | `/rental-applications-management` | Permanent |
| `/maintenance-old` | `/maintenance` | Permanent |
| `/payments-old` | `/payments` | Permanent |
| `/lease-management-old` | `/lease-management` | Permanent |
| `/expense-tracker-old` | `/expense-tracker` | Permanent |

**Implementation:**
```tsx
<Route path="lease" element={<Navigate to="/my-lease" replace />} />
```

## Route Constants

Centralized route definitions in `src/constants/routes.ts`:

**Usage:**
```tsx
import { ROUTES, buildRoute } from '@/constants/routes';

// Simple navigation
navigate(ROUTES.TENANT.MY_LEASE);

// With parameters
navigate(buildRoute.applicationConfirmation('APP-123456'));

// With redirect
navigate(buildRoute.loginWithRedirect('/my-lease'));
```

**Benefits:**
- Type safety with TypeScript
- No hardcoded strings
- Easy refactoring
- Autocomplete support
- Prevents typos

## Navigation Components

### TenantSidebar
Located: `src/domains/tenant/layouts/TenantSidebar.tsx`

**Links:**
1. Dashboard (`/dashboard`)
2. Maintenance (`/maintenance`)
3. Payments (`/payments`)
4. My Lease (`/my-lease`)
5. Messages (`/messages`)
6. Inspections (`/inspections`)

### Sidebar (Property Manager)
Located: `src/components/ui/Sidebar.tsx`

**Links (role-filtered):**
1. Dashboard (`/dashboard`)
2. Maintenance (`/maintenance-dashboard`)
3. Payments (`/payments-management`)
4. Messages (`/messages`)
5. Leases (`/leases`)
6. Applications (`/rental-applications-management`)
7. Expenses (`/expense-tracker`)
8. Documents (`/documents`)
9. Reports (`/reports`)

## Dashboard Routing

### Index Route Behavior
The root route (`/`) redirects to `/dashboard`:

```tsx
<Route index element={<Navigate to="/dashboard" replace />} />
```

### Role-Based Dashboards
The `/dashboard` route displays different components based on user role:

**Implementation:**
```tsx
// Tenant Dashboard
<Route element={<RequireRole allowedRoles={['tenant']} />}>
  <Route path="dashboard" element={<TenantDashboard />} />
</Route>

// Property Manager Dashboard
<Route element={<RequireRole allowedRoles={['property_manager', 'admin']} />}>
  <Route path="dashboard" element={<PropertyManagerDashboard />} />
</Route>
```

## Error Handling

### 404 - Not Found
**Component:** `NotFoundPage.tsx`

**Features:**
- Displays requested URL
- Shows role-specific quick links
- "Go Back" button using browser history
- Search functionality (future enhancement)

### 403 - Unauthorized
**Component:** `UnauthorizedPage.tsx`

**Features:**
- Shows requested path and user's role
- Explains access denial reason
- Contact support link
- Return to dashboard button

## Best Practices

### 1. Use Route Constants
```tsx
// ❌ Bad
navigate('/rental-application/confirmation?id=123');

// ✅ Good
import { buildRoute } from '@/constants/routes';
navigate(buildRoute.applicationConfirmation('123'));
```

### 2. Preserve Redirect Context
```tsx
// When redirecting to login
const params = new URLSearchParams({ redirect: location.pathname });
navigate(`/login?${params}`);
```

### 3. Use Route Guards Appropriately
```tsx
// Wrap related routes in single guard
<Route element={<RequireRole allowedRoles={['tenant']} />}>
  <Route path="my-lease" element={<MyLeasePage />} />
  <Route path="maintenance" element={<MaintenanceDashboard />} />
</Route>
```

### 4. Handle Missing Routes
Always include a catch-all route:
```tsx
<Route path="*" element={<NotFoundPage />} />
```

## Migration Notes

### From Previous Routing
If you have old bookmarks or links:
- `/lease` → automatically redirects to `/my-lease`
- Root `/` → redirects to `/dashboard`
- Invalid routes → show 404 page with suggestions

### Future Enhancements
Planned improvements:
- Route-based code splitting
- Loading states for route transitions
- Breadcrumb navigation
- Route analytics tracking

## Troubleshooting

### Issue: Redirect Loop
**Cause:** RequireAuth and RequireRole both redirecting
**Solution:** Ensure guards are properly nested, RequireAuth first

### Issue: 404 on Valid Route
**Cause:** Route guard preventing access
**Solution:** Check user role matches route's `allowedRoles`

### Issue: Lost Redirect After Login
**Cause:** LoginPage not reading redirect parameter
**Solution:** Ensure `useSearchParams` is implemented correctly

## Related Documentation
- [Authentication](Authentication.md)
- [Rental Application](Rental-Application.md)
- [Architecture](../ARCHITECTURE.md)
