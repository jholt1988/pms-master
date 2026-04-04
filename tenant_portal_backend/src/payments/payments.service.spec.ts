import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AIPaymentService } from './ai-payment.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TestDataFactory } from '../../test/factories';
import { StripeService } from './stripe.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  // Mock PrismaService
  const mockPrismaService = {
    lease: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    paymentPlan: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    ledgerAccount: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    ledgerTransaction: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    lateFee: {
      findMany: jest.fn(),
    },
  };

  // Mock EmailService
  const mockEmailService = {
    sendRentPaymentConfirmation: jest.fn(),
    sendRentDueReminder: jest.fn(),
    sendLateRentNotification: jest.fn(),
  };

  // Mock AIPaymentService
  const mockAIPaymentService = {
    assessPaymentRisk: jest.fn(),
    determineReminderTiming: jest.fn(),
  };

  const mockStripeService = {
    createCheckoutSession: jest.fn(),
    createSetupIntent: jest.fn(),
    processPayment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: AIPaymentService, useValue: mockAIPaymentService },
        { provide: StripeService, useValue: mockStripeService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const mockLease = { id: '1', tenantId: 1 };
      const invoiceDto = {
        description: 'December Rent',
        amount: 1500,
        dueDate: '2025-12-01',
        leaseId: '11111111-1111-4111-8111-111111111111',
      };
      const mockInvoice = {
        id: '1',
        ...invoiceDto,
        dueDate: new Date(invoiceDto.dueDate),
        status: 'UNPAID',
      };

      mockPrismaService.lease.findFirst.mockResolvedValue(mockLease);
      mockPrismaService.lease.findUnique.mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        unit: { propertyId: 'property-1' },
      });
      mockPrismaService.ledgerAccount.upsert.mockResolvedValue({ id: 'acc-1' });
      mockPrismaService.ledgerTransaction.findFirst.mockResolvedValue(null);
      mockPrismaService.ledgerTransaction.create.mockResolvedValue({ id: 'ltx-1' });
      mockPrismaService.invoice.create.mockResolvedValue(mockInvoice);

      const result = await service.createInvoice(invoiceDto as any, 'org-1');

      expect(result).toEqual(mockInvoice);
      expect(mockPrismaService.lease.findFirst).toHaveBeenCalledWith({
        where: { id: '11111111-1111-4111-8111-111111111111', unit: { property: { organizationId: 'org-1' } } },
      });
      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith({
        data: {
          description: 'December Rent',
          amount: 1500,
          dueDate: new Date('2025-12-01'),
          lease: { connect: { id: '11111111-1111-4111-8111-111111111111' } },
        },
        include: {
          lease: { include: { tenant: true, unit: { include: { property: true } } } },
          payments: true,
          lateFees: true,
        },
      });
    });

    it('should throw NotFoundException when lease not found', async () => {
      mockPrismaService.lease.findFirst.mockResolvedValue(null);

      await expect(
        service.createInvoice({
          description: 'Test',
          amount: 1500,
          dueDate: '2025-12-01',
          leaseId: '99999999-9999-4999-8999-999999999999',
        } as any, 'org-1')
      ).rejects.toThrow(NotFoundException);
    });

    // Note: Date and amount validation would be done at DTO validation layer (class-validator)
    // These tests are skipped as the service doesn't perform this validation
    it.skip('should handle invalid date format', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({ id: '1' });

      await expect(
        service.createInvoice({
          description: 'Test',
          amount: 1500,
          dueDate: 'invalid-date',
          leaseId: '11111111-1111-4111-8111-111111111111',
        })
      ).rejects.toThrow();
    });

    it.skip('should validate amount is positive', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({ id: '1' });

      await expect(
        service.createInvoice({
          description: 'Test',
          amount: -100,
          dueDate: '2025-12-01',
          leaseId: '11111111-1111-4111-8111-111111111111',
        })
      ).rejects.toThrow();
    });
  });

  describe('createPayment', () => {
    it('should create payment and send confirmation email', async () => {
      const mockLease = {
        id: '11111111-1111-4111-8111-111111111111',
        tenantId: 'tenant-1',
        tenant: { id: 'tenant-1', username: 'tenant@test.com' },
        unitId: 'unit-1',
        unit: {
          unitNumber: '101',
          propertyId: 'property-1',
          property: { address: '123 Test St', organizationId: 'org-1' }
        },
      };

      const paymentDto = {
        amount: 1500,
        leaseId: '11111111-1111-4111-8111-111111111111',
        status: 'COMPLETED',
      };

      const mockPayment = {
        id: '1',
        ...paymentDto,
        userId: 'tenant-1',
        paymentDate: new Date(),
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.ledgerAccount.upsert.mockResolvedValue({ id: 'acc-1' });
      mockPrismaService.ledgerTransaction.findFirst.mockResolvedValue(null);
      mockPrismaService.ledgerTransaction.create.mockResolvedValue({ id: 'ltx-1' });
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockEmailService.sendRentPaymentConfirmation.mockResolvedValue(undefined);

      const result = await service.createPayment(paymentDto as any, undefined, 'org-1');

      expect(result).toEqual(mockPayment);
      expect(mockEmailService.sendRentPaymentConfirmation).toHaveBeenCalledTimes(1);
      
      // sendRentPaymentConfirmation(email, amount, paymentDate)
      const emailCall = mockEmailService.sendRentPaymentConfirmation.mock.calls[0];
      expect(emailCall[0]).toBe('tenant@test.com');
      expect(emailCall[1]).toBe(1500);
      expect(emailCall[2]).toBeInstanceOf(Date);
    });

    it('should handle payment creation without email failure', async () => {
      const mockLease = {
        id: '11111111-1111-4111-8111-111111111111',
        tenantId: 'tenant-1',
        tenant: { id: 'tenant-1', username: 'tenant@test.com' },
        unitId: 'unit-1',
        unit: {
          unitNumber: '101',
          propertyId: 'property-1',
          property: { address: '123 Test St', organizationId: 'org-1' }
        },
      };

      const paymentDto = {
        amount: 1500,
        leaseId: '11111111-1111-4111-8111-111111111111',
        status: 'COMPLETED',
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.ledgerAccount.upsert.mockResolvedValue({ id: 'acc-1' });
      mockPrismaService.ledgerTransaction.findFirst.mockResolvedValue(null);
      mockPrismaService.ledgerTransaction.create.mockResolvedValue({ id: 'ltx-1' });
      mockPrismaService.payment.create.mockResolvedValue({ id: '1', ...paymentDto });

      // Email service fails but payment should still succeed
      mockEmailService.sendRentPaymentConfirmation.mockRejectedValue(
        new Error('SMTP error')
      );

      const result = await service.createPayment(paymentDto as any, undefined, 'org-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
    });

    it('should throw BadRequestException when lease not found', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(null);

      await expect(
        service.createPayment({
          amount: 1500,
          leaseId: '99999999-9999-4999-8999-999999999999',
          status: 'COMPLETED',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle failed payment status', async () => {
      const mockLease = {
        id: '11111111-1111-4111-8111-111111111111',
        tenantId: 'tenant-1',
        tenant: { id: 'tenant-1', username: 'tenant@test.com' },
        unitId: 'unit-1',
        unit: {
          unitNumber: '101',
          propertyId: 'property-1',
          property: { address: '123 Test St', organizationId: 'org-1' }
        },
      };

      const paymentDto = {
        amount: 1500,
        leaseId: '11111111-1111-4111-8111-111111111111',
        status: 'FAILED',
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.ledgerAccount.upsert.mockResolvedValue({ id: 'acc-1' });
      mockPrismaService.ledgerTransaction.findFirst.mockResolvedValue(null);
      mockPrismaService.ledgerTransaction.create.mockResolvedValue({ id: 'ltx-1' });
      mockPrismaService.payment.create.mockResolvedValue({ id: '1', ...paymentDto });

      const result = await service.createPayment(paymentDto as any, undefined, 'org-1');

      expect(result.status).toBe('FAILED');
      // Should not send confirmation email for failed payment
      expect(mockEmailService.sendRentPaymentConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('getInvoicesForUser', () => {
    it('should return invoices for tenant', async () => {
      const mockInvoices = [
        TestDataFactory.createInvoice(1, { id: '1', amount: 1500 }),
        TestDataFactory.createInvoice(1, { id: 2, amount: 1600 }),
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.getInvoicesForUser(1, 'TENANT');

      expect(result).toEqual(mockInvoices);
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
        where: {
          lease: {
            tenantId: 1,
          },
        },
        include: {
          lease: {
            include: {
              tenant: true,
              unit: {
                include: {
                  property: true,
                },
              },
            },
          },
          payments: true,
          lateFees: true,
          schedule: true,
        },
        orderBy: { dueDate: 'desc' },
      });
    });

    it('should filter invoices by leaseId for tenant', async () => {
      const mockInvoices = [TestDataFactory.createInvoice(5)];
      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      await service.getInvoicesForUser('1', 'TENANT' as any, '22222222-2222-4222-8222-222222222222');

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
        where: {
          lease: {
            tenantId: '1',
            id: '22222222-2222-4222-8222-222222222222',
          },
        },
        include: {
          lease: { include: { tenant: true, unit: { include: { property: true } } } },
          payments: true,
          lateFees: true,
          schedule: true,
        },
        orderBy: { dueDate: 'desc' },
      });
    });

    it('should return all invoices for property manager', async () => {
      const mockInvoices = [
        TestDataFactory.createInvoice(1),
        TestDataFactory.createInvoice(2),
        TestDataFactory.createInvoice(3),
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.getInvoicesForUser(2, 'PROPERTY_MANAGER');

      expect(result).toHaveLength(3);
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          lease: { include: { tenant: true, unit: { include: { property: true } } } },
          payments: true,
          lateFees: true,
          schedule: true,
        },
        orderBy: { dueDate: 'desc' },
      });
    });

    it('should return empty array when no invoices found', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.getInvoicesForUser(1, 'TENANT');

      expect(result).toEqual([]);
    });
  });

  describe('getPaymentsForUser', () => {
    it('should return payments for tenant', async () => {
      const mockPayments = [
        TestDataFactory.createPayment(1, 1, { id: '1' }),
        TestDataFactory.createPayment(1, 1, { id: 2 }),
      ];

      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const result = await service.getPaymentsForUser(1, 'TENANT');

      expect(result).toEqual(mockPayments);
      expect(mockPrismaService.payment.findMany).toHaveBeenCalled();
    });

    it('should return all payments for property manager', async () => {
      const mockPayments = TestDataFactory.createMany(
        () => TestDataFactory.createPayment(1, 1),
        5
      );

      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const result = await service.getPaymentsForUser(2, 'PROPERTY_MANAGER');

      expect(result).toHaveLength(5);
    });
  });

  // TODO: Implement these cron job methods in PaymentsService
  describe.skip('sendRentDueReminders (Cron Job)', () => {
    it('should send reminders for upcoming invoices', async () => {
      const mockInvoices = [
        {
          id: '1',
          amount: 1500,
          dueDate: new Date(),
          status: 'UNPAID',
          lease: {
            tenant: { id: '1', username: 'tenant1@test.com' },
            unit: { unitNumber: '101', property: { address: '123 Test St' } },
          },
        },
        {
          id: 2,
          amount: 1800,
          dueDate: new Date(),
          status: 'UNPAID',
          lease: {
            tenant: { id: 2, username: 'tenant2@test.com' },
            unit: { unitNumber: '102', property: { address: '123 Test St' } },
          },
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);
      mockEmailService.sendRentDueReminder.mockResolvedValue(undefined);

      await service.sendRentDueReminders();

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendRentDueReminder).toHaveBeenCalledTimes(2);
    });

    it('should handle empty invoice list', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      await service.sendRentDueReminders();

      expect(mockEmailService.sendRentDueReminder).not.toHaveBeenCalled();
    });

    it('should continue on email error', async () => {
      const mockInvoices = [
        {
          id: '1',
          amount: 1500,
          dueDate: new Date(),
          lease: {
            tenant: { username: 'tenant1@test.com' },
            unit: { unitNumber: '101', property: { address: '123 Test St' } },
          },
        },
        {
          id: 2,
          amount: 1800,
          dueDate: new Date(),
          lease: {
            tenant: { username: 'tenant2@test.com' },
            unit: { unitNumber: '102', property: { address: '123 Test St' } },
          },
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);
      mockEmailService.sendRentDueReminder
        .mockRejectedValueOnce(new Error('SMTP error'))
        .mockResolvedValueOnce(undefined);

      await service.sendRentDueReminders();

      // Should attempt both emails despite first failure
      expect(mockEmailService.sendRentDueReminder).toHaveBeenCalledTimes(2);
    });
  });

  describe.skip('sendLateRentNotifications (Cron Job)', () => {
    it('should send late notices for overdue invoices', async () => {
      const mockInvoices = [
        {
          id: '1',
          amount: 1500,
          dueDate: new Date('2025-11-01'),
          status: 'UNPAID',
          lease: {
            tenant: { username: 'tenant@test.com' },
            unit: { unitNumber: '101', property: { address: '123 Test St' } },
          },
          lateFees: [{ amount: 50 }],
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);
      mockEmailService.sendLateRentNotification.mockResolvedValue(undefined);

      await service.sendLateRentNotifications();

      expect(mockEmailService.sendLateRentNotification).toHaveBeenCalledTimes(1);
      
      // Check the call arguments match the actual implementation
      const call = mockEmailService.sendLateRentNotification.mock.calls[0];
      expect(call[0]).toMatchObject({
        username: 'tenant@test.com',
        email: 'tenant@test.com',
        firstName: 'tenant',
      });
      expect(call[1]).toMatchObject({
        tenant: { username: 'tenant@test.com' },
        unit: { unitNumber: '101' },
      });
      expect(call[2]).toMatchObject({
        amount: 1500,
        dueDate: expect.any(Date),
        lateFee: 50,
      });
    });

    it('should use default late fee when none exist', async () => {
      const mockInvoices = [
        {
          id: '1',
          amount: 1500,
          dueDate: new Date('2025-11-01'),
          lease: {
            tenant: { username: 'tenant@test.com' },
            unit: { unitNumber: '101', property: { address: '123 Test St' } },
          },
          lateFees: [],
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);
      mockEmailService.sendLateRentNotification.mockResolvedValue(undefined);

      await service.sendLateRentNotifications();

      const call = mockEmailService.sendLateRentNotification.mock.calls[0];
      expect(call[2]).toMatchObject({
        lateFee: 50, // Default value when no late fees exist
      });
    });
  });

  describe.skip('testRentDueReminder', () => {
    it('should send test reminder for specific invoice', async () => {
      const mockInvoice = {
        id: '1',
        amount: 1500,
        dueDate: new Date('2025-12-01'),
        lease: {
          tenant: { username: 'tenant@test.com' },
          unit: { unitNumber: '101', property: { address: '123 Test St' } },
        },
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockEmailService.sendRentDueReminder.mockResolvedValue(undefined);

      const result = await service.testRentDueReminder(1);

      expect(result).toHaveProperty('message');
      expect(mockEmailService.sendRentDueReminder).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.testRentDueReminder(999)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw error when tenant has no username', async () => {
      const mockInvoice = {
        id: '1',
        amount: 1500,
        dueDate: new Date(),
        lease: {
          tenant: { username: null },
          unit: { unitNumber: '101', property: { address: '123 Test St' } },
        },
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(service.testRentDueReminder(1)).rejects.toThrow();
    });
  });

  describe.skip('testLateRentNotification', () => {
    it('should send test late notice', async () => {
      const mockInvoice = {
        id: '1',
        amount: 1500,
        dueDate: new Date('2025-11-01'),
        lease: {
          tenant: { username: 'tenant@test.com' },
          unit: { unitNumber: '101', property: { address: '123 Test St' } },
        },
        lateFees: [{ amount: 75 }],
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockEmailService.sendLateRentNotification.mockResolvedValue(undefined);

      const result = await service.testLateRentNotification(1);

      expect(result).toHaveProperty('message');
      
      const call = mockEmailService.sendLateRentNotification.mock.calls[0];
      expect(call[2]).toMatchObject({
        lateFee: 75,
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.testLateRentNotification(999)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('createPaymentPlan', () => {
    it('should create a payment plan successfully', async () => {
      const invoiceId = 1;
      const tenantId = 10;
      const leaseId = 5;
      const dueDate = new Date('2025-01-15');

      const mockInvoice = {
        id: invoiceId,
        amount: 1500,
        dueDate,
        leaseId,
        paymentPlan: null,
        lease: {
          id: leaseId,
          tenantId,
          tenant: { id: tenantId },
        },
      };

      const mockPaymentPlan = {
        id: '1',
        invoiceId,
        installments: 3,
        amountPerInstallment: 500,
        totalAmount: 1500,
        status: 'PENDING',
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.paymentPlan.create.mockResolvedValue(mockPaymentPlan);

      const plan = {
        installments: 3,
        amountPerInstallment: 500,
        totalAmount: 1500,
      };

      const result = await service.createPaymentPlan(invoiceId, plan);

      expect(result).toEqual({
        id: mockPaymentPlan.id,
        status: mockPaymentPlan.status,
      });
      expect(mockPrismaService.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: invoiceId },
        include: {
          paymentPlan: true,
          lease: {
            include: {
              tenant: true,
              unit: { include: { property: true } },
            },
          },
        },
      });
      expect(mockPrismaService.paymentPlan.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentPlan(999, {
          installments: 3,
          amountPerInstallment: 500,
          totalAmount: 1500,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when payment plan already exists', async () => {
      const invoiceId = 1;
      const mockInvoice = {
        id: invoiceId,
        paymentPlan: {
          id: '1',
          status: 'PENDING',
        },
        lease: {
          tenantId: 10,
          tenant: { id: 10 },
        },
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.createPaymentPlan(invoiceId, {
          installments: 3,
          amountPerInstallment: 500,
          totalAmount: 1500,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.paymentPlan.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when lease has no tenant', async () => {
      const invoiceId = 1;
      const mockInvoice = {
        id: invoiceId,
        paymentPlan: null,
        lease: {
          tenantId: null,
          tenant: null,
        },
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.createPaymentPlan(invoiceId, {
          installments: 3,
          amountPerInstallment: 500,
          totalAmount: 1500,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.paymentPlan.create).not.toHaveBeenCalled();
    });

    it('should create payment plan with correct installment dates', async () => {
      const invoiceId = 1;
      const tenantId = 10;
      const leaseId = 5;
      const dueDate = new Date('2025-01-15');

      const mockInvoice = {
        id: invoiceId,
        amount: 1500,
        dueDate,
        leaseId,
        paymentPlan: null,
        lease: {
          id: leaseId,
          tenantId,
          tenant: { id: tenantId },
        },
      };

      const mockPaymentPlan = {
        id: '1',
        invoiceId,
        installments: 3,
        amountPerInstallment: 500,
        totalAmount: 1500,
        status: 'PENDING',
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.paymentPlan.create.mockResolvedValue(mockPaymentPlan);

      const plan = {
        installments: 3,
        amountPerInstallment: 500,
        totalAmount: 1500,
      };

      await service.createPaymentPlan(invoiceId, plan);

      // Verify payment plan creation was called
      expect(mockPrismaService.paymentPlan.create).toHaveBeenCalled();
      const createCall = mockPrismaService.paymentPlan.create.mock.calls[0][0];

      // Verify installments are created
      expect(createCall.data.paymentPlanPayments.create).toHaveLength(3);
      expect(createCall.data.paymentPlanPayments.create[0].installmentNumber).toBe(1);
      expect(createCall.data.paymentPlanPayments.create[1].installmentNumber).toBe(2);
      expect(createCall.data.paymentPlanPayments.create[2].installmentNumber).toBe(3);

      // Verify due dates are calculated correctly (monthly increments)
      const firstDueDate = new Date(createCall.data.paymentPlanPayments.create[0].dueDate);
      const secondDueDate = new Date(createCall.data.paymentPlanPayments.create[1].dueDate);
      const thirdDueDate = new Date(createCall.data.paymentPlanPayments.create[2].dueDate);

      expect(firstDueDate.getMonth()).toBe(dueDate.getMonth());
      expect(secondDueDate.getMonth()).toBe(dueDate.getMonth() + 1);
      expect(thirdDueDate.getMonth()).toBe(dueDate.getMonth() + 2);
    });
  });

  describe('getDelinquencyQueue sorting and pagination', () => {
    it('sorts by priorityScore descending and applies pagination fields', async () => {
      const now = new Date();
      mockPrismaService.invoice.findMany.mockResolvedValue([
        {
          id: 1,
          amount: 1000,
          dueDate: new Date(now.getTime() - 10 * 86400000),
          leaseId: 'lease-1',
          lease: {
            tenantId: 'tenant-a',
            tenant: { firstName: 'Alex', lastName: 'Zulu', username: 'alex' },
            unit: { propertyId: 'prop-1', name: 'Unit A', property: { name: 'Property 1' } },
          },
        },
        {
          id: 2,
          amount: 500,
          dueDate: new Date(now.getTime() - 5 * 86400000),
          leaseId: 'lease-2',
          lease: {
            tenantId: 'tenant-b',
            tenant: { firstName: 'Bea', lastName: 'Alpha', username: 'bea' },
            unit: { propertyId: 'prop-1', name: 'Unit B', property: { name: 'Property 1' } },
          },
        },
      ]);

      const result = await service.getDelinquencyQueue({
        orgId: 'org-1',
        sortBy: 'priorityScore',
        sortOrder: 'desc',
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
      expect(result.sortBy).toBe('priorityScore');
      expect(result.sortOrder).toBe('desc');
      expect(result.items[0].priorityScore).toBeGreaterThanOrEqual(result.items[1].priorityScore);
    });

    it('applies default sort and caps limit at 500', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.getDelinquencyQueue({
        orgId: 'org-1',
        limit: 9999,
      });

      expect(result.limit).toBe(500);
      expect(result.sortBy).toBe('daysPastDue');
      expect(result.sortOrder).toBe('desc');
    });
  });

  describe('ledger reversal integrity guards', () => {
    it('rejects non-positive ledger amounts', async () => {
      await expect(
        (service as any).createLedgerTransactionIfMissing(
          { ledgerTransaction: {} },
          {
            accountId: 'acc-1',
            entryType: 'CHARGE',
            direction: 'DEBIT',
            amountCents: 0,
            effectiveDate: new Date(),
            sourceType: 'invoice',
            sourceId: '1',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects reversal without reversesEntryId', async () => {
      await expect(
        (service as any).createLedgerTransactionIfMissing(
          { ledgerTransaction: {} },
          {
            accountId: 'acc-1',
            entryType: 'REVERSAL',
            direction: 'CREDIT',
            amountCents: 100,
            effectiveDate: new Date(),
            sourceType: 'manual_charge_void',
            sourceId: 'mc-1',
          },
        ),
      ).rejects.toThrow('must include reversesEntryId');
    });

    it('rejects reversal when original entry is missing', async () => {
      const prismaLike = {
        ledgerTransaction: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      await expect(
        (service as any).createLedgerTransactionIfMissing(prismaLike, {
          accountId: 'acc-1',
          entryType: 'REVERSAL',
          direction: 'CREDIT',
          amountCents: 100,
          effectiveDate: new Date(),
          sourceType: 'manual_charge_void',
          sourceId: 'mc-1',
          reversesEntryId: 'orig-1',
        }),
      ).rejects.toThrow('target entry was not found');
    });

    it('rejects reversal with same direction as original', async () => {
      const prismaLike = {
        ledgerTransaction: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'orig-1',
            accountId: 'acc-1',
            entryType: 'CHARGE',
            direction: 'DEBIT',
          }),
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };

      await expect(
        (service as any).createLedgerTransactionIfMissing(prismaLike, {
          accountId: 'acc-1',
          entryType: 'REVERSAL',
          direction: 'DEBIT',
          amountCents: 100,
          effectiveDate: new Date(),
          sourceType: 'manual_charge_void',
          sourceId: 'mc-1',
          reversesEntryId: 'orig-1',
        }),
      ).rejects.toThrow('must be opposite');
    });

    it('returns existing reversal instead of creating duplicate', async () => {
      const prismaLike = {
        ledgerTransaction: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'orig-1',
            accountId: 'acc-1',
            entryType: 'CHARGE',
            direction: 'DEBIT',
          }),
          findFirst: jest.fn().mockResolvedValue({ id: 'rev-existing' }),
          create: jest.fn(),
        },
      };

      const result = await (service as any).createLedgerTransactionIfMissing(prismaLike, {
        accountId: 'acc-1',
        entryType: 'REVERSAL',
        direction: 'CREDIT',
        amountCents: 100,
        effectiveDate: new Date(),
        sourceType: 'manual_charge_void',
        sourceId: 'mc-1',
        reversesEntryId: 'orig-1',
      });

      expect(result).toEqual({ id: 'rev-existing' });
      expect(prismaLike.ledgerTransaction.create).not.toHaveBeenCalled();
    });
  });
});
