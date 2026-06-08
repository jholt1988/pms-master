import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalTaskStatus, PolicyRuleApprovalStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../shared/audit-log.service';
import { RuleActionDispatcher } from './rule-action-dispatcher.service';
import { RuleAction } from './rules-engine.types';
import { StateTransitionApplierService } from './state-transition-applier.service';
import { DecisionRecordService } from '../decisions/decision-record.service';

type PolicyApprovalTaskPayload = {
  ruleName: string;
  decision: string;
  approvalRequirement?: string | null;
  evaluationId: string;
  workflowEventId: string;
  eventType: string;
  actions: RuleAction[];
  stateTransitions?: Array<{
    entityType: string;
    entityId: string;
    from?: string;
    to: string;
  }>;
};

@Injectable()
export class PolicyApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly actionDispatcher: RuleActionDispatcher,
    private readonly stateTransitionApplier: StateTransitionApplierService,
    private readonly decisionRecordService: DecisionRecordService,
  ) {}

  async listPendingTasks(orgId: string) {
    return this.prisma.approvalTask.findMany({
      where: {
        status: ApprovalTaskStatus.PENDING,
        property: { organizationId: orgId },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async decideTask(
    taskId: string,
    input: { decision: 'APPROVE' | 'REJECT'; reason?: string },
    actor: { userId: string; role: Role },
    orgId: string,
  ) {
    const task = await this.prisma.approvalTask.findFirst({
      where: {
        id: taskId,
        property: { organizationId: orgId },
      },
    });

    if (!task) {
      throw new NotFoundException('Approval task not found');
    }

    if (task.status !== ApprovalTaskStatus.PENDING) {
      throw new BadRequestException(`Approval task is not pending (status=${task.status})`);
    }

    const payload = task.actions as unknown as PolicyApprovalTaskPayload;
    if (!payload?.evaluationId || !Array.isArray(payload.actions)) {
      throw new BadRequestException('Approval task does not contain an executable policy payload');
    }
    if (!task.propertyId) {
      throw new BadRequestException('Approval task is missing property context');
    }

    await this.prisma.policyRuleApproval.create({
      data: {
        ruleEvaluationId: payload.evaluationId,
        approverUserId: actor.userId,
        approverRole: actor.role,
        status:
          input.decision === 'APPROVE'
            ? PolicyRuleApprovalStatus.APPROVED
            : PolicyRuleApprovalStatus.REJECTED,
        reason: input.reason?.trim() || null,
      },
    });

    const decidedTask = await this.prisma.approvalTask.update({
      where: { id: taskId },
      data: {
        status:
          input.decision === 'APPROVE'
            ? ApprovalTaskStatus.APPROVED
            : ApprovalTaskStatus.REJECTED,
        decidedById: actor.userId,
        decidedAt: new Date(),
      },
    });

    await this.auditLogService.record({
      orgId,
      actorId: actor.userId,
      module: 'POLICY',
      action: `POLICY_APPROVAL_TASK_${input.decision}`,
      entityType: 'ApprovalTask',
      entityId: taskId,
      result: 'SUCCESS',
      metadata: {
        evaluationId: payload.evaluationId,
        workflowEventId: payload.workflowEventId,
        ruleName: payload.ruleName,
        reason: input.reason ?? null,
      },
    });

    await this.decisionRecordService.create({
      organizationId: orgId,
      workflowId: payload.workflowEventId || payload.evaluationId,
      workflowInstanceId: payload.evaluationId,
      actorId: actor.userId,
      entityType: 'ApprovalTask',
      entityId: taskId,
      recommendation: task.title,
      rationale: [
        task.summary ?? 'Approval task decision recorded.',
        ...(input.reason ? [`Operator reason: ${input.reason}`] : []),
      ],
      evidenceRefs: [
        { type: 'ApprovalTask', id: taskId, label: task.title },
        ...(task.propertyId ? [{ type: 'Property', id: task.propertyId, label: 'Property context' }] : []),
        ...(task.leaseId ? [{ type: 'Lease', id: task.leaseId, label: 'Lease context' }] : []),
        ...(task.workOrderId ? [{ type: 'MaintenanceRequest', id: task.workOrderId, label: 'Work order context' }] : []),
      ],
      approvalTaskId: taskId,
      result: input.decision,
    });

    if (input.decision === 'REJECT') {
      return decidedTask;
    }

    const results: Array<{ actionType: string; result: unknown }> = [];

    try {
      for (const action of payload.actions) {
        await this.prisma.policyRuleActionLog.create({
          data: {
            propertyId: task.propertyId,
            ruleEvaluationId: payload.evaluationId,
            actorType: 'HUMAN',
            actorId: actor.userId,
            entityType: 'RuleAction',
            entityId: payload.evaluationId,
            action: action.type,
            afterJson: action as unknown as Prisma.InputJsonValue,
          },
        });

        const dispatchResult = await this.actionDispatcher.dispatch(action, {
          propertyId: task.propertyId,
          evaluationId: payload.evaluationId,
          actorId: actor.userId,
        });
        results.push({ actionType: action.type, result: dispatchResult });
      }

      for (const transition of payload.stateTransitions ?? []) {
        await this.prisma.policyRuleActionLog.create({
          data: {
            propertyId: task.propertyId,
            ruleEvaluationId: payload.evaluationId,
            actorType: 'HUMAN',
            actorId: actor.userId,
            entityType: transition.entityType,
            entityId: transition.entityId,
            action: 'STATE_TRANSITION_APPROVED',
            afterJson: transition as unknown as Prisma.InputJsonValue,
          },
        });
      }

      if (payload.stateTransitions?.length) {
        await this.stateTransitionApplier.applyTransitions({
          propertyId: task.propertyId,
          evaluationId: payload.evaluationId,
          transitions: payload.stateTransitions,
          actorId: actor.userId,
        });
      }

      const executedTask = await this.prisma.approvalTask.update({
        where: { id: taskId },
        data: {
          status: ApprovalTaskStatus.EXECUTED,
          executedAt: new Date(),
          results: results as unknown as Prisma.InputJsonValue,
        },
      });

      await this.decisionRecordService.create({
        organizationId: orgId,
        workflowId: payload.workflowEventId || payload.evaluationId,
        workflowInstanceId: payload.evaluationId,
        actorId: actor.userId,
        entityType: 'ApprovalTask',
        entityId: taskId,
        recommendation: task.title,
        rationale: ['Approved action execution completed.'],
        evidenceRefs: [
          { type: 'ApprovalTask', id: taskId, label: task.title },
          ...(task.propertyId ? [{ type: 'Property', id: task.propertyId, label: 'Property context' }] : []),
        ],
        approvalTaskId: taskId,
        result: 'EXECUTED',
      });

      return executedTask;
    } catch (error) {
      await this.auditLogService.record({
        orgId,
        actorId: actor.userId,
        module: 'POLICY',
        action: 'POLICY_APPROVAL_TASK_EXECUTION_FAILED',
        entityType: 'ApprovalTask',
        entityId: taskId,
        result: 'FAILURE',
        metadata: {
          evaluationId: payload.evaluationId,
          workflowEventId: payload.workflowEventId,
          error: String(error),
        },
      });

      const failedTask = await this.prisma.approvalTask.update({
        where: { id: taskId },
        data: {
          status: ApprovalTaskStatus.FAILED,
          executedAt: new Date(),
          executionError: String(error),
          results: results as unknown as Prisma.InputJsonValue,
        },
      });

      await this.decisionRecordService.create({
        organizationId: orgId,
        workflowId: payload.workflowEventId || payload.evaluationId,
        workflowInstanceId: payload.evaluationId,
        actorId: actor.userId,
        entityType: 'ApprovalTask',
        entityId: taskId,
        recommendation: task.title,
        rationale: [`Approved action execution failed: ${String(error)}`],
        evidenceRefs: [{ type: 'ApprovalTask', id: taskId, label: task.title }],
        approvalTaskId: taskId,
        result: 'EXECUTION_FAILED',
      });

      return failedTask;
    }
  }
}
