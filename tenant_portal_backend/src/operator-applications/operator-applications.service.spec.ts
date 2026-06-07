import { ApplicationStatus, Role } from '@prisma/client';
import { RentalApplicationReviewAction } from '../rental-application/dto/review-action.dto';
import { OperatorApplicationsService } from './operator-applications.service';

const baseApplication = {
  id: 17,
  fullName: 'Jordan Smith',
  email: 'jordan@example.com',
  phoneNumber: '555-0100',
  status: ApplicationStatus.APPROVED,
  propertyId: 'property-1',
  property: { id: 'property-1', name: 'Oak House' },
  unitId: 'unit-1',
  unit: { id: 'unit-1', unitNumber: '2A', address: null },
  applicantId: 'tenant-1',
  applicant: { id: 'tenant-1' },
  income: 4000,
  creditScore: 700,
  qualificationStatus: null,
  recommendation: null,
  screeningScore: 87,
  screenedAt: new Date('2026-06-01T00:00:00Z'),
  decisionedAt: new Date('2026-06-02T00:00:00Z'),
  convertedLeaseId: null,
  applicationDate: new Date('2026-05-31T00:00:00Z'),
  createdAt: new Date('2026-05-31T00:00:00Z'),
  updatedAt: new Date('2026-06-02T00:00:00Z'),
  decisionNotes: null,
  screeningDetails: null,
  screeningReasons: null,
  manualNotes: [],
};

describe('OperatorApplicationsService', () => {
  it('returns application-to-lease workbench metrics and handoffs', async () => {
    const prisma = {
      rentalApplication: {
        findMany: jest.fn().mockResolvedValue([
          baseApplication,
          { ...baseApplication, id: 18, status: ApplicationStatus.PENDING_AI_REVIEW, screenedAt: null },
        ]),
      },
    };
    const service = new OperatorApplicationsService(prisma as any, {} as any, {} as any);

    const result = await service.getWorkbench('org-1', { userId: 'actor-1', role: Role.PROPERTY_MANAGER });

    expect(prisma.rentalApplication.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { property: { organizationId: 'org-1' } },
    }));
    expect(result.metrics).toMatchObject({
      totalApplications: 2,
      needsScreening: 1,
      approvedReadyForLease: 1,
    });
    expect(result.leaseHandoffs[0]).toMatchObject({
      applicationId: 17,
      recommendedRentAmount: 1200,
      recommendedDepositAmount: 1200,
    });
  });

  it('wraps review actions with operator audit metadata', async () => {
    const rentalApplicationService = {
      performReviewAction: jest.fn().mockResolvedValue({ id: 17, status: ApplicationStatus.APPROVED }),
    };
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new OperatorApplicationsService({} as any, rentalApplicationService as any, auditLogService as any);

    await service.reviewAction(
      'org-1',
      { userId: 'actor-1', username: 'manager', role: Role.PROPERTY_MANAGER },
      17,
      { action: RentalApplicationReviewAction.APPROVE, note: 'Meets policy' },
    );

    expect(rentalApplicationService.performReviewAction).toHaveBeenCalledWith(
      17,
      { action: RentalApplicationReviewAction.APPROVE, note: 'Meets policy' },
      { userId: 'actor-1', username: 'manager', role: Role.PROPERTY_MANAGER },
      'org-1',
    );
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
      orgId: 'org-1',
      actorId: 'actor-1',
      module: 'operator-applications',
      action: 'APPLICATION_REVIEW_ACTION',
      entityType: 'RentalApplication',
      entityId: 17,
    }));
  });
});
