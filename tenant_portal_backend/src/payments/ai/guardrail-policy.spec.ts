import { AIPaymentGuardrailPolicy } from './guardrail-policy';

describe('AIPaymentGuardrailPolicy', () => {
  const policy = new AIPaymentGuardrailPolicy();

  it('blocks reminders when 24h frequency cap is reached', () => {
    const decision = policy.evaluate({
      userId: 'u1',
      invoiceId: 1,
      operation: 'REMINDER_TIMING',
      metadata: {
        channel: 'EMAIL',
        proposedSendTime: new Date('2026-03-05T12:00:00.000Z'),
        reminderCount24h: 3,
        maxReminders24h: 3,
        consent: { emailEnabled: true },
      },
    });

    expect(decision.allow).toBe(false);
    expect(decision.reason).toBe('blocked_frequency_cap_24h');
  });

  it('moves send time outside quiet hours', () => {
    const decision = policy.evaluate({
      userId: 'u1',
      invoiceId: 1,
      operation: 'REMINDER_TIMING',
      metadata: {
        channel: 'EMAIL',
        proposedSendTime: new Date('2026-03-05T23:30:00.000Z'),
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        consent: { emailEnabled: true },
      },
    });

    expect(decision.allow).toBe(true);
    expect(decision.adjustedSendTime).toBeInstanceOf(Date);
    expect(decision.adjustedSendTime?.getHours()).toBe(8);
    expect(decision.reason).toContain('quiet_hours');
  });

  it('falls back from unconsented SMS to EMAIL', () => {
    const decision = policy.evaluate({
      userId: 'u1',
      invoiceId: 1,
      operation: 'REMINDER_TIMING',
      metadata: {
        channel: 'SMS',
        proposedSendTime: new Date('2026-03-05T12:00:00.000Z'),
        consent: { emailEnabled: true, smsEnabled: false },
      },
    });

    expect(decision.allow).toBe(true);
    expect(decision.adjustedChannel).toBe('EMAIL');
  });

  it('blocks personalization when consent is disabled', () => {
    const decision = policy.evaluate({
      userId: 'u1',
      invoiceId: 1,
      operation: 'PERSONALIZED_MESSAGE',
      metadata: {
        channel: 'EMAIL',
        consent: { aiPersonalizationEnabled: false },
      },
    });

    expect(decision.allow).toBe(false);
    expect(decision.reason).toBe('blocked_ai_personalization_consent');
  });
});
