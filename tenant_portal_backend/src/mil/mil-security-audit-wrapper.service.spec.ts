import { MilSecurityAuditWrapperService } from './mil-security-audit-wrapper.service';

describe('MilSecurityAuditWrapperService', () => {
  const baseTrace = {
    traceId: 'trace-1',
    orgId: 'org-1',
    tenantId: 'tenant-1',
    actorUserId: 'user-1',
    module: 'rent-optimization',
    action: 'predict',
    entityType: 'unit',
    entityId: 'u1',
    modelProvider: 'internal',
    modelName: 'predictor',
    modelVersion: '1',
  };

  const build = (flags: { wrapperEnabled: boolean; auditPersistEnabled: boolean; encryptAtRestEnabled: boolean }) => {
    const policyService = { assertAllowed: jest.fn().mockResolvedValue(undefined) } as any;
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const securityEventsService = { logEvent: jest.fn().mockResolvedValue(undefined) } as any;
    const modelAccessTraceService = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const milAuditEventService = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const milService = {
      encryptPayload: jest.fn().mockReturnValue({ encryptedData: 'abc' }),
      decryptPayload: jest.fn().mockReturnValue({ ok: true }),
    } as any;
    const featureFlags = {
      isWrapperEnabled: jest.fn(() => flags.wrapperEnabled),
      isAuditPersistEnabled: jest.fn(() => flags.auditPersistEnabled),
      isEncryptAtRestEnabled: jest.fn(() => flags.encryptAtRestEnabled),
    } as any;

    const svc = new MilSecurityAuditWrapperService(
      policyService,
      auditLogService,
      securityEventsService,
      modelAccessTraceService,
      milAuditEventService,
      featureFlags,
      milService,
    );

    return { svc, policyService, auditLogService, securityEventsService, modelAccessTraceService, milAuditEventService, milService };
  };

  it('no-ops access checks when wrapper flag is disabled', async () => {
    const { svc, policyService, modelAccessTraceService } = build({
      wrapperEnabled: false,
      auditPersistEnabled: false,
      encryptAtRestEnabled: false,
    });

    await expect(svc.assertAccess('model_invoke', baseTrace as any)).resolves.toBeUndefined();
    expect(policyService.assertAllowed).not.toHaveBeenCalled();
    expect(modelAccessTraceService.record).not.toHaveBeenCalled();
  });

  it('records requested invocation and skips DB persistence when audit persist disabled', async () => {
    const { svc, modelAccessTraceService, auditLogService, milAuditEventService, securityEventsService } = build({
      wrapperEnabled: true,
      auditPersistEnabled: false,
      encryptAtRestEnabled: true,
    });

    await svc.recordModelInvocation(baseTrace as any, 'requested', { latencyMs: 7 });

    expect(modelAccessTraceService.record).toHaveBeenCalledTimes(1);
    expect(auditLogService.record).toHaveBeenCalledTimes(1);
    expect(milAuditEventService.record).not.toHaveBeenCalled();
    expect(securityEventsService.logEvent).not.toHaveBeenCalled();
  });

  it('requires encrypt-at-rest flag for encrypt/decrypt wrapper methods', async () => {
    const { svc } = build({
      wrapperEnabled: true,
      auditPersistEnabled: false,
      encryptAtRestEnabled: false,
    });

    await expect(svc.encryptPayload('tenant-1', { x: 1 }, baseTrace as any)).rejects.toThrow(
      'MIL encrypt-at-rest disabled by feature flag',
    );
    await expect(svc.decryptPayload('tenant-1', '{"foo":"bar"}', baseTrace as any)).rejects.toThrow(
      'MIL encrypt-at-rest disabled by feature flag',
    );
  });
});
