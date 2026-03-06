import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogEvent } from '../shared/audit-log.service';

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
      await (this.prisma as any).milAuditEvent.create({
        data: {
          traceId: params.traceId,
          orgId: params.orgId,
          actorId: params.actorId ?? undefined,
          module: params.module,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ? String(params.entityId) : undefined,
          result: params.result,
          metadata: params.metadata as any,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to persist MIL audit event ${params.action}: ${String(error)}`);
    }
  }
}
