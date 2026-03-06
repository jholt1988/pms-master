import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MilTraceContext } from './mil-envelope.types';

interface ModelAccessTraceDelegate {
  create(args: {
    data: {
      traceId: string;
      requestId?: string;
      operation: string;
      result: string;
      orgId?: string;
      tenantId?: string;
      actorUserId?: string;
      actorRole?: string | null;
      module: string;
      action: string;
      entityType: string;
      entityId?: string;
      modelProvider?: string;
      modelName?: string;
      modelVersion?: string;
      metadata?: unknown;
    };
  }): Promise<unknown>;
}

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
      const delegate = (this.prisma as unknown as { modelAccessTrace?: ModelAccessTraceDelegate }).modelAccessTrace;
      if (!delegate) {
        this.logger.warn('modelAccessTrace delegate unavailable; run prisma generate to enable typed persistence');
        return;
      }

      await delegate.create({
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
          metadata: params.metadata,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to persist model access trace ${params.trace.traceId}: ${String(error)}`);
    }
  }
}
