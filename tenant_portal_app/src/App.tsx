import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { NextUIProvider } from '@nextui-org/system';
import { Card } from '@nextui-org/card';
import { CardBody } from '@nextui-org/card';
import { Button } from '@nextui-org/button';
import { useAuth } from './AuthContext';
import ForgotPasswordPage from './ForgotPasswordPage';
import PasswordResetPage from './PasswordResetPage';
import MessagingPage from './MessagingPage';
import LeaseManagementPageModern from './LeaseManagementPageModern';
import RentalApplicationsManagementPage from './RentalApplicationsManagementPage';
import ExpenseTrackerPageModern from './ExpenseTrackerPageModern';
import RentEstimatorPage from './RentEstimatorPage';
import AuditLogPage from './AuditLogPage';
import DocumentManagementPage from './DocumentManagementPage';
import ReportingPage from './ReportingPage';
import UserManagementPage from './UserManagementPage';
import NotFoundPage from './NotFoundPage';
import UnauthorizedPage from './UnauthorizedPage';
import PropertyManagerDashboard from './PropertyManagerDashboard';
import PropertyManagementPage from './PropertyManagementPage';
import SchedulePage from './SchedulePage';

import InspectionManagementPage from './InspectionManagementPage';
import MaintenanceManagementPage from './MaintenanceManagementPage';
import QuickBooksPage from './QuickBooksPage';
import { AppShell } from './components/ui/AppShell';
import RentOptimizationDashboard from './domains/property-manager/features/rent-optimization/RentOptimizationDashboard';
import { PropertySearchPage } from './pages/properties/PropertySearchPage';

// Shared domain imports
import { LoginPage } from './domains/shared/auth/features/login';
import { SignupPage } from './domains/shared/auth/features/signup';

// Tenant domain imports
import { MaintenancePage as TenantMaintenancePage } from './domains/tenant/features/maintenance';
import TenantDashboard from './domains/tenant/features/dashboard/TenantDashboard';
import { TenantShell } from './domains/tenant/layouts';
import { MyLeasePage } from './domains/tenant/features/lease';
import { PaymentsPage } from './domains/tenant/features/payments';
import { InspectionPage as TenantInspectionPage } from './domains/tenant/features/inspection';
import { ApplicationPage as RentalApplicationFormPage } from './domains/tenant/features/application';
import ApplicationLandingPage from './domains/shared/application/ApplicationLandingPage';
import ApplicationConfirmationPage from './domains/shared/application/ApplicationConfirmationPage';

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
              Your account doesn't have the necessary permissions to access this portal.
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
  
  // Render the appropriate shell based on role
  // The shell components will render <Outlet /> for nested routes
  if (user.role === 'PROPERTY_MANAGER' || user.role === 'ADMIN') {
    return <AppShell onLogout={handleLogout} />;
  } else if (user.role === 'TENANT') {
    return <TenantShell onLogout={handleLogout} />;
  }
  
  // Unknown role - redirect to login
  return <Navigate to="/login" replace />;
};

// Dashboard router - handles role-based dashboard rendering
const DashboardRouter = () => {
  const { user } = useAuth();
  
  console.log('[DashboardRouter] Rendering for role:', user?.role);
  
  if (user?.role === 'TENANT') {
    return <TenantDashboard />;
  }
  
  if (user?.role === 'PROPERTY_MANAGER' || user?.role === 'ADMIN') {
    return <PropertyManagerDashboard />;
  }
  
  // If no valid role, redirect to unauthorized
  return <Navigate to="/unauthorized" replace />;
};

export default function App({className}: {className: string}): React.ReactElement {
  const { token } = useAuth();

  return (
    <NextUIProvider className={className}>
      <BrowserRouter>
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
      </BrowserRouter>
    </NextUIProvider>
  );
}
