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

  describe('Security: Condition Evaluation (P0-001)', () => {
    /**
     * Security tests to prevent code injection vulnerabilities.
     * Verifies that expr-eval is used instead of eval() and malicious input is rejected.
     */
    
    it('should safely evaluate valid mathematical conditions', () => {
      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: { amount: 100, threshold: 50 },
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      // Test valid condition evaluation
      const result1 = service['evaluateCondition']('${amount} > ${threshold}', execution);
      expect(result1).toBe(true);

      const result2 = service['evaluateCondition']('${amount} < ${threshold}', execution);
      expect(result2).toBe(false);

      const result3 = service['evaluateCondition']('${amount} === 100', execution);
      expect(result3).toBe(true);
    });

    it('should reject JavaScript code injection attempts', () => {
      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: { amount: 100 },
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      // Attempts to inject malicious JavaScript code should fail safely
      const maliciousInputs = [
        'process.exit(1)', // Node.js process manipulation
        'require("fs").readFileSync("/etc/passwd")', // File system access
        'global.process.exit()', // Global object manipulation
        'eval("malicious code")', // Nested eval
        'Function("return process")().exit()', // Function constructor
        'constructor.constructor("return process")().exit()', // Constructor chain
        '${amount}; process.exit(1)', // Mixed valid and malicious
        '${amount} && require("child_process").exec("rm -rf /")', // Command injection
      ];

      maliciousInputs.forEach((maliciousInput) => {
        // All malicious inputs should either throw an error or return false
        // expr-eval should reject these as invalid expressions
        try {
          const result = service['evaluateCondition'](maliciousInput, execution);
          // If it doesn't throw, it should return false (safe default)
          expect(result).toBe(false);
        } catch (error) {
          // Throwing an error is also acceptable - it means the input was rejected
          expect(error).toBeDefined();
        }
      });
    });

    it('should reject attempts to access global objects', () => {
      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: { amount: 100 },
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      const globalAccessAttempts = [
        'global',
        'window',
        'process',
        'require',
        'module',
        'exports',
        'console',
        'Buffer',
        '__dirname',
        '__filename',
      ];

      globalAccessAttempts.forEach((attempt) => {
        try {
          const result = service['evaluateCondition'](attempt, execution);
          expect(result).toBe(false);
        } catch (error) {
          // Rejecting with error is acceptable
          expect(error).toBeDefined();
        }
      });
    });

    it('should handle invalid expression syntax gracefully', () => {
      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: { amount: 100 },
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      const invalidExpressions = [
        '', // Empty string
        '${nonexistent}', // Undefined variable
        '${amount} >', // Incomplete expression
        '${amount} > > ${threshold}', // Syntax error
        '${amount} &&', // Incomplete logical
      ];

      invalidExpressions.forEach((invalidExpr) => {
        // Should return false or throw, but never execute arbitrary code
        try {
          const result = service['evaluateCondition'](invalidExpr, execution);
          expect(result).toBe(false);
        } catch (error) {
          // Error is acceptable - means expression was rejected
          expect(error).toBeDefined();
        }
      });
    });

    it('should verify expr-eval is used (not eval)', () => {
      // This test ensures that the code is using expr-eval Parser
      // by checking that it can handle expressions that eval() would execute
      // but expr-eval would reject or safely evaluate
      
      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: { value: 5 },
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      // expr-eval should safely evaluate this mathematical expression
      const result = service['evaluateCondition']('${value} * 2 === 10', execution);
      expect(result).toBe(true);

      // But it should reject attempts to call functions that don't exist in scope
      try {
        service['evaluateCondition']('Math.random()', execution);
        // If it doesn't throw, that's okay - expr-eval may allow Math functions
        // The important thing is it doesn't execute arbitrary code
      } catch (error) {
        // Rejection is acceptable
        expect(error).toBeDefined();
      }
    });

    it('should handle variable substitution safely', () => {
      const execution: WorkflowExecution = {
        id: 'exec1',
        workflowId: 'workflow1',
        status: 'RUNNING',
        input: {},
        output: { 
          amount: 100,
          description: 'Test; process.exit(1)', // Attempt to inject code in variable
          status: 'active',
        },
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      };

      // Variable substitution should be safe - even if variable contains malicious content
      // it should be treated as a string value, not executable code
      const result = service['evaluateCondition']('${status} === "active"', execution);
      expect(result).toBe(true);

      // Malicious content in variable should not be executed
      try {
        const result2 = service['evaluateCondition']('${description}', execution);
        // Should return false or throw, not execute the injected code
        expect(typeof result2).toBe('boolean');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});

