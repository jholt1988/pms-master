import { Role } from '@prisma/client';
import { BillingService } from './billing.service';

describe('BillingService autopay state machine', () => {
  const prisma: any = {
    $queryRaw: jest.fn(),
    autopayEnrollment: { findMany: jest.fn(), upsert: jest.fn(), updateMany: jest.fn() },
    lease: { findUnique: jest.fn(), findFirst: jest.fn() },
    paymentMethod: { findUnique: jest.fn() },
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
    jest.resetAllMocks();
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

  it('returns the tenant autopay contract as { leaseId, enrollment }', async () => {
    const service = new BillingService(prisma, paymentsService, securityEvents, stripeService);

    prisma.lease.findUnique.mockResolvedValueOnce({
      id: 'lease-1',
      autopayEnrollment: {
        id: 11,
        leaseId: 'lease-1',
        paymentMethodId: 77,
        active: true,
        paymentMethod: { id: 77, last4: '4242' },
      },
    });

    await expect(service.getAutopayForTenant('tenant-1')).resolves.toEqual({
      leaseId: 'lease-1',
      enrollment: expect.objectContaining({
        id: 11,
        leaseId: 'lease-1',
        paymentMethodId: 77,
        active: true,
      }),
    });
  });

  it('fails an autopay attempt without charging when the invoice exceeds the enrollment cap', async () => {
    const service = new BillingService(prisma, paymentsService, securityEvents, stripeService);

    prisma.autopayEnrollment.findMany.mockResolvedValueOnce([
      {
        id: 9,
        leaseId: 'lease-1',
        paymentMethodId: 15,
        maxAmount: 100,
        lease: {
          tenantId: 'tenant-1',
          unit: { property: { organizationId: 'org-1' } },
          invoices: [{ id: 22, amount: 120 }],
        },
      },
    ]);
    prisma.paymentAttempt.create.mockResolvedValueOnce({ id: 'att-1', status: 'SCHEDULED', attemptedAt: null });

    await service.processAutopayCharges();

    expect(paymentsService.recordPaymentForInvoice).not.toHaveBeenCalled();
    expect(prisma.paymentAttempt.update).toHaveBeenCalledWith({
      where: { id: 'att-1' },
      data: expect.objectContaining({
        status: 'FAILED',
        failureReason: 'Amount 120 exceeds cap 100',
      }),
    });
  });

  it('records a succeeded autopay attempt with the external payment id', async () => {
    const service = new BillingService(prisma, paymentsService, securityEvents, stripeService);

    prisma.autopayEnrollment.findMany.mockResolvedValueOnce([
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
    paymentsService.recordPaymentForInvoice.mockResolvedValueOnce({ externalId: 'pi_success_1' });

    await service.processAutopayCharges();

    expect(paymentsService.recordPaymentForInvoice).toHaveBeenCalledWith({
      invoiceId: 22,
      amount: 120,
      leaseId: 'lease-1',
      userId: 'tenant-1',
      paymentMethodId: 15,
      initiatedBy: 'AUTOPAY',
    });
    expect(prisma.paymentAttempt.update).toHaveBeenLastCalledWith({
      where: { id: 'att-1' },
      data: expect.objectContaining({
        status: 'SUCCEEDED',
        externalAttemptId: 'pi_success_1',
      }),
    });
  });

  it('prevents a tenant from configuring autopay for another tenant lease', async () => {
    const service = new BillingService(prisma, paymentsService, securityEvents, stripeService);

    prisma.lease.findFirst.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: 'tenant-owner',
      unit: { property: { organizationId: 'org-1' } },
    });

    await expect(
      service.configureAutopay(
        { userId: 'tenant-other', username: 'other', role: Role.TENANT },
        {
          leaseId: '11111111-1111-4111-8111-111111111111',
          paymentMethodId: 77,
          active: true,
        } as any,
      ),
    ).rejects.toThrow('You can only configure autopay for your lease');

    expect(prisma.paymentMethod.findUnique).not.toHaveBeenCalled();
  });

  it('rejects autopay configuration when the payment method belongs to another user', async () => {
    const service = new BillingService(prisma, paymentsService, securityEvents, stripeService);

    prisma.lease.findFirst.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      tenantId: 'tenant-owner',
      unit: { property: { organizationId: 'org-1' } },
    });
    prisma.paymentMethod.findUnique.mockResolvedValueOnce({ id: 77, userId: 'tenant-other' });

    await expect(
      service.configureAutopay(
        { userId: 'pm-1', username: 'manager', role: Role.PROPERTY_MANAGER },
        {
          leaseId: '11111111-1111-4111-8111-111111111111',
          paymentMethodId: 77,
          active: true,
        } as any,
        'org-1',
      ),
    ).rejects.toThrow('Payment method must belong to the lease tenant');

    expect(prisma.autopayEnrollment.upsert).not.toHaveBeenCalled();
  });
});
