import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaseStatus } from '@prisma/client';
import { LeaseService } from './lease.service';

const LEASE_ID = '11111111-1111-4111-8111-111111111111';
const UNIT_ID = '22222222-2222-4222-8222-222222222222';
const TENANT_ID = '33333333-3333-4333-8333-333333333333';
const ACTOR_ID = '44444444-4444-4444-8444-444444444444';
const ORG_ID = 'org_123';

describe('LeaseService core lease workflows', () => {
  let service: LeaseService;
  let prisma: any;
  let aiLeaseRenewalService: any;
  let auditLogService: any;

  const lease = (overrides: Record<string, unknown> = {}) => ({
    id: LEASE_ID,
    tenantId: TENANT_ID,
    unitId: UNIT_ID,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-12-31T00:00:00.000Z'),
    rentAmount: 1800,
    depositAmount: 1800,
    status: LeaseStatus.ACTIVE,
    renewalDueAt: null,
    unit: { id: UNIT_ID, name: 'Unit 1A', propertyId: 'property_1', property: { id: 'property_1', organizationId: ORG_ID } },
    tenant: { id: TENANT_ID, username: 'tenant@example.com', role: 'TENANT' },
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      unit: { findFirst: jest.fn() },
      lease: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      leaseHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      leaseRenewalOffer: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      scheduleEvent: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    aiLeaseRenewalService = { getRentAdjustmentRecommendation: jest.fn() };
    auditLogService = { record: jest.fn() };
    service = new LeaseService(prisma, aiLeaseRenewalService, auditLogService);
  });

  describe('createLease', () => {
    it('rejects leases whose end date is not after the start date before writing', async () => {
      await expect(
        service.createLease({
          tenantId: TENANT_ID,
          unitId: UNIT_ID,
          startDate: '2026-06-01',
          endDate: '2026-06-01',
          rentAmount: 1800,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.lease.create).not.toHaveBeenCalled();
      expect(prisma.leaseHistory.create).not.toHaveBeenCalled();
    });

    it('enforces organization ownership before creating a lease', async () => {
      prisma.unit.findFirst.mockResolvedValue(null);

      await expect(
        service.createLease({
          tenantId: TENANT_ID,
          unitId: UNIT_ID,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          rentAmount: 1800,
        } as any, ORG_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.unit.findFirst).toHaveBeenCalledWith({
        where: { id: UNIT_ID, property: { organizationId: ORG_ID } },
        select: { id: true },
      });
      expect(prisma.lease.create).not.toHaveBeenCalled();
    });

    it('creates the lease and records creation history with normalized defaults', async () => {
      const createdLease = lease({ status: LeaseStatus.ACTIVE });
      prisma.unit.findFirst.mockResolvedValue({ id: UNIT_ID });
      prisma.lease.create.mockResolvedValue(createdLease);
      prisma.leaseHistory.create.mockResolvedValue({ id: 'history_1' });

      const result = await service.createLease({
        tenantId: TENANT_ID,
        unitId: UNIT_ID,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        rentAmount: 1800,
      } as any, ORG_ID);

      expect(result).toBe(createdLease);
      expect(prisma.lease.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          unitId: UNIT_ID,
          rentAmount: 1800,
          status: LeaseStatus.ACTIVE,
          noticePeriodDays: 30,
          autoRenew: false,
          depositAmount: 0,
          moveInAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      }));
      expect(prisma.leaseHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lease: { connect: { id: LEASE_ID } },
          toStatus: LeaseStatus.ACTIVE,
          note: 'Lease created',
          rentAmount: 1800,
          depositAmount: 1800,
        }),
      });
    });
  });

  describe('updateLeaseStatus', () => {
    it('throws NotFoundException when org-scoped lease lookup misses', async () => {
      prisma.lease.findFirst.mockResolvedValue(null);

      await expect(
        service.updateLeaseStatus(LEASE_ID, { status: LeaseStatus.TERMINATED } as any, ACTOR_ID, ORG_ID),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.lease.update).not.toHaveBeenCalled();
      expect(prisma.leaseHistory.create).not.toHaveBeenCalled();
    });

    it('updates status fields and records the transition history', async () => {
      const existing = lease({ status: LeaseStatus.ACTIVE });
      const updated = lease({ status: LeaseStatus.NOTICE_GIVEN, moveOutAt: new Date('2026-11-30T00:00:00.000Z') });
      prisma.lease.findFirst.mockResolvedValue(existing);
      prisma.lease.update.mockResolvedValue(updated);
      prisma.leaseHistory.create.mockResolvedValue({ id: 'history_2' });

      const result = await service.updateLeaseStatus(
        LEASE_ID,
        { status: LeaseStatus.NOTICE_GIVEN, moveOutAt: '2026-11-30' } as any,
        ACTOR_ID,
        ORG_ID,
      );

      expect(result).toBe(updated);
      expect(prisma.lease.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: LEASE_ID, unit: { property: { organizationId: ORG_ID } } },
      }));
      expect(prisma.lease.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: LEASE_ID },
        data: expect.objectContaining({
          status: LeaseStatus.NOTICE_GIVEN,
          moveOutAt: new Date('2026-11-30T00:00:00.000Z'),
        }),
      }));
      expect(prisma.leaseHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lease: { connect: { id: LEASE_ID } },
          actor: { connect: { id: ACTOR_ID } },
          fromStatus: LeaseStatus.ACTIVE,
          toStatus: LeaseStatus.NOTICE_GIVEN,
          note: 'Lease status updated',
        }),
      });
    });
  });

  describe('getLeasesExpiringInDays', () => {
    it('queries active leases ending inside the renewal window and excludes already-offered renewals', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-04-30T21:33:00.000Z'));
      prisma.lease.findMany.mockResolvedValue([lease()]);

      await expect(service.getLeasesExpiringInDays(60)).resolves.toHaveLength(1);

      expect(prisma.lease.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          status: LeaseStatus.ACTIVE,
          renewalOfferedAt: null,
          endDate: {
            gte: new Date('2026-04-30T16:00:00.000Z'),
            lte: new Date('2026-06-29T16:00:00.000Z'),
          },
        }),
        orderBy: { endDate: 'asc' },
      }));

      jest.useRealTimers();
    });
  });
});
