/**
 * Centralized route constants for the Property Management Suite
 * Use these constants instead of hardcoded strings to prevent typos and enable refactoring
 */

// Authentication Routes
export const ROUTES = {
  // Auth
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  UNAUTHORIZED: '/unauthorized',

  // Dashboard
  DASHBOARD: '/dashboard',
  
  // Tenant Routes
  TENANT: {
    DASHBOARD: '/dashboard',
    MY_LEASE: '/my-lease',
    MAINTENANCE: '/maintenance',
    PAYMENTS: '/payments',
    MESSAGES: '/messages',
    INSPECTIONS: '/inspections',
  },

  // Property Manager Routes
  PROPERTY_MANAGER: {
    DASHBOARD: '/dashboard',
    PROPERTIES: '/properties',
    LEASES: '/leases',
    MAINTENANCE: '/maintenance-dashboard',
    PAYMENTS: '/payments-management',
    APPLICATIONS: '/rental-applications-management',
    MESSAGES: '/messages',
    EXPENSES: '/expense-tracker',
    DOCUMENTS: '/documents',
    REPORTS: '/reports',
    USER_MANAGEMENT: '/user-management',
    AUDIT_LOG: '/audit-log',
    RENT_OPTIMIZATION: '/rent-optimization',
  },

  // Admin Routes
  ADMIN: {
    DASHBOARD: '/dashboard',
    USER_MANAGEMENT: '/user-management',
    AUDIT_LOG: '/audit-log',
  },

  // Shared/Public Routes
  RENTAL_APPLICATION: {
    LANDING: '/rental-application',
    FORM: '/rental-application/form',
    CONFIRMATION: '/rental-application/confirmation',
  },

  RENT_ESTIMATOR: '/rent-estimator',
  NOT_FOUND: '/404',

  // Legacy redirects (for backward compatibility)
  LEGACY: {
    LEASE: '/lease', // redirects to /my-lease
    RENTAL_APPLICATIONS: '/rental-applications', // redirects to /rental-applications-management
  },
} as const;

// Type helper for route values
export type RouteValue = string;

// Helper function to build routes with params
export const buildRoute = {
  applicationConfirmation: (id: string) => `${ROUTES.RENTAL_APPLICATION.CONFIRMATION}?id=${id}`,
  loginWithRedirect: (redirect: string) => `${ROUTES.LOGIN}?redirect=${encodeURIComponent(redirect)}`,
} as const;
