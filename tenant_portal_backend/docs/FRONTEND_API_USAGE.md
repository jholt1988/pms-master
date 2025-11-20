# Frontend API Usage

This document lists all the API endpoints the frontend application uses.

## Auth

- `POST /api/auth/login` (LoginPage.tsx)
- `POST /api/auth/register` (SignupPage.tsx)
- `GET /api/auth/password-policy` (SignupPage.tsx)
- `POST /api/auth/forgot-password` (ForgotPasswordPage.tsx)
- `POST /api/auth/reset-password` (PasswordResetPage.tsx)

## Billing

- `GET /api/billing/autopay` (PaymentsPage.tsx)
- `POST /api/billing/autopay` (PaymentsPage.tsx)
- `PATCH /api/billing/autopay/:leaseId/disable` (PaymentsPage.tsx)

## Documents

- `GET /api/documents` (DocumentManagementPage.tsx)
- `POST /api/documents/upload` (DocumentManagementPage.tsx)
- `GET /api/documents/:id/download` (DocumentManagementPage.tsx)
- `DELETE /api/documents/:id` (DocumentManagementPage.tsx)

## Expense

- `GET /api/expenses` (ExpenseTrackerPage.tsx, ExpenseTrackerPageModern.tsx)
- `POST /api/expenses` (ExpenseTrackerPage.tsx, ExpenseTrackerPageModern.tsx)
- `DELETE /api/expenses/:id` (ExpenseTrackerPage.tsx, ExpenseTrackerPageModern.tsx)

## Inspections

- `GET /api/inspections` (InspectionManagementPage.tsx)
- `POST /api/inspections` (domains/tenant/features/inspection/InspectionPage.tsx)

## Lease

- `GET /api/leases` (LeaseManagementPage.tsx, LeaseManagementPageModern.tsx)
- `GET /api/leases/my-lease` (domains/tenant/features/lease/MyLeasePage.tsx, PaymentsPage.tsx)
- `PUT /api/leases/:id/status` (LeaseManagementPage.tsx)
- `POST /api/leases/:id/renewal-offers` (LeaseManagementPage.tsx)
- `POST /api/leases/:id/notices` (LeaseManagementPage.tsx)
- `POST /api/leases/:id/tenant-notices` (domains/tenant/features/lease/MyLeasePage.tsx)

## Leasing / Applications / Tours

- `GET /api/leads` (LeadManagementPage.tsx) - **MISSING**
- `GET /api/leads/stats/dashboard` (LeadManagementPage.tsx) - **MISSING**
- `GET /api/leads/:leadId/messages` (LeadManagementPage.tsx) - **MISSING**
- `PATCH /api/leads/:leadId/status` (LeadManagementPage.tsx) - **MISSING**
- `GET /api/rental-applications` (RentalApplicationsManagementPage.tsx)
- `PUT /api/rental-applications/:id/status` (RentalApplicationsManagementPage.tsx)
- `POST /api/rental-applications/:id/screen` (RentalApplicationsManagementPage.tsx)
- `POST /api/rental-applications/:id/notes` (RentalApplicationsManagementPage.tsx)

## Maintenance

- `GET /api/maintenance` (MaintenanceDashboard.tsx)
- `GET /api/maintenance/technicians` (MaintenanceDashboard.tsx)
- `POST /api/maintenance` (MaintenanceDashboard.tsx)
- `GET /api/maintenance/assets` (MaintenanceDashboard.tsx)
- `PUT /api/maintenance/:id/status` (MaintenanceDashboard.tsx)
- `PUT /api/maintenance/:id/assign` (MaintenanceDashboard.tsx)
- `POST /api/maintenance/:id/notes` (MaintenanceDashboard.tsx)
- `GET /api/maintenance-requests` (MaintenanceManagementPage.tsx) - **MISMATCH** (should be `/api/maintenance`)
- `GET /api/users/technicians` (MaintenanceDashboardModern.tsx) - **MISMATCH** (should be `/api/maintenance/technicians`)
- `PUT /api/maintenance/:requestId/assignee` (MaintenanceDashboardModern.tsx) - **MISMATCH** (should be `/api/maintenance/:id/assign`)

## Messaging

- `GET /api/messaging/conversations/:id` (MessagingPage.tsx) - **MISSING**
- `GET /api/messaging/conversations` (MessagingPage.tsx)
- `POST /api/messaging/bulk` (MessagingPage.tsx)
- `GET /api/messaging/templates` (MessagingPage.tsx)
- `POST /api/messaging/messages` (MessagingPage.tsx)

## Notifications

- `GET /api/notifications/unread-count` (NotificationCenter.tsx)
- `GET /api/notifications` (NotificationCenter.tsx)
- `POST /api/notifications/:id/read` (NotificationCenter.tsx)
- `POST /api/notifications/read-all` (NotificationCenter.tsx)
- `DELETE /api/notifications/:id` (NotificationCenter.tsx)

## Payments

- `GET /api/payments/invoices` (PaymentsPage.tsx, domains/tenant/features/payments/PaymentsPage.tsx)
- `GET /api/payments` (PaymentsPage.tsx, domains/tenant/features/payments/PaymentsPage.tsx)
- `GET /api/payment-methods` (PaymentsPage.tsx, domains/tenant/features/payments/PaymentsPage.tsx)
- `POST /api/payment-methods` (PaymentsPage.tsx, domains/tenant/features/payments/PaymentsPage.tsx)
- `DELETE /api/payment-methods/:id` (PaymentsPage.tsx)

## Properties

- `GET /api/properties` (ExpenseTrackerPage.tsx, ExpenseTrackerPageModern.tsx, MaintenanceDashboardModern.tsx, RentEstimatorPage.tsx)
- `GET /api/properties/public` (domains/tenant/features/application/ApplicationPage.tsx)

## QuickBooks

- `GET /api/quickbooks/connections` (QuickBooksPage.tsx)

## Rent Estimator

- `GET /api/rent-estimator` (RentEstimatorPage.tsx)

## Rent Optimization

- `POST /api/rent-recommendations/:id/accept` (RentOptimizationDashboard.tsx)
- `POST /api/rent-recommendations/:id/reject` (RentOptimizationDashboard.tsx)
- `POST /api/rent-recommendations/generate` (RentOptimizationDashboard.tsx)

## Reporting

- `GET /api/reporting/:reportType` (ReportingPage.tsx)

## Security Events

- `GET /api/security-events` (AuditLogPage.tsx)

## Users

- `GET /api/users` (UserManagementPage.tsx)
- `POST /api/users` (UserManagementPage.tsx)
- `PUT /api/users/:id` (UserManagementPage.tsx)
- `DELETE /api/users/:id` (UserManagementPage.tsx)

## Dashboard

- `GET /api/dashboard/metrics` (PropertyManagerDashboard.tsx)
- `GET /api/tenant/dashboard` (TenantDashboard.tsx)
