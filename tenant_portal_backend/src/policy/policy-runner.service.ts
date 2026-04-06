import { Injectable, Logger } from '@nestjs/common';
import { PolicyDecisionType, PolicyWorkflowEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../shared/audit-log.service';
import { evaluateEvent } from './event-router';
import { PolicyService } from './policy.service';
import { RuleContext } from './rules-engine.types';

@Injectable()
export class PolicyRunnerService {
  private readonly logger = new Logger(PolicyRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyService: PolicyService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async recordWorkflowEvent(input: {
    propertyId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    eventVersion?: number;
  }) {
    return this.prisma.policyWorkflowEvent.create({
      data: {
        propertyId: input.propertyId,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        eventVersion: input.eventVersion ?? 1,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  }

  async runEvaluationForEvent(workflowEventId: string, actorId?: string): Promise<void> {
    const workflowEvent = await this.prisma.policyWorkflowEvent.findUnique({
      where: { id: workflowEventId },
    });

    if (!workflowEvent) {
      throw new Error('Policy workflow event not found');
    }

    const policy = await this.policyService.getActiveBundle(workflowEvent.propertyId);
    const ctx: RuleContext = {
      propertyId: workflowEvent.propertyId,
      actorId,
      workflowEventId: workflowEvent.id,
      eventType: workflowEvent.eventType,
      timestamp: new Date().toISOString(),
      payload: workflowEvent.payload as Record<string, unknown>,
      policy,
    };

    const results = evaluateEvent(ctx);

    for (const result of results) {
      const evaluation = await this.prisma.policyRuleEvaluation.create({
        data: {
          workflowEventId: workflowEvent.id,
          propertyId: workflowEvent.propertyId,
          ruleName: result.ruleName,
          decisionType: result.decision as PolicyDecisionType,
          confidence: result.confidence ?? null,
          reasonsJson: result.reasons as Prisma.InputJsonValue,
          inputSnapshotJson: ctx.payload as Prisma.InputJsonValue,
          outputSnapshotJson: result as unknown as Prisma.InputJsonValue,
          policyVersion: policy.version,
        },
      });

      for (const action of result.actions) {
        await this.prisma.policyRuleActionLog.create({
          data: {
            propertyId: workflowEvent.propertyId,
            ruleEvaluationId: evaluation.id,
            actorType: 'SYSTEM',
            actorId: actorId ?? null,
            entityType: 'RuleAction',
            entityId: evaluation.id,
            action: action.type,
            afterJson: action as unknown as Prisma.InputJsonValue,
          },
        });
      }

      for (const transition of result.stateTransitions ?? []) {
        await this.prisma.policyRuleActionLog.create({
          data: {
            propertyId: workflowEvent.propertyId,
            ruleEvaluationId: evaluation.id,
            actorType: 'SYSTEM',
            actorId: actorId ?? null,
            entityType: transition.entityType,
            entityId: transition.entityId,
            action: 'STATE_TRANSITION',
            afterJson: transition as unknown as Prisma.InputJsonValue,
          },
        });
      }

      try {
        await this.auditLogService.record({
          orgId: undefined,
          actorId: actorId ?? null,
          module: 'POLICY',
          action: `RULE_EVALUATED:${result.ruleName}`,
          entityType: 'PolicyRuleEvaluation',
          entityId: evaluation.id,
          result: 'SUCCESS',
          metadata: {
            propertyId: workflowEvent.propertyId,
            workflowEventId: workflowEvent.id,
            eventType: workflowEvent.eventType,
            decision: result.decision,
            policyVersion: policy.version,
            requiresApproval: result.requiresApproval,
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to write policy audit event: ${String(error)}`);
      }
    }

    await this.prisma.policyWorkflowEvent.update({
      where: { id: workflowEvent.id },
      data: {
        status: PolicyWorkflowEventStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }
}

