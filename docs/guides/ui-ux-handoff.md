
# UI/UX Handoff

This document provides an overview of the Property Management Suite application for the UI/UX designer.

## Application Functionality

# Property Management Suite Documentation

This document provides an overview of the functionality and features of the Property Management Suite application.

## Functionality and Features

*   **Authentication:** Users can sign up and log in to the application. There are two roles: `TENANT` and `PROPERTY_MANAGER`.
*   **Maintenance:** Tenants can submit maintenance requests, and property managers can view and manage them.
*   **Payments:** Tenants can view their invoices and payments.
*   **Messaging:** Tenants and property managers can communicate with each other.
*   **Lease Management:** Property managers can view and manage leases. Tenants can view their own lease.
*   **Rental Application:** Prospective tenants can apply for a rental property. Property managers can view and manage rental applications.
*   **Tenant Screening:** Property managers can screen tenants who have applied for a rental property.
*   **Expense Tracker:** Property managers can track expenses for their properties.
*   **Rent Estimator:** Property managers can estimate the rent for a unit.

## How to Use Each Feature

### Authentication

*   To sign up, click on the "Sign Up" link on the login page and fill out the form.
*   To log in, enter your username and password on the login page and click "Sign In".

### Maintenance

*   **Tenants:** To submit a maintenance request, go to the "Maintenance" page, fill out the form, and click "Submit".
*   **Property Managers:** To view and manage maintenance requests, go to the "Maintenance" page. You can change the status of a request from "PENDING" to "IN_PROGRESS" or "COMPLETED".

### Payments

*   **Tenants:** To view your invoices and payments, go to the "Payments" page.

### Messaging

*   To send and receive messages, go to the "Messaging" page. You can select a conversation to view the messages and send a new message.

### Lease Management

*   **Property Managers:** To view and manage leases, go to the "Lease Management" page.
*   **Tenants:** To view your lease, go to the "My Lease" page.

### Rental Application

*   **Prospective Tenants:** To apply for a rental property, go to the "Rental Application" page and fill out the form.
*   **Property Managers:** To view and manage rental applications, go to the "Applications" page. You can approve or reject an application.

### Tenant Screening

*   **Property Managers:** To screen a tenant, go to the "Applications" page and click the "Screen" button for the application you want to screen.

### Expense Tracker

*   **Property Managers:** To track expenses, go to the "Expense Tracker" page. You can add new expenses and view a list of all expenses.

### Rent Estimator

*   **Property Managers:** To estimate the rent for a unit, go to the "Rent Estimator" page, select a property and a unit, and click "Estimate Rent".

## Application Pages

The application consists of the following pages:

- App.tsx
- AuditLogPage.tsx
- AuthContext.tsx
- ExpenseTrackerPage.tsx
- index.css
- index.tsx
- LeaseManagementPage.tsx
- LoginPage.tsx
- MaintenanceDashboard.tsx
- MessagingPage.tsx
- MyLeasePage.tsx
- PaymentsPage.tsx
- RentalApplicationPage.tsx
- RentalApplicationsManagementPage.tsx
- RentEstimatorPage.tsx
- SignupPage.tsx

## Application Layout

The following is the content of `App.tsx`, which defines the overall layout and routing of the application.

```tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import MaintenanceDashboard from './MaintenanceDashboard';
import PaymentsPage from './PaymentsPage';
import MessagingPage from './MessagingPage';
import LeaseManagementPage from './LeaseManagementPage';
import MyLeasePage from './MyLeasePage';
import RentalApplicationPage from './RentalApplicationPage';
import RentalApplicationsManagementPage from './RentalApplicationsManagementPage';
import ExpenseTrackerPage from './ExpenseTrackerPage';
import RentEstimatorPage from './RentEstimatorPage';
import AuditLogPage from './AuditLogPage';

const RequireAuth = () => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const RequireRole = ({ allowedRoles }: { allowedRoles: Array<string> }) => {
  const { user } = useAuth();
  if (!user?.role) {
    return <Navigate to="/" replace />;
  }

  return allowedRoles.includes(user.role) ? <Outlet /> : <Navigate to="/" replace />;
};

const AppLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          background: '#f0f0f0',
        }}
      >
        <h1>Property Management Suite</h1>
        <nav>
          <Link to="/" style={{ marginRight: '1rem' }}>
            Maintenance
          </Link>
          <Link to="/payments" style={{ marginRight: '1rem' }}>
            Payments
          </Link>
          <Link to="/messaging" style={{ marginRight: '1rem' }}>
            Messaging
          </Link>
          {user?.role === 'PROPERTY_MANAGER' && (
            <>
              <Link to="/lease-management" style={{ marginRight: '1rem' }}>
                Lease Management
              </Link>
              <Link to="/rental-applications-management" style={{ marginRight: '1rem' }}>
                Applications
              </Link>
              <Link to="/expense-tracker" style={{ marginRight: '1rem' }}>
                Expense Tracker
              </Link>
              <Link to="/rent-estimator" style={{ marginRight: '1rem' }}>
                Rent Estimator
              </Link>
              <Link to="/security-events" style={{ marginRight: '1rem' }}>
                Audit Log
              </Link>
            </>
          )}
          {user?.role === 'TENANT' && (
            <Link to="/my-lease" style={{ marginRight: '1rem' }}>
              My Lease
            </Link>
          )}
        </nav>
        <button onClick={logout} style={{ padding: '0.5rem 1rem' }}>
          Logout
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default function App(): React.ReactElement {
  const { token } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route path="/signup" element={!token ? <SignupPage /> : <Navigate to="/" replace />} />
        <Route path="/rental-application" element={<RentalApplicationPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<MaintenanceDashboard />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="messaging" element={<MessagingPage />} />

            <Route element={<RequireRole allowedRoles={['PROPERTY_MANAGER']} />}>
              <Route path="lease-management" element={<LeaseManagementPage />} />
              <Route path="rental-applications-management" element={<RentalApplicationsManagementPage />} />
              <Route path="expense-tracker" element={<ExpenseTrackerPage />} />
              <Route path="rent-estimator" element={<RentEstimatorPage />} />
              <Route path="security-events" element={<AuditLogPage />} />
            </Route>

            <Route element={<RequireRole allowedRoles={['TENANT']} />}>
              <Route path="my-lease" element={<MyLeasePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```
