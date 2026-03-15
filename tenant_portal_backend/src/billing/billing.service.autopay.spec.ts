import { Role } from '@prisma/client';
import { BillingService } from './billing.service';

describe('BillingService autopay state machine', () => {
  const prisma: any = {
    $queryRaw: jest.fn(),
    autopayEnrollment: { findMany: jest.fn() },
    paymentAttempt: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const paymentsService: any = { recordPaymentForInvoice: jest.fn() };
  const securityEvents: any = { logEvent: jest.fn() };
  const stripeService: any = {};

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$queryRaw.mockResolvedValue([{ pg_try_advisory_lock: true }]);
  });

  it('does not retry same-day attempts once they are NEEDS_AUTH', async () => {
    const service = new BillingService(prisma, paymentsService, securityEvents, stripeService);

    prisma.autopayEnrollment.findMany.mockResolvedValue([
      {
        id: 9,
        leaseId: 'lease-1',
        paymentMethodId: 15,
        maxAmount: null,
        lease: {
          tenantId: 'tenant-1',
          unit: { property: { organizationId: 'org-1' } },
          invoices: [{ id: 22, amount: 120 }],
        },
      },
    ]);

    prisma.paymentAttempt.create.mockResolvedValueOnce({ id: 'att-1', status: 'SCHEDULED', attemptedAt: null });
    paymentsService.recordPaymentForInvoice.mockRejectedValueOnce(new Error('requires_action from stripe'));

    await service.processAutopayCharges();

    expect(prisma.paymentAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'att-1' },
        data: expect.objectContaining({ status: 'NEEDS_AUTH' }),
      }),
    );

    prisma.paymentAttempt.create.mockRejectedValueOnce({ code: 'P2002' });
    prisma.paymentAttempt.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'att-1',
      status: 'NEEDS_AUTH',
      attemptedAt: new Date(),
    });

    await service.processAutopayCharges();

    expect(paymentsService.recordPaymentForInvoice).toHaveBeenCalledTimes(1);
  });

  it('keeps NEEDS_AUTH status on recovery when auth is still required', async () => {
    const service = new BillingService(prisma, paymentsService, securityEvents, stripeService);

    prisma.paymentAttempt.findUnique.mockResolvedValueOnce({
      id: 'attempt-1',
      invoiceId: 7,
      status: 'NEEDS_AUTH',
      invoice: { amount: 80 },
      autopayEnrollment: {
        paymentMethodId: 77,
        lease: {
          id: 'lease-1',
          tenantId: 'tenant-1',
          unit: { property: { organizationId: 'org-1' } },
        },
      },
    });

    prisma.paymentAttempt.update
      .mockResolvedValueOnce({ id: 'attempt-1', status: 'ATTEMPTING' })
      .mockResolvedValueOnce({ id: 'attempt-1', status: 'NEEDS_AUTH' });

    paymentsService.recordPaymentForInvoice.mockRejectedValueOnce(new Error('3d secure authentication required'));

    await service.recoverNeedsAuthAttempt(
      { userId: 'tenant-1', username: 'tenant', role: Role.TENANT },
      'attempt-1',
      undefined,
    );

    expect(prisma.paymentAttempt.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'attempt-1' },
        data: expect.objectContaining({ status: 'NEEDS_AUTH' }),
      }),
    );
  });
});
