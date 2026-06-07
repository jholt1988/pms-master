import { OwnerStatementStatus, Role } from '@prisma/client';
import { OperatorOwnerStatementsService } from './operator-owner-statements.service';

const statement = {
  id: 'statement-1',
  organizationId: 'org-1',
  ownerId: 'owner-1',
  owner: { id: 'owner-1', username: 'owner', firstName: 'Olivia', lastName: 'Owner' },
  month: '2026-05',
  grossIncomeCents: 250000,
  totalExpensesCents: 50000,
  managementFeeCents: 20000,
  netDistributionCents: 180000,
  status: OwnerStatementStatus.DRAFT,
  approvedAt: null,
  sentAt: null,
  createdAt: new Date('2026-06-01T00:00:00Z'),
};

describe('OperatorOwnerStatementsService', () => {
  it('returns owner statement review metrics and close blockers', async () => {
    const bookkeepingService = {
      getOwnerStatements: jest.fn().mockResolvedValue([statement]),
      getMonthlyCloseStates: jest.fn().mockResolvedValue([{ month: '2026-05', isLocked: false }]),
      getPaymentExpansionGateStatus: jest.fn().mockResolvedValue({ readyForExpandedPaymentWrites: false }),
    };
    const service = new OperatorOwnerStatementsService({} as any, bookkeepingService as any, {} as any);

    const result = await service.getWorkbench('org-1', { userId: 'actor-1', role: Role.PROPERTY_MANAGER }, { month: '2026-05' });

    expect(bookkeepingService.getOwnerStatements).toHaveBeenCalledWith('org-1', '2026-05');
    expect(result.metrics).toMatchObject({
      statements: 1,
      draftStatements: 1,
      netDistributionCents: 180000,
      closeUnlockedProperties: 1,
    });
    expect(result.statements[0].nextAction).toBe('blocked');
  });

  it('approves an org-scoped statement and records audit', async () => {
    const prisma = {
      ownerStatement: {
        findFirst: jest.fn().mockResolvedValue({ id: 'statement-1' }),
      },
    };
    const bookkeepingService = {
      approveOwnerStatement: jest.fn().mockResolvedValue({ ...statement, status: OwnerStatementStatus.APPROVED }),
    };
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new OperatorOwnerStatementsService(prisma as any, bookkeepingService as any, auditLogService as any);

    await service.approve('org-1', { userId: 'actor-1', role: Role.PROPERTY_MANAGER }, 'statement-1');

    expect(prisma.ownerStatement.findFirst).toHaveBeenCalledWith({
      where: { id: 'statement-1', organizationId: 'org-1' },
      select: { id: true },
    });
    expect(bookkeepingService.approveOwnerStatement).toHaveBeenCalledWith('statement-1', 'actor-1');
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
      module: 'operator-owner-statements',
      action: 'OWNER_STATEMENT_APPROVED',
      entityId: 'statement-1',
    }));
  });
});
