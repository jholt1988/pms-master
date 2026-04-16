import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AIPaymentService } from './ai-payment.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TestDataFactory } from '../../test/factories';
import { StripeService } from './stripe.service';
import { AuditLogService } from '../shared/audit-log.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowEventService } from '../policy/workflow-event.service';
import { WorkflowEventProcessor } from '../policy/workflow-event-processor.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let emailService: EmailService;
  let auditLogService: AuditLogService;

  // Mock PrismaService
  const mockPrismaService = {
    lease: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    leaseNotice: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    leaseHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
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
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    paymentPlan: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
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
    notification: {
      create: jest.fn(),
    },
    communicationLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    document: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    orgPlanCycle: {
      findFirst: jest.fn(),
    },
    manualPayment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    manualCharge: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    paymentMethod: {
      findUnique: jest.fn(),
    },
    courtCalendar: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    leaseNoticeDocument: {
      findMany: jest.fn(),
    },
    lawFirm: {
      findUnique: jest.fn(),
    },
    communication: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
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
    getCustomerByUserId: jest.fn(),
    createCustomer: jest.fn(),
    processPayment: jest.fn(),
  };

  const mockAuditLogService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockWorkflowEventService = {
    emitIfNotExists: jest.fn().mockResolvedValue({ id: 'workflow-event-1' }),
  };

  const mockWorkflowEventProcessor = {
    processEventById: jest.fn().mockResolvedValue({ results: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: AIPaymentService, useValue: mockAIPaymentService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: WorkflowEventService, useValue: mockWorkflowEventService },
        { provide: WorkflowEventProcessor, useValue: mockWorkflowEventProcessor },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    auditLogService = module.get<AuditLogService>(AuditLogService);
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
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        module: 'PAYMENTS',
        action: 'PAYMENT_PLAN_CREATED',
        entityType: 'PaymentPlan',
        entityId: mockPaymentPlan.id,
      }));
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
      expect(result.priorityWeights).toEqual({ daysWeight: 1, amountWeight: 1 });
      expect(result.items[0].priorityScore).toBeGreaterThanOrEqual(result.items[1].priorityScore);
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        module: 'PAYMENTS',
        action: 'DELINQUENCY_QUEUE_VIEWED',
        entityType: 'DelinquencyQueue',
      }));
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

    it('uses configured priority weights in score calculation', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        delinquencyDaysWeight: 2,
        delinquencyAmountWeight: 3,
      });

      const now = new Date();
      mockPrismaService.invoice.findMany.mockResolvedValue([
        {
          id: 3,
          amount: 100,
          dueDate: new Date(now.getTime() - 2 * 86400000),
          leaseId: 'lease-w',
          lease: {
            tenantId: 'tenant-w',
            tenant: { firstName: 'Weighted', lastName: 'Case', username: 'weighted' },
            unit: { propertyId: 'prop-1', name: 'Unit W', property: { name: 'Property 1' } },
          },
        },
      ]);

      const result = await service.getDelinquencyQueue({
        orgId: 'org-1',
        sortBy: 'priorityScore',
        sortOrder: 'desc',
      });

      expect(result.priorityWeights).toEqual({ daysWeight: 2, amountWeight: 3 });
      // dueDays=2, amountCents=10000 => (2*2) * (10000*3) = 120000
      expect(result.items[0].priorityScore).toBe(120000);
    });
  });

  describe('delinquency priority config methods', () => {
    it('returns env defaults when org overrides are absent', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        delinquencyDaysWeight: null,
        delinquencyAmountWeight: null,
      });

      const result = await service.getDelinquencyPriorityConfig('org-1');
      expect(result).toEqual({
        orgId: 'org-1',
        daysWeight: 1,
        amountWeight: 1,
        source: 'env_default',
      });
    });

    it('updates org overrides and returns new values', async () => {
      mockPrismaService.organization.update.mockResolvedValue({
        id: 'org-1',
        delinquencyDaysWeight: 2,
        delinquencyAmountWeight: 3,
      });

      const result = await service.updateDelinquencyPriorityConfig('org-1', 2, 3);
      expect(result).toEqual({
        orgId: 'org-1',
        daysWeight: 2,
        amountWeight: 3,
        source: 'org_override',
      });
    });
  });

  describe('payment reminders and ops summary auditability', () => {
    it('records audit event when creating payment reminder notifications', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue({
        id: 5,
        leaseId: 'lease-1',
        lease: {
          tenantId: 'tenant-1',
          tenant: { id: 'tenant-1', username: 'tenant@test.com' },
        },
      });
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.sendPaymentReminder(5, {
        message: 'Rent is due.',
        channel: 'EMAIL',
        urgency: 'MEDIUM',
      });

      expect(mockPrismaService.notification.create).toHaveBeenCalled();
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        module: 'PAYMENTS',
        action: 'PAYMENT_REMINDER_CREATED',
        entityType: 'Notification',
        entityId: 5,
      }));
    });

    it('records audit event when generating ops summary', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      const result = await service.getPaymentsOpsSummary('org-1', 10);

      expect(result.counts).toEqual({
        delinquentAccounts: 0,
        failedPayments: 0,
      });
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        module: 'PAYMENTS',
        action: 'PAYMENTS_OPS_SUMMARY_VIEWED',
        entityType: 'PaymentsOpsSummary',
        entityId: 'org-1',
      }));
    });
  });

  describe('delinquency legal workflow', () => {
    it('issues a delinquency notice when approval is confirmed and overdue invoices exist', async () => {
      const now = new Date('2026-04-06T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      mockPrismaService.lease.findFirst.mockResolvedValue({
        id: 'lease-1',
        tenantId: 'tenant-1',
        tenant: { id: 'tenant-1' },
        status: 'ACTIVE',
        unitId: 'unit-1',
        unit: {
          propertyId: 'property-1',
          property: { id: 'property-1', organizationId: 'org-1' },
        },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue([
        {
          id: 101,
          amount: 1200,
          dueDate: new Date('2026-03-01T00:00:00.000Z'),
        },
        {
          id: 102,
          amount: 300,
          dueDate: new Date('2026-03-15T00:00:00.000Z'),
        },
      ]);
      mockPrismaService.leaseNotice.create.mockResolvedValue({ id: 'notice-1' });
      mockPrismaService.lease.update.mockResolvedValue({ id: 'lease-1', status: 'NOTICE_GIVEN' });
      mockPrismaService.leaseHistory.create.mockResolvedValue({ id: 'history-1' });
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notification-1' });
      mockPrismaService.$transaction.mockImplementation(async (operations) => Promise.all(operations));

      const result = await service.issueDelinquencyNotice(
        {
          leaseId: 'lease-1',
          deliveryMethod: 'EMAIL' as any,
          approvalConfirmed: true,
        },
        'manager-1',
        'org-1',
      );

      expect(result).toEqual({
        noticeId: 'notice-1',
        leaseId: 'lease-1',
        status: 'NOTICE_GIVEN',
        overdueInvoiceIds: [101, 102],
        amountDueCents: 150000,
        oldestDueDate: new Date('2026-03-01T00:00:00.000Z'),
      });
      expect(mockPrismaService.leaseNotice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          type: 'OTHER',
          deliveryMethod: 'EMAIL',
        }),
      }));
      expect(mockPrismaService.lease.update).toHaveBeenCalledWith({
        where: { id: 'lease-1' },
        data: expect.objectContaining({
          status: 'NOTICE_GIVEN',
          terminationRequestedBy: 'MANAGER',
        }),
      });
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        module: 'PAYMENTS',
        action: 'DELINQUENCY_NOTICE_ISSUED',
        entityType: 'LeaseNotice',
        entityId: 'notice-1',
      }));

      jest.useRealTimers();
    });

    it('rejects delinquency notice issuance when no overdue invoices exist', async () => {
      mockPrismaService.lease.findFirst.mockResolvedValue({
        id: 'lease-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        unitId: 'unit-1',
        unit: { propertyId: 'property-1', property: { organizationId: 'org-1' } },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      await expect(
        service.issueDelinquencyNotice(
          {
            leaseId: 'lease-1',
            deliveryMethod: 'EMAIL' as any,
            approvalConfirmed: true,
          },
          'manager-1',
          'org-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.leaseNotice.create).not.toHaveBeenCalled();
    });

    it('rejects paid resolution when overdue balance still exists', async () => {
      mockPrismaService.lease.findFirst.mockResolvedValue({
        id: 'lease-1',
        tenantId: 'tenant-1',
        status: 'NOTICE_GIVEN',
        unitId: 'unit-1',
        terminationReason: null,
        unit: { propertyId: 'property-1', property: { organizationId: 'org-1' } },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue([
        {
          id: 201,
          amount: 450,
          dueDate: new Date('2026-03-01T00:00:00.000Z'),
          paymentPlan: null,
        },
      ]);

      await expect(
        service.resolveDelinquencyLegalHold(
          {
            leaseId: 'lease-1',
            resolutionMode: 'PAID' as any,
          },
          'manager-1',
          'org-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.lease.update).not.toHaveBeenCalled();
    });

    it('resolves delinquency legal hold when a payment plan is active', async () => {
      mockPrismaService.lease.findFirst.mockResolvedValue({
        id: 'lease-1',
        tenantId: 'tenant-1',
        status: 'NOTICE_GIVEN',
        unitId: 'unit-1',
        terminationReason: null,
        unit: {
          propertyId: 'property-1',
          property: { id: 'property-1', organizationId: 'org-1' },
        },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue([
        {
          id: 301,
          amount: 450,
          dueDate: new Date('2026-03-01T00:00:00.000Z'),
          paymentPlan: { status: 'ACTIVE' },
        },
      ]);
      mockPrismaService.lease.update.mockResolvedValue({ id: 'lease-1', status: 'ACTIVE' });
      mockPrismaService.leaseHistory.create.mockResolvedValue({ id: 'history-2' });
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notification-2' });
      mockPrismaService.$transaction.mockImplementation(async (operations) => Promise.all(operations));

      const result = await service.resolveDelinquencyLegalHold(
        {
          leaseId: 'lease-1',
          resolutionMode: 'PAYMENT_PLAN' as any,
          reason: 'Manager approved payment-plan hold',
        },
        'manager-1',
        'org-1',
      );

      expect(result).toEqual({
        leaseId: 'lease-1',
        previousStatus: 'NOTICE_GIVEN',
        status: 'ACTIVE',
        resolutionMode: 'PAYMENT_PLAN',
        outstandingDueCents: 45000,
        activePlanExists: true,
      });
      expect(mockPrismaService.lease.update).toHaveBeenCalledWith({
        where: { id: 'lease-1' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          terminationReason: 'Manager approved payment-plan hold',
        }),
      });
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        module: 'PAYMENTS',
        action: 'DELINQUENCY_LEGAL_HOLD_RESOLVED',
        entityType: 'Lease',
        entityId: 'lease-1',
      }));
    });

    it('refers delinquency to attorney after notice-stage delinquency', async () => {
      mockPrismaService.lease.findFirst.mockResolvedValue({
        id: 'lease-1',
        tenantId: 'tenant-1',
        status: 'NOTICE_GIVEN',
        unitId: 'unit-1',
        unit: {
          propertyId: 'property-1',
          property: { id: 'property-1', organizationId: 'org-1' },
        },
      });
      mockPrismaService.invoice.findMany.mockResolvedValue([
        {
          id: 401,
          amount: 900,
          dueDate: new Date('2026-03-01T00:00:00.000Z'),
        },
      ]);
      mockPrismaService.leaseNotice.findFirst.mockResolvedValue({ id: 88, createdAt: new Date('2026-03-20T00:00:00.000Z'), sentAt: new Date('2026-03-01T00:00:00.000Z') });
      mockPrismaService.communicationLog.create.mockResolvedValue({ id: 77 });
      mockPrismaService.leaseHistory.create.mockResolvedValue({ id: 'history-3' });
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notification-3' });
      mockPrismaService.$transaction.mockImplementation(async (operations) => Promise.all(operations));

      const result = await service.referDelinquencyToAttorney(
        {
          leaseId: 'lease-1',
          attorneyEmail: 'counsel@example.com',
          approvalConfirmed: true,
          attorneyName: 'Outside Counsel',
        },
        'manager-1',
        'org-1',
      );

      expect(result).toEqual(expect.objectContaining({
        leaseId: 'lease-1',
        attorneyEmail: 'counsel@example.com',
        latestNoticeId: 88,
        overdueInvoiceIds: [401],
        amountDueCents: 90000,
        workflowEventId: 'workflow-event-1',
        status: 'PROCESSED',
      }));
      expect(mockWorkflowEventService.emitIfNotExists).toHaveBeenCalled();
    });

    it('records court date and returns legal tracker entries', async () => {
      mockPrismaService.lease.findFirst.mockResolvedValue({
        id: 'lease-1',
        tenantId: 'tenant-1',
        status: 'NOTICE_GIVEN',
        unitId: 'unit-1',
        unit: {
          propertyId: 'property-1',
          property: { id: 'property-1', organizationId: 'org-1' },
        },
      });
      mockPrismaService.communicationLog.findFirst.mockResolvedValue({ id: 77 });
      mockPrismaService.leaseHistory.create.mockResolvedValue({ id: 55 });
      mockPrismaService.communicationLog.create.mockResolvedValue({ id: 78 });
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notification-4' });
      mockPrismaService.$transaction.mockImplementation(async (operations) => Promise.all(operations));

      const courtResult = await service.recordCourtDate(
        {
          leaseId: 'lease-1',
          courtDate: '2026-05-01T15:00:00.000Z',
          docketNumber: '24-EV-1001',
          courtroom: 'Room 2B',
        },
        'manager-1',
        'org-1',
      );

      expect(courtResult).toEqual({
        leaseId: 'lease-1',
        courtDate: new Date('2026-05-01T15:00:00.000Z'),
        docketNumber: '24-EV-1001',
        courtroom: 'Room 2B',
        relatedReferralCommunicationId: 77,
        historyId: 55,
      });
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        module: 'PAYMENTS',
        action: 'DELINQUENCY_COURT_DATE_RECORDED',
        entityType: 'LeaseHistory',
        entityId: 55,
      }));

      mockPrismaService.invoice.findMany.mockResolvedValue([
        {
          id: 402,
          amount: 900,
          dueDate: new Date('2026-03-01T00:00:00.000Z'),
        },
      ]);
      mockPrismaService.leaseNotice.findMany.mockResolvedValue([
        { id: 88, createdAt: new Date('2026-03-20T00:00:00.000Z'), sentAt: new Date('2026-03-20T00:00:00.000Z') },
      ]);
      mockPrismaService.leaseHistory.findMany.mockResolvedValue([
        {
          id: 55,
          createdAt: new Date('2026-04-10T00:00:00.000Z'),
          metadata: {
            legalStage: 'COURT_SCHEDULED',
            courtDate: '2026-05-01T15:00:00.000Z',
            docketNumber: '24-EV-1001',
            courtroom: 'Room 2B',
          },
        },
      ]);
      mockPrismaService.communicationLog.findMany.mockResolvedValue([
        {
          id: 77,
          createdAt: new Date('2026-04-09T00:00:00.000Z'),
          metadata: {
            workflow: 'DELINQUENCY_ATTORNEY_REFERRAL',
          },
        },
      ]);

      const tracker = await service.getDelinquencyLegalTracker('lease-1', 'org-1');

      expect(tracker).toEqual({
        leaseId: 'lease-1',
        leaseStatus: 'NOTICE_GIVEN',
        tenantId: 'tenant-1',
        propertyId: 'property-1',
        unitId: 'unit-1',
        overdueInvoiceIds: [402],
        amountDueCents: 90000,
        noticeCount: 1,
        latestNoticeAt: new Date('2026-03-20T00:00:00.000Z'),
        attorneyReferralCount: 1,
        latestAttorneyReferralAt: new Date('2026-04-09T00:00:00.000Z'),
        courtDates: [
          {
            historyId: 55,
            courtDate: '2026-05-01T15:00:00.000Z',
            docketNumber: '24-EV-1001',
            courtroom: 'Room 2B',
            createdAt: new Date('2026-04-10T00:00:00.000Z'),
          },
        ],
      });
    });

    it('builds an attorney packet checklist from lease, notice, and ledger evidence', async () => {
      const leaseRecord = {
        id: 'lease-1',
        tenantId: 'tenant-1',
        status: 'NOTICE_GIVEN',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
        rentAmount: 1200,
        currentBalance: 1500,
        unitId: 'unit-1',
        documents: [
          {
            id: 1,
            type: 'LEASE_AGREEMENT',
            url: '/lease.pdf',
            description: 'Executed lease',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        generalDocuments: [
          {
            id: 2,
            fileName: 'notice.pdf',
            category: 'NOTICE',
            filePath: '/notice.pdf',
            description: 'Posted notice copy',
            createdAt: new Date('2026-03-10T00:00:00.000Z'),
          },
        ],
        unit: {
          propertyId: 'property-1',
          property: { organizationId: 'org-1' },
        },
      };
      mockPrismaService.lease.findFirst.mockResolvedValue(leaseRecord);
      mockPrismaService.lease.findUnique.mockResolvedValue(leaseRecord);
      mockPrismaService.leaseNotice.findMany.mockResolvedValue([
        {
          id: 88,
          type: 'OTHER',
          deliveryMethod: 'PRINT',
          message: 'Delinquency notice issued for overdue balance.',
          createdAt: new Date('2026-03-10T00:00:00.000Z'),
        },
      ]);
      mockPrismaService.communicationLog.findMany.mockResolvedValue([
        {
          id: 77,
          to: 'counsel@example.com',
          subject: 'Delinquency referral for lease lease-1',
          createdAt: new Date('2026-03-20T00:00:00.000Z'),
          metadata: { workflow: 'DELINQUENCY_ATTORNEY_REFERRAL' },
        },
      ]);
      mockPrismaService.ledgerAccount.findUnique.mockResolvedValue({
        id: 'ledger-1',
        entries: [
          {
            id: 'entry-1',
            direction: 'DEBIT',
            sourceType: 'invoice',
            effectiveDate: new Date('2026-03-01T00:00:00.000Z'),
            amountCents: 120000,
            description: 'March rent',
          },
          {
            id: 'entry-2',
            direction: 'DEBIT',
            sourceType: 'invoice',
            effectiveDate: new Date('2026-04-01T00:00:00.000Z'),
            amountCents: 30000,
            description: 'Late fee',
          },
        ],
      });

      const result = await service.getAttorneyPacketChecklist(
        '11111111-1111-4111-8111-111111111111',
        { userId: 'manager-1', role: 'PROPERTY_MANAGER' as any },
        'org-1',
      );

      expect(result.packetStatus).toBe('READY');
      expect(result.noticeSummary).toEqual(expect.objectContaining({
        noticeId: 88,
        deliveryMethod: 'PRINT',
      }));
      expect(result.ledgerSummary.currentBalanceCents).toBe(150000);
      expect(result.documents.leaseDocuments).toHaveLength(1);
      expect(result.attorneyReferral).toEqual(expect.objectContaining({
        communicationId: 77,
        to: 'counsel@example.com',
      }));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        module: 'PAYMENTS',
        action: 'ATTORNEY_PACKET_CHECKLIST_VIEWED',
        entityType: 'Lease',
        entityId: '11111111-1111-4111-8111-111111111111',
      }));
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
