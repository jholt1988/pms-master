/**
 * API Fixtures for Development
 * Provides mock data when backend is unavailable
 */

export interface MockMaintenanceRequest {
  id: number;
  title: string;
  description: string;
  unit: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface MockInvoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  unit: string;
  description: string;
}

export interface MockPayment {
  id: number;
  amount: number;
  paymentDate: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  invoiceId: number;
  method: string;
}

export interface MockLease {
  id: number;
  property: string;
  unit: string;
  tenant: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
}

/**
 * Mock maintenance requests
 */
export const mockMaintenanceRequests: MockMaintenanceRequest[] = [
  {
    id: 1024,
    title: 'Gas Leak Detected',
    description: 'Tenant reports smell of gas in kitchen area',
    unit: 'Unit 2B',
    priority: 'HIGH',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 1023,
    title: 'AC Unit Failure',
    description: 'Air conditioning not working, unit completely dead',
    unit: 'Unit 5A',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 1021,
    title: 'Window Seal Broken',
    description: 'Window in bedroom has broken seal, letting in cold air',
    unit: 'Unit 1C',
    priority: 'LOW',
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Mock invoices
 */
export const mockInvoices: MockInvoice[] = [
  {
    id: 1043,
    invoiceNumber: 'INV-1043',
    amount: 1250.00,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'PENDING',
    unit: 'Unit 3C',
    description: 'Monthly Rent - November 2025',
  },
  {
    id: 1042,
    invoiceNumber: 'INV-1042',
    amount: 1150.00,
    dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'PAID',
    unit: 'Unit 2B',
    description: 'Monthly Rent - October 2025',
  },
];

/**
 * Mock payments
 */
export const mockPayments: MockPayment[] = [
  {
    id: 501,
    amount: 1150.00,
    paymentDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'COMPLETED',
    invoiceId: 1042,
    method: 'Card ending in 4242',
  },
];

/**
 * Mock leases
 */
export const mockLeases: MockLease[] = [
  {
    id: 201,
    property: 'Maple St',
    unit: 'Unit 4D',
    tenant: 'Jamie Lin',
    startDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    monthlyRent: 1250.00,
    status: 'ACTIVE',
  },
  {
    id: 202,
    property: 'Oak Ave',
    unit: 'Unit 1A',
    tenant: 'Chris Yu',
    startDate: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    monthlyRent: 1150.00,
    status: 'ACTIVE',
  },
];

/**
 * Check if we should use mock data
 */
export const shouldUseMockData = (): boolean => {
  return (
    import.meta.env.VITE_USE_MOCK_DATA === 'true' ||
    import.meta.env.DEV // Use mocks in development by default
  );
};

/**
 * Get mock maintenance requests
 */
export const getMockMaintenanceRequests = (): Promise<MockMaintenanceRequest[]> => {
  return Promise.resolve(mockMaintenanceRequests);
};

/**
 * Get mock invoices
 */
export const getMockInvoices = (): Promise<MockInvoice[]> => {
  return Promise.resolve(mockInvoices);
};

/**
 * Get mock payments
 */
export const getMockPayments = (): Promise<MockPayment[]> => {
  return Promise.resolve(mockPayments);
};

/**
 * Get mock leases
 */
export const getMockLeases = (): Promise<MockLease[]> => {
  return Promise.resolve(mockLeases);
};

