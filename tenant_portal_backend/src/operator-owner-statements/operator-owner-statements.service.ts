import { Injectable, NotFoundException } from '@nestjs/common';
import { OwnerStatementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookkeepingService } from '../bookkeeping/bookkeeping.service';
import { AuditLogService } from '../shared/audit-log.service';
import {
  OperatorOwnerStatementActor,
  OperatorOwnerStatementItem,
  OperatorOwnerStatementsWorkbench,
} from './operator-owner-statements.types';

type StatementRecord = Awaited<ReturnType<BookkeepingService['getOwnerStatements']>>[number];

@Injectable()
export class OperatorOwnerStatementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookkeepingService: BookkeepingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getWorkbench(
    orgId: string,
    _actor: OperatorOwnerStatementActor,
    options: { month?: string } = {},
  ): Promise<OperatorOwnerStatementsWorkbench> {
    const month = options.month ?? this.currentMonth();
    const [statements, monthlyClose, gates] = await Promise.all([
      this.bookkeepingService.getOwnerStatements(orgId, month),
      this.bookkeepingService.getMonthlyCloseStates(orgId),
      this.bookkeepingService.getPaymentExpansionGateStatus(orgId).catch((error) => ({
        unavailable: true,
        reason: error?.message ?? 'Payment expansion gates unavailable',
      })),
    ]);
    const closeRows = Array.isArray(monthlyClose) ? monthlyClose.filter((row: any) => row.month === month) : [];
    const closeLockedProperties = closeRows.filter((row: any) => row.isLocked).length;
    const closeUnlockedProperties = closeRows.filter((row: any) => !row.isLocked).length;
    const mappedStatements = statements.map((statement) =>
      this.mapStatement(statement, { closeLockedProperties, closeUnlockedProperties }),
    );

    return {
      generatedAt: new Date().toISOString(),
      month,
      metrics: {
        statements: mappedStatements.length,
        draftStatements: mappedStatements.filter((statement) => statement.status === OwnerStatementStatus.DRAFT).length,
        approvedStatements: mappedStatements.filter((statement) => statement.status === OwnerStatementStatus.APPROVED).length,
        sentStatements: mappedStatements.filter((statement) => statement.status === OwnerStatementStatus.SENT).length,
        netDistributionCents: mappedStatements.reduce((sum, statement) => sum + statement.netDistributionCents, 0),
        closeLockedProperties,
        closeUnlockedProperties,
      },
      statements: mappedStatements,
      monthlyClose,
      paymentExpansionGates: gates,
      sourceLinks: [
        { label: 'Canonical owner statements API', href: '/api/bookkeeping/owner-statements', entityType: 'OwnerStatement' },
        { label: 'Monthly close API', href: '/api/bookkeeping/monthly-close', entityType: 'PolicyMonthlyClose' },
        { label: 'Owner portal API', href: '/api/owner-portal', entityType: 'OwnerPortal' },
      ],
    };
  }

  async generate(orgId: string, actor: OperatorOwnerStatementActor, month: string) {
    const result = await this.bookkeepingService.generateOwnerStatementsFromPostedEntries(orgId, month);
    await this.recordAudit(orgId, actor.userId, 'OWNER_STATEMENTS_GENERATED', month, {
      generated: result.generated,
    });
    return result;
  }

  async approve(orgId: string, actor: OperatorOwnerStatementActor, statementId: string) {
    await this.assertStatementInOrg(orgId, statementId);
    const result = await this.bookkeepingService.approveOwnerStatement(statementId, actor.userId);
    await this.recordAudit(orgId, actor.userId, 'OWNER_STATEMENT_APPROVED', statementId, {
      month: result.month,
      ownerId: result.ownerId,
      netDistributionCents: result.netDistributionCents,
    });
    return result;
  }

  async send(orgId: string, actor: OperatorOwnerStatementActor, statementId: string) {
    await this.assertStatementInOrg(orgId, statementId);
    const result = await this.bookkeepingService.markOwnerStatementSent(statementId);
    await this.recordAudit(orgId, actor.userId, 'OWNER_STATEMENT_SENT', statementId, {
      month: result.month,
      ownerId: result.ownerId,
    });
    return result;
  }

  private async assertStatementInOrg(orgId: string, statementId: string) {
    const statement = await this.prisma.ownerStatement.findFirst({
      where: { id: statementId, organizationId: orgId },
      select: { id: true },
    });
    if (!statement) throw new NotFoundException('Owner statement not found.');
  }

  private mapStatement(
    statement: StatementRecord,
    close: { closeLockedProperties: number; closeUnlockedProperties: number },
  ): OperatorOwnerStatementItem {
    const ownerName = [statement.owner?.firstName, statement.owner?.lastName].filter(Boolean).join(' ') || statement.owner?.username || 'Owner';
    const blockers = [
      statement.status === OwnerStatementStatus.DRAFT && close.closeLockedProperties === 0
        ? 'Monthly close must be locked before approval.'
        : null,
    ].filter(Boolean) as string[];
    return {
      id: statement.id,
      ownerId: statement.ownerId,
      ownerName,
      month: statement.month,
      status: statement.status,
      grossIncomeCents: statement.grossIncomeCents,
      totalExpensesCents: statement.totalExpensesCents,
      managementFeeCents: statement.managementFeeCents,
      netDistributionCents: statement.netDistributionCents,
      approvedAt: statement.approvedAt?.toISOString() ?? null,
      sentAt: statement.sentAt?.toISOString() ?? null,
      createdAt: statement.createdAt.toISOString(),
      nextAction: this.getNextAction(statement.status, blockers),
      blockers,
      canonicalRoute: `/api/bookkeeping/owner-statements/${statement.id}`,
    };
  }

  private getNextAction(status: OwnerStatementStatus, blockers: string[]): OperatorOwnerStatementItem['nextAction'] {
    if (blockers.length > 0) return 'blocked';
    if (status === OwnerStatementStatus.DRAFT) return 'approve';
    if (status === OwnerStatementStatus.APPROVED) return 'send';
    if (status === OwnerStatementStatus.SENT) return 'complete';
    return 'review';
  }

  private currentMonth() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private async recordAudit(orgId: string, actorId: string, action: string, entityId: string, metadata: Record<string, unknown>) {
    await this.auditLogService.record({
      orgId,
      actorId,
      module: 'operator-owner-statements',
      action,
      entityType: 'OwnerStatement',
      entityId,
      result: 'SUCCESS',
      metadata,
    });
  }
}
