import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role, SecurityEventType } from '@prisma/client';
import { BillingService } from './billing.service';

describe('BillingService connected account and pricing flows', () => {
  const prisma: any = {
    organization: { findUnique: jest.fn(), update: jest.fn() },
    feeScheduleVersion: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    orgPlanCycle: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    pricingSnapshot: { create: jest.fn(), findMany: jest.fn() },
    lease: { findFirst: jest.fn() },
    recurringInvoiceSchedule: { upsert: jest.fn(), updateMany: jest.fn() },
    ledgerTransaction: { findFirst: jest.fn() },
  };
  const db = { forOrg: () => prisma, raw: prisma };
  const paymentsService: any = {
    getLedgerAccountForLease: jest.fn(),
    createOperationalLedgerEntry: jest.fn(),
  };
  const securityEvents: any = { logEvent: jest.fn() };
  const stripeService: any = {
    createConnectedAccount: jest.fn(),
    createConnectedAccountOnboardingLink: jest.fn(),
    getConnectedAccountStatus: jest.fn(),
  };

  let service: BillingService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new BillingService(db, paymentsService, securityEvents, stripeService);
  });

  it('creates onboarding link and account when org has no connected account', async () => {
    prisma.organization.findUnique.mockResolvedValueOnce({ id: 'org-1', name: 'Org', stripeConnectedAccountId: null });
    stripeService.createConnectedAccount.mockResolvedValueOnce({ accountId: 'acct_1' });
    stripeService.createConnectedAccountOnboardingLink.mockResolvedValueOnce({ url: 'https://stripe/onboard', expiresAt: 123 });

    const out = await service.createOnboardingLink('org-1', { refreshUrl: 'r', returnUrl: 'u' });

    expect(out).toEqual({ accountId: 'acct_1', onboardingUrl: 'https://stripe/onboard', expiresAt: 123 });
    expect(prisma.organization.update).toHaveBeenCalled();
  });

  it('throws when onboarding org is missing', async () => {
    prisma.organization.findUnique.mockResolvedValueOnce(null);
    await expect(service.createOnboardingLink('org-x', { refreshUrl: 'r', returnUrl: 'u' })).rejects.toThrow(NotFoundException);
  });

  it('rejects invalid plan cycle date range', async () => {
    await expect(service.createPlanCycle('org-1', { name: 'x', startsAt: 'bad', endsAt: '2026-01-01' })).rejects.toThrow(BadRequestException);
    await expect(service.createPlanCycle('org-1', { name: 'x', startsAt: '2026-02-01', endsAt: '2026-01-01' })).rejects.toThrow(BadRequestException);
  });

  it('rejects plan cycle when fee schedule is outside org', async () => {
    prisma.feeScheduleVersion.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.createPlanCycle('org-1', {
        name: 'Q1',
        startsAt: '2026-01-01',
        endsAt: '2026-03-31',
        activeFeeScheduleId: 'fs-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates pricing snapshot and defaults snapshot type', async () => {
    prisma.orgPlanCycle.findFirst.mockResolvedValueOnce({ id: 'pc1' });
    prisma.feeScheduleVersion.findFirst.mockResolvedValueOnce({ id: 'fs1' });
    prisma.pricingSnapshot.create.mockResolvedValueOnce({ id: 'snap-1', snapshotType: 'BILLING_PREVIEW' });

    const out = await service.createPricingSnapshot('org-1', {
      planCycleId: 'pc1',
      feeScheduleVersionId: 'fs1',
      computedFees: { total: 1 },
      snapshotType: '   ',
    });

    expect(out).toEqual({ id: 'snap-1', snapshotType: 'BILLING_PREVIEW' });
  });

  it('throws when pricing snapshot dependencies are missing', async () => {
    prisma.orgPlanCycle.findFirst.mockResolvedValueOnce(null);
    prisma.feeScheduleVersion.findFirst.mockResolvedValueOnce({ id: 'fs1' });
    await expect(
      service.createPricingSnapshot('org-1', { planCycleId: 'pc1', feeScheduleVersionId: 'fs1', computedFees: {} }),
    ).rejects.toThrow(NotFoundException);

    prisma.orgPlanCycle.findFirst.mockResolvedValueOnce({ id: 'pc1' });
    prisma.feeScheduleVersion.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.createPricingSnapshot('org-1', { planCycleId: 'pc1', feeScheduleVersionId: 'fs1', computedFees: {} }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws when refreshing connected account without account id', async () => {
    prisma.organization.findUnique.mockResolvedValueOnce({ id: 'org-1', stripeConnectedAccountId: null });
    await expect(service.refreshConnectedAccountStatus('org-1')).rejects.toThrow(NotFoundException);
  });

  it('throws not found when escrow lease is missing', async () => {
    prisma.lease.findFirst.mockResolvedValueOnce(null);
    await expect(service.getEscrowState('lease-1', 'org-1')).rejects.toThrow(NotFoundException);
  });

  it('transitions escrow and logs security event', async () => {
    prisma.lease.findFirst.mockResolvedValue({
      id: 'lease-1',
      depositAmount: 1250,
      unit: { propertyId: 'prop-1', property: { name: 'P1' } },
    });
    paymentsService.getLedgerAccountForLease.mockResolvedValueOnce({ id: 'acct-1' });
    prisma.ledgerTransaction.findFirst.mockResolvedValueOnce({ metadata: { escrowState: 'UNFUNDED' }, effectiveDate: new Date() });
    paymentsService.getLedgerAccountForLease.mockResolvedValueOnce({ id: 'acct-1' });
    prisma.ledgerTransaction.findFirst.mockResolvedValueOnce({ metadata: { escrowState: 'FUNDED' }, effectiveDate: new Date() });

    const out = await service.transitionEscrowState(
      'lease-1',
      'org-1',
      { userId: 'u1', username: 'pm', role: Role.PROPERTY_MANAGER },
      { nextState: 'FUNDED', reason: 'deposit received' },
    );

    expect(paymentsService.createOperationalLedgerEntry).toHaveBeenCalled();
    expect(securityEvents.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: SecurityEventType.RECURRING_BILLING_UPDATED, success: true }),
    );
    expect(out.currentState).toBe('FUNDED');
  });

  it('rejects invalid escrow transitions', async () => {
    prisma.lease.findFirst.mockResolvedValue({
      id: 'lease-1',
      depositAmount: 1250,
      unit: { propertyId: 'prop-1', property: { name: 'P1' } },
    });
    paymentsService.getLedgerAccountForLease.mockResolvedValueOnce({ id: 'acct-1' });
    prisma.ledgerTransaction.findFirst.mockResolvedValueOnce({ metadata: { escrowState: 'UNFUNDED' }, effectiveDate: new Date() });

    await expect(
      service.transitionEscrowState(
        'lease-1',
        'org-1',
        { userId: 'u1', username: 'pm', role: Role.PROPERTY_MANAGER },
        { nextState: 'RELEASED' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('upserts schedule and deactivates schedule', async () => {
    prisma.lease.findFirst.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      tenant: {},
      unit: {},
    });
    prisma.recurringInvoiceSchedule.upsert.mockResolvedValueOnce({ id: 1, leaseId: '11111111-1111-4111-8111-111111111111' });

    await service.upsertSchedule(
      { userId: 'u1', username: 'pm', role: Role.PROPERTY_MANAGER },
      { leaseId: '11111111-1111-4111-8111-111111111111', amount: 1000, frequency: 'MONTHLY' as any } as any,
      'org-1',
    );

    prisma.lease.findFirst.mockResolvedValueOnce({ id: '11111111-1111-4111-8111-111111111111' });
    prisma.recurringInvoiceSchedule.updateMany.mockResolvedValueOnce({ count: 1 });
    const out = await service.deactivateSchedule(
      { userId: 'u1', username: 'pm', role: Role.PROPERTY_MANAGER },
      '11111111-1111-4111-8111-111111111111',
      'org-1',
    );

    expect(out).toEqual({ leaseId: '11111111-1111-4111-8111-111111111111', active: false });
  });
});
