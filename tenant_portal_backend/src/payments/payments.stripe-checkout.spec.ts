import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService - Stripe Checkout Session', () => {
  const prismaMock: any = {
    invoice: {
      findUnique: jest.fn(),
    },
  };

  const stripeMock: any = {
    getCustomerByUserId: jest.fn(),
    createCustomer: jest.fn(),
    createCheckoutSession: jest.fn(),
  };

  const service = new PaymentsService(
    prismaMock,
    {} as any,
    {} as any,
    stripeMock,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a checkout session for an unpaid tenant invoice', async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: 42,
      amount: 1250,
      description: 'March rent',
      status: 'UNPAID',
      leaseId: 'lease-1',
      lease: {
        tenantId: 'tenant-1',
        tenant: { username: 'tenant@example.com', email: 'tenant@example.com' },
      },
    });

    stripeMock.getCustomerByUserId.mockResolvedValue(null);
    stripeMock.createCustomer.mockResolvedValue({ id: 'cus_123' });
    stripeMock.createCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.test/session_123',
      sessionId: 'cs_test_123',
    });

    const result = await service.createStripeCheckoutSession(
      {
        invoiceId: 42,
        successUrl: 'https://app.example.com/payments?success=1',
        cancelUrl: 'https://app.example.com/payments?cancel=1',
      },
      { userId: 'tenant-1', role: Role.TENANT },
      'org-1',
    );

    expect(result).toEqual({
      checkoutUrl: 'https://checkout.stripe.test/session_123',
      sessionId: 'cs_test_123',
      invoiceId: 42,
    });
    expect(stripeMock.createCheckoutSession).toHaveBeenCalled();
  });

  it('rejects already paid invoices', async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: 42,
      amount: 1250,
      description: 'March rent',
      status: 'PAID',
      leaseId: 'lease-1',
      lease: { tenantId: 'tenant-1', tenant: { username: 'tenant@example.com' } },
    });

    await expect(
      service.createStripeCheckoutSession(
        {
          invoiceId: 42,
          successUrl: 'https://app.example.com/payments?success=1',
          cancelUrl: 'https://app.example.com/payments?cancel=1',
        },
        { userId: 'tenant-1', role: Role.TENANT },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects tenant access to another tenant invoice', async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: 42,
      amount: 1250,
      description: 'March rent',
      status: 'UNPAID',
      leaseId: 'lease-1',
      lease: { tenantId: 'tenant-2', tenant: { username: 'tenant@example.com' } },
    });

    await expect(
      service.createStripeCheckoutSession(
        {
          invoiceId: 42,
          successUrl: 'https://app.example.com/payments?success=1',
          cancelUrl: 'https://app.example.com/payments?cancel=1',
        },
        { userId: 'tenant-1', role: Role.TENANT },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
