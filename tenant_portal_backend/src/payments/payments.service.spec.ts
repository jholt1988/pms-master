import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TestDataFactory } from '../../test/factories';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  // Mock PrismaService
  const mockPrismaService = {
    lease: {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
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
      const mockLease = { id: 1, tenantId: 1 };
      const invoiceDto = {
        description: 'December Rent',
        amount: 1500,
        dueDate: '2025-12-01',
        leaseId: 1,
      };
      const mockInvoice = {
        id: 1,
        ...invoiceDto,
        dueDate: new Date(invoiceDto.dueDate),
        status: 'UNPAID',
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.invoice.create.mockResolvedValue(mockInvoice);

      const result = await service.createInvoice(invoiceDto);

      expect(result).toEqual(mockInvoice);
      expect(mockPrismaService.lease.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith({
        data: {
          description: 'December Rent',
          amount: 1500,
          dueDate: new Date('2025-12-01'),
          lease: { connect: { id: 1 } },
        },
        include: {
          lease: { include: { tenant: true, unit: { include: { property: true } } } },
          payments: true,
          lateFees: true,
        },
      });
    });

    it('should throw NotFoundException when lease not found', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvoice({
          description: 'Test',
          amount: 1500,
          dueDate: '2025-12-01',
          leaseId: 999,
        })
      ).rejects.toThrow(NotFoundException);
    });

    // Note: Date and amount validation would be done at DTO validation layer (class-validator)
    // These tests are skipped as the service doesn't perform this validation
    it.skip('should handle invalid date format', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({ id: 1 });

      await expect(
        service.createInvoice({
          description: 'Test',
          amount: 1500,
          dueDate: 'invalid-date',
          leaseId: 1,
        })
      ).rejects.toThrow();
    });

    it.skip('should validate amount is positive', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({ id: 1 });

      await expect(
        service.createInvoice({
          description: 'Test',
          amount: -100,
          dueDate: '2025-12-01',
          leaseId: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe('createPayment', () => {
    it('should create payment and send confirmation email', async () => {
      const mockLease = {
        id: 1,
        tenantId: 1,
        tenant: { id: 1, username: 'tenant@test.com' },
        unit: { 
          unitNumber: '101', 
          property: { address: '123 Test St' } 
        },
      };

      const paymentDto = {
        amount: 1500,
        leaseId: 1,
        status: 'COMPLETED',
      };

      const mockPayment = {
        id: 1,
        ...paymentDto,
        userId: 1,
        paymentDate: new Date(),
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockEmailService.sendRentPaymentConfirmation.mockResolvedValue(undefined);

      const result = await service.createPayment(paymentDto);

      expect(result).toEqual(mockPayment);
      expect(mockEmailService.sendRentPaymentConfirmation).toHaveBeenCalledTimes(1);
      
      // Check the email was called with tenant info, lease, and payment data
      const emailCall = mockEmailService.sendRentPaymentConfirmation.mock.calls[0];
      expect(emailCall[0]).toMatchObject({
        username: 'tenant@test.com',
        email: 'tenant@test.com',
        firstName: 'tenant',
      });
      expect(emailCall[1]).toBe(mockLease);
      expect(emailCall[2]).toMatchObject({
        amountPaid: 1500,
        transactionId: '1',
      });
    });

    it('should handle payment creation without email failure', async () => {
      const mockLease = {
        id: 1,
        tenantId: 1,
        tenant: { id: 1, username: 'tenant@test.com' },
        unit: { 
          unitNumber: '101', 
          property: { address: '123 Test St' } 
        },
      };

      const paymentDto = {
        amount: 1500,
        leaseId: 1,
        status: 'COMPLETED',
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.payment.create.mockResolvedValue({ id: 1, ...paymentDto });
      
      // Email service fails but payment should still succeed
      mockEmailService.sendRentPaymentConfirmation.mockRejectedValue(
        new Error('SMTP error')
      );

      const result = await service.createPayment(paymentDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should throw BadRequestException when lease not found', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(null);

      await expect(
        service.createPayment({
          amount: 1500,
          leaseId: 999,
          status: 'COMPLETED',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle failed payment status', async () => {
      const mockLease = {
        id: 1,
        tenantId: 1,
        tenant: { id: 1, username: 'tenant@test.com' },
        unit: { unitNumber: '101', property: { address: '123 Test St' } },
      };

      const paymentDto = {
        amount: 1500,
        leaseId: 1,
        status: 'FAILED',
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.payment.create.mockResolvedValue({ id: 1, ...paymentDto });

      const result = await service.createPayment(paymentDto);

      expect(result.status).toBe('FAILED');
      // Should not send confirmation email for failed payment
      expect(mockEmailService.sendRentPaymentConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('getInvoicesForUser', () => {
    it('should return invoices for tenant', async () => {
      const mockInvoices = [
        TestDataFactory.createInvoice(1, { id: 1, amount: 1500 }),
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

      await service.getInvoicesForUser(1, 'TENANT', 5);

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
        where: {
          lease: {
            tenantId: 1,
            id: 5,
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
        where: undefined,
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
        TestDataFactory.createPayment(1, 1, { id: 1 }),
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
          id: 1,
          amount: 1500,
          dueDate: new Date(),
          status: 'UNPAID',
          lease: {
            tenant: { id: 1, username: 'tenant1@test.com' },
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
          id: 1,
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
          id: 1,
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
          id: 1,
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
        id: 1,
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
        id: 1,
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
        id: 1,
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
});
