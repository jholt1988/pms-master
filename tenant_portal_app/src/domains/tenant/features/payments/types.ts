/**
 * Tenant Domain - Payments Feature Types
 * Type definitions for payment-related functionality
 */

export interface Invoice {
  id: number;
  amount: number;
  dueDate: string;
  status: string;
}

export interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  status: string;
}

export interface PaymentMethod {
  id: number;
  type: string;
  provider: string;
  last4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  createdAt: string;
}

export interface AutopayEnrollment {
  id: number;
  active: boolean;
  maxAmount?: number | null;
  paymentMethodId: number;
  paymentMethod?: PaymentMethod | null;
}

export interface AutopayStatus {
  leaseId: number;
  enrollment?: AutopayEnrollment | null;
}

export interface PaymentMethodForm {
  type: string;
  provider: string;
  last4: string;
  brand: string;
  expMonth: string;
  expYear: string;
  providerCustomerId: string;
  providerPaymentMethodId: string;
}
