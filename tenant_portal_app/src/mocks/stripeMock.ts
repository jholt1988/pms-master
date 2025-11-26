/**
 * Stripe Mock Service for Development
 * Provides mock Stripe payment processing when production keys are not available
 */

export interface MockPaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'processing' | 'requires_payment_method' | 'failed';
  client_secret?: string;
}

export interface MockPaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

class StripeMockService {
  private isMockMode: boolean;

  constructor() {
    // Check if we're in mock mode (no real Stripe key or explicit flag)
    this.isMockMode = 
      !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
      import.meta.env.VITE_USE_STRIPE_MOCK === 'true';
  }

  /**
   * Check if mock mode is active
   */
  isMock(): boolean {
    return this.isMockMode;
  }

  /**
   * Create a payment intent (mock)
   */
  async createPaymentIntent(amount: number, currency: string = 'usd'): Promise<MockPaymentIntent> {
    if (!this.isMockMode) {
      throw new Error('StripeMock: Not in mock mode. Use real Stripe SDK.');
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const paymentIntent: MockPaymentIntent = {
      id: `pi_mock_${Date.now()}`,
      amount,
      currency,
      status: 'requires_payment_method',
      client_secret: `pi_mock_${Date.now()}_secret_mock`,
    };

    console.log('[StripeMock] Created payment intent:', paymentIntent);
    return paymentIntent;
  }

  /**
   * Confirm a payment (mock)
   */
  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<MockPaymentIntent> {
    if (!this.isMockMode) {
      throw new Error('StripeMock: Not in mock mode. Use real Stripe SDK.');
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Randomly succeed or fail (90% success rate for testing)
    const success = Math.random() > 0.1;

    const result: MockPaymentIntent = {
      id: paymentIntentId,
      amount: 0, // Would be set from original intent
      currency: 'usd',
      status: success ? 'succeeded' : 'failed',
    };

    console.log('[StripeMock] Payment confirmed:', result);
    return result;
  }

  /**
   * Create a payment method (mock)
   */
  async createPaymentMethod(cardDetails: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
  }): Promise<MockPaymentMethod> {
    if (!this.isMockMode) {
      throw new Error('StripeMock: Not in mock mode. Use real Stripe SDK.');
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    const paymentMethod: MockPaymentMethod = {
      id: `pm_mock_${Date.now()}`,
      type: 'card',
      card: {
        brand: this.detectCardBrand(cardDetails.number),
        last4: cardDetails.number.slice(-4),
        exp_month: cardDetails.exp_month,
        exp_year: cardDetails.exp_year,
      },
    };

    console.log('[StripeMock] Created payment method:', paymentMethod);
    return paymentMethod;
  }

  /**
   * Detect card brand from number
   */
  private detectCardBrand(number: string): string {
    const cleanNumber = number.replace(/\s/g, '');
    if (cleanNumber.startsWith('4')) return 'visa';
    if (cleanNumber.startsWith('5')) return 'mastercard';
    if (cleanNumber.startsWith('3')) return 'amex';
    return 'unknown';
  }
}

export const stripeMock = new StripeMockService();

/**
 * Display mock mode banner in UI
 * Note: This component should be moved to a separate .tsx file if needed
 * For now, we'll export a function that returns the banner element
 */
import React from 'react';

export const MockModeBanner: React.FC = () => {
  if (!stripeMock.isMock()) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs font-mono text-yellow-400">
        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
        MOCK MODE: Using simulated payment processing
      </div>
    </div>
  );
};

