import { PaymentAIChannel } from './payment-strategy.types';

export interface AIPaymentGuardrailInput {
  userId: string;
  invoiceId: number;
  operation: 'ASSESS_RISK' | 'REMINDER_TIMING' | 'PERSONALIZED_MESSAGE';
  metadata?: Record<string, unknown>;
}

export interface AIPaymentGuardrailDecision {
  allow: boolean;
  reason: string;
  policyVersion: string;
  adjustedChannel?: PaymentAIChannel;
  adjustedSendTime?: Date;
}

type ConsentMetadata = {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  paymentDueTypeEnabled?: boolean;
  aiPersonalizationEnabled?: boolean;
};

type ReminderMetadata = {
  channel?: PaymentAIChannel;
  proposedSendTime?: Date;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  reminderCount24h?: number;
  maxReminders24h?: number;
  consent?: ConsentMetadata;
};

/**
 * Step-3 scaffold: deterministic, rule-first guardrails with non-breaking fallbacks.
 */
export class AIPaymentGuardrailPolicy {
  static readonly VERSION = 'step3-hard-guardrails-v1';
  private static readonly DEFAULT_MAX_REMINDERS_24H = 3;

  evaluate(input: AIPaymentGuardrailInput): AIPaymentGuardrailDecision {
    if (input.operation === 'REMINDER_TIMING') {
      return this.evaluateReminderTiming(input.metadata as ReminderMetadata | undefined);
    }

    if (input.operation === 'PERSONALIZED_MESSAGE') {
      return this.evaluatePersonalizedMessage(input.metadata as ReminderMetadata | undefined);
    }

    return {
      allow: true,
      reason: 'allow_assess_risk_rule_first',
      policyVersion: AIPaymentGuardrailPolicy.VERSION,
    };
  }

  private evaluatePersonalizedMessage(metadata?: ReminderMetadata): AIPaymentGuardrailDecision {
    const consent = metadata?.consent;

    if (consent?.aiPersonalizationEnabled === false) {
      return {
        allow: false,
        reason: 'blocked_ai_personalization_consent',
        policyVersion: AIPaymentGuardrailPolicy.VERSION,
      };
    }

    const frequencyDecision = this.frequencyDecision(metadata);
    if (!frequencyDecision.allow) {
      return frequencyDecision;
    }

    return {
      allow: true,
      reason: 'allow_personalized_message',
      policyVersion: AIPaymentGuardrailPolicy.VERSION,
    };
  }

  private evaluateReminderTiming(metadata?: ReminderMetadata): AIPaymentGuardrailDecision {
    const frequencyDecision = this.frequencyDecision(metadata);
    if (!frequencyDecision.allow) {
      return frequencyDecision;
    }

    const channel = this.resolveConsentedChannel(metadata?.channel, metadata?.consent);
    if (!channel) {
      return {
        allow: false,
        reason: 'blocked_no_consented_channel',
        policyVersion: AIPaymentGuardrailPolicy.VERSION,
      };
    }

    const sendTime = this.adjustForQuietHours(
      metadata?.proposedSendTime,
      metadata?.quietHoursStart,
      metadata?.quietHoursEnd,
    );

    return {
      allow: true,
      reason: sendTime.changed ? 'allow_reminder_timing_adjusted_quiet_hours' : 'allow_reminder_timing',
      adjustedChannel: channel,
      adjustedSendTime: sendTime.date,
      policyVersion: AIPaymentGuardrailPolicy.VERSION,
    };
  }

  private frequencyDecision(metadata?: ReminderMetadata): AIPaymentGuardrailDecision {
    const reminderCount24h = Math.max(0, Number(metadata?.reminderCount24h ?? 0));
    const maxReminders24h = Math.max(
      1,
      Number(metadata?.maxReminders24h ?? AIPaymentGuardrailPolicy.DEFAULT_MAX_REMINDERS_24H),
    );

    if (reminderCount24h >= maxReminders24h) {
      return {
        allow: false,
        reason: 'blocked_frequency_cap_24h',
        policyVersion: AIPaymentGuardrailPolicy.VERSION,
      };
    }

    return {
      allow: true,
      reason: 'allow_frequency_check',
      policyVersion: AIPaymentGuardrailPolicy.VERSION,
    };
  }

  private resolveConsentedChannel(
    proposed: PaymentAIChannel | undefined,
    consent?: ConsentMetadata,
  ): PaymentAIChannel | null {
    const paymentDueEnabled = consent?.paymentDueTypeEnabled !== false;
    if (!paymentDueEnabled) {
      return null;
    }

    const candidateOrder: PaymentAIChannel[] = [
      ...(proposed ? [proposed] : []),
      'EMAIL',
      'SMS',
      'PUSH',
    ];

    for (const candidate of candidateOrder) {
      if (candidate === 'EMAIL' && consent?.emailEnabled !== false) return 'EMAIL';
      if (candidate === 'SMS' && consent?.smsEnabled === true) return 'SMS';
      if (candidate === 'PUSH' && consent?.pushEnabled === true) return 'PUSH';
    }

    return null;
  }

  private adjustForQuietHours(
    proposed: Date | undefined,
    quietHoursStart?: string | null,
    quietHoursEnd?: string | null,
  ): { date?: Date; changed: boolean } {
    if (!proposed || !quietHoursStart || !quietHoursEnd) {
      return { date: proposed, changed: false };
    }

    const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
    if ([startHour, startMinute, endHour, endMinute].some((v) => Number.isNaN(v))) {
      return { date: proposed, changed: false };
    }

    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    const current = proposed.getHours() * 60 + proposed.getMinutes();
    const inQuietHours = start < end ? current >= start && current < end : current >= start || current < end;

    if (!inQuietHours) {
      return { date: proposed, changed: false };
    }

    const adjusted = new Date(proposed);
    adjusted.setHours(endHour, endMinute, 0, 0);
    if (current >= start && start > end) {
      adjusted.setDate(adjusted.getDate() + 1);
    }

    return { date: adjusted, changed: true };
  }
}

export const defaultAIPaymentGuardrailPolicy = new AIPaymentGuardrailPolicy();
