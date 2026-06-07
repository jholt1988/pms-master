import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CryptoService } from '../mil/crypto.service';
import { KeyringService } from '../mil/keyring.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEnvelope } from '../common/events/event-envelope';
import { redactPii } from './pii-redaction';

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
    const metadata = event.metadata ? redactPii(event.metadata) : null;
    const payload = {
      timestamp: timestamp.toISOString(),
      orgId: event.orgId ?? null,
      actorId: event.actorId ?? null,
      module: event.module,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      result: event.result,
      metadata,
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

  async recordEnvelope(envelope: EventEnvelope, params?: {
    module?: string;
    action?: string;
    entityType?: string;
    entityId?: string | number;
    result?: AuditResult;
  }): Promise<void> {
    await this.record({
      orgId: envelope.organizationId,
      actorId: envelope.actorId ?? null,
      module: params?.module ?? envelope.source,
      action: params?.action ?? envelope.type,
      entityType: params?.entityType ?? envelope.subject?.type ?? 'EventEnvelope',
      entityId: params?.entityId ?? envelope.subject?.id ?? envelope.id,
      result: params?.result ?? 'SUCCESS',
      metadata: {
        eventEnvelopeId: envelope.id,
        eventType: envelope.type,
        eventVersion: envelope.version,
        occurredAt: envelope.occurredAt,
        correlationId: envelope.correlationId,
        idempotencyKey: envelope.idempotencyKey,
        payload: envelope.payload,
      },
    });
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

  async query(params: {
    entityId?: string;
    module?: string;
    actorId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ data: Array<Record<string, unknown>>; total: number }> {
    const where: Record<string, unknown> = {};
    if (params.actorId) where.userId = params.actorId;
    if (params.module) where.event = { startsWith: params.module.toUpperCase() + '.' };
    if (params.startDate || params.endDate) {
      where.createdAt = {
        ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
        ...(params.endDate ? { lte: new Date(params.endDate) } : {}),
      };
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit ?? 50,
        skip: params.skip ?? 0,
        include: { user: { select: { id: true, username: true, firstName: true, lastName: true } } },
      }),
    ]);

    const data = logs.map((log) => {
      let decrypted: Record<string, unknown> = {};
      try {
        const scope = AuditLogService.SYSTEM_AUDIT_SCOPE;
        const activeKey = this.keyringService.getActiveKey(scope);
        const plain = this.cryptoService.decrypt(
          { encVersion: 'v1', algorithm: 'aes-256-gcm', encryptedData: log.payload, iv: log.iv, authTag: log.authTag, keyId: activeKey.keyId, payloadDigest: '' },
          activeKey.key,
        );
        decrypted = JSON.parse(plain) as Record<string, unknown>;
      } catch {
        decrypted = { raw: log.event };
      }

      // Filter by entityId post-decrypt if requested
      if (params.entityId && decrypted.entityId !== params.entityId) return null;

      return {
        id: log.id,
        event: log.event,
        createdAt: log.createdAt,
        actor: log.user
          ? { id: log.user.id, name: [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.username }
          : null,
        ...decrypted,
      };
    }).filter(Boolean);

    return { data: data as Array<Record<string, unknown>>, total };
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
