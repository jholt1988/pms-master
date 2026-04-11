// src/audit/audit-log.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('audit-queue')
export class AuditLogProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditLogProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const payload = job.data;

    // This is where we attempt the risky database I/O
    await this.prisma.workflowExecution.create({
      data: {
        workflowId: payload.intent ?? 'feed.action.executed',
        status: payload.status ?? 'COMPLETED',
        input: {
          entityId: payload.entityId,
          userId: payload.userId,
          feedItemId: payload.feedItemId,
          timestamp: payload.timestamp instanceof Date ? payload.timestamp.toISOString() : payload.timestamp,
        },
        output: {
          source: 'AuditLogProcessor',
        },
      }
    });

    this.logger.debug(`Audit log written for job ${job.id}`);
  }
}
