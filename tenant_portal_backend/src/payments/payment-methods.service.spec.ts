import { Test } from '@nestjs/testing';
import { PaymentMethodsService } from './payment-methods.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';

describe('PaymentMethodsService', () => {
  const prisma: any = {
    user: {
      findUniqueOrThrow: jest.fn(),
    },
    paymentMethod: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const stripe: any = {
    createCustomer: jest.fn(),
    createSetupIntent: jest.fn(),
    savePaymentMethod: jest.fn(),
  };

  let service: PaymentMethodsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeService, useValue: stripe },
      ],
    }).compile();

    service = module.get(PaymentMethodsService);
  });

  it('creates setup intent and customer when tenant has no stripe customer id', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'tenant-1',
      email: 'tenant@example.com',
      username: 'tenant',
      firstName: 'Test',
      lastName: 'Tenant',
      stripeCustomerId: null,
    });
    stripe.createCustomer.mockResolvedValue({ id: 'cus_new_1' });
    stripe.createSetupIntent.mockResolvedValue({ id: 'seti_1', client_secret: 'seti_1_secret' });

    await expect(service.createSetupIntent('tenant-1')).resolves.toEqual({
      customerId: 'cus_new_1',
      setupIntentId: 'seti_1',
      clientSecret: 'seti_1_secret',
    });

    expect(stripe.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'tenant-1' }),
    );
  });

  it('persists card using stripe-returned card details', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'tenant-1',
      stripeCustomerId: 'cus_existing',
      email: 'tenant@example.com',
      username: 'tenant',
      firstName: 'Test',
      lastName: 'Tenant',
    });
    stripe.savePaymentMethod.mockResolvedValue({
      id: 'pm_1',
      card: { last4: '4242', brand: 'visa', exp_month: 12, exp_year: 2035 },
    });
    prisma.paymentMethod.create.mockResolvedValue({ id: 55, userId: 'tenant-1' });

    await service.create('tenant-1', {
      type: 'CREDIT_CARD',
      provider: 'STRIPE',
      providerPaymentMethodId: 'pm_1',
      last4: '0000',
      brand: 'unknown',
      expMonth: 1,
      expYear: 2029,
    });

    expect(prisma.paymentMethod.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerCustomerId: 'cus_existing',
        providerPaymentMethodId: 'pm_1',
        last4: '4242',
        brand: 'visa',
        expMonth: 12,
        expYear: 2035,
      }),
    });
  });

  it('lists payment methods newest-first', async () => {
    prisma.paymentMethod.findMany.mockResolvedValue([{ id: 2 }, { id: 1 }]);

    await expect(service.listForUser('tenant-1')).resolves.toEqual([{ id: 2 }, { id: 1 }]);
    expect(prisma.paymentMethod.findMany).toHaveBeenCalledWith({
      where: { userId: 'tenant-1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});
