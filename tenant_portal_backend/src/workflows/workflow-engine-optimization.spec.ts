import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowMetricsService } from './workflow-metrics.service';
import { WorkflowCacheService } from './workflow-cache.service';
import { WorkflowRateLimiterService } from './workflow-rate-limiter.service';
import { WorkflowErrorCode } from './workflow.errors';

describe('WorkflowEngineService - Optimizations', () => {
  let service: WorkflowEngineService;
  let prisma: PrismaService;
  let cacheService: WorkflowCacheService;
  let rateLimiter: WorkflowRateLimiterService;

  const mockPrisma = {
    workflowExecution: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    workflowExecutionStep: {
      upsert: jest.fn(),
    },
    deadLetterQueue: {
      create: jest.fn(),
    },
    maintenanceRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: WorkflowMetricsService,
          useValue: {
            recordMetric: jest.fn(),
          },
        },
        {
          provide: WorkflowCacheService,
          useValue: {
            getWorkflow: jest.fn(),
            setWorkflow: jest.fn(),
            getAIResponse: jest.fn(),
            setAIResponse: jest.fn(),
            generateAIResponseKey: jest.fn(),
          },
        },
        {
          provide: WorkflowRateLimiterService,
          useValue: {
            checkRateLimit: jest.fn(),
            generateUserKey: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheService = module.get<WorkflowCacheService>(WorkflowCacheService);
    rateLimiter = module.get<WorkflowRateLimiterService>(WorkflowRateLimiterService);

    jest.clearAllMocks();
  });

  describe('Caching', () => {
    it('should use cached workflow definition', async () => {
      const mockWorkflow = {
        id: 'test-workflow',
        name: 'Test',
        description: 'Test',
        steps: [],
      };

      (cacheService.getWorkflow as jest.Mock).mockReturnValue(mockWorkflow);
      (rateLimiter.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetAt: Date.now() + 60000,
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'PROPERTY_MANAGER' });

      await service.executeWorkflow('test-workflow', {}, 1);

      expect(cacheService.getWorkflow).toHaveBeenCalledWith('test-workflow');
      expect(cacheService.setWorkflow).not.toHaveBeenCalled(); // Should not set if already cached
    });

    it('should cache workflow definition after first lookup', async () => {
      (cacheService.getWorkflow as jest.Mock).mockReturnValue(null);
      (rateLimiter.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetAt: Date.now() + 60000,
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'PROPERTY_MANAGER' });

      // Register a workflow first
      service.registerWorkflow({
        id: 'test-workflow',
        name: 'Test',
        description: 'Test',
        steps: [],
      });

      await service.executeWorkflow('test-workflow', {}, 1);

      expect(cacheService.setWorkflow).toHaveBeenCalled();
    });

    it('should cache AI responses', async () => {
      const cacheKey = 'ai:test:method:params';
      (cacheService.generateAIResponseKey as jest.Mock).mockReturnValue(cacheKey);
      (cacheService.getAIResponse as jest.Mock).mockReturnValue({ priority: 'HIGH' });
      (rateLimiter.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetAt: Date.now() + 60000,
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'PROPERTY_MANAGER' });
      (mockPrisma.maintenanceRequest.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        title: 'Test',
        description: 'Test',
      });

      service.registerWorkflow({
        id: 'test-workflow',
        name: 'Test',
        description: 'Test',
        steps: [
          {
            id: 'assign-priority',
            type: 'ASSIGN_PRIORITY_AI',
            input: { requestId: 1 },
          },
        ],
      });

      await service.executeWorkflow('test-workflow', { requestId: 1 }, 1);

      expect(cacheService.getAIResponse).toHaveBeenCalledWith(cacheKey);
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limit before execution', async () => {
      (rateLimiter.generateUserKey as jest.Mock).mockReturnValue('workflow:1:test-workflow');
      (rateLimiter.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetAt: Date.now() + 60000,
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'PROPERTY_MANAGER' });

      await service.executeWorkflow('test-workflow', {}, 1);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalled();
    });

    it('should reject execution when rate limit exceeded', async () => {
      (rateLimiter.generateUserKey as jest.Mock).mockReturnValue('workflow:1:test-workflow');
      (rateLimiter.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'PROPERTY_MANAGER' });

      await expect(service.executeWorkflow('test-workflow', {}, 1)).rejects.toThrow();

      expect(rateLimiter.checkRateLimit).toHaveBeenCalled();
    });
  });

  describe('Parallel Execution', () => {
    it('should execute independent steps in parallel', async () => {
      const step1Start = Date.now();
      const step2Start = Date.now();

      let step1Executed = false;
      let step2Executed = false;

      service.registerWorkflow({
        id: 'parallel-workflow',
        name: 'Parallel Test',
        description: 'Test',
        steps: [
          {
            id: 'step1',
            type: 'CUSTOM',
            handler: async () => {
              step1Executed = true;
              await new Promise((resolve) => setTimeout(resolve, 100));
              return { result: 'step1' };
            },
          },
          {
            id: 'step2',
            type: 'CUSTOM',
            handler: async () => {
              step2Executed = true;
              await new Promise((resolve) => setTimeout(resolve, 100));
              return { result: 'step2' };
            },
          },
        ],
      });

      (rateLimiter.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetAt: Date.now() + 60000,
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'PROPERTY_MANAGER' });

      const startTime = Date.now();
      await service.executeWorkflow('parallel-workflow', {}, 1);
      const duration = Date.now() - startTime;

      // Both steps should execute
      expect(step1Executed).toBe(true);
      expect(step2Executed).toBe(true);

      // Should take ~100ms (parallel) not ~200ms (sequential)
      expect(duration).toBeLessThan(150);
    });

    it('should execute dependent steps sequentially', async () => {
      service.registerWorkflow({
        id: 'sequential-workflow',
        name: 'Sequential Test',
        description: 'Test',
        steps: [
          {
            id: 'step1',
            type: 'CUSTOM',
            handler: async () => {
              await new Promise((resolve) => setTimeout(resolve, 50));
              return { result: 'step1' };
            },
          },
          {
            id: 'step2',
            type: 'CUSTOM',
            dependsOn: ['step1'],
            handler: async () => {
              await new Promise((resolve) => setTimeout(resolve, 50));
              return { result: 'step2' };
            },
          },
        ],
      });

      (rateLimiter.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetAt: Date.now() + 60000,
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'PROPERTY_MANAGER' });

      const startTime = Date.now();
      await service.executeWorkflow('sequential-workflow', {}, 1);
      const duration = Date.now() - startTime;

      // Should take ~100ms (sequential)
      expect(duration).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Query Optimizations', () => {
    it('should use single query with includes for related data', async () => {
      const mockRequest = {
        id: 1,
        title: 'Test',
        property: { latitude: 40.7128, longitude: -74.0060 },
        asset: { category: 'HVAC' },
        technician: { id: 1, name: 'John' },
      };

      (mockPrisma.maintenanceRequest.findUnique as jest.Mock).mockResolvedValue(mockRequest);
      (rateLimiter.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetAt: Date.now() + 60000,
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'PROPERTY_MANAGER' });

      service.registerWorkflow({
        id: 'test-workflow',
        name: 'Test',
        description: 'Test',
        steps: [
          {
            id: 'assign-technician',
            type: 'ASSIGN_TECHNICIAN',
            input: { requestId: 1 },
          },
        ],
      });

      await service.executeWorkflow('test-workflow', { requestId: 1 }, 1);

      // Should call findUnique once with include
      expect(mockPrisma.maintenanceRequest.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.maintenanceRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.objectContaining({
          property: expect.any(Object),
          asset: expect.any(Object),
          technician: expect.any(Object),
        }),
      });
    });
  });
});

