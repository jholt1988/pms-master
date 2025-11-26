import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
// Optimized NextUI imports - using individual package imports for better tree-shaking
import { NextUIProvider } from '@nextui-org/system';
import { Card, CardBody } from '@nextui-org/card';
import { Button } from '@nextui-org/button';
import { useAuth } from './AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import "./index.css";

// Lazy load pages for code splitting
const ForgotPasswordPage = lazy(() => import('./ForgotPasswordPage'));
const PasswordResetPage = lazy(() => import('./PasswordResetPage'));
const MessagingPage = lazy(() => import('./MessagingPage'));
const LeaseManagementPageModern = lazy(() => import('./LeaseManagementPageModern'));
const RentalApplicationsManagementPage = lazy(() => import('./RentalApplicationsManagementPage'));
const ExpenseTrackerPageModern = lazy(() => import('./ExpenseTrackerPageModern'));
const RentEstimatorPage = lazy(() => import('./RentEstimatorPage'));
const AuditLogPage = lazy(() => import('./AuditLogPage'));
const DocumentManagementPage = lazy(() => import('./DocumentManagementPage'));
const ReportingPage = lazy(() => import('./ReportingPage'));
const UserManagementPage = lazy(() => import('./UserManagementPage'));
const NotFoundPage = lazy(() => import('./NotFoundPage'));
const UnauthorizedPage = lazy(() => import('./UnauthorizedPage'));
// const PropertyManagerDashboard = lazy(() => import('./PropertyManagerDashboard')); // Unused - using MainDashboard instead
const PropertyManagementPage = lazy(() => import('./PropertyManagementPage'));
const SchedulePage = lazy(() => import('./SchedulePage'));
const InspectionManagementPage = lazy(() => import('./InspectionManagementPage'));
const MaintenanceManagementPage = lazy(() => import('./MaintenanceManagementPage'));
const QuickBooksPage = lazy(() => import('./QuickBooksPage'));
const RentOptimizationDashboard = lazy(() => import('./domains/property-manager/features/rent-optimization/RentOptimizationDashboard'));
const PropertySearchPage = lazy(() => import('./pages/properties/PropertySearchPage').then(m => ({ default: m.PropertySearchPage })));

// Shared domain imports - lazy loaded
const LoginPage = lazy(() => import('./domains/shared/auth/features/login').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./domains/shared/auth/features/signup').then(m => ({ default: m.SignupPage })));

// Tenant domain imports - lazy loaded
const TenantMaintenancePage = lazy(() => import('./domains/tenant/features/maintenance').then(m => ({ default: m.MaintenancePage })));
const TenantDashboard = lazy(() => import('./domains/tenant/features/dashboard/TenantDashboard'));
// Note: TenantShell no longer used - all roles use AppShell with role-aware DockNavigation
const MyLeasePage = lazy(() => import('./domains/tenant/features/lease').then(m => ({ default: m.MyLeasePage })));
const PaymentsPage = lazy(() => import('./domains/tenant/features/payments').then(m => ({ default: m.PaymentsPage })));
const TenantInspectionPage = lazy(() => import('./domains/tenant/features/inspection').then(m => ({ default: m.InspectionPage })));
const RentalApplicationFormPage = lazy(() => import('./domains/tenant/features/application').then(m => ({ default: m.ApplicationPage })));
const ApplicationLandingPage = lazy(() => import('./domains/shared/application/ApplicationLandingPage'));
const ApplicationConfirmationPage = lazy(() => import('./domains/shared/application/ApplicationConfirmationPage'));
const MainDashboard = lazy(() => import('./MainDashboard'));

// Keep AppShell and ErrorBoundary eagerly loaded (critical path)
import { AppShell } from './components/ui/AppShell';

// Loading component for lazy routes
const PageLoader = () => (
  <div className="min-h-screen w-full bg-deep-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-400 text-sm font-mono">LOADING MODULE...</p>
    </div>
  </div>
);

const RequireAuth = () => {
  const { token } = useAuth();
  const location = useLocation();
  
  if (!token) {
    // Redirect to login with return URL
    const params = new URLSearchParams({ redirect: location.pathname + location.search });
    return <Navigate to={`/login?${params}`} replace />;
  }
  return <Outlet />;
};

const RequireRole = ({ allowedRoles }: { allowedRoles: Array<string> }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  if (!user?.role) {
    return <Navigate to="/" replace />;
  }

  // If user doesn't have required role, show unauthorized page
  return allowedRoles.includes(user.role) ? <Outlet /> : <Navigate to="/unauthorized" state={{ from: location }} replace />;
};

const RoleBasedShell = () => {
  const { user, logout } = useAuth();
  
  // Create centralized logout handler
  const handleLogout = () => {
    logout();
    // Navigation will be handled by AuthContext state change and RequireAuth guard
  };
  
  // Handle case where user is authenticated but has no role
  if (!user?.role) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
        <Card style={{ maxWidth: '400px', padding: '24px' }}>
          <CardBody className="text-center space-y-4">
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>
              Access Not Configured
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280' }}>
              Your account doesn&apos;t have the necessary permissions to access this portal.
              Please contact your administrator.
            </p>
            <Button 
              color="primary" 
              onClick={handleLogout}
              fullWidth
            >
              Return to Login
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }
  
  // Render the same AppShell for all roles (twin layout)
  // DockNavigation will show role-appropriate items
  if (user.role === 'PROPERTY_MANAGER' || user.role === 'ADMIN' || user.role === 'TENANT') {
    return <AppShell />;
  }
  
  // Unknown role - redirect to login
  return <Navigate to="/login" replace />;
};

// Dashboard router - handles role-based dashboard rendering
const DashboardRouter = () => {
  const { user } = useAuth();
  
  // console.log('[DashboardRouter] Rendering for role:', user?.role); // Debug logging
  
  if (user?.role === 'TENANT') {
    return <TenantDashboard />;
  }
  
  if (user?.role === 'PROPERTY_MANAGER' || user?.role === 'ADMIN') {
    return <MainDashboard />;
  }
  
  // If no valid role, redirect to unauthorized
  return <Navigate to="/unauthorized" replace />;
};

export default function App({className}: {className: string}): React.ReactElement {
  const { token } = useAuth();

  return (
    <ErrorBoundary>
      <NextUIProvider className={className}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
          <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!token ? <SignupPage /> : <Navigate to="/" replace />} />
          <Route path="/forgot-password" element={!token ? <ForgotPasswordPage /> : <Navigate to="/" replace />} />
          <Route path="/reset-password" element={!token ? <PasswordResetPage /> : <Navigate to="/" replace />} />
          
          {/* Enhanced Application Flow */}
          <Route path="/rental-application" element={<ApplicationLandingPage />} />
          <Route path="/rental-application/form" element={<RentalApplicationFormPage />} />
          <Route path="/rental-application/confirmation" element={<ApplicationConfirmationPage />} />

          {/* Unauthorized page - accessible to logged in users */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<RoleBasedShell />}>
              {/* Index route - redirects to role-appropriate dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              
              {/* Dashboard route - role-based rendering */}
              <Route path="dashboard" element={<DashboardRouter />} />
              
              <Route path="maintenance" element={<TenantMaintenancePage />} />
              
              {/* Legacy routes with redirect */}
              <Route path="lease" element={<Navigate to="/my-lease" replace />} />
              <Route path="maintenance-old" element={<Navigate to="/maintenance" replace />} />
              <Route path="payments-old" element={<Navigate to="/payments" replace />} />
              <Route path="lease-management-old" element={<Navigate to="/lease-management" replace />} />
              <Route path="expense-tracker-old" element={<Navigate to="/expense-tracker" replace />} />
              
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="messaging" element={<MessagingPage />} />

              <Route element={<RequireRole allowedRoles={['PROPERTY_MANAGER']} />}>
                <Route path="properties" element={<PropertyManagementPage />} />
                <Route path="properties/search" element={<PropertySearchPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="lease-management" element={<LeaseManagementPageModern />} />
                <Route path="rental-applications-management" element={<RentalApplicationsManagementPage />} />
                <Route path="expense-tracker" element={<ExpenseTrackerPageModern />} />
                <Route path="rent-estimator" element={<RentEstimatorPage />} />
                <Route path="rent-optimization" element={<RentOptimizationDashboard />} />
                <Route path="security-events" element={<AuditLogPage />} />
                <Route path="user-management" element={<UserManagementPage />} />
                <Route path="documents" element={<DocumentManagementPage />} />
                <Route path="reporting" element={<ReportingPage />} />
                <Route path="inspection-management" element={<InspectionManagementPage />} />
                <Route path="maintenance-management" element={<MaintenanceManagementPage />} />
                <Route path="quickbooks" element={<QuickBooksPage />} />
              </Route>

              <Route element={<RequireRole allowedRoles={['TENANT']} />}>
                <Route path="my-lease" element={<MyLeasePage />} />
                <Route path="inspections" element={<TenantInspectionPage />} />
              </Route>

              {/* Catch-all within authenticated area */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

          {/* Global catch-all for unauthenticated users */}
          <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </NextUIProvider>
    </ErrorBoundary>
  );
}
