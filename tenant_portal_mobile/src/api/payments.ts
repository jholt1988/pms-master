import { apiService } from './client';
import type { Lease, PaymentSummary, PaymentMethod as PaymentMethodModel } from '../types/payment';

export interface Payment {
  id: number;
  leaseId: number;
  amount: number;
  paymentDate: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  transactionId?: string;
  receiptUrl?: string;
  lateFee?: number;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = PaymentMethodModel;

export interface CreatePaymentRequest {
  leaseId: number;
  amount: number;
  paymentMethodId: number;
  description?: string;
}

export interface CreatePaymentResponse {
  payment: Payment;
  clientSecret?: string;
  requiresAction?: boolean;
}

export interface CreatePaymentMethodRequest {
  stripePaymentMethodId: string;
  isDefault?: boolean;
}

export interface AutoPaySettings {
  leaseId: number;
  enabled: boolean;
  paymentMethodId?: number;
  dayOfMonth?: number;
}

export const paymentsApi = {
  /**
   * Get payment history
   */
  getPayments: async (): Promise<Payment[]> => {
    return apiService.get<Payment[]>('/payments');
  },

  /**
   * Get single payment by ID
   */
  getPayment: async (id: number): Promise<Payment> => {
    return apiService.get<Payment>(`/payments/${id}`);
  },

  /**
   * Create a new payment
   */
  createPayment: async (data: CreatePaymentRequest): Promise<CreatePaymentResponse> => {
    return apiService.post<CreatePaymentResponse>('/payments', data);
  },

  /**
   * Get payment methods
   */
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    return apiService.get<PaymentMethod[]>('/payment-methods');
  },

  /**
   * Add new payment method
   */
  addPaymentMethod: async (data: CreatePaymentMethodRequest): Promise<PaymentMethod> => {
    return apiService.post<PaymentMethod>('/payment-methods', data);
  },

  /**
   * Delete payment method
   */
  deletePaymentMethod: async (id: number): Promise<void> => {
    return apiService.delete(`/payment-methods/${id}`);
  },

  /**
   * Set default payment method
   */
  setDefaultPaymentMethod: async (id: number): Promise<PaymentMethod> => {
    return apiService.patch<PaymentMethod>(`/payment-methods/${id}/set-default`);
  },

  /**
   * Get auto-pay settings
   */
  getAutoPaySettings: async (leaseId: number): Promise<AutoPaySettings> => {
    return apiService.get<AutoPaySettings>(`/billing/autopay?leaseId=${leaseId}`);
  },

  /**
   * Enable/disable auto-pay
   */
  updateAutoPaySettings: async (data: AutoPaySettings): Promise<AutoPaySettings> => {
    return apiService.post<AutoPaySettings>('/billing/autopay', data);
  },

  /**
   * Download payment receipt
   */
  downloadReceipt: async (paymentId: number): Promise<string> => {
    const response = await apiService.get<{ url: string }>(`/payments/${paymentId}/receipt`);
    return response.url;
  },

  /**
   * Get current lease information
   */
  getCurrentLease: async (): Promise<Lease> => {
    return apiService.get<Lease>('/leases/current');
  },

  /**
   * Get payment summary for dashboard
   */
  getPaymentSummary: async (): Promise<PaymentSummary> => {
    return apiService.get<PaymentSummary>('/payments/summary');
  },

  /**
   * Confirm payment (after Stripe 3D Secure)
   */
  confirmPayment: async (paymentId: number): Promise<Payment> => {
    return apiService.post<Payment>(`/payments/${paymentId}/confirm`);
  },

  /**
   * Cancel pending payment
   */
  cancelPayment: async (paymentId: number): Promise<Payment> => {
    return apiService.post<Payment>(`/payments/${paymentId}/cancel`);
  },

  /**
   * Get Stripe publishable key
   */
  getStripeConfig: async (): Promise<{ publishableKey: string }> => {
    return apiService.get('/payments/stripe/config');
  },
};
