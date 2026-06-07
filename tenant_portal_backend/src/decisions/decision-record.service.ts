import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CreateDecisionRecordInput = {
  organizationId: string;
  workflowId: string;
  workflowInstanceId?: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  recommendation: string;
  rationale: string[];
  confidence?: number;
  evidenceRefs: Array<{ type: string; id: string; label?: string }>;
  approvalTaskId?: string;
  result?: string;
};

@Injectable()
export class DecisionRecordService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateDecisionRecordInput) {
    return this.prisma.decisionRecord.create({
      data: {
        organizationId: input.organizationId,
        workflowId: input.workflowId,
        workflowInstanceId: input.workflowInstanceId,
        actorId: input.actorId,
        entityType: input.entityType,
        entityId: input.entityId,
        recommendation: input.recommendation,
        rationale: input.rationale as unknown as Prisma.InputJsonValue,
        confidence: input.confidence,
        evidenceRefs: input.evidenceRefs as unknown as Prisma.InputJsonValue,
        approvalTaskId: input.approvalTaskId,
        result: input.result,
      },
    });
  }

  list(orgId: string, query: { workflowId?: string; entityType?: string; entityId?: string; take?: number; skip?: number }) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 100);
    const skip = Math.max(query.skip ?? 0, 0);
    const where = {
      organizationId: orgId,
      ...(query.workflowId ? { workflowId: query.workflowId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };

    return Promise.all([
      this.prisma.decisionRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.decisionRecord.count({ where }),
    ]).then(([data, total]) => ({ data, total, take, skip }));
  }
}
