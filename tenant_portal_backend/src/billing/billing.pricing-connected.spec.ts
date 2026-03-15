import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';

describe('BillingService connected account + pricing snapshot guards', () => {
  const prisma: any = {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    feeScheduleVersion: {
      findFirst: jest.fn(),
    },
    orgPlanCycle: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    pricingSnapshot: {
      create: jest.fn(),
    },
  };

  const service = new BillingService(prisma, {} as any, {} as any, {
    createConnectedAccount: jest.fn(),
    createConnectedAccountOnboardingLink: jest.fn(),
    getConnectedAccountStatus: jest.fn(),
  } as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates onboarding link and initializes connected account when missing', async () => {
    prisma.organization.findUnique.mockResolvedValueOnce({
      id: 'org-1',
      name: 'Org',
      stripeConnectedAccountId: null,
    });
    (service as any).stripeService.createConnectedAccount.mockResolvedValue({ accountId: 'acct_1' });
    (service as any).stripeService.createConnectedAccountOnboardingLink.mockResolvedValue({
      url: 'https://stripe.test/onboarding',
      expiresAt: 123,
    });

    await expect(
      service.createOnboardingLink('org-1', {
        refreshUrl: 'https://app.test/refresh',
        returnUrl: 'https://app.test/return',
      }),
    ).resolves.toEqual({
      accountId: 'acct_1',
      onboardingUrl: 'https://stripe.test/onboarding',
      expiresAt: 123,
    });

    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stripeConnectedAccountId: 'acct_1' }) }),
    );
  });

  it('rejects plan cycle with invalid date order', async () => {
    await expect(
      service.createPlanCycle('org-1', {
        name: 'Cycle',
        startsAt: '2026-05-02T00:00:00.000Z',
        endsAt: '2026-05-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires pricing snapshot plan cycle + fee version to belong to org', async () => {
    prisma.orgPlanCycle.findFirst.mockResolvedValueOnce(null);
    prisma.feeScheduleVersion.findFirst.mockResolvedValueOnce({ id: 'fee-1' });

    await expect(
      service.createPricingSnapshot('org-1', {
        planCycleId: 'cycle-other-org',
        feeScheduleVersionId: 'fee-1',
        computedFees: { amount: 1 },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.orgPlanCycle.findFirst.mockResolvedValueOnce({ id: 'cycle-1' });
    prisma.feeScheduleVersion.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.createPricingSnapshot('org-1', {
        planCycleId: 'cycle-1',
        feeScheduleVersionId: 'fee-other',
        computedFees: { amount: 1 },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates pricing snapshot with trimmed snapshotType', async () => {
    prisma.orgPlanCycle.findFirst.mockResolvedValueOnce({ id: 'cycle-1' });
    prisma.feeScheduleVersion.findFirst.mockResolvedValueOnce({ id: 'fee-1' });
    prisma.pricingSnapshot.create.mockResolvedValueOnce({ id: 'snap-1' });

    await service.createPricingSnapshot('org-1', {
      planCycleId: 'cycle-1',
      feeScheduleVersionId: 'fee-1',
      snapshotType: '  NIGHTLY_TIER_PROJECTION ',
      computedFees: { amount: 10 },
    });

    expect(prisma.pricingSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ snapshotType: 'NIGHTLY_TIER_PROJECTION' }),
    });
  });
});
