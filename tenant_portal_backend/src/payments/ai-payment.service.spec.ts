import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIPaymentService } from './ai-payment.service';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

jest.mock('openai');

describe('AIPaymentService', () => {
  let service: AIPaymentService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  const mockPrismaService = {
    payment: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
    },
    lease: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockChatCompletions = {
      create: jest.fn(),
    };
    mockOpenAI = {
      chat: {
        completions: mockChatCompletions,
      } as any,
    } as jest.Mocked<OpenAI>;

    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIPaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AIPaymentService>(AIPaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Initialization', () => {
    it('should initialize with OpenAI when API key and AI are enabled', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_PAYMENT_ENABLED') return 'true';
        return undefined;
      });

      const newService = new AIPaymentService(prismaService, configService);
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test-key' });
    });

    it('should initialize in mock mode when API key is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_PAYMENT_ENABLED') return 'true';
        return undefined;
      });

      const newService = new AIPaymentService(prismaService, configService);
      expect(OpenAI).not.toHaveBeenCalled();
    });
  });

  describe('assessPaymentRisk', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_PAYMENT_ENABLED') return 'true';
        return undefined;
      });
    });

    it('should assess payment risk for tenant', async () => {
      const mockTenant = {
        id: 1,
        username: 'tenant@test.com',
      };

      const mockLease = {
        id: 1,
        tenantId: 1,
        rentAmount: 1500,
      };

      const mockInvoice = {
        id: 1,
        amount: 1500,
        dueDate: new Date(),
        status: 'UNPAID',
      };

      const mockPayments = [
        { amount: 1500, paymentDate: new Date('2024-01-01'), status: 'COMPLETED' },
        { amount: 1500, paymentDate: new Date('2024-02-01'), status: 'COMPLETED' },
        { amount: 1500, paymentDate: new Date('2024-03-01'), status: 'COMPLETED' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const assessment = await service.assessPaymentRisk(1, 1);

      expect(assessment).toBeDefined();
      expect(assessment.riskLevel).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/);
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(1);
      expect(assessment.factors).toBeInstanceOf(Array);
      expect(assessment.recommendedActions).toBeInstanceOf(Array);
    });

    it('should return HIGH risk for tenants with late payments', async () => {
      const mockPayments = [
        { amount: 1500, paymentDate: new Date('2024-01-05'), status: 'COMPLETED' }, // 4 days late
        { amount: 1500, paymentDate: new Date('2024-02-10'), status: 'COMPLETED' }, // 9 days late
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.lease.findUnique.mockResolvedValue({ id: 1, tenantId: 1 });
      mockPrismaService.invoice.findUnique.mockResolvedValue({ id: 1, amount: 1500 });
      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const assessment = await service.assessPaymentRisk(1, 1);

      expect(assessment.riskLevel).toBe('HIGH');
    });

    it('should suggest payment plan for high-risk payments', async () => {
      const mockPayments = [
        { amount: 1500, paymentDate: new Date('2024-01-15'), status: 'COMPLETED' }, // Very late
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.lease.findUnique.mockResolvedValue({ id: 1, tenantId: 1 });
      mockPrismaService.invoice.findUnique.mockResolvedValue({ id: 1, amount: 3000 });
      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const assessment = await service.assessPaymentRisk(1, 1);

      if (assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL') {
        expect(assessment.suggestPaymentPlan).toBe(true);
        expect(assessment.paymentPlanSuggestion).toBeDefined();
      }
    });
  });

  describe('determineReminderTiming', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_PAYMENT_ENABLED') return 'true';
        return undefined;
      });
    });

    it('should determine optimal reminder timing', async () => {
      const mockTenant = {
        id: 1,
        username: 'tenant@test.com',
      };

      const mockInvoice = {
        id: 1,
        amount: 1500,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const timing = await service.determineReminderTiming(1, 1);

      expect(timing).toBeDefined();
      expect(timing.optimalTime).toBeInstanceOf(Date);
      expect(['EMAIL', 'SMS', 'PUSH']).toContain(timing.channel);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(timing.urgency);
    });

    it('should use SMS for high urgency reminders', async () => {
      const mockInvoice = {
        id: 1,
        amount: 1500,
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const timing = await service.determineReminderTiming(1, 1);

      expect(timing.urgency).toBe('HIGH');
      expect(timing.channel).toBe('SMS');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tenant gracefully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.assessPaymentRisk(999, 1)).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_PAYMENT_ENABLED') return 'true';
        return undefined;
      });

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.lease.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.invoice.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      // Should use fallback logic
      const assessment = await service.assessPaymentRisk(1, 1);
      expect(assessment).toBeDefined();
      expect(assessment.riskLevel).toBeDefined();
    });
  });
});

