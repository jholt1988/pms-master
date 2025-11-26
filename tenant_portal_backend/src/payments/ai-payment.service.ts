import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

interface PaymentRiskAssessment {
  riskScore: number; // 0-100, higher = more risk
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  failureProbability: number; // 0-1
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

interface PaymentReminderTiming {
  optimalTime: Date;
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  personalizedMessage?: string;
}

@Injectable()
export class AIPaymentService {
  private readonly logger = new Logger(AIPaymentService.name);
  private openai: OpenAI | null = null;
  private readonly aiEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const aiEnabled = this.configService.get<string>('AI_ENABLED', 'false') === 'true';
    const paymentAiEnabled = this.configService.get<string>(
      'AI_PAYMENT_ENABLED',
      'true',
    ) === 'true';

    this.aiEnabled = aiEnabled && paymentAiEnabled;

    if (this.aiEnabled && apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('AI Payment Service initialized with OpenAI');
    } else {
      this.logger.warn(
        'AI Payment Service initialized in mock mode (no OpenAI API key or AI disabled)',
      );
    }
  }

  /**
   * Assess payment risk for a tenant/invoice
   */
  async assessPaymentRisk(
    userId: number,
    invoiceId: number,
  ): Promise<PaymentRiskAssessment> {
    // Get user payment history
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        payments: {
          include: {
            invoice: true,
          },
          orderBy: { id: 'desc' },
          take: 12,
        },
        lease: {
          include: {
            invoices: {
              orderBy: { dueDate: 'desc' },
              take: 12,
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const factors: string[] = [];
    let riskScore = 0;

    // Factor 1: Payment history (on-time payment rate)
    const totalPayments = user.payments.length;
    const onTimePayments = user.payments.filter((p) => {
      if (!p.invoice) return false;
      return p.paymentDate <= p.invoice.dueDate;
    }).length;

    const onTimeRate = totalPayments > 0 ? onTimePayments / totalPayments : 1;
    if (onTimeRate < 0.5) {
      riskScore += 40;
      factors.push(`Low on-time payment rate: ${(onTimeRate * 100).toFixed(0)}%`);
    } else if (onTimeRate < 0.8) {
      riskScore += 20;
      factors.push(`Moderate on-time payment rate: ${(onTimeRate * 100).toFixed(0)}%`);
    } else {
      factors.push(`Good on-time payment rate: ${(onTimeRate * 100).toFixed(0)}%`);
    }

    // Factor 2: Recent late payments
    const recentLatePayments = user.payments.filter((p) => {
      if (!p.invoice) return false;
      const daysLate = (p.paymentDate.getTime() - p.invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysLate > 0 && p.paymentDate > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    }).length;

    if (recentLatePayments > 2) {
      riskScore += 30;
      factors.push(`${recentLatePayments} late payments in last 90 days`);
    } else if (recentLatePayments > 0) {
      riskScore += 15;
      factors.push(`${recentLatePayments} late payment(s) in last 90 days`);
    }

    // Factor 3: Outstanding balance
    const outstandingInvoices = user.lease?.invoices.filter(
      (inv) => inv.status === 'PENDING' && inv.id !== invoiceId,
    ) || [];
    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    if (totalOutstanding > Number(invoice.amount) * 2) {
      riskScore += 25;
      factors.push(`High outstanding balance: $${totalOutstanding.toFixed(2)}`);
    } else if (totalOutstanding > 0) {
      riskScore += 10;
      factors.push(`Outstanding balance: $${totalOutstanding.toFixed(2)}`);
    }

    // Factor 4: Payment amount relative to history
    const avgPaymentAmount =
      user.payments.length > 0
        ? user.payments.reduce((sum, p) => sum + Number(p.amount), 0) / user.payments.length
        : Number(invoice.amount);

    if (Number(invoice.amount) > avgPaymentAmount * 1.5) {
      riskScore += 15;
      factors.push(
        `Invoice amount ($${Number(invoice.amount).toFixed(2)}) is significantly higher than average ($${avgPaymentAmount.toFixed(2)})`,
      );
    }

    // Factor 5: Days until due date
    const daysUntilDue = (invoice.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilDue < 0) {
      riskScore += 20;
      factors.push(`Invoice is ${Math.abs(daysUntilDue).toFixed(0)} days overdue`);
    } else if (daysUntilDue < 3) {
      riskScore += 10;
      factors.push(`Invoice due in ${daysUntilDue.toFixed(0)} days`);
    }

    // Normalize risk score
    const normalizedRisk = Math.min(100, riskScore);
    const failureProbability = normalizedRisk / 100;

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (normalizedRisk >= 80) {
      riskLevel = 'CRITICAL';
    } else if (normalizedRisk >= 60) {
      riskLevel = 'HIGH';
    } else if (normalizedRisk >= 40) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    // Generate recommended actions
    const recommendedActions: string[] = [];
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      recommendedActions.push('Send immediate payment reminder');
      recommendedActions.push('Consider payment plan options');
      recommendedActions.push('Monitor closely for payment');
    } else if (riskLevel === 'MEDIUM') {
      recommendedActions.push('Send payment reminder before due date');
    }

    // Calculate optimal retry time (if payment fails)
    const optimalRetryTime = this.calculateOptimalRetryTime(userId, invoice);

    // Determine if payment plan should be suggested
    const suggestPaymentPlan =
      riskLevel === 'CRITICAL' || riskLevel === 'HIGH' || totalOutstanding > Number(invoice.amount);

    let paymentPlanSuggestion;
    if (suggestPaymentPlan) {
      paymentPlanSuggestion = this.generatePaymentPlanSuggestion(
        Number(invoice.amount),
        totalOutstanding,
      );
    }

    return {
      riskScore: normalizedRisk,
      riskLevel,
      failureProbability,
      factors,
      recommendedActions,
      optimalRetryTime,
      suggestPaymentPlan,
      paymentPlanSuggestion,
    };
  }

  /**
   * Calculate optimal time to retry a failed payment
   */
  private calculateOptimalRetryTime(userId: number, invoice: any): Date {
    // Analyze user's payment patterns
    // For now, suggest retry 2-3 days after initial failure
    const retryDate = new Date();
    retryDate.setDate(retryDate.getDate() + 2);
    return retryDate;
  }

  /**
   * Generate payment plan suggestion
   */
  private generatePaymentPlanSuggestion(
    invoiceAmount: number,
    totalOutstanding: number,
  ): {
    installments: number;
    amountPerInstallment: number;
    totalAmount: number;
  } {
    const totalAmount = invoiceAmount + totalOutstanding;
    let installments = 3;

    if (totalAmount > 5000) {
      installments = 6;
    } else if (totalAmount > 2000) {
      installments = 4;
    }

    const amountPerInstallment = totalAmount / installments;

    return {
      installments,
      amountPerInstallment: Math.ceil(amountPerInstallment),
      totalAmount,
    };
  }

  /**
   * Determine optimal timing and channel for payment reminder
   */
  async determineReminderTiming(
    userId: number,
    invoiceId: number,
  ): Promise<PaymentReminderTiming> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        payments: {
          include: {
            invoice: true,
          },
          orderBy: { id: 'desc' },
          take: 10,
        },
      },
    });

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!user || !invoice) {
      throw new Error('User or invoice not found');
    }

    // Analyze user's payment patterns
    const paymentTimes = user.payments
      .map((p) => p.paymentDate.getHours())
      .filter((h) => h >= 8 && h <= 20);

    // Calculate average payment hour (default to 10 AM if no data)
    const avgHour =
      paymentTimes.length > 0
        ? Math.round(paymentTimes.reduce((a, b) => a + b, 0) / paymentTimes.length)
        : 10;

    // Determine urgency
    const daysUntilDue = (invoice.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    let urgency: 'LOW' | 'MEDIUM' | 'HIGH';
    if (daysUntilDue < 0) {
      urgency = 'HIGH';
    } else if (daysUntilDue < 3) {
      urgency = 'HIGH';
    } else if (daysUntilDue < 7) {
      urgency = 'MEDIUM';
    } else {
      urgency = 'LOW';
    }

    // Determine channel based on urgency and user preferences
    let channel: 'EMAIL' | 'SMS' | 'PUSH';
    if (urgency === 'HIGH') {
      channel = 'SMS'; // SMS for urgent reminders
    } else {
      channel = 'EMAIL'; // Email for less urgent
    }

    // Calculate optimal time (2-3 days before due date, at user's preferred hour)
    const optimalTime = new Date(invoice.dueDate);
    optimalTime.setDate(optimalTime.getDate() - 2);
    optimalTime.setHours(avgHour, 0, 0, 0);

    // If optimal time is in the past, use tomorrow
    if (optimalTime < new Date()) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }

    // Generate personalized message if AI is enabled
    let personalizedMessage: string | undefined;
    if (this.openai && this.aiEnabled) {
      try {
        personalizedMessage = await this.generatePersonalizedMessage(userId, invoice, urgency);
      } catch (error) {
        this.logger.warn('Failed to generate personalized message', error);
      }
    }

    return {
      optimalTime,
      channel,
      urgency,
      personalizedMessage,
    };
  }

  /**
   * Generate personalized payment reminder message using AI
   */
  private async generatePersonalizedMessage(
    userId: number,
    invoice: any,
    urgency: 'LOW' | 'MEDIUM' | 'HIGH',
  ): Promise<string> {
    if (!this.openai || !this.aiEnabled) {
      return `Reminder: Your payment of $${Number(invoice.amount).toFixed(2)} is due on ${invoice.dueDate.toLocaleDateString()}`;
    }

    try {
      const prompt = `Generate a friendly, professional payment reminder message for a tenant.

Invoice amount: $${Number(invoice.amount).toFixed(2)}
Due date: ${invoice.dueDate.toLocaleDateString()}
Urgency: ${urgency}

Keep it brief (1-2 sentences), professional, and friendly. Don't be pushy.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a property management assistant. Generate friendly, professional payment reminders.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      this.logger.error('Failed to generate personalized message', error);
      return `Reminder: Your payment of $${Number(invoice.amount).toFixed(2)} is due on ${invoice.dueDate.toLocaleDateString()}`;
    }
  }
}

