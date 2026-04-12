import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Role } from '@prisma/client';
import { testData } from '../../test/factories';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../shared/audit-log.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockPaymentsService = {
    createInvoice: jest.fn(),
    getInvoicesForUser: jest.fn(),
    createStripeCheckoutSession: jest.fn(),
    createPayment: jest.fn(),
    getPaymentsForUser: jest.fn(),
    getOperationalLedgerAccount: jest.fn(),
    getDelinquencyQueue: jest.fn(),
    getDelinquencyPriorityConfig: jest.fn(),
    updateDelinquencyPriorityConfig: jest.fn(),
    testRentDueReminder: jest.fn(),
    testLateRentNotification: jest.fn(),
  };

  const mockPrismaService = {
    userOrganization: {
      findMany: jest.fn().mockResolvedValue([{ organizationId: 'org-1', role: 'MEMBER' }]),
    },
  };

  const mockAuditLogService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const createInvoiceDto = {
        description: 'Monthly Rent - December 2024',
        leaseId: 1,
        amount: 1500.0,
        dueDate: '2024-12-01',
      };

      const mockInvoice = {
        id: '1',
        description: 'Monthly Rent - December 2024',
        leaseId: 1,
        amount: 1500.0,
        dueDate: new Date('2024-12-01'),
        status: 'PENDING',
        paidAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPaymentsService.createInvoice.mockResolvedValue(mockInvoice);

      const mockRequest = { user: { userId: 'pm-1', role: Role.PROPERTY_MANAGER }, org: { orgId: 'org-1' } } as any;
      const result = await controller.createInvoice(createInvoiceDto, mockRequest, 'org-1');

      expect(result).toEqual(mockInvoice);
      expect(service.createInvoice).toHaveBeenCalledWith(createInvoiceDto, 'org-1');
      expect(service.createInvoice).toHaveBeenCalledTimes(1);
    });
  });

  describe('getInvoices', () => {
    it('should get invoices for a user without leaseId filter', async () => {
      const mockRequest = {
        user: {
          userId: 1,
          role: Role.TENANT,
        },
      } as any;

      const mockInvoices = [
        {
          id: '1',
          leaseId: 1,
          amount: 1500.0,
          dueDate: new Date('2024-12-01'),
          status: 'PENDING',
          paidAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          leaseId: 1,
          amount: 1500.0,
          dueDate: new Date('2024-11-01'),
          status: 'PAID',
          paidAt: new Date('2024-11-05'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPaymentsService.getInvoicesForUser.mockResolvedValue(mockInvoices);

      const result = await controller.getInvoices(mockRequest);

      expect(result).toEqual(mockInvoices);
      expect(service.getInvoicesForUser).toHaveBeenCalledWith(1, Role.TENANT, undefined, undefined);
      expect(service.getInvoicesForUser).toHaveBeenCalledTimes(1);
    });

    it('should get invoices for a user with leaseId filter', async () => {
      const mockRequest = {
        user: {
          userId: 2,
          role: Role.PROPERTY_MANAGER,
        },
      } as any;

      const mockInvoices = [
        {
          id: 5,
          leaseId: 10,
          amount: 2000.0,
          dueDate: new Date('2024-12-01'),
          status: 'PENDING',
          paidAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPaymentsService.getInvoicesForUser.mockResolvedValue(mockInvoices);

      const result = await controller.getInvoices(mockRequest, '10');

      expect(result).toEqual(mockInvoices);
      expect(service.getInvoicesForUser).toHaveBeenCalledWith(2, Role.PROPERTY_MANAGER, '10', undefined);
      expect(service.getInvoicesForUser).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid leaseId', async () => {
      const mockRequest = {
        user: {
          userId: '1',
          role: Role.TENANT,
        },
      } as any;

      mockPaymentsService.getInvoicesForUser.mockRejectedValue(new BadRequestException('Invalid lease identifier provided.'));

      await expect(controller.getInvoices(mockRequest, 'invalid')).rejects.toThrow(BadRequestException);
      expect(service.getInvoicesForUser).toHaveBeenCalledWith('1', Role.TENANT, 'invalid', undefined);
    });
  });

  describe('createStripeCheckoutSession', () => {
    it('should return the canonical checkout session response shape', async () => {
      const dto = {
        invoiceId: 42,
        successUrl: 'https://app.example.com/payments?success=1',
        cancelUrl: 'https://app.example.com/payments?cancel=1',
      };

      const mockRequest = {
        user: {
          userId: 'tenant-1',
          role: Role.TENANT,
        },
      } as any;

      mockPaymentsService.createStripeCheckoutSession.mockResolvedValue({
        checkoutUrl: 'https://checkout.stripe.test/session_123',
        sessionId: 'cs_test_123',
        invoiceId: 42,
      });

      const result = await controller.createStripeCheckoutSession(dto as any, mockRequest);

      expect(result).toEqual({
        checkoutUrl: 'https://checkout.stripe.test/session_123',
        sessionId: 'cs_test_123',
        invoiceId: 42,
      });
      expect(service.createStripeCheckoutSession).toHaveBeenCalledWith(dto, mockRequest.user, undefined);
    });
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const createPaymentDto = {
        invoiceId: 1,
        leaseId: 1,
        amount: 1500.0,
        method: 'credit_card',
      };

      const mockPayment = {
        id: '1',
        invoiceId: 1,
        amount: 1500.0,
        method: 'credit_card',
        status: 'COMPLETED',
        transactionId: 'txn_12345',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPaymentsService.createPayment.mockResolvedValue(mockPayment);

      const mockRequest = {
        user: {
          userId: 1,
          role: Role.TENANT,
        },
      } as any;

      const result = await controller.createPayment(createPaymentDto, mockRequest);

      expect(result).toEqual(mockPayment);
      expect(service.createPayment).toHaveBeenCalledWith(createPaymentDto, mockRequest.user, undefined);
      expect(service.createPayment).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPayments', () => {
    it('should get payments for a user without leaseId filter', async () => {
      const mockRequest = {
        user: {
          userId: 1,
          role: Role.TENANT,
        },
      } as any;

      const mockPayments = [
        {
          id: '1',
          invoiceId: 1,
          amount: 1500.0,
          method: 'credit_card',
          status: 'COMPLETED',
          transactionId: 'txn_12345',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPaymentsService.getPaymentsForUser.mockResolvedValue(mockPayments);

      const result = await controller.getPayments(mockRequest);

      expect(result).toEqual(mockPayments);
      expect(service.getPaymentsForUser).toHaveBeenCalledWith(1, Role.TENANT, undefined, undefined);
      expect(service.getPaymentsForUser).toHaveBeenCalledTimes(1);
    });

    it('should get payments for a user with leaseId filter', async () => {
      const mockRequest = {
        user: {
          userId: 3,
          role: Role.PROPERTY_MANAGER,
        },
      } as any;

      const mockPayments = [
        {
          id: 10,
          invoiceId: 5,
          amount: 2500.0,
          method: 'bank_transfer',
          status: 'COMPLETED',
          transactionId: 'txn_98765',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPaymentsService.getPaymentsForUser.mockResolvedValue(mockPayments);

      const result = await controller.getPayments(mockRequest, '15');

      expect(result).toEqual(mockPayments);
      expect(service.getPaymentsForUser).toHaveBeenCalledWith(3, Role.PROPERTY_MANAGER, '15', undefined);
      expect(service.getPaymentsForUser).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid leaseId', async () => {
      const mockRequest = {
        user: {
          userId: '1',
          role: Role.TENANT,
        },
      } as any;

      mockPaymentsService.getPaymentsForUser.mockRejectedValue(new BadRequestException('Invalid lease identifier provided.'));

      await expect(controller.getPayments(mockRequest, 'notanumber')).rejects.toThrow(BadRequestException);
      expect(service.getPaymentsForUser).toHaveBeenCalledWith('1', Role.TENANT, 'notanumber', undefined);
    });
  });

  describe('getLedgerAccount', () => {
    it('should return operational ledger account payload', async () => {
      const mockRequest = {
        user: {
          userId: 'tenant-1',
          role: Role.TENANT,
        },
        org: {
          orgId: 'org-1',
        },
      } as any;

      const ledgerPayload = {
        leaseId: '11111111-1111-4111-8111-111111111111',
        tenantId: 'tenant-1',
        propertyId: 'property-1',
        unitId: 'unit-1',
        currency: 'USD',
        currentBalanceCents: 250000,
        entryCount: 3,
        entries: [
          {
            id: 'entry-1',
            kind: 'charge',
            source: 'invoice',
            occurredAt: new Date().toISOString(),
            amountCents: 300000,
            signedAmountCents: 300000,
            runningBalanceCents: 300000,
            description: 'Invoice #1',
          },
        ],
      };

      mockPaymentsService.getOperationalLedgerAccount.mockResolvedValue(ledgerPayload);

      const result = await controller.getLedgerAccount('11111111-1111-4111-8111-111111111111', mockRequest);

      expect(result).toEqual(ledgerPayload);
      expect(service.getOperationalLedgerAccount).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        mockRequest.user,
        'org-1',
      );
    });
  });

  describe('getDelinquencyQueue', () => {
    it('should return delinquency queue with filters', async () => {
      const mockRequest = {
        user: {
          userId: 'pm-1',
          role: Role.PROPERTY_MANAGER,
        },
        org: {
          orgId: 'org-1',
        },
      } as any;

      const queuePayload = {
        generatedAt: new Date().toISOString(),
        count: 1,
        bucket: '8_30',
        items: [
          {
            leaseId: '11111111-1111-4111-8111-111111111111',
            tenantId: 'tenant-1',
            tenantName: 'Tenant One',
            amountDueCents: 120000,
            daysPastDue: 12,
            bucket: '8_30',
            invoiceIds: [1, 2],
          },
        ],
      };

      mockPaymentsService.getDelinquencyQueue.mockResolvedValue(queuePayload);

      const result = await controller.getDelinquencyQueue(
        mockRequest,
        '8_30',
        'property-1',
        '50',
        '10',
        'priorityScore',
        'desc',
      );

      expect(result).toEqual(queuePayload);
      expect(service.getDelinquencyQueue).toHaveBeenCalledWith({
        orgId: 'org-1',
        bucket: '8_30',
        propertyId: 'property-1',
        limit: 50,
        offset: 10,
        sortBy: 'priorityScore',
        sortOrder: 'desc',
      });
    });
  });

  describe('delinquency priority config', () => {
    it('gets delinquency priority config for org', async () => {
      const payload = { orgId: 'org-1', daysWeight: 1, amountWeight: 1, source: 'env_default' };
      mockPaymentsService.getDelinquencyPriorityConfig.mockResolvedValue(payload);

      const result = await controller.getDelinquencyPriorityConfig('org-1');
      expect(result).toEqual(payload);
      expect(service.getDelinquencyPriorityConfig).toHaveBeenCalledWith('org-1');
    });

    it('updates delinquency priority config for org', async () => {
      const payload = { orgId: 'org-1', daysWeight: 2, amountWeight: 3, source: 'org_override' };
      mockPaymentsService.updateDelinquencyPriorityConfig.mockResolvedValue(payload);
      const req = { user: { userId: 'admin-1' } } as any;

      const result = await controller.updateDelinquencyPriorityConfig('org-1', { daysWeight: 2, amountWeight: 3 } as any, req);
      expect(result).toEqual(payload);
      expect(service.updateDelinquencyPriorityConfig).toHaveBeenCalledWith('org-1', 2, 3);
      expect(mockAuditLogService.record).toHaveBeenCalled();
    });
  });

  // TODO: Implement testRentReminder endpoint in PaymentsController
  describe.skip('testRentReminder', () => {
    it('should send test rent reminder successfully', async () => {
      const mockResponse = {
        message: 'Test rent reminder sent successfully for invoice 5',
      };

      mockPaymentsService.testRentDueReminder.mockResolvedValue(mockResponse);

      const result = await (controller as any).testRentReminder('5');

      expect(result).toEqual(mockResponse);
      expect(service.testRentDueReminder).toHaveBeenCalledWith(5);
      expect(service.testRentDueReminder).toHaveBeenCalledTimes(1);
    });
  });

  // TODO: Implement testLateNotice endpoint in PaymentsController
  describe.skip('testLateNotice', () => {
    it('should send test late notice successfully', async () => {
      const mockResponse = {
        message: 'Test late rent notification sent successfully for invoice 8',
      };

      mockPaymentsService.testLateRentNotification.mockResolvedValue(mockResponse);

      const result = await (controller as any).testLateNotice('8');

      expect(result).toEqual(mockResponse);
      expect(service.testLateRentNotification).toHaveBeenCalledWith(8);
      expect(service.testLateRentNotification).toHaveBeenCalledTimes(1);
    });
  });
});
