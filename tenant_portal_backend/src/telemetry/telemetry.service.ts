// Telemetry Service - P0 Gap Remediation
// Event tracking for analytics and user behavior

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TelemetryEvent {
  eventType: string;
  userId?: string;
  orgId?: string;
  domain: string;
  entityId?: string;
  action: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track an event - called from controllers/services
   */
  async trackEvent(event: TelemetryEvent): Promise<void> {
    const timestamp = event.timestamp ?? new Date();
    
    this.logger.log(`[TELEMETRY] ${event.eventType}: ${event.action} on ${event.domain}${event.entityId ? `/${event.entityId}` : ''}`);

    // In production, would persist to database or send to analytics
    // For now, log and optionally store in Prisma if available
    try {
      // Try to log to telemetry events for analytics
      await this.prisma.telemetryEvent?.create({
        data: {
          eventName: event.eventType,
          outcome: event.action,
          domain: event.domain,
          entityId: event.entityId,
          userId: event.userId,
          orgId: event.orgId,
          metadata: event.metadata as any,
          createdAt: timestamp,
        },
      }).catch(() => {
        // Table may not exist, ignore
      });
    } catch (e) {
      // Telemetry should never break main flow
      this.logger.warn(`Telemetry tracking failed: ${e}`);
    }
  }

  /**
   * Track a UI action
   */
  async trackAction(
    action: string,
    domain: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.trackEvent({
      eventType: 'UI_ACTION',
      domain,
      entityId,
      action,
      metadata,
    });
  }

  /**
   * Track a decision execution
   */
  async trackDecision(
    decisionId: string,
    decisionType: string,
    outcome: string,
  ): Promise<void> {
    await this.trackEvent({
      eventType: 'DECISION_EXECUTED',
      domain: 'briefing',
      entityId: decisionId,
      action: outcome,
      metadata: { decisionType },
    });
  }

  /**
   * Track a workflow execution
   */
  async trackWorkflow(
    workflowId: string,
    workflowType: string,
    status: string,
  ): Promise<void> {
    await this.trackEvent({
      eventType: 'WORKFLOW_EXECUTION',
      domain: 'workflows',
      entityId: workflowId,
      action: status,
      metadata: { workflowType },
    });
  }

  /**
   * Track API call for analytics
   */
  async trackApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    userId?: string,
  ): Promise<void> {
    await this.trackEvent({
      eventType: 'API_CALL',
      domain: 'api',
      action: method,
      userId,
      metadata: { endpoint, statusCode },
    });
  }

  /**
   * Get telemetry summary for dashboard
   */
  async getSummary(days: number = 7): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByDomain: Record<string, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query telemetry events for summary data
    const events = await this.prisma.telemetryEvent?.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: { outcome: true, domain: true },
    }).catch(() => []);

    const eventsByType: Record<string, number> = {};
    const eventsByDomain: Record<string, number> = {};

    for (const event of events ?? []) {
      const outcome = (event as any).outcome || 'unknown';
      const domain = (event as any).domain || 'unknown';
      eventsByType[outcome] = (eventsByType[outcome] ?? 0) + 1;
      eventsByDomain[domain] = (eventsByDomain[domain] ?? 0) + 1;
    }

    return {
      totalEvents: events?.length ?? 0,
      eventsByType,
      eventsByDomain,
    };
  }
}