import { EsignEnvelopeStatus, LeaseRenewalStatus, LeaseStatus, Role } from '@prisma/client';
import { OperatorRenewalsService } from './operator-renewals.service';

const lease = {
  id: 'lease-1',
  status: LeaseStatus.RENEWAL_PENDING,
  tenantId: 'tenant-1',
  tenant: { id: 'tenant-1', username: 'Taylor Tenant', email: 'tenant@example.com' },
  unitId: 'unit-1',
  unit: { id: 'unit-1', unitNumber: '2A', name: null, property: { id: 'property-1', name: 'Oak House' }, propertyId: 'property-1' },
  rentAmount: 1200,
  endDate: new Date('2026-08-31T00:00:00Z'),
  renewalDueAt: new Date('2026-07-31T00:00:00Z'),
  moveOutAt: null,
  renewalOffers: [{
    id: 7,
    proposedRent: 1250,
    proposedStart: new Date('2026-09-01T00:00:00Z'),
    proposedEnd: new Date('2027-08-31T00:00:00Z'),
    status: LeaseRenewalStatus.ACCEPTED,
    expiresAt: null,
    respondedAt: new Date('2026-06-04T00:00:00Z'),
  }],
  esignEnvelopes: [],
  notices: [],
};

describe('OperatorRenewalsService', () => {
  it('returns renewal workbench metrics and next actions', async () => {
    const prisma = {
      lease: {
        findMany: jest.fn().mockResolvedValue([
          lease,
          {
            ...lease,
            id: 'lease-2',
            renewalOffers: [],
            esignEnvelopes: [{
              id: 3,
              status: EsignEnvelopeStatus.SENT,
              providerStatus: 'sent',
              participants: [{ id: 1, name: 'Taylor Tenant', email: 'tenant@example.com', status: 'SENT' }],
            }],
          },
        ]),
      },
    };
    const service = new OperatorRenewalsService(prisma as any, {} as any, {} as any, {} as any);

    const result = await service.getWorkbench('org-1', { userId: 'actor-1', role: Role.PROPERTY_MANAGER });

    expect(prisma.lease.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ unit: { property: { organizationId: 'org-1' } } }),
    }));
    expect(result.metrics.expiringLeases).toBe(2);
    expect(result.metrics.offersAccepted).toBe(1);
    expect(result.leases[0].nextAction).toBe('send_signature');
    expect(result.leases[1].nextAction).toBe('create_offer');
  });

  it('records renewal response on behalf of tenant and audits operator action', async () => {
    const prisma = {
      lease: { findFirst: jest.fn().mockResolvedValue(lease) },
    };
    const leaseService = {
      respondToRenewalOffer: jest.fn().mockResolvedValue({ id: 'lease-1' }),
    };
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new OperatorRenewalsService(prisma as any, leaseService as any, {} as any, auditLogService as any);

    await service.recordResponse(
      'org-1',
      { userId: 'actor-1', role: Role.PROPERTY_MANAGER },
      'lease-1',
      7,
      { decision: 'ACCEPTED', message: 'Tenant confirmed by phone.' },
    );

    expect(leaseService.respondToRenewalOffer).toHaveBeenCalledWith(
      'lease-1',
      7,
      { decision: 'ACCEPTED', message: 'Tenant confirmed by phone.' },
      'tenant-1',
      'org-1',
    );
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
      module: 'operator-renewals',
      action: 'RENEWAL_RESPONSE_RECORDED_BY_OPERATOR',
      entityId: 'lease-1',
    }));
  });
});
