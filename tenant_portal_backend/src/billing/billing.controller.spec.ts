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
    manualRun: jest.fn(),
    getEscrowState: jest.fn(),
    transitionEscrowState: jest.fn(),
    computeYieldSweepAllocation: jest.fn(),
    sendOwnerStatement: jest.fn(),
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

  it('returns mapped lease autopay contract for property manager', async () => {
    const req = {
      user: { userId: 'pm-1', username: 'pm', role: Role.PROPERTY_MANAGER },
      org: { orgId: 'org-1' },
    } as any;
    billingService.getAutopayForLease.mockResolvedValueOnce({
      id: 'lease-9',
      autopayEnrollment: { active: true },
      tenant: { id: 't1' },
      unit: { id: 'u1' },
    });

    await expect(controller.getAutopay(req, 'lease-9')).resolves.toEqual({
      leaseId: 'lease-9',
      autopayEnrollment: { active: true },
      tenant: { id: 't1' },
      unit: { id: 'u1' },
    });
    expect(billingService.getAutopayForLease).toHaveBeenCalledWith('lease-9', 'org-1');
  });

  it('forwards list and schedule operations', async () => {
    const req = { user: { userId: 'pm-1', username: 'pm', role: Role.PROPERTY_MANAGER } } as any;
    await controller.listSchedules('org-1');
    await controller.upsertSchedule({ leaseId: 'l1' } as any, req, 'org-1');
    await controller.deactivate('l1', req, 'org-1');

    expect(billingService.listSchedules).toHaveBeenCalledWith('org-1');
    expect(billingService.upsertSchedule).toHaveBeenCalledWith(req.user, { leaseId: 'l1' }, 'org-1');
    expect(billingService.deactivateSchedule).toHaveBeenCalledWith(req.user, 'l1', 'org-1');
  });

  it('forwards autopay mutation operations', async () => {
    const req = { user: { userId: 'u1', username: 'n1', role: Role.TENANT }, org: { orgId: 'org-1' } } as any;
    await controller.configureAutopay({ leaseId: 'l1' } as any, req);
    await controller.disableAutopay('l1', req);
    await controller.recoverNeedsAuthAttempt('a1', req);

    expect(billingService.configureAutopay).toHaveBeenCalledWith(req.user, { leaseId: 'l1' }, 'org-1');
    expect(billingService.disableAutopay).toHaveBeenCalledWith(req.user, 'l1', 'org-1');
    expect(billingService.recoverNeedsAuthAttempt).toHaveBeenCalledWith(req.user, 'a1', 'org-1');
  });

  it('handles needs-auth attempts role branch', async () => {
    const tenantReq = { user: { userId: 't1', username: 't', role: Role.TENANT } } as any;
    const pmReq = { user: { userId: 'pm1', username: 'pm', role: Role.PROPERTY_MANAGER } } as any;

    await controller.listNeedsAuthAttempts(tenantReq);
    expect(billingService.listNeedsAuthAttemptsForTenant).toHaveBeenCalledWith('t1');
    await expect(controller.listNeedsAuthAttempts(pmReq)).rejects.toThrow(BadRequestException);
  });

  it('forwards connected account and pricing operations', async () => {
    const req = { user: { userId: 'pm-1', username: 'pm', role: Role.PROPERTY_MANAGER } } as any;
    await controller.getConnectedAccount('org-1');
    await controller.upsertConnectedAccount('org-1', { stripeConnectedAccountId: 'acct_1' });
    await controller.createOnboardingLink('org-1', { refreshUrl: 'r', returnUrl: 'u' });
    await controller.refreshConnectedAccountStatus('org-1');
    await controller.listFeeScheduleVersions('org-1');
    await controller.createFeeScheduleVersion('org-1', req, { versionLabel: 'v1', effectiveAt: '2026-01-01', feeConfig: {} });
    await controller.listPlanCycles('org-1');
    await controller.createPlanCycle('org-1', { name: 'Q1', startsAt: '2026-01-01', endsAt: '2026-03-31' });
    await controller.createPricingSnapshot('org-1', { planCycleId: 'pc1', feeScheduleVersionId: 'fv1', computedFees: {} });
    await controller.listPricingSnapshots('org-1', 'pc1');

    expect(billingService.getConnectedAccount).toHaveBeenCalledWith('org-1');
    expect(billingService.upsertConnectedAccount).toHaveBeenCalledWith('org-1', { stripeConnectedAccountId: 'acct_1' });
    expect(billingService.createOnboardingLink).toHaveBeenCalledWith('org-1', { refreshUrl: 'r', returnUrl: 'u' });
    expect(billingService.refreshConnectedAccountStatus).toHaveBeenCalledWith('org-1');
    expect(billingService.listFeeScheduleVersions).toHaveBeenCalledWith('org-1');
    expect(billingService.createFeeScheduleVersion).toHaveBeenCalledWith('org-1', 'pm-1', { versionLabel: 'v1', effectiveAt: '2026-01-01', feeConfig: {} });
    expect(billingService.listPlanCycles).toHaveBeenCalledWith('org-1');
    expect(billingService.createPlanCycle).toHaveBeenCalledWith('org-1', { name: 'Q1', startsAt: '2026-01-01', endsAt: '2026-03-31' });
    expect(billingService.createPricingSnapshot).toHaveBeenCalledWith('org-1', { planCycleId: 'pc1', feeScheduleVersionId: 'fv1', computedFees: {} });
    expect(billingService.listPricingSnapshots).toHaveBeenCalledWith('org-1', 'pc1');
  });

  it('forwards billing run, escrow, yield sweep and statement send', async () => {
    const req = { user: { userId: 'pm-1', username: 'pm', role: Role.PROPERTY_MANAGER } } as any;
    await controller.runBilling();
    await controller.getEscrowState('lease-1', 'org-1');
    await controller.transitionEscrowState('lease-1', { nextState: 'FUNDED' }, req, 'org-1');
    await controller.previewYieldSweep({ amountCents: 10000 }, 'org-1');
    await controller.sendOwnerStatement('stmt-1', { ownerId: 'owner-1' }, req, 'org-1');

    expect(billingService.manualRun).toHaveBeenCalled();
    expect(billingService.getEscrowState).toHaveBeenCalledWith('lease-1', 'org-1');
    expect(billingService.transitionEscrowState).toHaveBeenCalledWith('lease-1', 'org-1', req.user, { nextState: 'FUNDED' });
    expect(billingService.computeYieldSweepAllocation).toHaveBeenCalledWith('org-1', 10000);
    expect(billingService.sendOwnerStatement).toHaveBeenCalledWith('stmt-1', 'owner-1', 'pm-1', 'org-1');
  });
});
