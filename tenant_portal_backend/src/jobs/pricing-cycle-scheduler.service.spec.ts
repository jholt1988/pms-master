import { PricingCycleSchedulerService } from './pricing-cycle-scheduler.service';

describe('PricingCycleSchedulerService', () => {
  const prisma: any = {
    organization: { findMany: jest.fn() },
    orgPlanCycle: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    feeScheduleVersion: { findFirst: jest.fn() },
    pricingSnapshot: { findFirst: jest.fn(), create: jest.fn() },
    $queryRaw: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.organization.findMany.mockResolvedValue([{ id: 'org-1' }]);
    prisma.$queryRaw
      .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])
      .mockResolvedValueOnce([{ ok: true }]);
    prisma.orgPlanCycle.updateMany.mockResolvedValue({ count: 0 });
    prisma.orgPlanCycle.findFirst
      .mockResolvedValueOnce(null) // active cycle
      .mockResolvedValueOnce({ id: 'cycle-existing' }); // same month window
  });

  it('reactivates existing month cycle instead of creating duplicate', async () => {
    const service = new PricingCycleSchedulerService(prisma);

    await service.handleMonthlyCycleTransitions();

    expect(prisma.orgPlanCycle.update).toHaveBeenCalledWith({
      where: { id: 'cycle-existing' },
      data: { status: 'ACTIVE' },
    });
    expect(prisma.orgPlanCycle.create).not.toHaveBeenCalled();
  });
});
