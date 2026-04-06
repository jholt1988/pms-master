import { Injectable, Logger } from '@nestjs/common';
import {
  ApplicationStatus,
  ApplicationDecisionReasonCode,
  Prisma,
  QualificationStatus,
  Recommendation,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../shared/audit-log.service';

type PolicyStateTransition = {
  entityType: string;
  entityId: string;
  from?: string;
  to: string;
};

@Injectable()
export class StateTransitionApplierService {
  private readonly logger = new Logger(StateTransitionApplierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async applyTransitions(input: {
    propertyId: string;
    evaluationId: string;
    transitions: PolicyStateTransition[];
    actorId?: string;
  }) {
    if (!input.transitions.length) {
      return [];
    }

    const evaluation = await this.prisma.policyRuleEvaluation.findUnique({
      where: { id: input.evaluationId },
    });

    if (!evaluation) {
      throw new Error(`Policy rule evaluation ${input.evaluationId} not found`);
    }

    const snapshot = evaluation.inputSnapshotJson as Record<string, unknown>;
    const applied: Array<{ entityType: string; entityId: string; to: string; applied: boolean; mode: string }> = [];

    for (const transition of input.transitions) {
      if (transition.entityType === 'Application') {
        const result = await this.applyApplicationTransition(transition, snapshot, input);
        applied.push(result);
        continue;
      }

      if (transition.entityType === 'DelinquencyState') {
        const result = await this.applyDelinquencyTransition(transition, snapshot, input);
        applied.push(result);
        continue;
      }

      applied.push(
        await this.recordUnsupportedTransition(
          transition,
          input,
          'No canonical persisted state column exists for this entity in the current schema',
        ),
      );
    }

    return applied;
  }

  private async applyApplicationTransition(
    transition: PolicyStateTransition,
    snapshot: Record<string, unknown>,
    input: { propertyId: string; evaluationId: string; actorId?: string },
  ) {
    const applicationId = Number(transition.entityId);
    if (!Number.isInteger(applicationId)) {
      return this.recordUnsupportedTransition(transition, input, 'Application entity id is not a numeric application id');
    }

    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) {
      return this.recordUnsupportedTransition(transition, input, 'Application not found');
    }

    const updateData: Prisma.RentalApplicationUpdateInput = {};
    let lifecycleToStatus: ApplicationStatus | null = null;
    let lifecycleEventType: string | null = null;

    switch (transition.to) {
      case 'APPROVED':
        updateData.status = ApplicationStatus.APPROVED;
        updateData.qualificationStatus = QualificationStatus.QUALIFIED;
        updateData.recommendation = Recommendation.RECOMMEND_RENT;
        updateData.decisionedAt = new Date();
        lifecycleToStatus = ApplicationStatus.APPROVED;
        lifecycleEventType = 'APPROVED';
        break;
      case 'DENIED':
        updateData.status = ApplicationStatus.REJECTED;
        updateData.qualificationStatus = QualificationStatus.NOT_QUALIFIED;
        updateData.recommendation = Recommendation.DO_NOT_RECOMMEND_RENT;
        updateData.decisionedAt = new Date();
        updateData.decisionReasonCode = ApplicationDecisionReasonCode.POLICY_MISMATCH;
        lifecycleToStatus = ApplicationStatus.REJECTED;
        lifecycleEventType = 'REJECTED';
        break;
      case 'UNDER_REVIEW':
        updateData.status = ApplicationStatus.UNDER_REVIEW;
        lifecycleToStatus = ApplicationStatus.UNDER_REVIEW;
        lifecycleEventType = 'UNDER_REVIEW';
        break;
      case 'WAITLISTED':
        return this.recordUnsupportedTransition(
          transition,
          input,
          'Application waitlist is modeled in policy/docs but not as a persisted ApplicationStatus enum value',
        );
      default:
        return this.recordUnsupportedTransition(
          transition,
          input,
          `Unsupported application transition target ${transition.to}`,
        );
    }

    await this.prisma.rentalApplication.update({
      where: { id: applicationId },
      data: updateData,
    });

    if (lifecycleToStatus && lifecycleEventType) {
      await this.prisma.applicationLifecycleEvent.create({
        data: {
          applicationId,
          eventType: lifecycleEventType,
          fromStatus: application.status,
          toStatus: lifecycleToStatus,
          performedById: input.actorId ?? null,
          metadata: {
            source: 'policy_engine',
            evaluationId: input.evaluationId,
            workflowEventId: snapshot.workflowEventId ?? null,
            policyDecision: transition.to,
          } as Prisma.InputJsonValue,
        },
      });
    }

    await this.auditLogService.record({
      actorId: input.actorId ?? null,
      module: 'POLICY',
      action: 'POLICY_STATE_TRANSITION_APPLIED',
      entityType: 'RentalApplication',
      entityId: applicationId,
      result: 'SUCCESS',
      metadata: {
        propertyId: input.propertyId,
        evaluationId: input.evaluationId,
        from: application.status,
        to: transition.to,
      },
    });

    return {
      entityType: transition.entityType,
      entityId: transition.entityId,
      to: transition.to,
      applied: true,
      mode: 'application_status',
    };
  }

  private async applyDelinquencyTransition(
    transition: PolicyStateTransition,
    snapshot: Record<string, unknown>,
    input: { propertyId: string; evaluationId: string; actorId?: string },
  ) {
    const leaseId = typeof snapshot.leaseId === 'string' ? snapshot.leaseId : null;
    if (!leaseId) {
      return this.recordUnsupportedTransition(
        transition,
        input,
        'Delinquency transition has no leaseId in the evaluation snapshot',
      );
    }

    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });
    if (!lease) {
      return this.recordUnsupportedTransition(transition, input, 'Lease not found for delinquency transition');
    }

    await this.prisma.leaseHistory.create({
      data: {
        leaseId,
        actorId: input.actorId ?? null,
        fromStatus: lease.status,
        toStatus: lease.status,
        note: `Policy transition recorded for delinquency state: ${transition.to}`,
        metadata: {
          source: 'policy_engine',
          evaluationId: input.evaluationId,
          workflowEventId: snapshot.workflowEventId ?? null,
          delinquencyStateFrom: transition.from ?? null,
          delinquencyStateTo: transition.to,
        } as Prisma.InputJsonValue,
      },
    });

    await this.auditLogService.record({
      actorId: input.actorId ?? null,
      module: 'POLICY',
      action: 'POLICY_STATE_TRANSITION_APPLIED',
      entityType: 'Lease',
      entityId: leaseId,
      result: 'SUCCESS',
      metadata: {
        propertyId: input.propertyId,
        evaluationId: input.evaluationId,
        transitionEntityType: transition.entityType,
        transitionTo: transition.to,
        mode: 'lease_history_only',
      },
    });

    return {
      entityType: transition.entityType,
      entityId: transition.entityId,
      to: transition.to,
      applied: true,
      mode: 'lease_history_only',
    };
  }

  private async recordUnsupportedTransition(
    transition: PolicyStateTransition,
    input: { propertyId: string; evaluationId: string; actorId?: string },
    reason: string,
  ) {
    this.logger.warn(`Policy transition not applied for ${transition.entityType}:${transition.entityId} -> ${transition.to}: ${reason}`);

    await this.auditLogService.record({
      actorId: input.actorId ?? null,
      module: 'POLICY',
      action: 'POLICY_STATE_TRANSITION_SKIPPED',
      entityType: transition.entityType,
      entityId: transition.entityId,
      result: 'SUCCESS',
      metadata: {
        propertyId: input.propertyId,
        evaluationId: input.evaluationId,
        from: transition.from ?? null,
        to: transition.to,
        reason,
      },
    });

    return {
      entityType: transition.entityType,
      entityId: transition.entityId,
      to: transition.to,
      applied: false,
      mode: 'unsupported',
    };
  }
}
