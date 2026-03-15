import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AIPaymentService } from './ai-payment.service';
import { EmailService } from '../email/email.service';
import { StripeService } from './stripe.service';

describe('PaymentsService direct charge fee derivation', () => {
  const prisma: any = {
    lease: { findUnique: jest.fn() },
    invoice: { findUnique: jest.fn(), update: jest.fn() },
    paymentMethod: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    orgPlanCycle: { findFirst: jest.fn() },
    payment: { create: jest.fn() },
  };

  const stripe: any = {
    processPayment: jest.fn(),
  };

  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AIPaymentService, useValue: {} },
        { provide: EmailService, useValue: { sendRentPaymentConfirmation: jest.fn().mockResolvedValue(undefined) } },
        { provide: StripeService, useValue: stripe },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it('passes connected account and derived application fee to Stripe payment intent', async () => {
    prisma.lease.findUnique.mockResolvedValue({
      id: 'lease-123e4567-e89b-12d3-a456-426614174000',
      tenantId: 'tenant-1',
      tenant: { id: 'tenant-1', email: 'tenant@example.com', username: 'tenant@example.com' },
      unit: { property: { organizationId: 'org-1' } },
    });
    prisma.paymentMethod.findUnique.mockResolvedValue({
      id: 17,
      userId: 'tenant-1',
      provider: 'STRIPE',
      providerCustomerId: 'cus_1',
      providerPaymentMethodId: 'pm_1',
    });
    prisma.organization.findUnique.mockResolvedValue({ stripeConnectedAccountId: 'acct_123' });
    prisma.orgPlanCycle.findFirst.mockResolvedValue({
      id: 'cycle-1',
      activeFeeSchedule: {
        feeConfig: {
          baseManagementFeePct: 5,
          minimumFee: 0,
        },
      },
    });
    stripe.processPayment.mockResolvedValue({ id: 'pi_1', status: 'succeeded' });
    prisma.payment.create.mockResolvedValue({ id: 99, status: 'COMPLETED', invoiceId: null, lease: { tenant: { email: 'tenant@example.com' } } });

    await service.createPayment(
      {
        amount: 100,
        leaseId: 'lease-123e4567-e89b-12d3-a456-426614174000',
        paymentMethodId: 17,
      },
      { userId: 'tenant-1', role: Role.TENANT },
    );

    expect(stripe.processPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        connectedAccountId: 'acct_123',
        applicationFeeAmountCents: 500,
      }),
    );
    expect(stripe.processPayment.mock.calls[0][0].metadata).toEqual(
      expect.objectContaining({
        leaseId: 'lease-123e4567-e89b-12d3-a456-426614174000',
        organizationId: 'org-1',
        platform_fee_minor: '500',
      }),
    );
  });
});
