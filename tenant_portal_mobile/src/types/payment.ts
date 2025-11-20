/**
 * Payment and Lease Types
 * Types for rent payments, leases, payment methods, and transactions
 */

/**
 * Lease status enum
 */
export enum LeaseStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

/**
 * Payment method type enum
 */
export enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  ACH = 'ACH',
  PAYPAL = 'PAYPAL',
}

/**
 * Lease information
 */
export interface Lease {
  id: number;
  tenantId: number;
  propertyId: number;
  unitId: number;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  monthlyRent: number;
  securityDeposit: number;
  status: LeaseStatus;
  paymentDueDay: number; // Day of month (1-31)
  autoPayEnabled: boolean;
  defaultPaymentMethodId?: number;
  createdAt: string;
  updatedAt: string;
  property?: Property;
  unit?: Unit;
}

/**
 * Property information
 */
export interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  imageUrl?: string;
}

/**
 * Unit information
 */
export interface Unit {
  id: number;
  propertyId: number;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
}

/**
 * Payment record
 */
export interface Payment {
  id: number;
  leaseId: number;
  tenantId: number;
  amount: number;
  paymentMethodId?: number;
  status: PaymentStatus;
  paymentDate: string; // ISO date string
  dueDate: string; // ISO date string
  paidDate?: string; // ISO date string
  lateFee?: number;
  description?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
  lease?: Lease;
  paymentMethod?: PaymentMethod;
}

/**
 * Payment method (Stripe)
 */
export interface PaymentMethod {
  id: number;
  tenantId: number;
  type: PaymentMethodType;
  stripePaymentMethodId: string;
  isDefault: boolean;
  // Card details
  cardBrand?: string; // visa, mastercard, amex, etc.
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  // Bank account details
  bankName?: string;
  bankLast4?: string;
  accountType?: string; // checking, savings
  createdAt: string;
  updatedAt: string;
}

/**
 * Request to create a payment
 */
export interface CreatePaymentRequest {
  leaseId: number;
  amount: number;
  paymentMethodId: number;
  dueDate?: string; // Optional, uses lease due date if not provided
}

/**
 * Response from creating a payment
 */
export interface CreatePaymentResponse {
  payment: Payment;
  clientSecret?: string; // Stripe payment intent client secret
  requiresAction?: boolean; // 3D Secure or other authentication
}

/**
 * Request to add a payment method
 */
export interface AddPaymentMethodRequest {
  stripePaymentMethodId: string; // From Stripe.js
  setAsDefault?: boolean;
}

/**
 * Request to enable auto-pay
 */
export interface EnableAutoPayRequest {
  leaseId: number;
  paymentMethodId: number;
  paymentDay?: number; // Day of month (1-31), uses lease default if not provided
}

/**
 * Auto-pay configuration
 */
export interface AutoPayConfig {
  enabled: boolean;
  paymentMethodId?: number;
  paymentDay: number;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
}

/**
 * Payment summary for dashboard
 */
export interface PaymentSummary {
  currentBalance: number;
  nextPaymentDue: string; // ISO date string
  nextPaymentAmount: number;
  upcomingPayments: Payment[];
  recentPayments: Payment[];
  totalPaidThisYear: number;
  totalPaidAllTime: number;
}

/**
 * Payment filters for history
 */
export interface PaymentFilters {
  status?: PaymentStatus | PaymentStatus[];
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

/**
 * Paginated payment response
 */
export interface PaginatedPaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Payment receipt
 */
export interface PaymentReceipt {
  paymentId: number;
  amount: number;
  paidDate: string;
  paymentMethod: string;
  property: string;
  unit: string;
  receiptNumber: string;
  receiptUrl?: string;
}
