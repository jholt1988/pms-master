import { Role } from '@prisma/client';
import { CommandCenterService } from './command-center.service';

const actor = { userId: '9f77885c-7784-4f22-9ba5-a7516c18c4d0', role: Role.PROPERTY_MANAGER };

describe('CommandCenterService', () => {
  it('persists surfaced decision records once and returns linkage', async () => {
    const prisma = createPrismaMock();
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 10,
        amount: 1200,
        description: 'June rent',
        dueDate: new Date('2026-06-01T00:00:00.000Z'),
        issuedAt: new Date('2026-05-25T00:00:00.000Z'),
        lease: {
          tenant: { firstName: 'Ava', lastName: 'Tenant', email: 'ava@example.com' },
          tenantId: 'tenant-1',
          unitId: 'unit-1',
          unit: { propertyId: 'property-1', property: { name: 'Oak House' } },
        },
      },
    ]);
    prisma.decisionRecord.findFirst.mockResolvedValue(null);
    const decisionRecordService = {
      create: jest.fn().mockResolvedValue({ id: 'decision-record-1' }),
      list: jest.fn(),
    };
    const service = createService(prisma, decisionRecordService);

    const decisions = await service.getDecisionQueue('org-1', actor);

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        lease: { unit: { property: { organizationId: 'org-1' } } },
      }),
    }));
    expect(decisionRecordService.create).toHaveBeenCalledTimes(1);
    expect(decisions[0]).toMatchObject({
      id: 'delinquency:10',
      decisionRecordId: 'decision-record-1',
    });
  });

  it('returns decision detail with records, source links, and audit trail', async () => {
    const prisma = createPrismaMock();
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 10,
        amount: 1200,
        description: 'June rent',
        dueDate: new Date('2026-06-01T00:00:00.000Z'),
        issuedAt: new Date('2026-05-25T00:00:00.000Z'),
        lease: {
          tenant: { firstName: 'Ava', lastName: 'Tenant', email: 'ava@example.com' },
          tenantId: 'tenant-1',
          unitId: 'unit-1',
          unit: { propertyId: 'property-1', property: { name: 'Oak House' } },
        },
      },
    ]);
    prisma.decisionRecord.findFirst.mockResolvedValue({ id: 'decision-record-1' });
    prisma.approvalTask.findMany.mockResolvedValue([
      {
        id: 'approval-1',
        title: 'Prepare follow-up',
        status: 'PENDING',
        createdAt: new Date('2026-06-02T00:00:00.000Z'),
        decidedAt: null,
        executedAt: null,
      },
    ]);
    const decisionRecordService = {
      create: jest.fn(),
      list: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'decision-record-1',
            recommendation: 'Send follow-up',
            result: 'SURFACED',
            createdAt: new Date('2026-06-01T12:00:00.000Z'),
          },
        ],
      }),
    };
    const service = createService(prisma, decisionRecordService);

    const detail = await service.getDecisionDetail('org-1', actor, 'delinquency:10');

    expect(detail.decision.decisionRecordId).toBe('decision-record-1');
    expect(detail.sourceLinks.some((link) => link.entityType === 'Invoice' && link.entityId === '10')).toBe(true);
    expect(detail.auditTrail.length).toBeGreaterThan(0);
  });
});

function createService(prisma: any, decisionRecordService: any) {
  return new CommandCenterService(
    prisma,
    { getDailyBriefing: jest.fn() } as any,
    { listPendingTasks: jest.fn().mockResolvedValue([]) } as any,
    decisionRecordService,
  );
}

function createPrismaMock() {
  return {
    invoice: { findMany: jest.fn().mockResolvedValue([]) },
    maintenanceRequest: { findMany: jest.fn().mockResolvedValue([]) },
    rentalApplication: { findMany: jest.fn().mockResolvedValue([]) },
    lease: { findMany: jest.fn().mockResolvedValue([]) },
    bookkeepingTransaction: { findMany: jest.fn().mockResolvedValue([]) },
    inspectionRequest: { findMany: jest.fn().mockResolvedValue([]) },
    approvalTask: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    decisionRecord: { findFirst: jest.fn() },
  };
}
