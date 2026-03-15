import { StripeService } from './stripe.service';

describe('StripeService webhook idempotency', () => {
  const basePrisma: any = {
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
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dedupes duplicate events when create hits unique constraint', async () => {
    basePrisma.stripeWebhookEvent.create.mockRejectedValueOnce({ code: 'P2002' });
    basePrisma.stripeWebhookEvent.findUnique.mockResolvedValueOnce({ organizationId: 'org-1' });

    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    const svc = new StripeService(basePrisma);
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

  it('ignores duplicate ledger finalization writes for same event id', async () => {
    basePrisma.payment.findFirst.mockResolvedValueOnce({ id: 33, amount: 12.5 });
    basePrisma.payment.update.mockResolvedValueOnce({ id: 33, status: 'COMPLETED' });
    basePrisma.paymentLedgerEntry.create.mockRejectedValueOnce({ code: 'P2002' });

    const svc = new StripeService(basePrisma);
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
});
