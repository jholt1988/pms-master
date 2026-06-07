import { EsignEnvelopeStatus, EsignParticipantStatus, LeaseStatus, Role } from '@prisma/client';
import { OperatorLeaseSigningService } from './operator-lease-signing.service';

const lease = {
  id: 'lease-1',
  status: LeaseStatus.DRAFT,
  tenantId: 'tenant-1',
  tenant: { id: 'tenant-1', username: 'Taylor Tenant', email: 'tenant@example.com' },
  unitId: 'unit-1',
  unit: { id: 'unit-1', unitNumber: '2A', name: null, property: { id: 'property-1', name: 'Oak House' } },
  startDate: new Date('2026-07-01T00:00:00Z'),
  endDate: new Date('2027-06-30T00:00:00Z'),
  rentAmount: 1200,
  depositAmount: 1200,
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-02T00:00:00Z'),
  generalDocuments: [{ id: 1 }],
  documents: [],
  esignEnvelopes: [],
};

describe('OperatorLeaseSigningService', () => {
  it('returns org-scoped signing metrics and next actions', async () => {
    const prisma = {
      lease: {
        findMany: jest.fn().mockResolvedValue([
          lease,
          {
            ...lease,
            id: 'lease-2',
            esignEnvelopes: [{
              id: 7,
              providerEnvelopeId: 'provider-7',
              status: EsignEnvelopeStatus.SENT,
              providerStatus: 'sent',
              signedPdfDocumentId: null,
              auditTrailDocumentId: null,
              createdAt: new Date('2026-06-03T00:00:00Z'),
              updatedAt: new Date('2026-06-03T00:00:00Z'),
              participants: [{ id: 11, name: 'Taylor Tenant', email: 'tenant@example.com', role: 'TENANT', status: EsignParticipantStatus.SENT, userId: 'tenant-1' }],
            }],
          },
        ]),
      },
    };
    const esignatureService = { getSignatureRiskQueue: jest.fn().mockResolvedValue({ count: 1, items: [] }) };
    const service = new OperatorLeaseSigningService(prisma as any, {} as any, esignatureService as any, {} as any);

    const result = await service.getWorkbench('org-1', { userId: 'actor-1', role: Role.PROPERTY_MANAGER });

    expect(prisma.lease.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ unit: { property: { organizationId: 'org-1' } } }),
    }));
    expect(result.metrics).toMatchObject({ draftLeases: 2, packetsReady: 1, envelopesSent: 1, riskItems: 1 });
    expect(result.items[0].nextAction).toBe('send_for_signature');
    expect(result.items[1].nextAction).toBe('monitor_signature');
  });

  it('sends an envelope through EsignatureService and records audit', async () => {
    const prisma = {
      lease: {
        findFirst: jest.fn().mockResolvedValue(lease),
      },
    };
    const esignatureService = {
      createEnvelope: jest.fn().mockResolvedValue({ id: 9, providerEnvelopeId: 'provider-9' }),
    };
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new OperatorLeaseSigningService(prisma as any, {} as any, esignatureService as any, auditLogService as any);

    await service.sendEnvelope('org-1', { userId: 'actor-1', role: Role.PROPERTY_MANAGER }, 'lease-1', {});

    expect(esignatureService.createEnvelope).toHaveBeenCalledWith(
      'lease-1',
      expect.objectContaining({
        templateId: 'LEASE_PACKET_V1',
        recipients: [expect.objectContaining({ email: 'tenant@example.com', userId: 'tenant-1' })],
      }),
      'actor-1',
    );
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
      orgId: 'org-1',
      actorId: 'actor-1',
      module: 'operator-lease-signing',
      action: 'LEASE_ENVELOPE_SENT',
      entityType: 'Lease',
      entityId: 'lease-1',
    }));
  });
});
