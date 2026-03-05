import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MilTraceContext } from './mil-envelope.types';

export interface RecordModelAccessTraceParams {
  operation: 'encrypt' | 'decrypt' | 'model_invoke';
  result: 'requested' | 'completed' | 'failed' | 'allowed' | 'denied';
  trace: MilTraceContext;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ModelAccessTraceService {
  private readonly logger = new Logger(ModelAccessTraceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordModelAccessTraceParams): Promise<void> {
    try {
      await this.prisma.modelAccessTrace.create({
        data: {
          traceId: params.trace.traceId,
          requestId: params.trace.requestId,
          operation: params.operation,
          result: params.result,
          orgId: params.trace.orgId,
          tenantId: params.trace.tenantId,
          actorUserId: params.trace.actorUserId ?? undefined,
          actorRole: params.trace.actorRole,
          module: params.trace.module,
          action: params.trace.action,
          entityType: params.trace.entityType,
          entityId: params.trace.entityId ? String(params.trace.entityId) : undefined,
          modelProvider: params.trace.modelProvider,
          modelName: params.trace.modelName,
          modelVersion: params.trace.modelVersion,
          metadata: params.metadata as any,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to persist model access trace ${params.trace.traceId}: ${String(error)}`);
    }
  }
}
