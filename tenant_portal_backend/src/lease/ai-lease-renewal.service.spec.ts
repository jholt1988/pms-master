import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AILeaseRenewalService } from './ai-lease-renewal.service';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

jest.mock('openai');

describe('AILeaseRenewalService', () => {
  let service: AILeaseRenewalService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  const mockPrismaService = {
    lease: {
      findUnique: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    maintenanceRequest: {
      findMany: jest.fn(),
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
        AILeaseRenewalService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AILeaseRenewalService>(AILeaseRenewalService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Initialization', () => {
    it('should initialize with OpenAI when API key and AI are enabled', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_LEASE_RENEWAL_ENABLED') return 'true';
        if (key === 'ML_SERVICE_URL') return 'http://localhost:8000';
        return undefined;
      });

      const newService = new AILeaseRenewalService(prismaService, configService);
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test-key' });
    });

    it('should initialize in mock mode when API key is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_LEASE_RENEWAL_ENABLED') return 'true';
        return undefined;
      });

      const newService = new AILeaseRenewalService(prismaService, configService);
      expect(OpenAI).not.toHaveBeenCalled();
    });
  });

  describe('predictRenewalLikelihood', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_LEASE_RENEWAL_ENABLED') return 'true';
        if (key === 'ML_SERVICE_URL') return 'http://localhost:8000';
        return undefined;
      });
    });

    it('should predict renewal likelihood for lease', async () => {
      const mockLease = {
        id: 1,
        tenantId: 1,
        rentAmount: 1500,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
      };

      const mockPayments = [
        { amount: 1500, paymentDate: new Date('2024-01-01'), status: 'COMPLETED' },
        { amount: 1500, paymentDate: new Date('2024-02-01'), status: 'COMPLETED' },
      ];

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const prediction = await service.predictRenewalLikelihood(1);

      expect(prediction).toBeDefined();
      expect(prediction.renewalProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.renewalProbability).toBeLessThanOrEqual(1);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(prediction.confidence);
      expect(prediction.factors).toBeInstanceOf(Array);
    });

    it('should return high probability for good tenants', async () => {
      const mockLease = {
        id: 1,
        tenantId: 1,
        rentAmount: 1500,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
      };

      // All payments on time
      const mockPayments = Array.from({ length: 12 }, (_, i) => ({
        amount: 1500,
        paymentDate: new Date(`2024-${String(i + 1).padStart(2, '0')}-01`),
        status: 'COMPLETED',
      }));

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      const prediction = await service.predictRenewalLikelihood(1);

      expect(prediction.renewalProbability).toBeGreaterThan(0.5);
    });

    it('should return low probability for problematic tenants', async () => {
      const mockLease = {
        id: 1,
        tenantId: 1,
        rentAmount: 1500,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
      };

      // Late payments
      const mockPayments = [
        { amount: 1500, paymentDate: new Date('2024-01-15'), status: 'COMPLETED' }, // Late
        { amount: 1500, paymentDate: new Date('2024-02-20'), status: 'COMPLETED' }, // Late
      ];

      const mockMaintenanceRequests = [
        { id: 1, status: 'PENDING', priority: 'HIGH' },
        { id: 2, status: 'PENDING', priority: 'HIGH' },
      ];

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue(mockMaintenanceRequests);

      const prediction = await service.predictRenewalLikelihood(1);

      expect(prediction.renewalProbability).toBeLessThan(0.5);
    });
  });

  describe('getOptimalRentAdjustment', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_LEASE_RENEWAL_ENABLED') return 'true';
        if (key === 'ML_SERVICE_URL') return 'http://localhost:8000';
        return undefined;
      });
    });

    it('should calculate optimal rent adjustment', async () => {
      const mockLease = {
        id: 1,
        tenantId: 1,
        rentAmount: 1500,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      const adjustment = await service.getOptimalRentAdjustment(1);

      expect(adjustment).toBeDefined();
      expect(adjustment.recommendedRent).toBeGreaterThan(0);
      expect(adjustment.adjustmentPercentage).toBeDefined();
      expect(adjustment.reasoning).toBeDefined();
      expect(adjustment.factors).toBeInstanceOf(Array);
    });

    it('should suggest reasonable rent increase', async () => {
      const mockLease = {
        id: 1,
        tenantId: 1,
        rentAmount: 1500,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      const adjustment = await service.getOptimalRentAdjustment(1);

      // Should be between 0% and 10% typically
      expect(adjustment.adjustmentPercentage).toBeGreaterThanOrEqual(0);
      expect(adjustment.adjustmentPercentage).toBeLessThanOrEqual(10);
    });
  });

  describe('generatePersonalizedRenewalOffer', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_LEASE_RENEWAL_ENABLED') return 'true';
        if (key === 'ML_SERVICE_URL') return 'http://localhost:8000';
        return undefined;
      });
    });

    it('should generate personalized renewal offer', async () => {
      const mockLease = {
        id: 1,
        tenantId: 1,
        rentAmount: 1500,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      const offer = await service.generatePersonalizedRenewalOffer(1);

      expect(offer).toBeDefined();
      expect(offer.baseRent).toBeGreaterThan(0);
      expect(offer.message).toBeDefined();
      expect(offer.incentives).toBeInstanceOf(Array);
      expect(offer.expirationDate).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing lease gracefully', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(null);

      await expect(service.predictRenewalLikelihood(999)).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_LEASE_RENEWAL_ENABLED') return 'true';
        return undefined;
      });

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const mockLease = {
        id: 1,
        tenantId: 1,
        rentAmount: 1500,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);

      // Should use fallback logic
      const prediction = await service.predictRenewalLikelihood(1);
      expect(prediction).toBeDefined();
      expect(prediction.renewalProbability).toBeDefined();
    });
  });
});

