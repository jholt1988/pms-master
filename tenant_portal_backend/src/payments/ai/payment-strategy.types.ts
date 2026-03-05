export type PaymentAIChannel = 'EMAIL' | 'SMS' | 'PUSH';
export type PaymentAIUrgency = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PaymentRiskAssessmentResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  failureProbability: number;
  factors: string[];
  recommendedActions: string[];
  optimalRetryTime?: Date;
  suggestPaymentPlan: boolean;
  paymentPlanSuggestion?: {
    installments: number;
    amountPerInstallment: number;
    totalAmount: number;
  };
}

export interface PaymentReminderTimingResult {
  optimalTime: Date;
  channel: PaymentAIChannel;
  urgency: PaymentAIUrgency;
  personalizedMessage?: string;
}

export interface PaymentRiskStrategy {
  readonly name: string;
  assessPaymentRisk(userId: string, invoiceId: number): Promise<PaymentRiskAssessmentResult>;
}

export interface PaymentReminderStrategy {
  readonly name: string;
  determineReminderTiming(
    userId: string,
    invoiceId: number,
  ): Promise<PaymentReminderTimingResult>;
}
