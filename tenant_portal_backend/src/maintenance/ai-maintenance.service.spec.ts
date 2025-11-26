import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIMaintenanceService } from './ai-maintenance.service';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenancePriority } from '@prisma/client';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

describe('AIMaintenanceService', () => {
  let service: AIMaintenanceService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  const mockPrismaService = {
    maintenanceRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    technician: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock OpenAI constructor
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
        AIMaintenanceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AIMaintenanceService>(AIMaintenanceService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Initialization', () => {
    it('should initialize with OpenAI when API key and AI are enabled', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_MAINTENANCE_ENABLED') return 'true';
        return undefined;
      });

      const newService = new AIMaintenanceService(prismaService, configService);
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test-key' });
    });

    it('should initialize in mock mode when API key is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_MAINTENANCE_ENABLED') return 'true';
        return undefined;
      });

      const newService = new AIMaintenanceService(prismaService, configService);
      expect(OpenAI).not.toHaveBeenCalled();
    });

    it('should initialize in mock mode when AI is disabled', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'false';
        return undefined;
      });

      const newService = new AIMaintenanceService(prismaService, configService);
      expect(OpenAI).not.toHaveBeenCalled();
    });
  });

  describe('assignPriorityWithAI', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_MAINTENANCE_ENABLED') return 'true';
        return undefined;
      });
    });

    it('should assign HIGH priority for emergency situations', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'HIGH',
              role: 'assistant',
            },
          },
        ],
      } as any);

      const priority = await service.assignPriorityWithAI(
        'Water leak',
        'Water is leaking from the ceiling',
      );

      expect(priority).toBe(MaintenancePriority.HIGH);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should assign MEDIUM priority for important but not urgent issues', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'MEDIUM',
              role: 'assistant',
            },
          },
        ],
      } as any);

      const priority = await service.assignPriorityWithAI(
        'Broken dishwasher',
        'Dishwasher is not working',
      );

      expect(priority).toBe(MaintenancePriority.MEDIUM);
    });

    it('should assign LOW priority for cosmetic issues', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'LOW',
              role: 'assistant',
            },
          },
        ],
      } as any);

      const priority = await service.assignPriorityWithAI(
        'Paint touch-up',
        'Need to touch up paint in hallway',
      );

      expect(priority).toBe(MaintenancePriority.LOW);
    });

    it('should fallback to keyword-based priority when AI fails', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const priority = await service.assignPriorityWithAI(
        'Water leak',
        'Water is leaking from the ceiling',
      );

      expect(priority).toBe(MaintenancePriority.HIGH); // Fallback should detect "leak"
    });

    it('should use fallback when OpenAI is not available', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AI_ENABLED') return 'false';
        return undefined;
      });

      const newService = new AIMaintenanceService(prismaService, configService);
      const priority = await newService.assignPriorityWithAI(
        'Water leak',
        'Water is leaking',
      );

      expect(priority).toBe(MaintenancePriority.HIGH);
    });
  });

  describe('assignTechnician', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_MAINTENANCE_ENABLED') return 'true';
        return undefined;
      });
    });

    it('should assign technician based on request details', async () => {
      const mockRequest = {
        id: 1,
        title: 'Plumbing issue',
        description: 'Leaky faucet',
        priority: MaintenancePriority.MEDIUM,
        property: {
          latitude: 40.7128,
          longitude: -74.006,
        },
        asset: {
          category: 'PLUMBING',
        },
      };

      const mockTechnicians = [
        {
          id: 1,
          name: 'John Plumber',
          specialties: ['PLUMBING'],
          role: 'VENDOR',
          isAvailable: true,
        },
        {
          id: 2,
          name: 'Jane Electrician',
          specialties: ['ELECTRICAL'],
          role: 'VENDOR',
          isAvailable: true,
        },
      ];

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.technician.findMany.mockResolvedValue(mockTechnicians);

      const result = await service.assignTechnician(1);

      expect(result).toBeDefined();
      expect(result.technician).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(mockPrismaService.maintenanceRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          property: { select: { latitude: true, longitude: true } },
          asset: { select: { category: true } },
        },
      });
    });

    it('should throw error when request not found', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(null);

      await expect(service.assignTechnician(999)).rejects.toThrow('Maintenance request 999 not found');
    });
  });

  describe('predictSLABreach', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_MAINTENANCE_ENABLED') return 'true';
        return undefined;
      });
    });

    it('should predict SLA breach risk', async () => {
      const mockRequest = {
        id: 1,
        priority: MaintenancePriority.HIGH,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        responseDueAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
        status: 'PENDING',
      };

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);

      const prediction = await service.predictSLABreach(1);

      expect(prediction).toBeDefined();
      expect(prediction.probability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeLessThanOrEqual(1);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(prediction.riskLevel);
      expect(prediction.factors).toBeInstanceOf(Array);
      expect(prediction.recommendedActions).toBeInstanceOf(Array);
    });

    it('should return high risk for urgent pending requests', async () => {
      const mockRequest = {
        id: 1,
        priority: MaintenancePriority.HIGH,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        responseDueAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour overdue
        status: 'PENDING',
      };

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);

      const prediction = await service.predictSLABreach(1);

      expect(prediction.riskLevel).toBe('HIGH');
      expect(prediction.probability).toBeGreaterThan(0.7);
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_MAINTENANCE_ENABLED') return 'true';
        return undefined;
      });

      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API Error'),
      );

      // Should not throw, should use fallback
      const priority = await service.assignPriorityWithAI('Test', 'Test description');
      expect(priority).toBeDefined();
    });

    it('should handle network timeouts', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_MAINTENANCE_ENABLED') return 'true';
        return undefined;
      });

      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Network timeout'),
      );

      const priority = await service.assignPriorityWithAI('Test', 'Test');
      expect(priority).toBeDefined();
    });
  });
});

