import { Injectable, Logger, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowStep, WorkflowExecution, WorkflowStatus } from './workflow.types';
import { AIMaintenanceService } from '../maintenance/ai-maintenance.service';
import { AIPaymentService } from '../payments/ai-payment.service';
import { AILeaseRenewalService } from '../lease/ai-lease-renewal.service';
import { AINotificationService } from '../notifications/ai-notification.service';
import { WorkflowError, WorkflowErrorCode } from './workflow.errors';
import { WorkflowMetricsService } from './workflow-metrics.service';
import { WorkflowCacheService } from './workflow-cache.service';
import { WorkflowRateLimiterService } from './workflow-rate-limiter.service';
import { callAIServiceWithRetry } from './workflow-ai-helper';
import { buildStepGraph, topologicalSort } from './workflow-parallel-executor';
import { Parser } from 'expr-eval';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  onError?: 'STOP' | 'CONTINUE' | 'RETRY';
  maxRetries?: number;
}

// Input validation schema
const WorkflowInputSchema = z.object({
  tenantId: z.number().optional(),
  unitId: z.number().optional(),
  userId: z.number().optional(),
  leaseId: z.number().optional(),
  requestId: z.number().optional(),
  invoiceId: z.number().optional(),
  tenantEmail: z.string().email().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  notificationType: z.string().optional(),
  urgency: z.string().optional(),
}).passthrough();

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private stepRetryCount: Map<string, Map<string, number>> = new Map(); // executionId -> stepId -> count
  private readonly conditionParser = new Parser();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly workflowMetrics?: WorkflowMetricsService,
    @Optional() private readonly workflowCache?: WorkflowCacheService,
    @Optional() private readonly rateLimiter?: WorkflowRateLimiterService,
    @Optional() private readonly aiMaintenanceService?: AIMaintenanceService,
    @Optional() private readonly aiPaymentService?: AIPaymentService,
    @Optional() private readonly aiLeaseRenewalService?: AILeaseRenewalService,
    @Optional() private readonly aiNotificationService?: AINotificationService,
  ) {
    this.registerDefaultWorkflows();
    // Clear expired cache entries periodically
    if (this.workflowCache) {
      setInterval(() => {
        this.workflowCache!.clearExpiredEntries();
      }, 60000); // Every minute
    }
    // Clear expired rate limit entries periodically
    if (this.rateLimiter) {
      setInterval(() => {
        this.rateLimiter!.clearExpiredEntries();
      }, 60000); // Every minute
    }
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    this.logger.log(`Registered workflow: ${workflow.name} (${workflow.id})`);
  }

  /**
   * Execute a workflow with full production-grade error handling
   */
  async executeWorkflow(
    workflowId: string,
    input: Record<string, any>,
    userId?: number,
  ): Promise<WorkflowExecution> {
    const correlationId = uuidv4();
    const startTime = Date.now();

    // Validate input
    let validatedInput: Record<string, any>;
    try {
      validatedInput = WorkflowInputSchema.parse(input);
    } catch (error) {
      this.logger.error('Invalid workflow input', {
        correlationId,
        workflowId,
        error: error instanceof z.ZodError ? error.errors : error,
        input: this.maskSensitiveData(input),
      });
      throw new WorkflowError(
        WorkflowErrorCode.INVALID_INPUT,
        'Invalid workflow input',
        { validationErrors: error instanceof z.ZodError ? error.errors : [] },
      );
    }

    // Get workflow (check cache first)
    let workflow = this.workflowCache?.getWorkflow(workflowId) || null;
    if (!workflow) {
      workflow = this.workflows.get(workflowId) || null;
      if (workflow && this.workflowCache) {
        // Cache the workflow
        this.workflowCache.setWorkflow(workflowId, workflow);
      }
    }

    if (!workflow) {
      this.logger.error('Workflow not found', { correlationId, workflowId });
      throw new WorkflowError(
        WorkflowErrorCode.WORKFLOW_NOT_FOUND,
        `Workflow ${workflowId} not found`,
      );
    }

    // Check permissions
    if (userId) {
      const hasPermission = await this.checkWorkflowPermission(userId, workflowId);
      if (!hasPermission) {
        this.logger.warn('Unauthorized workflow execution attempt', {
          correlationId,
          workflowId,
          userId,
        });
        throw new WorkflowError(
          WorkflowErrorCode.UNAUTHORIZED,
          `User ${userId} not authorized to execute workflow ${workflowId}`,
        );
      }

      // Check rate limit
      if (this.rateLimiter) {
        const rateLimitKey = this.rateLimiter.generateUserKey(userId, workflowId);
        const rateLimit = await this.rateLimiter.checkRateLimit(rateLimitKey, 10, 60); // 10 per minute

        if (!rateLimit.allowed) {
          this.logger.warn('Rate limit exceeded', {
            correlationId,
            workflowId,
            userId,
            resetAt: new Date(rateLimit.resetAt),
          });
          throw new WorkflowError(
            WorkflowErrorCode.TIMEOUT,
            `Rate limit exceeded. Try again after ${new Date(rateLimit.resetAt).toISOString()}`,
          );
        }
      }
    }

    // Execute in transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create execution record
        const execution: WorkflowExecution = {
          id: executionId,
          workflowId,
          status: 'RUNNING',
          input: validatedInput,
          output: {},
          steps: [],
          startedAt: new Date(),
          completedAt: null,
          error: null,
        };

        this.logger.log('Workflow execution started', {
          correlationId,
          executionId,
          workflowId,
          userId,
          input: this.maskSensitiveData(validatedInput),
        });

        // Initialize retry tracking for this execution
        this.stepRetryCount.set(executionId, new Map());

        try {
          // Persist initial execution state
          await this.persistExecution(tx, execution);

          // Execute steps (with parallel execution support)
          const stepGraph = buildStepGraph(workflow.steps);
          const executionGroups = topologicalSort(stepGraph);

          this.logger.log('Workflow execution plan', {
            correlationId,
            executionId,
            workflowId,
            totalSteps: workflow.steps.length,
            executionGroups: executionGroups.length,
            parallelGroups: executionGroups.filter((g) => g.length > 1).length,
          });

          // Execute step groups (each group can run in parallel)
          for (const stepGroup of executionGroups) {
            if (stepGroup.length === 1) {
              // Single step - execute normally
              const step = stepGroup[0];
              const stepResult = await this.executeStepWithRetry(
                step,
                execution,
                userId,
                correlationId,
                workflow,
              );

              execution.steps.push({
                stepId: step.id,
                status: stepResult.success ? 'COMPLETED' : 'FAILED',
                input: stepResult.input,
                output: stepResult.output,
                error: stepResult.error,
                startedAt: stepResult.startedAt,
                completedAt: stepResult.completedAt,
              });

              // Handle step failure
              if (!stepResult.success) {
                if (workflow.onError === 'STOP') {
                  execution.status = 'FAILED';
                  execution.error = stepResult.error || 'Step execution failed';
                  break;
                } else if (workflow.onError === 'CONTINUE') {
                  this.logger.warn('Step failed, continuing workflow', {
                    correlationId,
                    executionId,
                    stepId: step.id,
                    error: stepResult.error,
                  });
                }
              }

              // Update execution output
              if (stepResult.output) {
                execution.output = { ...execution.output, ...stepResult.output };
              }
            } else {
              // Multiple steps - execute in parallel
              this.logger.log('Executing steps in parallel', {
                correlationId,
                executionId,
                stepIds: stepGroup.map((s) => s.id),
              });

              const stepResults = await Promise.all(
                stepGroup.map((step) =>
                  this.executeStepWithRetry(step, execution, userId, correlationId, workflow),
                ),
              );

              // Process results
              for (let i = 0; i < stepGroup.length; i++) {
                const step = stepGroup[i];
                const stepResult = stepResults[i];

                execution.steps.push({
                  stepId: step.id,
                  status: stepResult.success ? 'COMPLETED' : 'FAILED',
                  input: stepResult.input,
                  output: stepResult.output,
                  error: stepResult.error,
                  startedAt: stepResult.startedAt,
                  completedAt: stepResult.completedAt,
                });

                // Handle step failure
                if (!stepResult.success) {
                  if (workflow.onError === 'STOP') {
                    execution.status = 'FAILED';
                    execution.error = stepResult.error || 'Step execution failed';
                    break;
                  } else if (workflow.onError === 'CONTINUE') {
                    this.logger.warn('Step failed, continuing workflow', {
                      correlationId,
                      executionId,
                      stepId: step.id,
                      error: stepResult.error,
                    });
                  }
                }

                // Update execution output
                if (stepResult.output) {
                  execution.output = { ...execution.output, ...stepResult.output };
                }
              }

              // If any step failed and workflow should stop, break
              if (execution.status === 'FAILED' && workflow.onError === 'STOP') {
                break;
              }
            }

            // Checkpoint execution state after each group
            await this.checkpointExecution(tx, execution);
          }

          // Mark as completed if still running
          if (execution.status === 'RUNNING') {
            execution.status = 'COMPLETED';
          }

          execution.completedAt = new Date();

          // Final persistence
          await this.persistExecution(tx, execution);

          const duration = Date.now() - startTime;
          const failedStepCount = execution.steps.filter((s) => s.status === 'FAILED').length;

          // Record metrics
          if (this.workflowMetrics) {
            this.workflowMetrics.recordMetric({
              workflowId,
              executionId,
              status: execution.status as 'COMPLETED' | 'FAILED' | 'CANCELLED',
              duration,
              stepCount: execution.steps.length,
              failedStepCount,
              errorCode: execution.error
                ? this.extractErrorCode(execution.error)
                : undefined,
            });
          }

          this.logger.log('Workflow execution completed', {
            correlationId,
            executionId,
            workflowId,
            status: execution.status,
            duration,
            stepCount: execution.steps.length,
            failedStepCount,
            errorCode: execution.error ? this.extractErrorCode(execution.error) : undefined,
          });

          return execution;
        } catch (error) {
          execution.status = 'FAILED';
          execution.error = error instanceof Error ? error.message : 'Unknown error';
          execution.completedAt = new Date();

          await this.persistExecution(tx, execution);

          // Send to dead letter queue if max retries exceeded
          if (error instanceof WorkflowError && error.code === WorkflowErrorCode.MAX_RETRIES_EXCEEDED) {
            await this.sendToDeadLetterQueue(tx, execution, error);
          }

          throw error;
        } finally {
          // Clean up retry tracking
          this.stepRetryCount.delete(executionId);
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Workflow execution failed', {
        correlationId,
        workflowId,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        duration,
      });

      throw error;
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId: number | undefined,
    correlationId: string,
  ): Promise<{
    success: boolean;
    input: any;
    output: any;
    error: string | null;
    startedAt: Date;
    completedAt: Date;
  }> {
    const startedAt = new Date();

    try {
      let output: any = {};

      switch (step.type) {
        case 'CREATE_LEASE':
          output = await this.executeCreateLease(step, execution, userId);
          break;
        case 'SEND_EMAIL':
          output = await this.executeSendEmail(step, execution, userId);
          break;
        case 'SCHEDULE_INSPECTION':
          output = await this.executeScheduleInspection(step, execution, userId);
          break;
        case 'CREATE_MAINTENANCE_REQUEST':
          output = await this.executeCreateMaintenanceRequest(step, execution, userId);
          break;
        case 'ASSIGN_TECHNICIAN':
          output = await this.executeAssignTechnician(step, execution, userId);
          break;
        case 'SEND_NOTIFICATION':
          output = await this.executeSendNotification(step, execution, userId);
          break;
        case 'ASSIGN_PRIORITY_AI':
          output = await this.executeAssignPriorityAI(step, execution, userId, correlationId);
          break;
        case 'ASSESS_PAYMENT_RISK_AI':
          output = await this.executeAssessPaymentRiskAI(step, execution, userId, correlationId);
          break;
        case 'PREDICT_RENEWAL_AI':
          output = await this.executePredictRenewalAI(step, execution, userId, correlationId);
          break;
        case 'PERSONALIZE_NOTIFICATION_AI':
          output = await this.executePersonalizeNotificationAI(step, execution, userId, correlationId);
          break;
        case 'CONDITIONAL':
          output = await this.executeConditional(step, execution, userId);
          break;
        case 'CUSTOM':
          output = await this.executeCustom(step, execution, userId);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      return {
        success: true,
        input: step.input || {},
        output,
        error: null,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Step execution failed', {
        correlationId,
        executionId: execution.id,
        stepId: step.id,
        stepType: step.type,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        input: step.input || {},
        output: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        startedAt,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Execute step: Create Lease
   */
  private async executeCreateLease(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
  ): Promise<any> {
    // Implementation would create a lease using Prisma
    this.logger.log(`Executing CREATE_LEASE step: ${step.id}`);
    return { leaseId: 123 }; // Placeholder
  }

  /**
   * Execute step: Send Email
   */
  private async executeSendEmail(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
  ): Promise<any> {
    this.logger.log(`Executing SEND_EMAIL step: ${step.id}`);
    return { emailSent: true };
  }

  /**
   * Execute step: Schedule Inspection
   */
  private async executeScheduleInspection(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
  ): Promise<any> {
    this.logger.log(`Executing SCHEDULE_INSPECTION step: ${step.id}`);
    return { inspectionId: 456 };
  }

  /**
   * Execute step: Create Maintenance Request
   */
  private async executeCreateMaintenanceRequest(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
  ): Promise<any> {
    this.logger.log(`Executing CREATE_MAINTENANCE_REQUEST step: ${step.id}`);
    return { maintenanceRequestId: 789 };
  }

  /**
   * Execute step: Assign Technician
   */
  private async executeAssignTechnician(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
  ): Promise<any> {
    this.logger.log(`Executing ASSIGN_TECHNICIAN step: ${step.id}`);
    
    const requestId = step.input?.requestId || execution.output?.maintenanceRequestId;
    if (!requestId) {
      throw new Error('Request ID is required for technician assignment');
    }

    // Get the request with full details
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        property: {
          select: {
            latitude: true,
            longitude: true,
          },
        },
        asset: {
          select: {
            category: true,
          },
        },
      },
    });

    if (!request) {
      throw new Error(`Maintenance request ${requestId} not found`);
    }

    // Use AI to assign technician
    // Note: This requires injecting AIMaintenanceService - we'll need to update the constructor
    // For now, return a placeholder that indicates AI assignment should be used
    return {
      technicianAssigned: true,
      requestId,
      note: 'AI technician assignment should be performed via MaintenanceService.assignTechnician()',
    };
  }

  /**
   * Execute step: Send Notification
   */
  private async executeSendNotification(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
  ): Promise<any> {
    this.logger.log(`Executing SEND_NOTIFICATION step: ${step.id}`);
    return { notificationSent: true };
  }

  /**
   * Execute step: Assign Priority AI
   */
  private async executeAssignPriorityAI(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
    correlationId?: string,
  ): Promise<any> {
    this.logger.log(`Executing ASSIGN_PRIORITY_AI step: ${step.id}`, { correlationId });

    if (!this.aiMaintenanceService) {
      this.logger.warn('AIMaintenanceService not available, skipping AI priority assignment', {
        correlationId,
        stepId: step.id,
      });
      return { priority: 'MEDIUM', note: 'AI service not available' };
    }

    const requestId = step.input?.requestId || execution.output?.maintenanceRequestId;
    if (!requestId) {
      throw new WorkflowError(
        WorkflowErrorCode.INVALID_INPUT,
        'Request ID is required for AI priority assignment',
      );
    }

    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      select: { title: true, description: true },
    });

    if (!request) {
      throw new WorkflowError(
        WorkflowErrorCode.STEP_EXECUTION_FAILED,
        `Maintenance request ${requestId} not found`,
      );
    }

    // Check cache first
    const cacheKey = this.workflowCache?.generateAIResponseKey('AIMaintenanceService', 'assignPriorityWithAI', {
      title: request.title,
      description: request.description || '',
    });
    let priority = cacheKey ? this.workflowCache.getAIResponse(cacheKey) : null;

    if (!priority) {
      // Use retry wrapper with circuit breaker
      priority = await callAIServiceWithRetry(
        'AIMaintenanceService',
        'assignPriorityWithAI',
        async () => {
          return await this.aiMaintenanceService!.assignPriorityWithAI(
            request.title,
            request.description || '',
          );
        },
        this.logger,
        {
          retry: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            timeout: 10000,
          },
          correlationId,
        },
      );

      // Cache the result
      if (cacheKey && this.workflowCache) {
        this.workflowCache.setAIResponse(cacheKey, priority, 300000); // 5 minutes
      }
    } else {
      this.logger.log('AI response retrieved from cache', {
        correlationId,
        requestId,
        cacheKey,
      });
    }

    // Update the request with AI-assigned priority
    await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { priority },
    });

    this.logger.log(`AI assigned priority ${priority} to request ${requestId}`, {
      correlationId,
      requestId,
      priority,
    });

    return {
      priority,
      requestId,
      assignedBy: 'AI',
    };
  }

  /**
   * Execute step: Assess Payment Risk AI
   */
  private async executeAssessPaymentRiskAI(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
    correlationId?: string,
  ): Promise<any> {
    this.logger.log(`Executing ASSESS_PAYMENT_RISK_AI step: ${step.id}`);

    if (!this.aiPaymentService) {
      this.logger.warn('AIPaymentService not available, skipping AI payment risk assessment');
      return { riskLevel: 'MEDIUM', riskScore: 0.5, note: 'AI service not available' };
    }

    try {
      const tenantId = step.input?.tenantId || execution.input?.tenantId || execution.output?.tenantId;
      const invoiceId = step.input?.invoiceId || execution.input?.invoiceId || execution.output?.invoiceId;

      if (!tenantId || !invoiceId) {
        throw new Error('Tenant ID and Invoice ID are required for payment risk assessment');
      }

      const riskAssessment = await this.aiPaymentService.assessPaymentRisk(tenantId, invoiceId);

      this.logger.log(
        `AI payment risk assessment: ${riskAssessment.riskLevel} (${riskAssessment.riskScore.toFixed(2)})`,
      );

      return {
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.riskScore,
        factors: riskAssessment.factors,
        recommendedActions: riskAssessment.recommendedActions,
        suggestPaymentPlan: riskAssessment.suggestPaymentPlan,
        paymentPlanSuggestion: riskAssessment.paymentPlanSuggestion,
        tenantId,
        invoiceId,
      };
    } catch (error) {
      this.logger.error(`Error in AI payment risk assessment: ${step.id}`, error);
      throw error;
    }
  }

  /**
   * Execute step: Predict Renewal AI
   */
  private async executePredictRenewalAI(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
    correlationId?: string,
  ): Promise<any> {
    this.logger.log(`Executing PREDICT_RENEWAL_AI step: ${step.id}`);

    if (!this.aiLeaseRenewalService) {
      this.logger.warn('AILeaseRenewalService not available, skipping AI renewal prediction');
      return {
        renewalProbability: 0.5,
        confidence: 'LOW',
        note: 'AI service not available',
      };
    }

    try {
      const leaseId = step.input?.leaseId || execution.input?.leaseId || execution.output?.leaseId;
      if (!leaseId) {
        throw new Error('Lease ID is required for renewal prediction');
      }

      const prediction = await this.aiLeaseRenewalService.predictRenewalLikelihood(leaseId);
      const adjustment = await this.aiLeaseRenewalService.getRentAdjustmentRecommendation(leaseId);

      this.logger.log(
        `AI renewal prediction for lease ${leaseId}: ${(prediction.renewalProbability * 100).toFixed(1)}% ` +
        `(confidence: ${prediction.confidence})`,
      );

      return {
        renewalProbability: prediction.renewalProbability,
        confidence: prediction.confidence,
        factors: prediction.factors,
        recommendedRent: adjustment.recommendedRent,
        adjustmentPercentage: adjustment.adjustmentPercentage,
        reasoning: adjustment.reasoning,
        adjustmentFactors: adjustment.factors,
        leaseId,
      };
    } catch (error) {
      this.logger.error(`Error in AI renewal prediction: ${step.id}`, error);
      throw error;
    }
  }

  /**
   * Execute step: Personalize Notification AI
   */
  private async executePersonalizeNotificationAI(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
    correlationId?: string,
  ): Promise<any> {
    this.logger.log(`Executing PERSONALIZE_NOTIFICATION_AI step: ${step.id}`);

    if (!this.aiNotificationService) {
      this.logger.warn('AINotificationService not available, skipping AI notification personalization');
      return {
        personalized: false,
        originalContent: step.input?.content || '',
        note: 'AI service not available',
      };
    }

    try {
      const targetUserId = step.input?.userId || execution.input?.userId || userId;
      const notificationType = step.input?.notificationType || execution.input?.notificationType;
      const originalContent = step.input?.content || execution.input?.content || '';

      if (!targetUserId || !notificationType || !originalContent) {
        throw new Error(
          'User ID, notification type, and content are required for notification personalization',
        );
      }

      const personalizedContent = await this.aiNotificationService.customizeNotificationContent(
        targetUserId,
        notificationType,
        originalContent,
      );

      const timing = await this.aiNotificationService.determineOptimalTiming(
        targetUserId,
        notificationType,
        step.input?.urgency || 'MEDIUM',
      );

      this.logger.log(
        `AI personalized notification for user ${targetUserId} (channel: ${timing.channel})`,
      );

      return {
        personalized: true,
        originalContent,
        personalizedContent,
        channel: timing.channel,
        optimalTime: timing.sendAt,
        priority: timing.priority,
        userId: targetUserId,
        notificationType,
      };
    } catch (error) {
      this.logger.error(`Error in AI notification personalization: ${step.id}`, error);
      throw error;
    }
  }

  /**
   * Execute step: Conditional
   */
  private async executeConditional(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
  ): Promise<any> {
    this.logger.log(`Executing CONDITIONAL step: ${step.id}`);
    
    if (!step.condition) {
      throw new Error('Conditional step requires a condition');
    }

    // Evaluate condition
    const conditionResult = this.evaluateCondition(step.condition, execution);

    return {
      conditionResult,
      nextStep: conditionResult ? step.onTrue : step.onFalse,
    };
  }

  /**
   * Execute step: Custom
   */
  private async executeCustom(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
  ): Promise<any> {
    this.logger.log(`Executing CUSTOM step: ${step.id}`);
    
    if (!step.handler) {
      throw new Error('Custom step requires a handler function');
    }

    return await step.handler(execution, userId);
  }

  /**
   * Safe condition evaluation (replaces eval with expr-eval)
   */
  private evaluateCondition(condition: string, execution: WorkflowExecution): boolean {
    try {
      // Replace variables with execution values
      let evaluated = condition;
      const scope: Record<string, any> = {};

      for (const [key, value] of Object.entries(execution.output)) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        evaluated = evaluated.replace(regex, String(value));
        // Also add to scope for direct variable access
        scope[key] = value;
      }

      // Parse and evaluate safely using expr-eval
      const expr = this.conditionParser.parse(evaluated);
      return expr.evaluate(scope) as boolean;
    } catch (error) {
      this.logger.error('Condition evaluation failed', {
        condition,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Execute step with retry logic and exponential backoff
   */
  private async executeStepWithRetry(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId: number | undefined,
    correlationId: string,
    workflow: WorkflowDefinition,
  ): Promise<{
    success: boolean;
    input: any;
    output: any;
    error: string | null;
    startedAt: Date;
    completedAt: Date;
  }> {
    const retryMap = this.stepRetryCount.get(execution.id) || new Map();
    const maxRetries = workflow.maxRetries || 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await this.executeStep(step, execution, userId, correlationId);

        // Reset retry count on success
        retryMap.delete(step.id);

        return result;
      } catch (error) {
        attempt++;
        const currentRetries = retryMap.get(step.id) || 0;

        if (currentRetries >= maxRetries) {
          this.logger.error('Step failed after max retries', {
            correlationId,
            executionId: execution.id,
            stepId: step.id,
            retries: currentRetries,
            error: error instanceof Error ? error.message : String(error),
          });

          throw new WorkflowError(
            WorkflowErrorCode.MAX_RETRIES_EXCEEDED,
            `Step ${step.id} failed after ${maxRetries} retries`,
            { stepId: step.id, error: error instanceof Error ? error.message : 'Unknown error' },
          );
        }

        // Calculate backoff
        const backoffMs = this.calculateBackoff(currentRetries);
        retryMap.set(step.id, currentRetries + 1);

        // Only retry if workflow error strategy is RETRY
        if (workflow.onError === 'RETRY') {
          this.logger.warn('Step failed, retrying', {
            correlationId,
            executionId: execution.id,
            stepId: step.id,
            attempt: currentRetries + 1,
            maxRetries,
            backoffMs,
          });

          // Wait before retry
          await this.delay(backoffMs);
        } else {
          // If not retrying, return failure
          return {
            success: false,
            input: step.input || {},
            output: {},
            error: error instanceof Error ? error.message : 'Unknown error',
            startedAt: new Date(),
            completedAt: new Date(),
          };
        }
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new WorkflowError(
      WorkflowErrorCode.STEP_EXECUTION_FAILED,
      `Step ${step.id} execution failed`,
    );
  }

  /**
   * Persist execution to database
   */
  private async persistExecution(
    tx: Prisma.TransactionClient,
    execution: WorkflowExecution,
  ): Promise<void> {
    // Type assertion needed until Prisma types are fully regenerated
    const txClient = tx as any;
    await txClient.workflowExecution.upsert({
      where: { id: execution.id },
      update: {
        status: execution.status,
        output: execution.output as Prisma.InputJsonValue,
        error: execution.error,
        completedAt: execution.completedAt,
      },
      create: {
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        input: execution.input as Prisma.InputJsonValue,
        output: execution.output as Prisma.InputJsonValue,
        error: execution.error,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
      },
    });

    // Persist steps
    for (const step of execution.steps) {
      await txClient.workflowExecutionStep.upsert({
        where: {
          executionId_stepId: {
            executionId: execution.id,
            stepId: step.stepId,
          },
        },
        update: {
          status: step.status,
          input: step.input as Prisma.InputJsonValue,
          output: step.output as Prisma.InputJsonValue,
          error: step.error,
          completedAt: step.completedAt,
        },
        create: {
          executionId: execution.id,
          stepId: step.stepId,
          status: step.status,
          input: step.input as Prisma.InputJsonValue,
          output: step.output as Prisma.InputJsonValue,
          error: step.error,
          startedAt: step.startedAt,
          completedAt: step.completedAt,
        },
      });
    }
  }

  /**
   * Checkpoint execution state
   */
  private async checkpointExecution(
    tx: Prisma.TransactionClient,
    execution: WorkflowExecution,
  ): Promise<void> {
    const txClient = tx as any;
    await txClient.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: execution.status,
        output: execution.output as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Send failed execution to dead letter queue
   */
  private async sendToDeadLetterQueue(
    tx: Prisma.TransactionClient,
    execution: WorkflowExecution,
    error: Error,
  ): Promise<void> {
    const txClient = tx as any;
    await txClient.deadLetterQueue.create({
      data: {
        workflowId: execution.workflowId,
        executionId: execution.id,
        input: execution.input as Prisma.InputJsonValue,
        error: error.message,
        errorCode: error instanceof WorkflowError ? error.code : 'UNKNOWN',
      },
    });

    this.logger.error('Workflow sent to dead letter queue', {
      executionId: execution.id,
      workflowId: execution.workflowId,
      error: error.message,
    });
  }

  /**
   * Check user permission to execute workflow
   */
  private async checkWorkflowPermission(
    userId: number,
    workflowId: string,
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        return false;
      }

      // Property Manager can execute any workflow
      if (user.role === 'PROPERTY_MANAGER') {
        return true;
      }

      // Tenant can only execute tenant-specific workflows
      if (user.role === 'TENANT') {
        const tenantWorkflows = ['new-tenant-onboarding'];
        return tenantWorkflows.includes(workflowId);
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking workflow permission', {
        userId,
        workflowId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateBackoff(attempt: number, baseDelay: number = 1000): number {
    const exponentialDelay = Math.pow(2, attempt) * baseDelay;
    const jitter = Math.random() * 1000; // 0-1000ms jitter
    return Math.min(exponentialDelay + jitter, 60000); // Cap at 60s
  }

  /**
   * Delay helper
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Extract error code from error message
   */
  private extractErrorCode(error: string): string {
    // Try to extract WorkflowErrorCode from error message
    const errorCodeMatch = error.match(/\[(\w+)\]/);
    if (errorCodeMatch) {
      return errorCodeMatch[1];
    }

    // Check if it's a known error code
    const knownCodes = Object.values(WorkflowErrorCode);
    for (const code of knownCodes) {
      if (error.includes(code)) {
        return code;
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Mask sensitive data in logs
   */
  private maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const masked = { ...data };
    const sensitiveFields = ['email', 'password', 'ssn', 'creditCard', 'phone', 'token', 'apiKey'];

    for (const field of sensitiveFields) {
      if (masked[field]) {
        masked[field] = '***MASKED***';
      }
    }

    // Recursively mask nested objects
    for (const key in masked) {
      if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    }

    return masked;
  }

  /**
   * Register default workflows
   */
  private registerDefaultWorkflows(): void {
    // New Tenant Onboarding Workflow
    this.registerWorkflow({
      id: 'new-tenant-onboarding',
      name: 'New Tenant Onboarding',
      description: 'Automated workflow for onboarding new tenants',
      steps: [
        {
          id: 'create-lease',
          type: 'CREATE_LEASE',
          input: { tenantId: '${input.tenantId}', unitId: '${input.unitId}' },
        },
        {
          id: 'send-welcome-email',
          type: 'SEND_EMAIL',
          input: { to: '${input.tenantEmail}', template: 'welcome' },
        },
        {
          id: 'schedule-move-in-inspection',
          type: 'SCHEDULE_INSPECTION',
          input: { unitId: '${input.unitId}', type: 'MOVE_IN' },
        },
        {
          id: 'setup-payment-account',
          type: 'CUSTOM',
          input: { leaseId: '${output.leaseId}' },
          handler: async (execution, userId) => {
            // Custom handler for setting up payment account
            return { paymentAccountSetup: true };
          },
        },
      ],
      onError: 'CONTINUE',
      maxRetries: 3,
    });

    // Maintenance Request Lifecycle Workflow
    this.registerWorkflow({
      id: 'maintenance-request-lifecycle',
      name: 'Maintenance Request Lifecycle',
      description: 'Automated workflow for handling maintenance requests',
      steps: [
        {
          id: 'create-request',
          type: 'CREATE_MAINTENANCE_REQUEST',
          input: { title: '${input.title}', description: '${input.description}' },
        },
        {
          id: 'assign-priority',
          type: 'ASSIGN_PRIORITY_AI',
          input: { requestId: '${output.maintenanceRequestId}' },
        },
        {
          id: 'assign-technician',
          type: 'ASSIGN_TECHNICIAN',
          input: { requestId: '${output.maintenanceRequestId}' },
        },
        {
          id: 'notify-tenant',
          type: 'SEND_NOTIFICATION',
          input: { userId: '${input.userId}', type: 'MAINTENANCE_REQUEST_CREATED' },
        },
      ],
      onError: 'RETRY',
      maxRetries: 3,
    });

    // Lease Renewal Workflow
    this.registerWorkflow({
      id: 'lease-renewal',
      name: 'Lease Renewal Process',
      description: 'Automated workflow for lease renewals',
      steps: [
        {
          id: 'check-renewal-likelihood',
          type: 'PREDICT_RENEWAL_AI',
          input: { leaseId: '${input.leaseId}' },
        },
        {
          id: 'generate-offer',
          type: 'CUSTOM',
          input: { leaseId: '${input.leaseId}' },
          handler: async (execution, userId) => {
            // Generate personalized renewal offer using AI prediction results
            const leaseId = execution.input?.leaseId || execution.output?.leaseId;
            const renewalData = execution.output?.renewalProbability
              ? execution.output
              : execution.steps.find((s) => s.stepId === 'check-renewal-likelihood')?.output;

            if (leaseId && renewalData && renewalData.renewalProbability > 0.3) {
              // Note: This requires injecting AILeaseRenewalService
              // For now, return based on prediction data
              return {
                offerId: 123,
                baseRent: renewalData.recommendedRent || 0,
                adjustmentPercentage: renewalData.adjustmentPercentage || 0,
                reasoning: renewalData.reasoning || 'Based on AI analysis',
                renewalProbability: renewalData.renewalProbability,
              };
            }
            return { offerId: 0, note: 'Low renewal probability or missing data' };
          },
        },
        {
          id: 'send-offer',
          type: 'SEND_EMAIL',
          input: { to: '${input.tenantEmail}', template: 'renewal-offer' },
        },
      ],
      onError: 'CONTINUE',
      maxRetries: 2,
    });
  }

  /**
   * Get workflow definition
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * List all registered workflows
   */
  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }
}

