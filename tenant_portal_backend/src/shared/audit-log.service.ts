import { Injectable, Logger } from '@nestjs/common';

export type AuditResult = 'SUCCESS' | 'FAILURE';

export interface AuditLogEvent {
  orgId?: string;
  actorId?: string | null;
  module: string;
  action: string;
  entityType: string;
  entityId?: string | number;
  result: AuditResult;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  async record(event: AuditLogEvent): Promise<void> {
    // Current implementation: structured app log for audit trail.
    // Follow-up (R-04.2): persist to dedicated audit table once schema migration is approved.
    this.logger.log(
      JSON.stringify({
        kind: 'AUDIT_EVENT',
        timestamp: new Date().toISOString(),
        ...event,
      }),
    );
  }
}
