// apps/api/src/audit/mil.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { KeyringService } from './keyring.service';
import { MilEnvelope } from './mil-envelope.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MilService {
  private readonly logger = new Logger(MilService.name);

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly keyringService: KeyringService,
    private readonly prisma: PrismaService,
  ) {}

  encryptPayload(tenantId: string, payload: object): MilEnvelope {
    const tenantKey = this.keyringService.getActiveKey(tenantId);
    return this.cryptoService.encrypt(JSON.stringify(payload), tenantKey.key, tenantKey.keyId);
  }

  decryptPayload<T>(tenantId: string, encryptedPayload: MilEnvelope | string): T {
    const envelope = typeof encryptedPayload === 'string'
      ? JSON.parse(encryptedPayload) as MilEnvelope
      : encryptedPayload;

    const tenantKey = this.keyringService.getActiveKey(tenantId);

    if (envelope.keyId !== tenantKey.keyId) {
      throw new Error(`MIL key mismatch. Expected ${tenantKey.keyId}, got ${envelope.keyId}`);
    }

    const decrypted = this.cryptoService.decrypt(envelope, tenantKey.key);
    return JSON.parse(decrypted) as T;
  }

  async encryptAndLog(event: string, payload: any, userId?: string) {
    try {
      // 1. Multi-tenancy enforcement
      const tenantId = payload.tenantId;
      if (!tenantId) {
        throw new Error('tenantId is required in the payload to derive MIL encryption keys.');
      }

      // 2. Generate the MilEnvelope using the dedicated Crypto & Keyring services
      const encryptedPayload = this.encryptPayload(tenantId, payload);

      // 3. Persist to PostgreSQL via Prisma
      const logEntry = await this.prisma.milAuditEvent.create({
        data: {
          event,
          traceId: payload.traceId,
          orgId: payload.orgId,
          actorId: userId,
          module: 'MIL',
          action: event,
          entityType: 'MilEnvelope',
          entityId: payload.entityId ? String(payload.entityId) : undefined,
          result: 'ENCRYPTED',
          metadata: {
            tenantId,
            envelope: encryptedPayload,
          } as any,
        },
      });

      this.logger.log(`MIL event [${event}] safely logged for tenant [${tenantId}]`);
      return logEntry;

    } catch (error) {
      this.logger.error(`Failed to encrypt and log event: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to encrypt and log event');
    }
  }
}
