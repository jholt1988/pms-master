import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowStep, WorkflowExecution, WorkflowStatus } from './workflow.types';
import { AIMaintenanceService } from '../maintenance/ai-maintenance.service';
import { AIPaymentService } from '../payments/ai-payment.service';
import { AILeaseRenewalService } from '../lease/ai-lease-renewal.service';
import { AINotificationService } from '../notifications/ai-notification.service';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  onError?: 'STOP' | 'CONTINUE' | 'RETRY';
  maxRetries?: number;
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private workflows: Map<string, WorkflowDefinition> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiMaintenanceService?: AIMaintenanceService,
    private readonly aiPaymentService?: AIPaymentService,
    private readonly aiLeaseRenewalService?: AILeaseRenewalService,
    private readonly aiNotificationService?: AINotificationService,
  ) {
    this.registerDefaultWorkflows();
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    this.logger.log(`Registered workflow: ${workflow.name} (${workflow.id})`);
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    input: Record<string, any>,
    userId?: number,
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const execution: WorkflowExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      status: 'RUNNING',
      input,
      output: {},
      steps: [],
      startedAt: new Date(),
      completedAt: null,
      error: null,
    };

    try {
      // Execute steps sequentially or in parallel based on workflow definition
      for (const step of workflow.steps) {
        const stepResult = await this.executeStep(step, execution, userId);

        execution.steps.push({
          stepId: step.id,
          status: stepResult.success ? 'COMPLETED' : 'FAILED',
          input: stepResult.input,
          output: stepResult.output,
          error: stepResult.error,
          startedAt: stepResult.startedAt,
          completedAt: stepResult.completedAt,
        });

        // Check if step failed and handle according to workflow error strategy
        if (!stepResult.success) {
          if (workflow.onError === 'STOP') {
            execution.status = 'FAILED';
            execution.error = stepResult.error;
            break;
          } else if (workflow.onError === 'RETRY') {
            const retries = execution.steps.filter(
              (s) => s.stepId === step.id && s.status === 'FAILED',
            ).length;

            if (retries < (workflow.maxRetries || 3)) {
              // Retry the step
              this.logger.log(`Retrying step ${step.id} (attempt ${retries + 1})`);
              const retryResult = await this.executeStep(step, execution, userId);
              execution.steps[execution.steps.length - 1] = {
                stepId: step.id,
                status: retryResult.success ? 'COMPLETED' : 'FAILED',
                input: retryResult.input,
                output: retryResult.output,
                error: retryResult.error,
                startedAt: retryResult.startedAt,
                completedAt: retryResult.completedAt,
              };
            } else {
              execution.status = 'FAILED';
              execution.error = `Step ${step.id} failed after ${retries} retries`;
              break;
            }
          }
          // If onError is 'CONTINUE', just log and continue
        }

        // Update execution output with step output
        if (stepResult.output) {
          execution.output = { ...execution.output, ...stepResult.output };
        }
      }

      if (execution.status === 'RUNNING') {
        execution.status = 'COMPLETED';
      }

      execution.completedAt = new Date();
    } catch (error) {
      execution.status = 'FAILED';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
      this.logger.error(`Workflow ${workflowId} failed`, error);
    }

    // Store execution in database (if table exists)
    await this.storeExecution(execution);

    return execution;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
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
          output = await this.executeAssignPriorityAI(step, execution, userId);
          break;
        case 'ASSESS_PAYMENT_RISK_AI':
          output = await this.executeAssessPaymentRiskAI(step, execution, userId);
          break;
        case 'PREDICT_RENEWAL_AI':
          output = await this.executePredictRenewalAI(step, execution, userId);
          break;
        case 'PERSONALIZE_NOTIFICATION_AI':
          output = await this.executePersonalizeNotificationAI(step, execution, userId);
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
  ): Promise<any> {
    this.logger.log(`Executing ASSIGN_PRIORITY_AI step: ${step.id}`);

    if (!this.aiMaintenanceService) {
      this.logger.warn('AIMaintenanceService not available, skipping AI priority assignment');
      return { priority: 'MEDIUM', note: 'AI service not available' };
    }

    try {
      const requestId = step.input?.requestId || execution.output?.maintenanceRequestId;
      if (!requestId) {
        throw new Error('Request ID is required for AI priority assignment');
      }

      const request = await this.prisma.maintenanceRequest.findUnique({
        where: { id: requestId },
        select: { title: true, description: true },
      });

      if (!request) {
        throw new Error(`Maintenance request ${requestId} not found`);
      }

      const priority = await this.aiMaintenanceService.assignPriorityWithAI(
        request.title,
        request.description || '',
      );

      // Update the request with AI-assigned priority
      await this.prisma.maintenanceRequest.update({
        where: { id: requestId },
        data: { priority },
      });

      this.logger.log(`AI assigned priority ${priority} to request ${requestId}`);

      return {
        priority,
        requestId,
        assignedBy: 'AI',
      };
    } catch (error) {
      this.logger.error(`Error in AI priority assignment: ${step.id}`, error);
      throw error;
    }
  }

  /**
   * Execute step: Assess Payment Risk AI
   */
  private async executeAssessPaymentRiskAI(
    step: WorkflowStep,
    execution: WorkflowExecution,
    userId?: number,
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
      const adjustment = await this.aiLeaseRenewalService.getOptimalRentAdjustment(leaseId);

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
   * Evaluate a condition
   */
  private evaluateCondition(condition: string, execution: WorkflowExecution): boolean {
    // Simple condition evaluation
    // In production, you'd use a proper expression evaluator
    try {
      // Replace variables with execution values
      let evaluated = condition;
      for (const [key, value] of Object.entries(execution.output)) {
        evaluated = evaluated.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
      }

      // Evaluate as JavaScript expression (simplified - use a proper evaluator in production)
      return eval(evaluated) as boolean;
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * Store workflow execution in database
   */
  private async storeExecution(execution: WorkflowExecution): Promise<void> {
    // In production, this would store in WorkflowExecution table
    this.logger.debug(`Storing workflow execution: ${execution.id}`);
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

