import { createDecipheriv } from 'crypto';
import { CryptoService } from '../mil/crypto.service';
import { KeyringService } from '../mil/keyring.service';
import { AuditLogEvent, AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  const orgId = '11111111-1111-4111-8111-111111111111';
  const actorId = '22222222-2222-4222-8222-222222222222';

  let prisma: {
    auditLog: { create: jest.Mock };
    workflowExecution: { create: jest.Mock };
  };
  let keyringService: KeyringService;
  let service: AuditLogService;

  beforeEach(() => {
    process.env.MIL_MASTER_KEY = 'unit-test-master-key';

    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      workflowExecution: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    keyringService = new KeyringService();
    service = new AuditLogService(
      prisma as any,
      new CryptoService(),
      keyringService,
    );

    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.MIL_MASTER_KEY;
    jest.restoreAllMocks();
  });

  it('persists an encrypted AuditLog row with composite event and mapped userId', async () => {
    const occurredAt = new Date('2026-04-11T12:00:00.000Z');
    const event: AuditLogEvent = {
      orgId,
      actorId,
      module: 'payments',
      action: 'payment_created',
      entityType: 'Payment',
      entityId: 123,
      result: 'SUCCESS',
      metadata: {
        amount: 1200,
        occurredAt,
      },
    };

    await service.record(event);

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event: 'PAYMENTS.PAYMENT_CREATED',
        userId: actorId,
        payload: expect.any(String),
        iv: expect.any(String),
        authTag: expect.any(String),
      }),
    });

    const persisted = prisma.auditLog.create.mock.calls[0][0].data;
    const decrypted = decryptPersistedPayload(persisted, keyringService, orgId);

    expect(decrypted).toMatchObject({
      orgId,
      actorId,
      module: 'payments',
      action: 'payment_created',
      entityType: 'Payment',
      entityId: 123,
      result: 'SUCCESS',
      metadata: {
        amount: 1200,
        occurredAt: occurredAt.toISOString(),
      },
    });
    expect(typeof decrypted.timestamp).toBe('string');
  });

  it('uses the shared system audit scope when orgId is missing', async () => {
    const event: AuditLogEvent = {
      actorId: null,
      module: 'privacy',
      action: 'export_requested',
      entityType: 'PrivacyRequest',
      entityId: 'request-123',
      result: 'SUCCESS',
      metadata: { reason: 'self-service' },
    };

    await service.record(event);

    const persisted = prisma.auditLog.create.mock.calls[0][0].data;
    const decrypted = decryptPersistedPayload(
      persisted,
      keyringService,
      'audit:system',
    );

    expect(decrypted.orgId).toBeNull();
    expect(decrypted.actorId).toBeNull();
    expect(decrypted.module).toBe('privacy');
    expect(decrypted.action).toBe('export_requested');
  });

  it('redacts PII and secrets before logging or persisting audit metadata', async () => {
    await service.record({
      orgId,
      actorId,
      module: 'auth',
      action: 'login_failed',
      entityType: 'User',
      entityId: 'user-123',
      result: 'FAILURE',
      metadata: {
        email: 'tenant@example.com',
        phoneNumber: '+1 316 555 1212',
        password: 'plain-text-password',
        authorization: 'Bearer secret-token',
        nested: {
          ssn: '123-45-6789',
          note: 'operator-visible reason',
        },
        contacts: [
          { type: 'email', value: 'resident@example.com' },
          { type: 'reference', value: 'safe value' },
        ],
      },
    });

    const logPayload = JSON.parse(((service as any).logger.log as jest.Mock).mock.calls[0][0]);
    expect(logPayload.metadata).toMatchObject({
      email: '[REDACTED]',
      phoneNumber: '[REDACTED]',
      password: '[REDACTED]',
      authorization: '[REDACTED]',
      nested: {
        ssn: '[REDACTED]',
        note: 'operator-visible reason',
      },
      contacts: [
        { type: 'email', value: '[REDACTED]' },
        { type: 'reference', value: 'safe value' },
      ],
    });

    const persisted = prisma.auditLog.create.mock.calls[0][0].data;
    const decrypted = decryptPersistedPayload(persisted, keyringService, orgId);
    expect(decrypted.metadata).toEqual(logPayload.metadata);
    expect(JSON.stringify(decrypted.metadata)).not.toContain('tenant@example.com');
    expect(JSON.stringify(decrypted.metadata)).not.toContain('plain-text-password');
    expect(JSON.stringify(decrypted.metadata)).not.toContain('123-45-6789');
  });

  it('redacts nested EventEnvelope payload metadata', async () => {
    await service.recordEnvelope({
      id: 'event-123',
      type: 'application.submitted',
      version: 1,
      source: 'rental-application',
      occurredAt: '2026-06-07T12:00:00.000Z',
      organizationId: orgId,
      actorId,
      correlationId: 'corr-123',
      idempotencyKey: 'idem-123',
      subject: { type: 'Application', id: 'app-123' },
      payload: {
        applicantEmail: 'applicant@example.com',
        applicantPhone: '316-555-0000',
        screening: {
          socialSecurityNumber: '123456789',
          score: 720,
        },
      },
    });

    const persisted = prisma.auditLog.create.mock.calls[0][0].data;
    const decrypted = decryptPersistedPayload(persisted, keyringService, orgId);

    expect(decrypted.metadata).toMatchObject({
      eventEnvelopeId: 'event-123',
      eventType: 'application.submitted',
      eventVersion: 1,
      correlationId: 'corr-123',
      idempotencyKey: '[REDACTED]',
      payload: {
        applicantEmail: '[REDACTED]',
        applicantPhone: '[REDACTED]',
        screening: {
          socialSecurityNumber: '[REDACTED]',
          score: 720,
        },
      },
    });
  });

  it('does not throw when AuditLog persistence fails', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.record({
        orgId,
        actorId,
        module: 'payments',
        action: 'payment_created',
        entityType: 'Payment',
        entityId: 456,
        result: 'FAILURE',
        metadata: { reason: 'gateway_timeout' },
      }),
    ).resolves.toBeUndefined();

    expect((service as any).logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to persist audit log PAYMENTS.PAYMENT_CREATED'),
      expect.stringContaining('database unavailable'),
    );
  });

  it('routes tenant helper logging through record()', async () => {
    const recordSpy = jest.spyOn(service, 'record').mockResolvedValue(undefined);

    await service.log('TENANT_PROFILE_UPDATED', actorId, {
      tenantId: 'tenant-123',
      changes: { preferredName: 'Pat' },
    });

    expect(recordSpy).toHaveBeenCalledWith({
      actorId,
      module: 'TENANT',
      action: 'TENANT_PROFILE_UPDATED',
      entityType: 'TenantActivity',
      entityId: 'tenant-123',
      result: 'SUCCESS',
      metadata: {
        tenantId: 'tenant-123',
        changes: { preferredName: 'Pat' },
      },
    });
  });
});

function decryptPersistedPayload(
  persisted: { payload: string; iv: string; authTag: string },
  keyringService: KeyringService,
  scope: string,
) {
  const activeKey = keyringService.getActiveKey(scope);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    activeKey.key,
    Buffer.from(persisted.iv, 'base64'),
  );

  decipher.setAuthTag(Buffer.from(persisted.authTag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(persisted.payload, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(decrypted);
}
