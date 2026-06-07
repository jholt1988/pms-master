import { StripeService } from './stripe.service';

describe('StripeService webhook idempotency', () => {
  let basePrisma: any;
  let eventsService: any;
  let rabbitMQService: any;

  const createService = () => new StripeService(basePrisma, eventsService, rabbitMQService);
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    delete process.env.DISABLE_STRIPE;

    eventsService = {
      emitPaymentSuccess: jest.fn(),
      emitPaymentFailure: jest.fn(),
    };
    rabbitMQService = {
      publishIntent: jest.fn().mockResolvedValue(undefined),
    };
    basePrisma = {
    stripeWebhookEvent: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    paymentLedgerEntry: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ledgerAccount: {
      findUnique: jest.fn(),
    },
    ledgerTransaction: {
      create: jest.fn(),
    },
    orgPlanCycle: {
      findFirst: jest.fn(),
    },
  };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('fails fast when Stripe is disabled in production without an explicit override', () => {
    process.env.NODE_ENV = 'production';
    process.env.DISABLE_STRIPE = 'true';
    delete process.env.ALLOW_DISABLED_STRIPE_IN_PRODUCTION;

    expect(() => createService()).toThrow('DISABLE_STRIPE=true is not allowed in production');
  });

  it('fails fast when STRIPE_SECRET_KEY is missing in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DISABLE_STRIPE;
    delete process.env.STRIPE_SECRET_KEY;

    expect(() => createService()).toThrow('STRIPE_SECRET_KEY must be set in production');
  });

  it('dedupes duplicate events when create hits unique constraint', async () => {
    basePrisma.stripeWebhookEvent.create.mockRejectedValueOnce({ code: 'P2002' });
    basePrisma.stripeWebhookEvent.findUnique.mockResolvedValueOnce({ organizationId: 'org-1' });

    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const svc = createService();
    (svc as any).isStripeDisabled = false;
    (svc as any).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_dup_1',
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_1', metadata: {} } },
        }),
      },
    };

    const result = await svc.handleWebhook('sig', Buffer.from('{}'));

    expect(result).toEqual({ eventId: 'evt_dup_1', deduped: true, organizationId: 'org-1' });
    expect(basePrisma.stripeWebhookEvent.create).toHaveBeenCalledTimes(1);
    expect(basePrisma.payment.update).not.toHaveBeenCalled();
    expect(basePrisma.paymentLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('dedupes duplicate connected-account updates before organization side effects', async () => {
    basePrisma.stripeWebhookEvent.create.mockRejectedValueOnce({ code: 'P2002' });
    basePrisma.stripeWebhookEvent.findUnique.mockResolvedValueOnce({ organizationId: 'org-connected' });

    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const svc = createService();
    (svc as any).isStripeDisabled = false;
    (svc as any).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_account_dup',
          type: 'account.updated',
          data: {
            object: {
              id: 'acct_123',
              charges_enabled: true,
              payouts_enabled: true,
              details_submitted: true,
            },
          },
        }),
      },
    };

    const result = await svc.handleWebhook('sig', Buffer.from('{}'));

    expect(result).toEqual({ eventId: 'evt_account_dup', deduped: true, organizationId: 'org-connected' });
    expect(basePrisma.organization.findFirst).not.toHaveBeenCalled();
    expect(basePrisma.organization.update).not.toHaveBeenCalled();
  });

  it('ignores duplicate ledger finalization writes for same event id', async () => {
    basePrisma.payment.findFirst.mockResolvedValueOnce({ id: 33, amount: 12.5 });
    basePrisma.payment.update.mockResolvedValueOnce({ id: 33, status: 'COMPLETED' });
    basePrisma.paymentLedgerEntry.create.mockRejectedValueOnce({ code: 'P2002' });

    const svc = createService();
    await (svc as any).handlePaymentSuccess(
      {
        id: 'pi_1',
        currency: 'usd',
        amount: 1250,
        metadata: {},
      },
      'evt_ledger_dup',
    );

    expect(basePrisma.paymentLedgerEntry.create).toHaveBeenCalledTimes(1);
    expect(basePrisma.payment.update).toHaveBeenCalledTimes(1);
  });

  it('creates disabled-mode payment intents in cents with safe defaults', async () => {
    const svc = createService();

    const result = await svc.processPayment({
      amount: 12.34,
      customerId: 'cus_1',
      paymentMethodId: 'pm_1',
      metadata: { invoiceId: 'inv-1' },
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'mock_pi_cus_1',
        amount: 1234,
        currency: 'usd',
        customer: 'cus_1',
        payment_method: 'pm_1',
        status: 'succeeded',
        metadata: { invoiceId: 'inv-1' },
      }),
    );
  });

  it('reuses an existing customer id in disabled mode without writing user updates', async () => {
    basePrisma.user.findUnique.mockResolvedValueOnce({ stripeCustomerId: 'cus_existing' });
    const svc = createService();

    const result = await svc.createCustomer({
      email: 'tenant@example.com',
      name: 'Tenant Example',
      userId: 'user-1',
    });

    expect(result.id).toBe('cus_existing');
    expect(basePrisma.user.update).not.toHaveBeenCalled();
  });

  it('records ledger, yield sweep allocation, event emission, and RabbitMQ intent on payment success', async () => {
    basePrisma.payment.findFirst.mockResolvedValueOnce({ id: 33, amount: 12.5 });
    basePrisma.payment.update.mockResolvedValueOnce({ id: 33, status: 'COMPLETED' });
    basePrisma.paymentLedgerEntry.create.mockResolvedValueOnce({ id: 'ledger-entry-1' });
    basePrisma.orgPlanCycle.findFirst.mockResolvedValueOnce({
      activeFeeScheduleId: 'fee-schedule-1',
      activeFeeSchedule: {
        feeConfig: { baseManagementFeePct: 0.1, reservePct: 0.05 },
      },
    });
    basePrisma.ledgerAccount.findUnique.mockResolvedValueOnce({ id: 'ledger-account-1' });
    basePrisma.ledgerTransaction.create.mockResolvedValueOnce({ id: 'yield-transaction-1' });
    basePrisma.paymentLedgerEntry.updateMany.mockResolvedValueOnce({ count: 1 });

    const svc = createService();
    await (svc as any).handlePaymentSuccess(
      {
        id: 'pi_1',
        currency: 'usd',
        amount: 1250,
        application_fee_amount: 125,
        metadata: {
          organizationId: 'org-1',
          leaseId: 'lease-1',
        },
      },
      'evt_success_1',
    );

    expect(basePrisma.payment.update).toHaveBeenCalledWith({
      where: { id: 33 },
      data: expect.objectContaining({ status: 'COMPLETED' }),
    });
    expect(basePrisma.paymentLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentId: 33,
        organizationId: 'org-1',
        leaseId: 'lease-1',
        sourceEventId: 'evt_success_1',
        grossAmountMinor: 1250,
        platformFeeMinor: 125,
        netAmountMinor: 1125,
      }),
    });
    expect(basePrisma.ledgerTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: 'ledger-account-1',
        paymentId: 33,
        amountCents: 1250,
        categoryCode: 'yield_sweep',
      }),
    });
    expect(basePrisma.paymentLedgerEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { paymentId: 33, sourceEventId: 'evt_success_1' },
      }),
    );
    expect(eventsService.emitPaymentSuccess).toHaveBeenCalledWith(33, 'lease-1', 12.5);
    expect(rabbitMQService.publishIntent).toHaveBeenCalledWith('ledger.updated', expect.objectContaining({
      paymentId: 33,
      leaseId: 'lease-1',
      amountMinor: 1125,
    }));
  });
});
