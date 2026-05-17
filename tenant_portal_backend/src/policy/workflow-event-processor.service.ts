import { Injectable, Logger } from '@nestjs/common';
import { PolicyWorkflowEvent, PolicyWorkflowEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyService } from './policy.service';
import { evaluateEvent } from './event-router';
import { RuleContext } from './rules-engine.types';
import { AuditLogService } from '../shared/audit-log.service';
import { RuleActionDispatcher } from './rule-action-dispatcher.service';
import { StateTransitionApplierService } from './state-transition-applier.service';

@Injectable()
export class WorkflowEventProcessor {
  private readonly logger = new Logger(WorkflowEventProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyService: PolicyService,
    private readonly auditLogService: AuditLogService,
    private readonly actionDispatcher: RuleActionDispatcher,
    private readonly stateTransitionApplier: StateTransitionApplierService,
  ) {}

  async processPending(limit = 50) {
    const events = await this.prisma.policyWorkflowEvent.findMany({
      where: { status: PolicyWorkflowEventStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    for (const event of events) {
      await this.processEvent(event);
    }
  }

  async processEventById(eventId: string) {
    const event = await this.prisma.policyWorkflowEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error(`Policy workflow event ${eventId} not found`);
    }

    return this.processEvent(event);
  }

  private async processEvent(event: PolicyWorkflowEvent) {
    try {
      const policy = await this.policyService.getActiveBundle(event.propertyId);
      const ctx: RuleContext = {
        propertyId: event.propertyId,
        eventType: event.eventType,
        timestamp: new Date().toISOString(),
        workflowEventId: event.id,
        payload: {
          workflowEventId: event.id,
          ...(event.payload as Record<string, unknown>),
        },
        policy,
      };

      const results = evaluateEvent(ctx);
      const processedResults: Array<{
        evaluationId: string;
        decision: string;
        requiresApproval: boolean;
        approvalTaskId?: string;
      }> = [];

      for (const result of results) {
        const evaluation = await this.prisma.policyRuleEvaluation.create({
          data: {
            workflowEventId: event.id,
            propertyId: event.propertyId,
            ruleName: result.ruleName,
            decisionType: result.decision,
            confidence: result.confidence ?? null,
            reasonsJson: result.reasons as Prisma.JsonValue,
            inputSnapshotJson: ctx.payload as Prisma.JsonValue,
            outputSnapshotJson: result as unknown as Prisma.JsonValue,
            policyVersion: policy.version,
          },
        });

        let approvalTaskId: string | undefined;

        if (result.requiresApproval) {
          const approvalTask = await this.prisma.approvalTask.create({
            data: {
              status: 'PENDING',
              propertyId: event.propertyId,
              tenantId: this.extractTenantId(event.payload),
              leaseId: this.extractLeaseId(event.payload),
              unitId: this.extractUnitId(event.payload),
              title: `Policy approval required: ${result.ruleName}`,
              summary: result.reasons.join(' | '),
              actions: {
                ruleName: result.ruleName,
                decision: result.decision,
                approvalRequirement: result.approvalRequirement ?? null,
                evaluationId: evaluation.id,
                workflowEventId: event.id,
                eventType: event.eventType,
                actions: result.actions,
                stateTransitions: result.stateTransitions ?? [],
              } as Prisma.JsonValue,
            },
          });
          approvalTaskId = approvalTask.id;
        } else {
          for (const action of result.actions) {
            await this.prisma.policyRuleActionLog.create({
              data: {
                propertyId: event.propertyId,
                ruleEvaluationId: evaluation.id,
                actorType: 'SYSTEM',
                entityType: 'RuleAction',
                entityId: evaluation.id,
                action: action.type,
                afterJson: action as unknown as Prisma.JsonValue,
              },
            });
            await this.actionDispatcher.dispatch(action, {
              propertyId: event.propertyId,
              evaluationId: evaluation.id,
            });
          }
        }

        for (const transition of result.stateTransitions ?? []) {
          await this.prisma.policyRuleActionLog.create({
            data: {
              propertyId: event.propertyId,
              ruleEvaluationId: evaluation.id,
              actorType: 'SYSTEM',
              entityType: transition.entityType,
              entityId: transition.entityId,
              action: 'STATE_TRANSITION',
              afterJson: transition as unknown as Prisma.JsonValue,
            },
          });
        }

        if (!result.requiresApproval && result.stateTransitions?.length) {
          await this.stateTransitionApplier.applyTransitions({
            propertyId: event.propertyId,
            evaluationId: evaluation.id,
            transitions: result.stateTransitions,
          });
        }

        await this.auditLogService.record({
          module: 'POLICY',
          action: `RULE_EVALUATED:${result.ruleName}`,
          entityType: 'PolicyRuleEvaluation',
          entityId: evaluation.id,
          result: 'SUCCESS',
          metadata: {
            propertyId: event.propertyId,
            workflowEventId: event.id,
            eventType: event.eventType,
            decision: result.decision,
            policyVersion: policy.version,
            approvalTaskId: approvalTaskId ?? null,
          },
        });

        processedResults.push({
          evaluationId: evaluation.id,
          decision: result.decision,
          requiresApproval: result.requiresApproval,
          approvalTaskId,
        });
      }

      await this.prisma.policyWorkflowEvent.update({
        where: { id: event.id },
        data: {
          status: PolicyWorkflowEventStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      return {
        eventId: event.id,
        status: PolicyWorkflowEventStatus.PROCESSED,
        results: processedResults,
      };
    } catch (error) {
      this.logger.error(`Failed to process policy workflow event ${event.id}: ${String(error)}`);
      await this.prisma.policyWorkflowEvent.update({
        where: { id: event.id },
        data: { status: PolicyWorkflowEventStatus.FAILED },
      });
      throw error;
    }
  }

  private extractTenantId(payload: Prisma.JsonValue): string | null {
    const record = payload as Record<string, unknown>;
    const candidate = record.tenantId ?? record.applicantId;
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
  }

  private extractLeaseId(payload: Prisma.JsonValue): string | null {
    const record = payload as Record<string, unknown>;
    const candidate = record.leaseId;
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
  }

  private extractUnitId(payload: Prisma.JsonValue): string | null {
    const record = payload as Record<string, unknown>;
    const candidate = record.unitId;
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
  }
}
