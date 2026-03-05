import { Injectable, Logger } from '@nestjs/common';
import { SecurityEventType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditLogService } from '../shared/audit-log.service';
import { SecurityEventsService } from '../security-events/security-events.service';
import { MilAccessPolicyService } from './mil-access-policy.service';
import { MilTraceContext, MilEnvelope } from './mil-envelope.types';
import { ModelAccessTraceService } from './model-access-trace.service';
import { MilAuditEventService } from './mil-audit-event.service';
import { MilFeatureFlagsService } from './mil-feature-flags.service';
import { MilService } from './mil.service';

@Injectable()
export class MilSecurityAuditWrapperService {
  private readonly logger = new Logger(MilSecurityAuditWrapperService.name);

  constructor(
    private readonly policyService: MilAccessPolicyService,
    private readonly auditLogService: AuditLogService,
    private readonly securityEventsService: SecurityEventsService,
    private readonly modelAccessTraceService: ModelAccessTraceService,
    private readonly milAuditEventService: MilAuditEventService,
    private readonly flags: MilFeatureFlagsService,
    private readonly milService: MilService,
  ) {}

  createTraceContext(context: Omit<MilTraceContext, 'traceId'> & { traceId?: string }): MilTraceContext {
    return {
      traceId: context.traceId ?? randomUUID(),
      ...context,
    };
  }

  async assertAccess(
    operation: 'encrypt' | 'decrypt' | 'model_invoke',
    trace: MilTraceContext,
  ): Promise<void> {
    if (!this.flags.isWrapperEnabled()) {
      return;
    }

    try {
      await this.policyService.assertAllowed({
        operation,
        tenantId: trace.tenantId ?? trace.orgId ?? 'unknown',
        orgId: trace.orgId,
        actorUserId: trace.actorUserId,
        actorRole: trace.actorRole,
      });

      await this.modelAccessTraceService.record({
        operation,
        result: 'allowed',
        trace,
      });
    } catch (error) {
      await this.modelAccessTraceService.record({
        operation,
        result: 'denied',
        trace,
        metadata: { error: String(error) },
      });
      throw error;
    }
  }

  async encryptPayload<T extends object>(tenantId: string, payload: T, trace: MilTraceContext): Promise<MilEnvelope> {
    if (!this.flags.isEncryptAtRestEnabled()) {
      throw new Error('MIL encrypt-at-rest disabled by feature flag');
    }

    await this.assertAccess('encrypt', trace);
    return this.milService.encryptPayload(tenantId, payload);
  }

  async decryptPayload<T>(tenantId: string, encryptedPayload: MilEnvelope | string, trace: MilTraceContext): Promise<T> {
    if (!this.flags.isEncryptAtRestEnabled()) {
      throw new Error('MIL encrypt-at-rest disabled by feature flag');
    }

    await this.assertAccess('decrypt', trace);
    return this.milService.decryptPayload<T>(tenantId, encryptedPayload);
  }

  async recordModelInvocation(trace: MilTraceContext, result: 'requested' | 'completed' | 'failed', metadata?: Record<string, unknown>) {
    if (!this.flags.isWrapperEnabled()) {
      return;
    }

    const action = `model.invoke.${result}`;
    const success = result !== 'failed';
    const eventMetadata = {
      traceId: trace.traceId,
      modelProvider: trace.modelProvider,
      modelName: trace.modelName,
      modelVersion: trace.modelVersion,
      tenantId: trace.tenantId,
      ...metadata,
    };

    await this.modelAccessTraceService.record({
      operation: 'model_invoke',
      result,
      trace,
      metadata: eventMetadata,
    });

    try {
      await this.auditLogService.record({
        orgId: trace.orgId,
        actorId: trace.actorUserId,
        module: trace.module,
        action,
        entityType: trace.entityType,
        entityId: trace.entityId,
        result: success ? 'SUCCESS' : 'FAILURE',
        metadata: eventMetadata,
      });
    } catch (error) {
      this.logger.warn(`Failed to write audit log for trace ${trace.traceId}: ${String(error)}`);
    }

    if (this.flags.isAuditPersistEnabled()) {
      try {
        await this.milAuditEventService.record({
          traceId: trace.traceId,
          orgId: trace.orgId,
          actorId: trace.actorUserId,
          module: trace.module,
          action,
          entityType: trace.entityType,
          entityId: trace.entityId,
          result: success ? 'SUCCESS' : 'FAILURE',
          metadata: eventMetadata,
        });
      } catch (error) {
        this.logger.warn(`Failed to persist MIL audit event for trace ${trace.traceId}: ${String(error)}`);
      }

      try {
        await this.securityEventsService.logEvent({
          type: success ? SecurityEventType.PROPERTY_OS_ANALYSIS_SUCCESS : SecurityEventType.PROPERTY_OS_ANALYSIS_FAILURE,
          success,
          userId: trace.actorUserId ?? undefined,
          metadata: {
            traceId: trace.traceId,
            module: trace.module,
            action,
            modelProvider: trace.modelProvider,
            modelName: trace.modelName,
            modelVersion: trace.modelVersion,
            tenantId: trace.tenantId,
            orgId: trace.orgId,
            ...metadata,
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to persist security event for trace ${trace.traceId}: ${String(error)}`);
      }
    }
  }
}
