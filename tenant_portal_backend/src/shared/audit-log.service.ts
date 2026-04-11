import { Injectable, Logger } from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {PrismaService} from '../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}
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
@OnEvent('feed.action.executed', { async: true }) // async: true ensures non-blocking
  async logFeedAction(payload: {
    feedItemId: string;
    intent: string;
    entityId: string;
    userId: string;
    timestamp: Date;
    status: string;
  }) {
    try {
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
            source: 'AuditLogService',
          },
        }
      });
    } catch (error) {
      // If the audit log fails, the UI doesn't break, but we must log it to standard out
      this.logger.error(`CRITICAL: Failed to write audit log for intent ${payload.intent}`, error.stack);
    }
  }

}
