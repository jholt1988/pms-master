import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookkeepingService {
  private readonly logger = new Logger(BookkeepingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---- Transaction Capture & Categorization ----

  async getPendingTransactions(orgId: string, take = 50) {
    return this.prisma.bookkeepingTransaction.findMany({
      where: { organizationId: orgId, status: 'PENDING_REVIEW' },
      include: { allocations: true, bankTransaction: true },
      orderBy: { date: 'desc' },
      take,
    });
  }

  async getExceptionTransactions(orgId: string, take = 50) {
    return this.prisma.bookkeepingTransaction.findMany({
      where: { organizationId: orgId, status: 'EXCEPTION' },
      include: { allocations: true, bankTransaction: true },
      orderBy: { date: 'desc' },
      take,
    });
  }

  async categorizeTransaction(id: string, category: string, userId: string) {
    return this.prisma.bookkeepingTransaction.update({
      where: { id },
      data: { category, status: 'CATEGORIZED', reviewedById: userId },
    });
  }

  async markException(id: string, reason: string) {
    return this.prisma.bookkeepingTransaction.update({
      where: { id },
      data: { status: 'EXCEPTION', exceptionReason: reason },
    });
  }

  // ---- Allocation ----

  async allocateTransaction(
    transactionId: string,
    allocations: {
      accountId: string;
      amountCents: number;
      propertyId?: string;
      unitId?: string;
      leaseId?: string;
      vendorId?: string;
      ownerId?: string;
    }[],
  ) {
    const tx = await this.prisma.bookkeepingTransaction.findUniqueOrThrow({
      where: { id: transactionId },
    });

    const totalAllocated = allocations.reduce((s, a) => s + a.amountCents, 0);
    if (totalAllocated !== tx.amountCents) {
      throw new BadRequestException(
        `Allocation total (${totalAllocated}) must equal transaction amount (${tx.amountCents})`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.bookkeepingAllocation.deleteMany({ where: { transactionId } }),
      ...allocations.map((a) =>
        this.prisma.bookkeepingAllocation.create({
          data: { transactionId, ...a },
        }),
      ),
      this.prisma.bookkeepingTransaction.update({
        where: { id: transactionId },
        data: { status: 'ALLOCATED' },
      }),
    ]);

    return this.prisma.bookkeepingTransaction.findUnique({
      where: { id: transactionId },
      include: { allocations: { include: { account: true } } },
    });
  }

  // ---- Reconciliation ----

  async getReconciliationSummary(orgId: string) {
    const [unmatched, matched, exception] = await Promise.all([
      this.prisma.reconciliationSessionItem.count({
        where: { session: { organizationId: orgId }, status: 'UNMATCHED' },
      }),
      this.prisma.reconciliationSessionItem.count({
        where: { session: { organizationId: orgId }, status: { in: ['MATCHED', 'CONFIRMED'] } },
      }),
      this.prisma.reconciliationSessionItem.count({
        where: { session: { organizationId: orgId }, status: 'EXCEPTION' },
      }),
    ]);

    const items = await this.prisma.reconciliationSessionItem.findMany({
      where: { session: { organizationId: orgId }, status: { in: ['UNMATCHED', 'EXCEPTION'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { unmatchedCount: unmatched, matchedCount: matched, exceptionCount: exception, items };
  }

  async confirmReconciliationMatch(itemId: string, userId: string) {
    return this.prisma.reconciliationSessionItem.update({
      where: { id: itemId },
      data: { status: 'CONFIRMED', resolvedAt: new Date(), resolvedById: userId },
    });
  }

  // ---- Monthly Close ----

  async getMonthlyCloseStates(orgId: string) {
    const properties = await this.prisma.property.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const results = await Promise.all(
      properties.map(async (prop) => {
        const closeRecord = await this.prisma.policyMonthlyClose.findUnique({
          where: { propertyId_month: { propertyId: prop.id, month: currentMonth } },
        });

        const [unreconciledCount, exceptionCount, pendingEntries] = await Promise.all([
          this.prisma.bookkeepingTransaction.count({
            where: {
              organizationId: orgId,
              status: { notIn: ['RECONCILED', 'POSTED'] },
              allocations: { some: { propertyId: prop.id } },
            },
          }),
          this.prisma.bookkeepingTransaction.count({
            where: {
              organizationId: orgId,
              status: 'EXCEPTION',
              allocations: { some: { propertyId: prop.id } },
            },
          }),
          this.prisma.journalEntry.count({
            where: { organizationId: orgId, status: 'DRAFT' },
          }),
        ]);

        let step: string;
        if (closeRecord?.isLocked) step = 'locked';
        else if (closeRecord?.closedAt) step = 'reported';
        else if (unreconciledCount === 0 && exceptionCount === 0) step = 'review';
        else if (unreconciledCount > 0) step = 'reconciling';
        else step = 'open';

        return {
          propertyId: prop.id,
          propertyName: prop.name,
          month: currentMonth,
          step,
          unreconciledCount,
          exceptionCount,
          pendingJournalEntries: pendingEntries,
          closedAt: closeRecord?.closedAt?.toISOString(),
          closedBy: closeRecord?.closedByUserId || undefined,
        };
      }),
    );

    return results;
  }

  async lockMonth(propertyId: string, month: string, userId: string) {
    return this.prisma.policyMonthlyClose.upsert({
      where: { propertyId_month: { propertyId, month } },
      create: { propertyId, month, isLocked: true, closedAt: new Date(), closedByUserId: userId },
      update: { isLocked: true, closedAt: new Date(), closedByUserId: userId },
    });
  }

  async reopenMonth(propertyId: string, month: string, reason: string) {
    return this.prisma.policyMonthlyClose.update({
      where: { propertyId_month: { propertyId, month } },
      data: { isLocked: false, closedAt: null, reopenReason: reason },
    });
  }

  // ---- Owner Statements ----

  async getOwnerStatements(orgId: string, month?: string) {
    const currentMonth = month || (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();

    return this.prisma.ownerStatement.findMany({
      where: { organizationId: orgId, month: currentMonth },
      include: { owner: { select: { id: true, username: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveOwnerStatement(id: string, userId: string) {
    return this.prisma.ownerStatement.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async markOwnerStatementSent(id: string) {
    return this.prisma.ownerStatement.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  // ---- Chart of Accounts ----

  async getChartOfAccounts(orgId: string) {
    return this.prisma.chartOfAccount.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
  }

  async createAccount(orgId: string, data: { code: string; name: string; type: string; parentId?: string; description?: string }) {
    return this.prisma.chartOfAccount.create({
      data: { organizationId: orgId, ...data } as any,
    });
  }

  // ---- Workspace Aggregation ----

  async getFinancialsWorkspace(orgId: string) {
    const [
      pendingTransactions,
      exceptions,
      reconciliation,
      monthlyClose,
      ownerStatements,
    ] = await Promise.allSettled([
      this.getPendingTransactions(orgId, 20),
      this.getExceptionTransactions(orgId, 20),
      this.getReconciliationSummary(orgId),
      this.getMonthlyCloseStates(orgId),
      this.getOwnerStatements(orgId),
    ]);

    const pending = pendingTransactions.status === 'fulfilled' ? pendingTransactions.value : [];
    const exc = exceptions.status === 'fulfilled' ? exceptions.value : [];
    const recon = reconciliation.status === 'fulfilled' ? reconciliation.value : { unmatchedCount: 0, matchedCount: 0, exceptionCount: 0, items: [] };
    const close = monthlyClose.status === 'fulfilled' ? monthlyClose.value : [];
    const statements = ownerStatements.status === 'fulfilled' ? ownerStatements.value : [];

    const unreconciledAmount = pending.reduce((s, t) => s + t.amountCents, 0) +
      exc.reduce((s, t) => s + t.amountCents, 0);

    return {
      pendingTransactions: pending,
      exceptions: exc,
      reconciliation: recon,
      monthlyClose: close,
      ownerStatements: statements,
      metrics: {
        unreconciledAmount,
        pendingCategorization: pending.length,
        exceptionsCount: exc.length,
        monthsOpen: close.filter((c: any) => c.step !== 'locked' && c.step !== 'reported').length,
        ownerDistributionsDue: statements.filter((s: any) => s.status === 'DRAFT').length,
      },
    };
  }

  // ---- Briefing Integration ----

  async getFinancialSignals(orgId: string) {
    const signals: any[] = [];

    const exceptions = await this.prisma.bookkeepingTransaction.findMany({
      where: { organizationId: orgId, status: 'EXCEPTION' },
      orderBy: { date: 'desc' },
      take: 5,
    });

    for (const exc of exceptions) {
      signals.push({
        id: `fin-exc-${exc.id}`,
        severity: Math.abs(exc.amountCents) > 100000 ? 'critical' : Math.abs(exc.amountCents) > 10000 ? 'high' : 'medium',
        domain: 'financials',
        title: `Exception: ${exc.description}`,
        summary: `$${(Math.abs(exc.amountCents) / 100).toLocaleString()} - ${exc.exceptionReason || 'Requires review'}`,
        monetaryImpact: Math.abs(exc.amountCents) / 100,
        actionUrl: '/financials',
        actionLabel: 'Review Exception',
        createdAt: exc.createdAt.toISOString(),
      });
    }

    const unreconciledCount = await this.prisma.bookkeepingTransaction.count({
      where: { organizationId: orgId, status: { in: ['PENDING_REVIEW', 'CATEGORIZED', 'ALLOCATED'] } },
    });

    if (unreconciledCount > 10) {
      const totalUnreconciled = await this.prisma.bookkeepingTransaction.aggregate({
        where: { organizationId: orgId, status: { in: ['PENDING_REVIEW', 'CATEGORIZED', 'ALLOCATED'] } },
        _sum: { amountCents: true },
      });
      signals.push({
        id: 'fin-unrecon-bulk',
        severity: unreconciledCount > 50 ? 'critical' : 'high',
        domain: 'financials',
        title: `${unreconciledCount} unreconciled transactions`,
        summary: `$${(Math.abs(totalUnreconciled._sum.amountCents || 0) / 100).toLocaleString()} pending reconciliation`,
        monetaryImpact: Math.abs(totalUnreconciled._sum.amountCents || 0) / 100,
        actionUrl: '/financials',
        actionLabel: 'Start Reconciliation',
        createdAt: new Date().toISOString(),
      });
    }

    const draftStatements = await this.prisma.ownerStatement.count({
      where: { organizationId: orgId, status: 'DRAFT' },
    });

    if (draftStatements > 0) {
      signals.push({
        id: 'fin-owner-statements',
        severity: 'medium',
        domain: 'financials',
        title: `${draftStatements} owner statements pending approval`,
        summary: 'Monthly owner distributions need review and approval before sending.',
        actionUrl: '/financials',
        actionLabel: 'Review Statements',
        createdAt: new Date().toISOString(),
      });
    }

    return signals;
  }

  async getFinancialDecisions(orgId: string) {
    const decisions: any[] = [];

    const pendingTransactions = await this.prisma.bookkeepingTransaction.findMany({
      where: { organizationId: orgId, status: 'PENDING_REVIEW', categoryConfidence: { lt: 0.7 } },
      orderBy: [{ amountCents: 'desc' }],
      take: 5,
    });

    for (const tx of pendingTransactions) {
      const amount = Math.abs(tx.amountCents) / 100;
      const confidence = Math.round((tx.categoryConfidence || 0) * 100);
      const suggestedCategory = tx.category || 'No category suggestion';
      decisions.push({
        id: `fin-cat-${tx.id}`,
        domain: 'financials',
        type: 'transaction_categorization',
        entityType: 'bookkeeping_transaction',
        entityId: tx.id,
        title: `Categorize: ${tx.description}`,
        summary: `A bookkeeping transaction needs categorization review before reconciliation can continue.`,
        context: `$${amount.toLocaleString()} on ${new Date(tx.date).toLocaleDateString()}. ${tx.category ? `AI suggests: ${tx.category} (${confidence}% confidence)` : 'No category suggestion.'}`,
        reasoning: [
          `Transaction status is ${tx.status}.`,
          `Amount is $${amount.toLocaleString()}.`,
          tx.category ? `AI suggestion is ${tx.category} at ${confidence}% confidence.` : 'There is no AI category suggestion.',
        ],
        priority: Math.abs(tx.amountCents) > 50000 ? 90 : 72,
        aiRecommendation: tx.category || undefined,
        actions: [
          {
            label: 'Accept Category',
            endpoint: `/bookkeeping/transactions/${tx.id}/categorize`,
            method: 'PATCH',
            body: { category: tx.category },
            variant: 'primary',
            description: `Accept ${suggestedCategory} and move the transaction forward.`,
            confirmation: {
              title: 'Accept suggested category?',
              message: `Apply ${suggestedCategory} to ${tx.description}?`,
              confirmLabel: 'Accept category',
              cancelLabel: 'Cancel',
            },
            metadata: {
              entityType: 'bookkeeping_transaction',
              entityId: tx.id,
              category: tx.category,
              confidence,
            },
          },
          {
            label: 'Mark Exception',
            endpoint: `/bookkeeping/transactions/${tx.id}/exception`,
            method: 'PATCH',
            body: { reason: 'Needs manual review' },
            variant: 'danger',
            confirmRequired: true,
            description: 'Move the transaction into exception handling for manual review.',
            confirmation: {
              title: 'Mark transaction as exception?',
              message: `This will flag ${tx.description} for manual review.`,
              confirmLabel: 'Mark exception',
              cancelLabel: 'Keep reviewing',
            },
            metadata: {
              entityType: 'bookkeeping_transaction',
              entityId: tx.id,
              status: 'EXCEPTION',
            },
          },
        ],
        urgency: Math.abs(tx.amountCents) > 50000 ? 'immediate' : 'today',
      });
    }

    const draftStatements = await this.prisma.ownerStatement.findMany({
      where: { organizationId: orgId, status: 'DRAFT' },
      include: { owner: { select: { username: true, firstName: true, lastName: true } } },
      take: 5,
    });

    for (const stmt of draftStatements) {
      const ownerName = stmt.owner.firstName
        ? `${stmt.owner.firstName} ${stmt.owner.lastName || ''}`.trim()
        : stmt.owner.username;
      const netDistribution = stmt.netDistributionCents / 100;
      decisions.push({
        id: `fin-stmt-${stmt.id}`,
        domain: 'financials',
        type: 'owner_statement_approval',
        entityType: 'owner_statement',
        entityId: stmt.id,
        title: `Approve statement: ${ownerName}`,
        summary: `Owner statement is drafted and ready for approval before distribution.`,
        context: `${stmt.month} - Net distribution: $${netDistribution.toLocaleString()}`,
        reasoning: [
          `Statement month is ${stmt.month}.`,
          `Owner is ${ownerName}.`,
          `Net distribution is $${netDistribution.toLocaleString()}.`,
        ],
        priority: 70,
        actions: [
          {
            label: 'Approve',
            endpoint: `/bookkeeping/owner-statements/${stmt.id}/approve`,
            method: 'PATCH',
            body: {},
            variant: 'primary',
            description: 'Approve the owner statement so it can move to delivery.',
            confirmation: {
              title: 'Approve owner statement?',
              message: `Approve ${ownerName}'s ${stmt.month} statement for $${netDistribution.toLocaleString()}?`,
              confirmLabel: 'Approve statement',
              cancelLabel: 'Cancel',
            },
            metadata: {
              entityType: 'owner_statement',
              entityId: stmt.id,
              status: 'APPROVED',
              month: stmt.month,
            },
          },
        ],
        urgency: 'today',
      });
    }

    return decisions;
  }

  async getFinancialEvents(orgId: string) {
    const events: any[] = [];

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const openMonths = await this.prisma.policyMonthlyClose.findMany({
      where: {
        property: { organizationId: orgId },
        isLocked: false,
        month: { lt: currentMonth },
      },
      include: { property: { select: { name: true } } },
    });

    for (const m of openMonths) {
      events.push({
        id: `fin-close-${m.id}`,
        type: 'monthly_close',
        title: `Monthly close: ${m.property.name} (${m.month})`,
        scheduledAt: new Date().toISOString(),
        propertyName: m.property.name,
      });
    }

    return events;
  }

  // ---- Manual Transaction Import ----

  async importTransactions(
    orgId: string,
    rows: Array<{
      date?: string;
      description?: string;
      amount?: string | number;
      amountCents?: number;
      type?: string; // CREDIT | DEBIT
    }>,
    actorId: string,
  ) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('No transaction rows provided');
    }
    if (rows.length > 500) {
      throw new BadRequestException('Maximum 500 rows per import');
    }

    let imported = 0;
    let skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    const validRows: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.date) { errors.push({ row: rowNum, reason: 'Missing date' }); skipped++; continue; }
      if (!row.description?.toString().trim()) { errors.push({ row: rowNum, reason: 'Missing description' }); skipped++; continue; }

      const parsedDate = new Date(row.date);
      if (isNaN(parsedDate.getTime())) { errors.push({ row: rowNum, reason: `Invalid date: ${row.date}` }); skipped++; continue; }

      // Resolve amountCents: prefer explicit amountCents, else convert amount (dollars)
      let amountCents: number;
      if (row.amountCents !== undefined) {
        amountCents = Math.round(Number(row.amountCents));
      } else if (row.amount !== undefined) {
        const dollars = parseFloat(String(row.amount).replace(/[$,]/g, ''));
        if (isNaN(dollars)) { errors.push({ row: rowNum, reason: `Invalid amount: ${row.amount}` }); skipped++; continue; }
        // DEBIT rows → negative cents; CREDIT rows → positive cents
        const sign = (row.type ?? '').toUpperCase() === 'DEBIT' ? -1 : 1;
        amountCents = Math.round(dollars * 100 * sign);
      } else {
        errors.push({ row: rowNum, reason: 'Missing amount' }); skipped++; continue;
      }

      validRows.push({
        organizationId: orgId,
        date: parsedDate,
        description: String(row.description).trim(),
        amountCents,
        status: 'PENDING_REVIEW',
        sourceType: 'MANUAL_IMPORT',
        importedById: actorId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (validRows.length > 0) {
      await this.prisma.bookkeepingTransaction.createMany({ data: validRows });
      imported = validRows.length;
      this.logger.log(`Imported ${imported} transactions for org ${orgId} by ${actorId}`);
    }

    return { imported, skipped, errors, total: rows.length };
  }
}
