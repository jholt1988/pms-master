import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaseNoticeDeliveryMethod, LeaseNoticeType, LeaseRenewalStatus, LeaseStatus } from '@prisma/client';
import { LeaseService } from './lease.service';
import { RenewalDecision } from './dto/respond-renewal-offer.dto';

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
        update: jest.fn(),
      },
      leaseNotice: {
        create: jest.fn(),
      },
      scheduleEvent: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      propertyMarketingProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: { findFirst: jest.fn() },
      unitInspection: { create: jest.fn() },
      $transaction: jest.fn(async (operations: unknown[]) => Promise.all(operations)),
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

  describe('createRenewalOffer', () => {
    it('uses AI rent recommendations, moves the lease to renewal pending, schedules follow-up, and audits', async () => {
      const existing = lease({ status: LeaseStatus.ACTIVE, rentAmount: 1800 });
      const updated = lease({ status: LeaseStatus.RENEWAL_PENDING, renewalDueAt: new Date('2026-11-30T00:00:00.000Z') });
      prisma.lease.findFirst.mockResolvedValue(existing);
      aiLeaseRenewalService.getRentAdjustmentRecommendation.mockResolvedValue({
        recommendedRent: 1875,
        adjustmentPercentage: 4.2,
        reasoning: 'Market rent supports a modest increase.',
        factors: [{ name: 'market', impact: 0.7, description: 'Comparable rents increased' }],
      });
      prisma.leaseRenewalOffer.create.mockResolvedValue({ id: 'offer_1', expiresAt: new Date('2026-11-30T00:00:00.000Z') });
      prisma.lease.update.mockResolvedValue(updated);
      prisma.leaseHistory.create.mockResolvedValue({ id: 'history_renewal' });
      prisma.scheduleEvent.findFirst.mockResolvedValue(null);
      prisma.scheduleEvent.create.mockResolvedValue({ id: 'event_renewal' });
      auditLogService.record.mockResolvedValue(undefined);

      const result = await service.createRenewalOffer(
        LEASE_ID,
        {
          proposedStart: '2027-01-01',
          proposedEnd: '2027-12-31',
          expiresAt: '2026-11-30',
        } as any,
        ACTOR_ID,
        ORG_ID,
      );

      expect(result).toBe(updated);
      expect(aiLeaseRenewalService.getRentAdjustmentRecommendation).toHaveBeenCalledWith(Number(LEASE_ID));
      expect(prisma.leaseRenewalOffer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leaseId: LEASE_ID,
          proposedRent: 1875,
          proposedStart: new Date('2027-01-01T00:00:00.000Z'),
          proposedEnd: new Date('2027-12-31T00:00:00.000Z'),
          message: 'Market rent supports a modest increase.',
          status: LeaseRenewalStatus.OFFERED,
          respondedById: ACTOR_ID,
        }),
      });
      expect(prisma.lease.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: LEASE_ID },
        data: expect.objectContaining({ status: LeaseStatus.RENEWAL_PENDING }),
      }));
      expect(prisma.scheduleEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'LEASE_RENEWAL',
          priority: 'HIGH',
          tenantId: TENANT_ID,
          unitId: UNIT_ID,
        }),
      });
      expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        orgId: ORG_ID,
        actorId: ACTOR_ID,
        module: 'LEASE',
        action: 'LEASE_RENEWAL_OFFER_CREATED',
        result: 'SUCCESS',
        metadata: expect.objectContaining({ aiRentUsed: true, proposedRent: 1875 }),
      }));
    });

    it('rejects renewal offers with invalid proposed date order before writing', async () => {
      prisma.lease.findFirst.mockResolvedValue(lease());

      await expect(
        service.createRenewalOffer(
          LEASE_ID,
          { proposedStart: '2027-12-31', proposedEnd: '2027-01-01', proposedRent: 1900 } as any,
          ACTOR_ID,
          ORG_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.leaseRenewalOffer.create).not.toHaveBeenCalled();
      expect(prisma.lease.update).not.toHaveBeenCalled();
    });
  });

  describe('respondToRenewalOffer', () => {
    it('accepts an active renewal offer, updates lease terms, records history, and audits', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
      const existing = lease({ status: LeaseStatus.RENEWAL_PENDING, rentAmount: 1800 });
      const updated = lease({
        status: LeaseStatus.ACTIVE,
        rentAmount: 1900,
        startDate: new Date('2027-01-01T00:00:00.000Z'),
        endDate: new Date('2027-12-31T00:00:00.000Z'),
      });
      const returned = lease({ status: LeaseStatus.ACTIVE, rentAmount: 1900 });
      const offer = {
        id: 77,
        leaseId: LEASE_ID,
        status: LeaseRenewalStatus.OFFERED,
        proposedRent: 1900,
        proposedStart: new Date('2027-01-01T00:00:00.000Z'),
        proposedEnd: new Date('2027-12-31T00:00:00.000Z'),
        escalationPercent: 3,
        expiresAt: new Date('2026-11-01T00:00:00.000Z'),
      };
      prisma.lease.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(returned);
      prisma.leaseRenewalOffer.findUnique.mockResolvedValue(offer);
      prisma.leaseRenewalOffer.update.mockResolvedValue({ ...offer, status: LeaseRenewalStatus.ACCEPTED });
      prisma.lease.update.mockResolvedValue(updated);
      prisma.leaseHistory.create.mockResolvedValue({ id: 'history_response' });
      auditLogService.record.mockResolvedValue(undefined);

      const result = await service.respondToRenewalOffer(
        LEASE_ID,
        77,
        { decision: RenewalDecision.ACCEPTED, message: 'Looks good.' },
        TENANT_ID,
        ORG_ID,
      );

      expect(result).toBe(returned);
      expect(prisma.leaseRenewalOffer.update).toHaveBeenCalledWith({
        where: { id: 77 },
        data: expect.objectContaining({
          status: LeaseRenewalStatus.ACCEPTED,
          respondedBy: { connect: { id: TENANT_ID } },
        }),
      });
      expect(prisma.lease.update).toHaveBeenCalledWith({
        where: { id: LEASE_ID },
        data: expect.objectContaining({
          status: LeaseStatus.ACTIVE,
          startDate: offer.proposedStart,
          endDate: offer.proposedEnd,
          rentAmount: 1900,
          rentEscalationPercent: 3,
          renewalDueAt: null,
        }),
      });
      expect(prisma.leaseHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actor: { connect: { id: TENANT_ID } },
          fromStatus: LeaseStatus.RENEWAL_PENDING,
          toStatus: LeaseStatus.ACTIVE,
          rentAmount: 1900,
          metadata: expect.objectContaining({ renewalOfferId: 77, decision: RenewalDecision.ACCEPTED, message: 'Looks good.' }),
        }),
      });
      expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'LEASE_RENEWAL_OFFER_RESPONDED',
        entityId: 77,
        metadata: expect.objectContaining({
          leaseId: LEASE_ID,
          decision: RenewalDecision.ACCEPTED,
          resultingLeaseStatus: LeaseStatus.ACTIVE,
        }),
      }));
      jest.useRealTimers();
    });

    it('rejects renewal responses from a different tenant before writing', async () => {
      prisma.lease.findFirst.mockResolvedValue(lease({ tenantId: TENANT_ID }));

      await expect(
        service.respondToRenewalOffer(LEASE_ID, 77, { decision: RenewalDecision.DECLINED } as any, ACTOR_ID, ORG_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.leaseRenewalOffer.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('submitTenantNotice', () => {
    it('records tenant move-out notice, schedules follow-up, records history, and audits', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00.000Z'));
      const existing = lease({ status: LeaseStatus.ACTIVE });
      const updated = lease({ status: LeaseStatus.NOTICE_GIVEN, moveOutAt: new Date('2026-10-31T00:00:00.000Z') });
      const returned = lease({ status: LeaseStatus.NOTICE_GIVEN });
      prisma.lease.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(returned);
      prisma.leaseNotice.create.mockResolvedValue({ id: 'tenant_notice_1' });
      prisma.lease.update.mockResolvedValue(updated);
      prisma.leaseHistory.create.mockResolvedValue({ id: 'history_tenant_notice' });
      prisma.scheduleEvent.findFirst.mockResolvedValue(null);
      prisma.scheduleEvent.create.mockResolvedValue({ id: 'event_tenant_moveout' });
      auditLogService.record.mockResolvedValue(undefined);

      const result = await service.submitTenantNotice(
        LEASE_ID,
        { type: LeaseNoticeType.MOVE_OUT, moveOutAt: '2026-10-31', message: 'Moving for work.' } as any,
        TENANT_ID,
        ORG_ID,
      );

      expect(result).toBe(returned);
      expect(prisma.leaseNotice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lease: { connect: { id: LEASE_ID } },
          type: LeaseNoticeType.MOVE_OUT,
          deliveryMethod: LeaseNoticeDeliveryMethod.PORTAL,
          createdBy: { connect: { id: TENANT_ID } },
        }),
      });
      expect(prisma.lease.update).toHaveBeenCalledWith({
        where: { id: LEASE_ID },
        data: expect.objectContaining({
          moveOutAt: new Date('2026-10-31T00:00:00.000Z'),
          status: LeaseStatus.NOTICE_GIVEN,
        }),
      });
      expect(prisma.scheduleEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'MOVE_OUT',
          title: 'Tenant Move-Out - Unit 1A',
          date: new Date('2026-10-31T00:00:00.000Z'),
          priority: 'HIGH',
          tenantId: TENANT_ID,
          unitId: UNIT_ID,
        }),
      });
      expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'TENANT_NOTICE_SUBMITTED',
        metadata: expect.objectContaining({
          noticeType: LeaseNoticeType.MOVE_OUT,
          requestedMoveOut: '2026-10-31T00:00:00.000Z',
          resultingLeaseStatus: LeaseStatus.NOTICE_GIVEN,
        }),
      }));
      jest.useRealTimers();
    });

    it('rejects tenant notices from a different tenant before writing', async () => {
      prisma.lease.findFirst.mockResolvedValue(lease({ tenantId: TENANT_ID }));

      await expect(
        service.submitTenantNotice(LEASE_ID, { type: LeaseNoticeType.MOVE_OUT, moveOutAt: '2026-10-31' } as any, ACTOR_ID, ORG_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.leaseHistory.create).not.toHaveBeenCalled();
    });
  });

  describe('recordLeaseNotice', () => {
    it('records move-out notices, updates status, schedules operations follow-up, and audits', async () => {
      const existing = lease({ status: LeaseStatus.ACTIVE, moveOutAt: new Date('2026-10-31T00:00:00.000Z') });
      const returned = lease({ status: LeaseStatus.NOTICE_GIVEN });
      prisma.lease.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(returned);
      prisma.leaseNotice.create.mockResolvedValue({
        id: 'notice_1',
        lease: existing,
      });
      prisma.lease.update.mockResolvedValue({ ...existing, status: LeaseStatus.NOTICE_GIVEN });
      prisma.leaseHistory.create.mockResolvedValue({ id: 'history_notice' });
      prisma.scheduleEvent.findFirst.mockResolvedValue(null);
      prisma.scheduleEvent.create.mockResolvedValue({ id: 'event_moveout' });
      auditLogService.record.mockResolvedValue(undefined);

      const result = await service.recordLeaseNotice(
        LEASE_ID,
        {
          type: LeaseNoticeType.MOVE_OUT,
          deliveryMethod: LeaseNoticeDeliveryMethod.EMAIL,
          message: 'Tenant submitted move-out notice.',
        } as any,
        ACTOR_ID,
        ORG_ID,
      );

      expect(result).toBe(returned);
      expect(prisma.leaseNotice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lease: { connect: { id: LEASE_ID } },
          type: LeaseNoticeType.MOVE_OUT,
          deliveryMethod: LeaseNoticeDeliveryMethod.EMAIL,
          createdBy: { connect: { id: ACTOR_ID } },
        }),
        include: { lease: true },
      });
      expect(prisma.lease.update).toHaveBeenCalledWith({
        where: { id: LEASE_ID },
        data: { status: LeaseStatus.NOTICE_GIVEN },
      });
      expect(prisma.scheduleEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'MOVE_OUT',
          priority: 'HIGH',
          tenantId: TENANT_ID,
          unitId: UNIT_ID,
        }),
      });
      expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'LEASE_NOTICE_RECORDED',
        entityId: 'notice_1',
        metadata: expect.objectContaining({
          leaseId: LEASE_ID,
          noticeType: LeaseNoticeType.MOVE_OUT,
          statusUpdatedTo: LeaseStatus.NOTICE_GIVEN,
        }),
      }));
    });
  });

  describe('prepareForVacancy', () => {
    it('marks existing marketing as available, schedules move-out inspection, history, schedule follow-up, and audit', async () => {
      const endingLease = lease({
        id: LEASE_ID,
        status: LeaseStatus.ACTIVE,
        endDate: new Date('2026-12-31T00:00:00.000Z'),
        unit: { id: UNIT_ID, name: 'Unit 1A', propertyId: 'property_1', property: { id: 'property_1', name: 'Cedar Court', organizationId: ORG_ID } },
      });
      prisma.lease.findUnique.mockResolvedValue(endingLease);
      prisma.propertyMarketingProfile.findUnique.mockResolvedValue({ id: 'marketing_1', propertyId: 'property_1' });
      prisma.propertyMarketingProfile.update.mockResolvedValue({ id: 'marketing_1' });
      prisma.user.findFirst.mockResolvedValue({ id: ACTOR_ID });
      prisma.unitInspection.create.mockResolvedValue({ id: 'inspection_1' });
      prisma.leaseHistory.create.mockResolvedValue({ id: 'history_vacancy' });
      prisma.scheduleEvent.findFirst.mockResolvedValue(null);
      prisma.scheduleEvent.create.mockResolvedValue({ id: 'event_vacancy' });
      auditLogService.record.mockResolvedValue(undefined);

      await service.prepareForVacancy(LEASE_ID);

      expect(prisma.lease.findUnique).toHaveBeenCalledWith({
        where: { id: LEASE_ID },
        include: {
          unit: { include: { property: true } },
          tenant: { select: expect.any(Object) },
        },
      });
      expect(prisma.propertyMarketingProfile.update).toHaveBeenCalledWith({
        where: { propertyId: 'property_1' },
        data: {
          availableOn: new Date('2026-12-31T00:00:00.000Z'),
          availabilityStatus: 'AVAILABLE',
        },
      });
      expect(prisma.unitInspection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          unit: { connect: { id: UNIT_ID } },
          property: { connect: { id: 'property_1' } },
          lease: { connect: { id: LEASE_ID } },
          createdBy: { connect: { id: ACTOR_ID } },
          type: 'MOVE_OUT',
          status: 'SCHEDULED',
          scheduledDate: new Date('2026-12-24T00:00:00.000Z'),
        }),
      });
      expect(prisma.leaseHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lease: { connect: { id: LEASE_ID } },
          actor: { connect: { id: '0' } },
          fromStatus: LeaseStatus.ACTIVE,
          toStatus: LeaseStatus.ACTIVE,
        }),
      });
      expect(prisma.scheduleEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'MOVE_OUT',
          title: 'Move-Out Inspection Prep - Cedar Court',
          date: new Date('2026-12-24T00:00:00.000Z'),
          priority: 'HIGH',
          propertyId: 'property_1',
          unitId: UNIT_ID,
          tenantId: TENANT_ID,
        }),
      });
      expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
        actorId: null,
        action: 'LEASE_VACANCY_PREPARED',
        entityType: 'Lease',
        entityId: LEASE_ID,
        metadata: expect.objectContaining({
          unitId: UNIT_ID,
          propertyId: 'property_1',
          inspectionDate: '2026-12-24T00:00:00.000Z',
          leaseEndDate: '2026-12-31T00:00:00.000Z',
        }),
      }));
    });

    it('throws NotFoundException and performs no vacancy writes when the lease is missing', async () => {
      prisma.lease.findUnique.mockResolvedValue(null);

      await expect(service.prepareForVacancy(LEASE_ID)).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.propertyMarketingProfile.create).not.toHaveBeenCalled();
      expect(prisma.propertyMarketingProfile.update).not.toHaveBeenCalled();
      expect(prisma.unitInspection.create).not.toHaveBeenCalled();
      expect(prisma.leaseHistory.create).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('lease document/signature stubs', () => {
    it('generateLeaseDocument returns the current generated document stub contract without persistence', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-01T00:00:00.000Z'));

      await expect(service.generateLeaseDocument(LEASE_ID, ACTOR_ID, ORG_ID)).resolves.toEqual({
        success: true,
        leaseId: LEASE_ID,
        documentUrl: `/leases/${LEASE_ID}/documents/lease-agreement.pdf`,
        status: 'GENERATED',
        generatedAt: '2026-05-01T00:00:00.000Z',
      });

      expect(prisma.lease.findFirst).not.toHaveBeenCalled();
      expect(prisma.lease.update).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('sendForSignature returns the current signature stub contract with provided signer details and no persistence', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-01T00:00:00.000Z'));

      await expect(
        service.sendForSignature(LEASE_ID, 'tenant@example.com', 'Taylor Tenant', ACTOR_ID, ORG_ID),
      ).resolves.toEqual({
        success: true,
        leaseId: LEASE_ID,
        signerEmail: 'tenant@example.com',
        signerName: 'Taylor Tenant',
        status: 'SENT_FOR_SIGNATURE',
        sentAt: '2026-05-01T00:00:00.000Z',
        expiresAt: '2026-05-31T00:00:00.000Z',
      });

      expect(prisma.lease.findFirst).not.toHaveBeenCalled();
      expect(prisma.lease.update).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('sendForSignature uses tenant fallback signer details in the current stub contract', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-01T00:00:00.000Z'));

      await expect(service.sendForSignature(LEASE_ID, undefined, undefined, ACTOR_ID, ORG_ID)).resolves.toEqual(expect.objectContaining({
        signerEmail: 'tenant@example.com',
        signerName: 'Tenant',
        status: 'SENT_FOR_SIGNATURE',
      }));

      jest.useRealTimers();
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
