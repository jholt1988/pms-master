import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Role } from '@prisma/client';
import { testData } from '../../test/factories';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockPaymentsService = {
    createInvoice: jest.fn(),
    getInvoicesForUser: jest.fn(),
    createPayment: jest.fn(),
    getPaymentsForUser: jest.fn(),
    testRentDueReminder: jest.fn(),
    testLateRentNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
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
        id: 1,
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

      const result = await controller.createInvoice(createInvoiceDto);

      expect(result).toEqual(mockInvoice);
      expect(service.createInvoice).toHaveBeenCalledWith(createInvoiceDto);
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
          id: 1,
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
      expect(service.getInvoicesForUser).toHaveBeenCalledWith(1, Role.TENANT, undefined);
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
      expect(service.getInvoicesForUser).toHaveBeenCalledWith(2, Role.PROPERTY_MANAGER, 10);
      expect(service.getInvoicesForUser).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid leaseId', async () => {
      const mockRequest = {
        user: {
          userId: 1,
          role: Role.TENANT,
        },
      } as any;

      await expect(controller.getInvoices(mockRequest, 'invalid')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getInvoices(mockRequest, 'invalid')).rejects.toThrow(
        'leaseId must be a number',
      );
      expect(service.getInvoicesForUser).not.toHaveBeenCalled();
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
        id: 1,
        invoiceId: 1,
        amount: 1500.0,
        method: 'credit_card',
        status: 'COMPLETED',
        transactionId: 'txn_12345',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPaymentsService.createPayment.mockResolvedValue(mockPayment);

      const result = await controller.createPayment(createPaymentDto);

      expect(result).toEqual(mockPayment);
      expect(service.createPayment).toHaveBeenCalledWith(createPaymentDto);
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
          id: 1,
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
      expect(service.getPaymentsForUser).toHaveBeenCalledWith(1, Role.TENANT, undefined);
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
      expect(service.getPaymentsForUser).toHaveBeenCalledWith(3, Role.PROPERTY_MANAGER, 15);
      expect(service.getPaymentsForUser).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid leaseId', async () => {
      const mockRequest = {
        user: {
          userId: 1,
          role: Role.TENANT,
        },
      } as any;

      await expect(controller.getPayments(mockRequest, 'notanumber')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getPayments(mockRequest, 'notanumber')).rejects.toThrow(
        'leaseId must be a number',
      );
      expect(service.getPaymentsForUser).not.toHaveBeenCalled();
    });
  });

  // TODO: Implement testRentReminder endpoint in PaymentsController
  describe.skip('testRentReminder', () => {
    it('should send test rent reminder successfully', async () => {
      const mockResponse = {
        message: 'Test rent reminder sent successfully for invoice 5',
      };

      mockPaymentsService.testRentDueReminder.mockResolvedValue(mockResponse);

      const result = await controller.testRentReminder('5');

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

      const result = await controller.testLateNotice('8');

      expect(result).toEqual(mockResponse);
      expect(service.testLateRentNotification).toHaveBeenCalledWith(8);
      expect(service.testLateRentNotification).toHaveBeenCalledTimes(1);
    });
  });
});
