import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CryptoService } from '../mil/crypto.service';
import { KeyringService } from '../mil/keyring.service';
import { PrismaService } from '../prisma/prisma.service';

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
  private static readonly SYSTEM_AUDIT_SCOPE = 'audit:system';
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly keyringService: KeyringService,
  ) {}

  async record(event: AuditLogEvent): Promise<void> {
    const timestamp = new Date();
    const payload = {
      timestamp: timestamp.toISOString(),
      orgId: event.orgId ?? null,
      actorId: event.actorId ?? null,
      module: event.module,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      result: event.result,
      metadata: event.metadata ?? null,
    };

    this.logger.log(
      JSON.stringify({
        kind: 'AUDIT_EVENT',
        ...payload,
      }),
    );

    try {
      const serializedPayload = JSON.stringify(payload, this.jsonReplacer);
      const scope = this.resolveAuditScope(event.orgId);
      const activeKey = this.keyringService.getActiveKey(scope);
      const envelope = this.cryptoService.encrypt(
        serializedPayload,
        activeKey.key,
        activeKey.keyId,
      );

      await this.prisma.auditLog.create({
        data: {
          event: this.toCompositeEventName(event.module, event.action),
          userId: this.normalizeActorId(event.actorId),
          payload: envelope.encryptedData,
          iv: envelope.iv,
          authTag: envelope.authTag,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist audit log ${this.toCompositeEventName(event.module, event.action)} for entity ${event.entityType}:${String(event.entityId ?? 'unknown')}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async log(action: string, actorId?: string | null, metadata?: Record<string, unknown>): Promise<void> {
    await this.record({
      actorId: actorId ?? null,
      module: 'TENANT',
      action,
      entityType: 'TenantActivity',
      entityId:
        typeof metadata?.tenantId === 'string' || typeof metadata?.tenantId === 'number'
          ? metadata.tenantId
          : undefined,
      result: 'SUCCESS',
      metadata,
    });
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
        },
      });
    } catch (error) {
      // If the audit log fails, the UI doesn't break, but we must log it to standard out
      this.logger.error(
        `CRITICAL: Failed to write audit log for intent ${payload.intent}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private resolveAuditScope(orgId?: string): string {
    const normalizedOrgId = orgId?.trim();
    return normalizedOrgId?.length ? normalizedOrgId : AuditLogService.SYSTEM_AUDIT_SCOPE;
  }

  private toCompositeEventName(module: string, action: string): string {
    return `${module.trim().toUpperCase()}.${action.trim().toUpperCase()}`;
  }

  private normalizeActorId(actorId?: string | number | null): string | null {
    if (typeof actorId !== 'string') {
      return null;
    }

    const normalized = actorId.trim();
    return AuditLogService.UUID_PATTERN.test(normalized) ? normalized : null;
  }

  private jsonReplacer(_key: string, value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    return value;
  }
}
