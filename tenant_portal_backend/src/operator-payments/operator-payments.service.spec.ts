import { Role } from '@prisma/client';
import { OperatorPaymentsService } from './operator-payments.service';

describe('OperatorPaymentsService', () => {
  it('builds an org-scoped payment workbench from ledger accounts and accounting signals', async () => {
    const prisma = {
      ledgerAccount: {
        findMany: jest.fn().mockResolvedValue([
          {
            leaseId: 'lease-1',
            propertyId: 'property-1',
            unitId: 'unit-1',
            updatedAt: new Date('2026-06-04T00:00:00.000Z'),
            lease: {
              tenantId: 'tenant-1',
              currentBalance: 1250,
              tenant: { firstName: 'Ava', lastName: 'Tenant', email: 'ava@example.com' },
              unitId: 'unit-1',
              unit: { name: '1A', propertyId: 'property-1', property: { name: 'Oak House' } },
            },
            entries: [{ effectiveDate: new Date('2026-06-03T00:00:00.000Z') }],
          },
        ]),
      },
      lease: { findMany: jest.fn() },
    };
    const paymentsService = {
      getDelinquencyQueue: jest.fn().mockResolvedValue({
        data: [{ leaseId: 'lease-1', amountDueCents: 125000 }],
      }),
    };
    const bookkeepingService = {
      getExceptionTransactions: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'tx-1',
            description: 'Stripe payout mismatch',
            amountCents: 5000,
            status: 'EXCEPTION',
            exceptionReason: 'Missing payout',
            sourceType: 'stripe',
            sourceId: 'po_1',
            date: new Date('2026-06-02T00:00:00.000Z'),
          },
        ],
      }),
      getReconciliationSummary: jest.fn().mockResolvedValue({ unmatchedCount: 2 }),
      getPaymentExpansionGateStatus: jest.fn().mockResolvedValue({ ready: false, blockers: ['exceptions'] }),
    };

    const service = new OperatorPaymentsService(prisma as any, paymentsService as any, bookkeepingService as any);
    const result = await service.getWorkbench(
      'org-1',
      { userId: 'manager-1', role: Role.PROPERTY_MANAGER },
      { propertyId: 'property-1', limit: 10 },
    );

    expect(prisma.ledgerAccount.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-1', propertyId: 'property-1' },
    }));
    expect(paymentsService.getDelinquencyQueue).toHaveBeenCalledWith(expect.objectContaining({
      orgId: 'org-1',
      propertyId: 'property-1',
    }));
    expect(result.metrics).toMatchObject({
      ledgerAccounts: 1,
      totalBalanceCents: 125000,
      delinquentLeases: 1,
      paymentExceptions: 1,
      unreconciledItems: 2,
      paymentExpansionBlocked: true,
    });
    expect(result.ledgerAccounts[0]).toMatchObject({
      leaseId: 'lease-1',
      tenantName: 'Ava Tenant',
      canonicalRoute: '/api/payments/ledger/accounts/lease-1',
    });
  });
});
