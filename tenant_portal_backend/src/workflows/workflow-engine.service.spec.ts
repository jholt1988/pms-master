import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowEngineService } from './workflow-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { AIMaintenanceService } from '../maintenance/ai-maintenance.service';
import { AIPaymentService } from '../payments/ai-payment.service';
import { AILeaseRenewalService } from '../lease/ai-lease-renewal.service';
import { AINotificationService } from '../notifications/ai-notification.service';
import { WorkflowMetricsService } from './workflow-metrics.service';
import { WorkflowCacheService } from './workflow-cache.service';
import { WorkflowRateLimiterService } from './workflow-rate-limiter.service';
import { WorkflowStep, WorkflowExecution } from './workflow.types';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let prismaService: PrismaService;
  let aiMaintenanceService: AIMaintenanceService;
  let aiPaymentService: AIPaymentService;
  let aiLeaseRenewalService: AILeaseRenewalService;
  let aiNotificationService: AINotificationService;

  const mockPrismaService = {
    maintenanceRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
    },
    lease: {
      findUnique: jest.fn(),
    },
  };

  const mockAIMaintenanceService = {
    assignPriorityWithAI: jest.fn(),
  };

  const mockAIPaymentService = {
    assessPaymentRisk: jest.fn(),
  };

  const mockAILeaseRenewalService = {
    predictRenewalLikelihood: jest.fn(),
  };

  const mockAINotificationService = {
    customizeNotificationContent: jest.fn(),
  };

  const mockWorkflowMetricsService = {
    recordWorkflowExecution: jest.fn(),
    recordStepExecution: jest.fn(),
  };

  const mockWorkflowCacheService = {
    generateAIResponseKey: jest.fn(),
    getAIResponse: jest.fn(),
    setAIResponse: jest.fn(),
    clearExpiredEntries: jest.fn(),
  };

  const mockWorkflowRateLimiterService = {
    checkRateLimit: jest.fn(),
    clearExpiredEntries: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AIMaintenanceService, useValue: mockAIMaintenanceService },
        { provide: AIPaymentService, useValue: mockAIPaymentService },
        { provide: AILeaseRenewalService, useValue: mockAILeaseRenewalService },
        { provide: AINotificationService, useValue: mockAINotificationService },
        { provide: WorkflowMetricsService, useValue: mockWorkflowMetricsService },
        { provide: WorkflowCacheService, useValue: mockWorkflowCacheService },
        { provide: WorkflowRateLimiterService, useValue: mockWorkflowRateLimiterService },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
    prismaService = module.get<PrismaService>(PrismaService);
    aiMaintenanceService = module.get<AIMaintenanceService>(AIMaintenanceService);
    aiPaymentService = module.get<AIPaymentService>(AIPaymentService);
    aiLeaseRenewalService = module.get<AILeaseRenewalService>(AILeaseRenewalService);
    aiNotificationService = module.get<AINotificationService>(AINotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeAssignPriorityAI', () => {
    it('should assign priority using AI service', async () => {
      const step: WorkflowStep = {
        id: 'step1',
        type: 'ASSIGN_PRIORITY_AI',
        input: { requestId: 1 },
      };

      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: {},
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        id: 1,
        title: 'Test Request',
        description: 'Test Description',
      });

      mockAIMaintenanceService.assignPriorityWithAI.mockResolvedValue('HIGH');

      mockWorkflowCacheService.generateAIResponseKey.mockReturnValue('cache-key');
      mockWorkflowCacheService.getAIResponse.mockReturnValue(null);

      mockPrismaService.maintenanceRequest.update.mockResolvedValue({ id: 1, priority: 'HIGH' });

      // Access private method via reflection or test through executeWorkflow
      // For now, we'll test the behavior through workflow execution
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test',
        steps: [step],
      };

      service.registerWorkflow(workflow);

      // Mock the AI service call
      const result = await service['executeAssignPriorityAI'](step, execution, 1, 'corr1');

      expect(result.priority).toBe('HIGH');
      expect(mockAIMaintenanceService.assignPriorityWithAI).toHaveBeenCalledWith(
        'Test Request',
        'Test Description',
      );
      expect(mockPrismaService.maintenanceRequest.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { priority: 'HIGH' },
      });
    });

    it('should use cached priority if available', async () => {
      const step: WorkflowStep = {
        id: 'step1',
        type: 'ASSIGN_PRIORITY_AI',
        input: { requestId: 1 },
      };

      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: {},
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        id: 1,
        title: 'Test Request',
        description: 'Test Description',
      });

      mockWorkflowCacheService.generateAIResponseKey.mockReturnValue('cache-key');
      mockWorkflowCacheService.getAIResponse.mockReturnValue('MEDIUM');

      const result = await service['executeAssignPriorityAI'](step, execution, 1, 'corr1');

      expect(result.priority).toBe('MEDIUM');
      expect(mockAIMaintenanceService.assignPriorityWithAI).not.toHaveBeenCalled();
    });

    it('should return fallback if AI service not available', async () => {
      const moduleWithoutAI: TestingModule = await Test.createTestingModule({
        providers: [
          WorkflowEngineService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: AIMaintenanceService, useValue: null },
          { provide: WorkflowMetricsService, useValue: mockWorkflowMetricsService },
          { provide: WorkflowCacheService, useValue: mockWorkflowCacheService },
          { provide: WorkflowRateLimiterService, useValue: mockWorkflowRateLimiterService },
        ],
      }).compile();

      const serviceWithoutAI = moduleWithoutAI.get<WorkflowEngineService>(WorkflowEngineService);

      const step: WorkflowStep = {
        id: 'step1',
        type: 'ASSIGN_PRIORITY_AI',
        input: { requestId: 1 },
      };

      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: {},
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      const result = await serviceWithoutAI['executeAssignPriorityAI'](step, execution, 1, 'corr1');

      expect(result.priority).toBe('MEDIUM');
      expect(result.note).toBe('AI service not available');
    });
  });

  describe('executeAssessPaymentRiskAI', () => {
    it('should assess payment risk using AI service', async () => {
      const step: WorkflowStep = {
        id: 'step1',
        type: 'ASSESS_PAYMENT_RISK_AI',
        input: { tenantId: 1, invoiceId: 1 },
      };

      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: {},
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      mockAIPaymentService.assessPaymentRisk.mockResolvedValue({
        riskLevel: 'HIGH',
        riskScore: 0.8,
        factors: ['Late payments'],
        recommendedActions: ['Monitor closely'],
        suggestPaymentPlan: true,
        paymentPlanSuggestion: { installments: 3 },
      });

      const result = await service['executeAssessPaymentRiskAI'](step, execution, 1, 'corr1');

      expect(result.riskLevel).toBe('HIGH');
      expect(result.riskScore).toBe(0.8);
      expect(mockAIPaymentService.assessPaymentRisk).toHaveBeenCalledWith(1, 1);
    });

    it('should return fallback if AI service not available', async () => {
      const moduleWithoutAI: TestingModule = await Test.createTestingModule({
        providers: [
          WorkflowEngineService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: AIPaymentService, useValue: null },
          { provide: WorkflowMetricsService, useValue: mockWorkflowMetricsService },
          { provide: WorkflowCacheService, useValue: mockWorkflowCacheService },
          { provide: WorkflowRateLimiterService, useValue: mockWorkflowRateLimiterService },
        ],
      }).compile();

      const serviceWithoutAI = moduleWithoutAI.get<WorkflowEngineService>(WorkflowEngineService);

      const step: WorkflowStep = {
        id: 'step1',
        type: 'ASSESS_PAYMENT_RISK_AI',
        input: { tenantId: 1, invoiceId: 1 },
      };

      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: {},
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      const result = await serviceWithoutAI['executeAssessPaymentRiskAI'](step, execution, 1, 'corr1');

      expect(result.riskLevel).toBe('MEDIUM');
      expect(result.riskScore).toBe(0.5);
      expect(result.note).toBe('AI service not available');
    });
  });

  describe('executePredictRenewalAI', () => {
    it('should predict renewal likelihood using AI service', async () => {
      const step: WorkflowStep = {
        id: 'step1',
        type: 'PREDICT_RENEWAL_AI',
        input: { leaseId: 1 },
      };

      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: {},
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      mockAILeaseRenewalService.predictRenewalLikelihood.mockResolvedValue({
        probability: 0.75,
        confidence: 'HIGH',
        factors: ['Good payment history'],
      });

      const result = await service['executePredictRenewalAI'](step, execution, 1, 'corr1');

      expect(result.renewalProbability).toBe(0.75);
      expect(result.confidence).toBe('HIGH');
      expect(mockAILeaseRenewalService.predictRenewalLikelihood).toHaveBeenCalledWith(1);
    });

    it('should return fallback if AI service not available', async () => {
      const moduleWithoutAI: TestingModule = await Test.createTestingModule({
        providers: [
          WorkflowEngineService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: AILeaseRenewalService, useValue: null },
          { provide: WorkflowMetricsService, useValue: mockWorkflowMetricsService },
          { provide: WorkflowCacheService, useValue: mockWorkflowCacheService },
          { provide: WorkflowRateLimiterService, useValue: mockWorkflowRateLimiterService },
        ],
      }).compile();

      const serviceWithoutAI = moduleWithoutAI.get<WorkflowEngineService>(WorkflowEngineService);

      const step: WorkflowStep = {
        id: 'step1',
        type: 'PREDICT_RENEWAL_AI',
        input: { leaseId: 1 },
      };

      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: {},
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      const result = await serviceWithoutAI['executePredictRenewalAI'](step, execution, 1, 'corr1');

      expect(result.renewalProbability).toBe(0.5);
      expect(result.confidence).toBe('LOW');
      expect(result.note).toBe('AI service not available');
    });
  });

  describe('executePersonalizeNotificationAI', () => {
    it('should personalize notification using AI service', async () => {
      const step: WorkflowStep = {
        id: 'step1',
        type: 'PERSONALIZE_NOTIFICATION_AI',
        input: { userId: 1, notificationType: 'RENT_REMINDER', message: 'Original message' },
      };

      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: {},
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      mockAINotificationService.customizeNotificationContent.mockResolvedValue('Personalized message');

      const result = await service['executePersonalizeNotificationAI'](step, execution, 1, 'corr1');

      expect(result.personalizedMessage).toBe('Personalized message');
      expect(mockAINotificationService.customizeNotificationContent).toHaveBeenCalledWith(
        1,
        'RENT_REMINDER',
        'Original message',
      );
    });

    it('should return original message if AI service not available', async () => {
      const moduleWithoutAI: TestingModule = await Test.createTestingModule({
        providers: [
          WorkflowEngineService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: AINotificationService, useValue: null },
          { provide: WorkflowMetricsService, useValue: mockWorkflowMetricsService },
          { provide: WorkflowCacheService, useValue: mockWorkflowCacheService },
          { provide: WorkflowRateLimiterService, useValue: mockWorkflowRateLimiterService },
        ],
      }).compile();

      const serviceWithoutAI = moduleWithoutAI.get<WorkflowEngineService>(WorkflowEngineService);

      const step: WorkflowStep = {
        id: 'step1',
        type: 'PERSONALIZE_NOTIFICATION_AI',
        input: { userId: 1, notificationType: 'RENT_REMINDER', message: 'Original message' },
      };

      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: {},
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      const result = await serviceWithoutAI['executePersonalizeNotificationAI'](step, execution, 1, 'corr1');

      expect(result.personalizedMessage).toBe('Original message');
      expect(result.note).toBe('AI service not available');
    });
  });
});

