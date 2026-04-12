import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BillingController } from './billing.controller';

describe('BillingController', () => {
  const billingService = {
    listSchedules: jest.fn(),
    upsertSchedule: jest.fn(),
    deactivateSchedule: jest.fn(),
    getAutopayForTenant: jest.fn(),
    getAutopayForLease: jest.fn(),
    configureAutopay: jest.fn(),
    disableAutopay: jest.fn(),
    listNeedsAuthAttemptsForTenant: jest.fn(),
    recoverNeedsAuthAttempt: jest.fn(),
    getConnectedAccount: jest.fn(),
    upsertConnectedAccount: jest.fn(),
    createOnboardingLink: jest.fn(),
    refreshConnectedAccountStatus: jest.fn(),
    listFeeScheduleVersions: jest.fn(),
    createFeeScheduleVersion: jest.fn(),
    listPlanCycles: jest.fn(),
    createPlanCycle: jest.fn(),
    createPricingSnapshot: jest.fn(),
    listPricingSnapshots: jest.fn(),
  };

  let controller: BillingController;

  beforeEach(() => {
    Object.values(billingService).forEach((fn: any) => fn.mockReset?.());
    controller = new BillingController(billingService as any);
  });

  it('returns the tenant autopay contract for tenant callers', async () => {
    const req = {
      user: { userId: 'tenant-1', username: 'tenant', role: Role.TENANT },
    } as any;
    billingService.getAutopayForTenant.mockResolvedValueOnce({
      leaseId: 'lease-1',
      enrollment: { id: 11, leaseId: 'lease-1', paymentMethodId: 77, active: true },
    });

    await expect(controller.getAutopay(req)).resolves.toEqual({
      leaseId: 'lease-1',
      enrollment: { id: 11, leaseId: 'lease-1', paymentMethodId: 77, active: true },
    });
    expect(billingService.getAutopayForTenant).toHaveBeenCalledWith('tenant-1');
  });

  it('requires leaseId query param for property-manager autopay reads', async () => {
    const req = {
      user: { userId: 'pm-1', username: 'pm', role: Role.PROPERTY_MANAGER },
    } as any;

    await expect(controller.getAutopay(req)).rejects.toThrow(BadRequestException);
    expect(billingService.getAutopayForLease).not.toHaveBeenCalled();
  });
});
