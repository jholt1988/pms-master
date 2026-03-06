import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogEvent } from '../shared/audit-log.service';

interface MilAuditEventDelegate {
  create(args: {
    data: {
      traceId?: string;
      orgId?: string;
      actorId?: string;
      module: string;
      action: string;
      entityType: string;
      entityId?: string;
      result: string;
      metadata?: unknown;
    };
  }): Promise<unknown>;
}

export interface RecordMilAuditEventParams extends AuditLogEvent {
  traceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class MilAuditEventService {
  private readonly logger = new Logger(MilAuditEventService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordMilAuditEventParams): Promise<void> {
    try {
      const delegate = (this.prisma as unknown as { milAuditEvent?: MilAuditEventDelegate }).milAuditEvent;
      if (!delegate) {
        this.logger.warn('milAuditEvent delegate unavailable; run prisma generate to enable typed persistence');
        return;
      }

      await delegate.create({
        data: {
          traceId: params.traceId,
          orgId: params.orgId,
          actorId: params.actorId ?? undefined,
          module: params.module,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ? String(params.entityId) : undefined,
          result: params.result,
          metadata: params.metadata,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to persist MIL audit event ${params.action}: ${String(error)}`);
    }
  }
}
