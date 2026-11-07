import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowIntentRow, workflowIntentListQuery } from './workflow-intent.query';

@Injectable()
export class WorkflowIntentStore {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, take: number): Promise<WorkflowIntentRow[]> {
    const query = workflowIntentListQuery(tenantId, take);
    return this.prisma.$queryRawUnsafe(query.text, ...query.values);
  }
}
