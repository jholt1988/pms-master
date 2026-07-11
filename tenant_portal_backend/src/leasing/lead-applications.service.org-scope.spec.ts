import { NotFoundException } from '@nestjs/common';
import { LeadApplicationsService } from './lead-applications.service';

/**
 * Org-isolation regression tests for LeadApplicationsService. Applications are
 * scoped to an organization via their property (property.organizationId), so a
 * caller must never read or mutate an application outside their org.
 */
describe('LeadApplicationsService org scoping', () => {
  let service: LeadApplicationsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      leadApplication: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
    };
    const emailService = {} as any;
    const securityEvents = { logEvent: jest.fn() } as any;
    service = new LeadApplicationsService(prisma, emailService, securityEvents);
  });

  it('getApplicationById uses an org-scoped findFirst when orgId is provided', async () => {
    prisma.leadApplication.findFirst.mockResolvedValue(null);

    const result = await service.getApplicationById('app-1', 'org-1');

    expect(result).toBeNull();
    expect(prisma.leadApplication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'app-1', property: { organizationId: 'org-1' } },
      }),
    );
    expect(prisma.leadApplication.findUnique).not.toHaveBeenCalled();
  });

  it('getApplicationById falls back to findUnique without orgId', async () => {
    prisma.leadApplication.findUnique.mockResolvedValue({ id: 'app-1' });

    await service.getApplicationById('app-1');

    expect(prisma.leadApplication.findUnique).toHaveBeenCalled();
    expect(prisma.leadApplication.findFirst).not.toHaveBeenCalled();
  });

  it('getApplications scopes the query by organization', async () => {
    await service.getApplications({ status: 'SUBMITTED' }, 'org-1');

    expect(prisma.leadApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ property: { organizationId: 'org-1' } }),
      }),
    );
  });

  it('updateScreeningResults rejects a cross-org application with NotFound', async () => {
    prisma.leadApplication.findFirst.mockResolvedValue(null);

    await expect(
      service.updateScreeningResults('app-x', 700, undefined, undefined, 'org-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.leadApplication.update).not.toHaveBeenCalled();
  });

  it('recordFeePayment rejects a cross-org application with NotFound', async () => {
    prisma.leadApplication.findFirst.mockResolvedValue(null);

    await expect(service.recordFeePayment('app-x', 50, 'org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.leadApplication.update).not.toHaveBeenCalled();
  });
});
