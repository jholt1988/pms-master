import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../prisma/database.service';

const REQUIRED_ACCOUNT_CODES = {
  operatingCash: '1000',
  stripeClearing: '1010',
  securityDepositsHeld: '1020',
  ownerPayable: '2100',
  rentalIncome: '4000',
  feeIncome: '4010',
  maintenanceExpense: '5000',
  processingFees: '5050',
  suspense: '9000',
};

const DEFAULT_ACCOUNTS = [
  { code: '1000', name: 'Operating Cash', type: 'ASSET', isSystem: true },
  { code: '1010', name: 'Stripe Clearing', type: 'ASSET', isSystem: true },
  { code: '1020', name: 'Security Deposits Held', type: 'LIABILITY', isSystem: true },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', isSystem: true },
  { code: '2000', name: 'Tenant Prepayments', type: 'LIABILITY', isSystem: true },
  { code: '2100', name: 'Owner Payable', type: 'LIABILITY', isSystem: true },
  { code: '3000', name: 'Owner Equity / Contributions', type: 'EQUITY', isSystem: true },
  { code: '4000', name: 'Rental Income', type: 'REVENUE', isSystem: true },
  { code: '4010', name: 'Fee Income', type: 'REVENUE', isSystem: true },
  { code: '4020', name: 'Other Income', type: 'REVENUE', isSystem: true },
  { code: '5000', name: 'Repairs And Maintenance', type: 'EXPENSE', isSystem: true },
  { code: '5010', name: 'Utilities', type: 'EXPENSE', isSystem: true },
  { code: '5020', name: 'Management Fees', type: 'EXPENSE', isSystem: true },
  { code: '5030', name: 'Insurance', type: 'EXPENSE', isSystem: true },
  { code: '5040', name: 'Taxes', type: 'EXPENSE', isSystem: true },
  { code: '5050', name: 'Bank And Processing Fees', type: 'EXPENSE', isSystem: true },
  { code: '9000', name: 'Suspense / Uncategorized', type: 'EXPENSE', isSystem: true },
];

@Injectable()
export class BookkeepingService {
  private readonly logger = new Logger(BookkeepingService.name);

  constructor(private readonly db: DatabaseService) {}

  // ---- Transaction Capture & Categorization ----

  async getPendingTransactions(orgId: string, take = 50, skip = 0) {
    const prisma = this.db.forOrg(orgId);
    const safeTake = Math.min(Math.max(take || 50, 1), 100);
    const safeSkip = Math.max(skip || 0, 0);
    const where = { organizationId: orgId, status: 'PENDING_REVIEW' as const };
    const [data, total] = await Promise.all([
      prisma.bookkeepingTransaction.findMany({
      where: { status: 'PENDING_REVIEW' },
      include: { allocations: true, bankTransaction: true },
      orderBy: { date: 'desc' },
      skip: safeSkip,
      take: safeTake,
      }),
      prisma.bookkeepingTransaction.count({ where }),
    ]);
    return { data, total, skip: safeSkip, take: safeTake };
  }

  async getExceptionTransactions(orgId: string, take = 50, skip = 0) {
    const prisma = this.db.forOrg(orgId);
    const safeTake = Math.min(Math.max(take || 50, 1), 100);
    const safeSkip = Math.max(skip || 0, 0);
    const where = { organizationId: orgId, status: 'EXCEPTION' as const };
    const [data, total] = await Promise.all([
      prisma.bookkeepingTransaction.findMany({
      where: { status: 'EXCEPTION' },
      include: { allocations: true, bankTransaction: true },
      orderBy: { date: 'desc' },
      skip: safeSkip,
      take: safeTake,
      }),
      prisma.bookkeepingTransaction.count({ where }),
    ]);
    return { data, total, skip: safeSkip, take: safeTake };
  }

  async categorizeTransaction(id: string, category: string, userId: string) {
    return this.db.raw.bookkeepingTransaction.update({
      where: { id },
      data: { category, status: 'CATEGORIZED', reviewedById: userId },
    });
  }

  async markException(id: string, reason: string) {
    return this.db.raw.bookkeepingTransaction.update({
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
    const tx = await this.db.raw.bookkeepingTransaction.findUniqueOrThrow({
      where: { id: transactionId },
    });

    const totalAllocated = allocations.reduce((s, a) => s + a.amountCents, 0);
    if (totalAllocated !== tx.amountCents) {
      throw new BadRequestException(
        `Allocation total (${totalAllocated}) must equal transaction amount (${tx.amountCents})`,
      );
    }

    await this.db.raw.$transaction([
      this.db.raw.bookkeepingAllocation.deleteMany({ where: { transactionId } }),
      ...allocations.map((a) =>
        this.db.raw.bookkeepingAllocation.create({
          data: { transactionId, ...a },
        }),
      ),
      this.db.raw.bookkeepingTransaction.update({
        where: { id: transactionId },
        data: { status: 'ALLOCATED' },
      }),
    ]);

    return this.db.raw.bookkeepingTransaction.findUnique({
      where: { id: transactionId },
      include: { allocations: { include: { account: true } } },
    });
  }

  // ---- Reconciliation ----

  async getReconciliationSummary(orgId: string) {
    const prisma = this.db.forOrg(orgId);
    const [unmatched, matched, exception] = await Promise.all([
      prisma.reconciliationSessionItem.count({
        where: { session: { organizationId: orgId }, status: 'UNMATCHED' },
      }),
      prisma.reconciliationSessionItem.count({
        where: { session: { organizationId: orgId }, status: { in: ['MATCHED', 'CONFIRMED'] } },
      }),
      prisma.reconciliationSessionItem.count({
        where: { session: { organizationId: orgId }, status: 'EXCEPTION' },
      }),
    ]);

    const items = await prisma.reconciliationSessionItem.findMany({
      where: { session: { organizationId: orgId }, status: { in: ['UNMATCHED', 'EXCEPTION'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { unmatchedCount: unmatched, matchedCount: matched, exceptionCount: exception, items };
  }

  async confirmReconciliationMatch(itemId: string, userId: string) {
    const item = await this.db.raw.reconciliationSessionItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new BadRequestException('Reconciliation item not found');
    }
    if (item.status === 'EXCEPTION') {
      throw new BadRequestException('Exception reconciliation items must be resolved before confirmation');
    }
    if (!item.suggestedMatchId && !item.ledgerEntryId) {
      throw new BadRequestException('Cannot confirm reconciliation item without a ledger match');
    }
    if (item.ledgerAmountCents !== null && item.ledgerAmountCents !== item.bankAmountCents) {
      throw new BadRequestException('Cannot confirm reconciliation item with amount mismatch');
    }

    return this.db.raw.reconciliationSessionItem.update({
      where: { id: itemId },
      data: { status: 'CONFIRMED', resolvedAt: new Date(), resolvedById: userId },
    });
  }

  // ---- Monthly Close ----

  async getMonthlyCloseStates(orgId: string) {
    const prisma = this.db.forOrg(orgId);
    const properties = await prisma.property.findMany({
      where: { },
      select: { id: true, name: true },
    });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const results = await Promise.all(
      properties.map(async (prop) => {
        const closeRecord = await prisma.policyMonthlyClose.findUnique({
          where: { propertyId_month: { propertyId: prop.id, month: currentMonth } },
        });

        const [unreconciledCount, exceptionCount, pendingEntries] = await Promise.all([
          prisma.bookkeepingTransaction.count({
            where: { status: { notIn: ['RECONCILED', 'POSTED'] },
              allocations: { some: { propertyId: prop.id } },
            },
          }),
          prisma.bookkeepingTransaction.count({
            where: { status: 'EXCEPTION',
              allocations: { some: { propertyId: prop.id } },
            },
          }),
          prisma.journalEntry.count({
            where: { status: 'DRAFT' },
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
    const blockers = await this.getMonthlyCloseBlockers(propertyId, month);
    if (blockers.length > 0) {
      throw new BadRequestException(`Cannot lock month with unresolved blockers: ${blockers.join(', ')}`);
    }

    return this.db.raw.policyMonthlyClose.upsert({
      where: { propertyId_month: { propertyId, month } },
      create: { propertyId, month, isLocked: true, closedAt: new Date(), closedByUserId: userId },
      update: { isLocked: true, closedAt: new Date(), closedByUserId: userId },
    });
  }

  async reopenMonth(propertyId: string, month: string, reason: string) {
    if (!reason?.trim()) {
      throw new BadRequestException('A reopen reason is required');
    }

    return this.db.raw.policyMonthlyClose.update({
      where: { propertyId_month: { propertyId, month } },
      data: { isLocked: false, closedAt: null, reopenReason: reason },
    });
  }

  // ---- Owner Statements ----

  async getOwnerStatements(orgId: string, month?: string) {
    const prisma = this.db.forOrg(orgId);
    const currentMonth = month || (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();

    return prisma.ownerStatement.findMany({
      where: { month: currentMonth },
      include: { owner: { select: { id: true, username: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveOwnerStatement(id: string, userId: string) {
    const statement = await this.db.raw.ownerStatement.findUnique({ where: { id } });
    if (!statement) {
      throw new BadRequestException('Owner statement not found');
    }
    const close = await this.db.raw.policyMonthlyClose.findFirst({
      where: { month: statement.month, isLocked: true, property: { organizationId: statement.organizationId } },
    });
    if (!close) {
      throw new BadRequestException('Owner statement cannot be approved before monthly close is locked');
    }

    return this.db.raw.ownerStatement.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });
  }

  async markOwnerStatementSent(id: string) {
    const statement = await this.db.raw.ownerStatement.findUnique({ where: { id } });
    if (!statement) {
      throw new BadRequestException('Owner statement not found');
    }
    if (statement.status !== 'APPROVED') {
      throw new BadRequestException('Owner statement must be approved before it can be sent');
    }

    return this.db.raw.ownerStatement.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  // ---- Chart of Accounts ----

  async getChartOfAccounts(orgId: string) {
    const prisma = this.db.forOrg(orgId);
    return prisma.chartOfAccount.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
  }

  async createAccount(orgId: string, data: { code: string; name: string; type: string; parentId?: string; description?: string }) {
    const prisma = this.db.forOrg(orgId);
    return prisma.chartOfAccount.create({
      data: { organizationId: orgId, ...data } as any,
    });
  }

  async seedDefaultChartOfAccounts(orgId: string) {
    const prisma = this.db.forOrg(orgId);
    const results = await Promise.all(
      DEFAULT_ACCOUNTS.map((account) =>
        prisma.chartOfAccount.upsert({
          where: { organizationId_code: { organizationId: orgId, code: account.code } },
          create: { organizationId: orgId, ...account } as any,
          update: { name: account.name, type: account.type as any, isSystem: true, isActive: true },
        }),
      ),
    );

    return { seeded: results.length, accounts: results };
  }

  async validateRequiredAccountingMappings(orgId: string) {
    const prisma = this.db.forOrg(orgId);
    const requiredCodes = Object.values(REQUIRED_ACCOUNT_CODES);
    const accounts = await prisma.chartOfAccount.findMany({
      where: { code: { in: requiredCodes }, isActive: true },
    });
    const present = new Set(accounts.map((account) => account.code));
    const missing = Object.entries(REQUIRED_ACCOUNT_CODES)
      .filter(([, code]) => !present.has(code))
      .map(([mapping, code]) => ({ mapping, code }));

    return {
      ready: missing.length === 0,
      missing,
      required: REQUIRED_ACCOUNT_CODES,
    };
  }

  private async requireAccountingMappings(orgId: string) {
    const prisma = this.db.forOrg(orgId);
    const status = await this.validateRequiredAccountingMappings(orgId);
    if (!status.ready) {
      throw new BadRequestException(`Accounting mappings are incomplete: ${status.missing.map((item) => item.code).join(', ')}`);
    }
    return status;
  }

  private async accountByCode(orgId: string, code: string) {
    const prisma = this.db.forOrg(orgId);
    const account = await prisma.chartOfAccount.findUnique({
      where: { organizationId_code: { organizationId: orgId, code } },
    });
    if (!account) {
      throw new BadRequestException(`Required account ${code} is missing`);
    }
    return account;
  }

  private validateBalancedLines(lines: Array<{ debitCents?: number; creditCents?: number }>) {
    if (!Array.isArray(lines) || lines.length < 2) {
      throw new BadRequestException('A journal entry requires at least two line items');
    }
    const totals = lines.reduce(
      (sum, line) => ({
        debitCents: sum.debitCents + (line.debitCents ?? 0),
        creditCents: sum.creditCents + (line.creditCents ?? 0),
      }),
      { debitCents: 0, creditCents: 0 },
    );
    if (totals.debitCents <= 0 || totals.creditCents <= 0 || totals.debitCents !== totals.creditCents) {
      throw new BadRequestException('Journal entry debits and credits must be positive and balanced');
    }
    return totals;
  }

  private async nextJournalEntryNumber(orgId: string) {
    const prisma = this.db.forOrg(orgId);
    const latest = await prisma.journalEntry.findFirst({
      where: { },
      orderBy: { entryNumber: 'desc' },
      select: { entryNumber: true },
    });
    return (latest?.entryNumber ?? 0) + 1;
  }

  async createJournalDraft(orgId: string, payload: {
    date?: string;
    memo?: string;
    type?: string;
    sourceType?: string;
    sourceId?: string;
    isAdjusting?: boolean;
    lines: Array<{
      accountId: string;
      debitCents?: number;
      creditCents?: number;
      propertyId?: string;
      unitId?: string;
      leaseId?: string;
      vendorId?: string;
      description?: string;
    }>;
  }, actorId: string) {
    const prisma = this.db.forOrg(orgId);
    this.validateBalancedLines(payload.lines);
    const accountIds = [...new Set(payload.lines.map((line) => line.accountId))];
    const accountCount = await prisma.chartOfAccount.count({
      where: { id: { in: accountIds }, isActive: true },
    });
    if (accountCount !== accountIds.length) {
      throw new BadRequestException('All journal line accounts must exist and belong to the organization');
    }

    return prisma.journalEntry.create({
      data: {
        organizationId: orgId,
        entryNumber: await this.nextJournalEntryNumber(orgId),
        date: payload.date ? new Date(payload.date) : new Date(),
        type: payload.type ?? 'standard',
        memo: payload.memo,
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        isAdjusting: payload.isAdjusting ?? false,
        status: 'DRAFT',
        createdById: actorId,
        lineItems: {
          create: payload.lines.map((line) => ({
            accountId: line.accountId,
            debitCents: line.debitCents ?? 0,
            creditCents: line.creditCents ?? 0,
            propertyId: line.propertyId,
            unitId: line.unitId,
            leaseId: line.leaseId,
            vendorId: line.vendorId,
            description: line.description,
          })),
        },
      },
      include: { lineItems: true },
    });
  }

  async postJournalEntry(id: string, actorId: string) {
    const entry = await this.db.raw.journalEntry.findUnique({
      where: { id },
      include: { lineItems: true },
    });
    if (!entry) {
      throw new BadRequestException('Journal entry not found');
    }
    if (entry.status === 'POSTED') {
      return entry;
    }
    if (entry.status !== 'DRAFT') {
      throw new BadRequestException('Only draft journal entries can be posted');
    }
    this.validateBalancedLines(entry.lineItems);

    return this.db.raw.journalEntry.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date(), postedById: actorId },
      include: { lineItems: true },
    });
  }

  async reverseJournalEntry(id: string, reason: string, actorId: string, date = new Date()) {
    if (!reason?.trim()) {
      throw new BadRequestException('A reversal reason is required');
    }
    const original = await this.db.raw.journalEntry.findUnique({
      where: { id },
      include: { lineItems: true },
    });
    if (!original) {
      throw new BadRequestException('Journal entry not found');
    }
    if (original.status !== 'POSTED') {
      throw new BadRequestException('Only posted journal entries can be reversed');
    }
    const existing = await this.db.raw.journalEntry.findFirst({
      where: { reversesId: id, status: { in: ['DRAFT', 'POSTED'] } },
      include: { lineItems: true },
    });
    if (existing) {
      return existing;
    }

    const reversal = await this.createJournalDraft(original.organizationId, {
      date: date.toISOString(),
      type: 'reversal',
      memo: `Reversal: ${reason}`,
      sourceType: 'journal_reversal',
      sourceId: original.id,
      lines: original.lineItems.map((line) => ({
        accountId: line.accountId,
        debitCents: line.creditCents,
        creditCents: line.debitCents,
        propertyId: line.propertyId ?? undefined,
        unitId: line.unitId ?? undefined,
        leaseId: line.leaseId ?? undefined,
        vendorId: line.vendorId ?? undefined,
        description: `Reversal of ${line.description ?? original.memo ?? original.entryNumber}`,
      })),
    }, actorId);

    await this.db.raw.journalEntry.update({
      where: { id: reversal.id },
      data: { reversesId: original.id, isReversing: true },
    });

    return this.postJournalEntry(reversal.id, actorId);
  }

  async createAccountingDraftFromOperationalLedgerEvent(orgId: string, ledgerTransactionId: string, actorId: string) {
    const prisma = this.db.forOrg(orgId);
    await this.requireAccountingMappings(orgId);
    const ledgerTx = await prisma.ledgerTransaction.findUnique({
      where: { id: ledgerTransactionId },
      include: { account: true },
    });
    if (!ledgerTx || ledgerTx.account.organizationId !== orgId) {
      throw new BadRequestException('Operational ledger transaction not found for organization');
    }
    const existing = await prisma.journalEntry.findFirst({
      where: { sourceType: 'operational_ledger', sourceId: ledgerTransactionId },
      include: { lineItems: true },
    });
    if (existing) {
      return existing;
    }

    const amount = Math.abs(ledgerTx.amountCents);
    const cash = await this.accountByCode(orgId, REQUIRED_ACCOUNT_CODES.stripeClearing);
    const rentIncome = await this.accountByCode(orgId, REQUIRED_ACCOUNT_CODES.rentalIncome);
    const depositLiability = await this.accountByCode(orgId, REQUIRED_ACCOUNT_CODES.securityDepositsHeld);
    const suspense = await this.accountByCode(orgId, REQUIRED_ACCOUNT_CODES.suspense);

    let balancingAccount = rentIncome;
    if (ledgerTx.categoryCode?.includes('deposit') || ledgerTx.sourceType?.includes('deposit')) {
      balancingAccount = depositLiability;
    } else if (!['PAYMENT', 'CHARGE', 'CREDIT', 'REVERSAL', 'RETURN_FEE', 'WRITEOFF'].includes(ledgerTx.entryType as any)) {
      balancingAccount = suspense;
    }

    const paymentIncreasesCash = ledgerTx.entryType === 'PAYMENT' || ledgerTx.direction === 'CREDIT';
    const lines = paymentIncreasesCash
      ? [
          { accountId: cash.id, debitCents: amount, leaseId: ledgerTx.account.leaseId, description: ledgerTx.description ?? 'Operational ledger cash impact' },
          { accountId: balancingAccount.id, creditCents: amount, leaseId: ledgerTx.account.leaseId, propertyId: ledgerTx.account.propertyId ?? undefined, unitId: ledgerTx.account.unitId ?? undefined, description: ledgerTx.description ?? 'Operational ledger revenue/liability impact' },
        ]
      : [
          { accountId: balancingAccount.id, debitCents: amount, leaseId: ledgerTx.account.leaseId, propertyId: ledgerTx.account.propertyId ?? undefined, unitId: ledgerTx.account.unitId ?? undefined, description: ledgerTx.description ?? 'Operational ledger reversal/credit impact' },
          { accountId: cash.id, creditCents: amount, leaseId: ledgerTx.account.leaseId, description: ledgerTx.description ?? 'Operational ledger cash reduction' },
        ];

    return this.createJournalDraft(orgId, {
      date: ledgerTx.effectiveDate.toISOString(),
      memo: `Accounting draft from operational ledger ${ledgerTx.id}`,
      sourceType: 'operational_ledger',
      sourceId: ledgerTx.id,
      lines,
    }, actorId);
  }

  // ---- Workspace Aggregation ----

  async getFinancialsWorkspace(orgId: string) {
    const prisma = this.db.forOrg(orgId);
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

    const pending = pendingTransactions.status === 'fulfilled' ? pendingTransactions.value.data : [];
    const exc = exceptions.status === 'fulfilled' ? exceptions.value.data : [];
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
    const prisma = this.db.forOrg(orgId);
    const signals: any[] = [];

    const exceptions = await prisma.bookkeepingTransaction.findMany({
      where: { status: 'EXCEPTION' },
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

    const unreconciledCount = await prisma.bookkeepingTransaction.count({
      where: { status: { in: ['PENDING_REVIEW', 'CATEGORIZED', 'ALLOCATED'] } },
    });

    if (unreconciledCount > 10) {
      const totalUnreconciled = await prisma.bookkeepingTransaction.aggregate({
        where: { status: { in: ['PENDING_REVIEW', 'CATEGORIZED', 'ALLOCATED'] } },
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

    const draftStatements = await prisma.ownerStatement.count({
      where: { status: 'DRAFT' },
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
    const prisma = this.db.forOrg(orgId);
    const decisions: any[] = [];

    const pendingTransactions = await prisma.bookkeepingTransaction.findMany({
      where: { status: 'PENDING_REVIEW', categoryConfidence: { lt: 0.7 } },
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

    const draftStatements = await prisma.ownerStatement.findMany({
      where: { status: 'DRAFT' },
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
    const prisma = this.db.forOrg(orgId);
    const events: any[] = [];

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const openMonths = await prisma.policyMonthlyClose.findMany({
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

  async getMonthlyCloseBlockers(propertyId: string, month: string) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);

    const property = await this.db.raw.property.findUnique({
      where: { id: propertyId },
      select: { organizationId: true },
    });
    if (!property) {
      throw new BadRequestException('Property not found');
    }

    const [unreconciled, exceptions, draftJournals, suspenseAccount, draftStatements] = await Promise.all([
      this.db.raw.bookkeepingTransaction.count({
        where: {
          organizationId: property.organizationId,
          date: { gte: start, lt: end },
          status: { in: ['PENDING_REVIEW', 'CATEGORIZED', 'ALLOCATED'] },
          allocations: { some: { propertyId } },
        },
      }),
      this.db.raw.bookkeepingTransaction.count({
        where: {
          organizationId: property.organizationId,
          date: { gte: start, lt: end },
          status: 'EXCEPTION',
          allocations: { some: { propertyId } },
        },
      }),
      this.db.raw.journalEntry.count({
        where: {
          organizationId: property.organizationId,
          date: { gte: start, lt: end },
          status: 'DRAFT',
          lineItems: { some: { propertyId } },
        },
      }),
      this.db.raw.chartOfAccount.findUnique({
        where: { organizationId_code: { organizationId: property.organizationId, code: REQUIRED_ACCOUNT_CODES.suspense } },
      }),
      this.db.raw.ownerStatement.count({
        where: { organizationId: property.organizationId, month, status: 'DRAFT' },
      }),
    ]);

    const suspenseLines = suspenseAccount
      ? await this.db.raw.journalLineItem.count({
          where: {
            accountId: suspenseAccount.id,
            propertyId,
            journalEntry: { date: { gte: start, lt: end }, status: { in: ['DRAFT', 'POSTED'] } },
          },
        })
      : 0;

    const blockers: string[] = [];
    if (unreconciled > 0) blockers.push(`${unreconciled} unreconciled transactions`);
    if (exceptions > 0) blockers.push(`${exceptions} exception transactions`);
    if (draftJournals > 0) blockers.push(`${draftJournals} draft journal entries`);
    if (suspenseLines > 0) blockers.push(`${suspenseLines} suspense allocations`);
    if (draftStatements > 0) blockers.push(`${draftStatements} draft owner statements`);
    return blockers;
  }

  async generateOwnerStatementsFromPostedEntries(orgId: string, month: string) {
    const prisma = this.db.forOrg(orgId);
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);

    const owners = await prisma.user.findMany({
      where: {
        role: 'OWNER',
        organizations: { some: { organizationId: orgId } },
      },
      select: { id: true },
    });
    const ownerIds = owners.map((owner) => owner.id);
    if (ownerIds.length === 0) {
      return { generated: 0, statements: [] };
    }

    const postedEntries = await prisma.journalEntry.findMany({
      where: { status: 'POSTED',
        date: { gte: start, lt: end },
      },
      include: {
        lineItems: { include: { account: true } },
      },
    });

    const statements = [];
    for (const ownerId of ownerIds) {
      const ownerLines = postedEntries.flatMap((entry) => entry.lineItems);
      const grossIncomeCents = ownerLines
        .filter((line: any) => ['REVENUE', 'CONTRA_REVENUE'].includes(line.account.type))
        .reduce((sum: number, line: any) => sum + line.creditCents - line.debitCents, 0);
      const totalExpensesCents = ownerLines
        .filter((line: any) => line.account.type === 'EXPENSE')
        .reduce((sum: number, line: any) => sum + line.debitCents - line.creditCents, 0);
      const managementFeeCents = ownerLines
        .filter((line: any) => line.account.code === '5020')
        .reduce((sum: number, line: any) => sum + line.debitCents - line.creditCents, 0);
      const netDistributionCents = grossIncomeCents - totalExpensesCents - managementFeeCents;

      const statement = await prisma.ownerStatement.upsert({
        where: { organizationId_ownerId_month: { organizationId: orgId, ownerId, month } },
        create: {
          organizationId: orgId,
          ownerId,
          month,
          grossIncomeCents,
          totalExpensesCents,
          managementFeeCents,
          netDistributionCents,
          status: 'DRAFT',
          propertyBreakdown: { sourceJournalEntryIds: postedEntries.map((entry) => entry.id) },
        },
        update: {
          grossIncomeCents,
          totalExpensesCents,
          managementFeeCents,
          netDistributionCents,
          propertyBreakdown: { sourceJournalEntryIds: postedEntries.map((entry) => entry.id) },
        },
      });
      statements.push(statement);
    }

    return { generated: statements.length, statements };
  }

  async getPaymentExpansionGateStatus(orgId: string) {
    const prisma = this.db.forOrg(orgId);
    const mapping = await this.validateRequiredAccountingMappings(orgId);
    const [draftJournals, unreconciled, exceptions, draftStatements] = await Promise.all([
      prisma.journalEntry.count({ where: { status: 'DRAFT' } }),
      prisma.bookkeepingTransaction.count({ where: { status: { in: ['PENDING_REVIEW', 'CATEGORIZED', 'ALLOCATED'] } } }),
      prisma.bookkeepingTransaction.count({ where: { status: 'EXCEPTION' } }),
      prisma.ownerStatement.count({ where: { status: 'DRAFT' } }),
    ]);

    const gates = [
      { id: 'G1', label: 'Required chart of accounts seeded', passed: mapping.ready, detail: mapping.missing },
      { id: 'G2', label: 'Operational ledger idempotency guards implemented', passed: true },
      { id: 'G3', label: 'Refund, reversal, chargeback, write-off policies defined', passed: false, detail: 'Policy implementation pending' },
      { id: 'G4', label: 'Operational events can create accounting journal drafts', passed: mapping.ready },
      { id: 'G5', label: 'Stripe webhook replay coverage for expanded events', passed: false, detail: 'Add refund, payout, dispute replay tests' },
      { id: 'G6', label: 'Reconciliation exception queue available', passed: true },
      { id: 'G7', label: 'Monthly close blocks unresolved accounting work', passed: true },
      { id: 'G8', label: 'Owner statements derive from app-owned entries', passed: true },
      { id: 'G9', label: 'Financial mutations produce audit/approval records', passed: false, detail: 'Approval task integration pending' },
      { id: 'G10', label: 'Contract tests cover accounting/payment routes', passed: true },
    ];

    return {
      readyForExpandedPaymentWrites: gates.every((gate) => gate.passed) && draftJournals === 0 && unreconciled === 0 && exceptions === 0 && draftStatements === 0,
      gates,
      blockers: { draftJournals, unreconciled, exceptions, draftStatements },
    };
  }

  async assertPaymentExpansionAllowed(orgId: string, flow: string) {
    const prisma = this.db.forOrg(orgId);
    const status = await this.getPaymentExpansionGateStatus(orgId);
    if (!status.readyForExpandedPaymentWrites) {
      throw new ForbiddenException(`${flow} is blocked until accounting MVP gates are complete`);
    }
    return status;
  }

  async getQuickBooksExportBatchSpec(orgId: string) {
    const prisma = this.db.forOrg(orgId);
    const mapping = await this.validateRequiredAccountingMappings(orgId);
    const exportableCount = await prisma.journalEntry.count({
      where: { status: 'POSTED' },
    });
    const blockedCount = await prisma.journalEntry.count({
      where: { status: 'DRAFT' },
    });

    return {
      sourceOfTruth: 'PropertyOS',
      target: 'QuickBooks Online',
      exportableSource: 'POSTED JournalEntry records only',
      idempotencyKey: 'organizationId + journalEntryId + targetRealmId',
      mappingReady: mapping.ready,
      missingMappings: mapping.missing,
      exportableCount,
      blockedCount,
      payloadShape: {
        batchId: 'uuid',
        organizationId: orgId,
        entries: [
          {
            sourceType: 'journal_entry',
            sourceId: 'journalEntry.id',
            externalId: 'QuickBooks JournalEntry Id after success',
            lines: 'JournalLineItem[] mapped to QuickBooks accounts/classes/customers',
          },
        ],
      },
      retryPolicy: 'Retry failed records by sourceId; never resend successful externalId records.',
    };
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
    const prisma = this.db.forOrg(orgId);
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
      await prisma.bookkeepingTransaction.createMany({ data: validRows });
      imported = validRows.length;
      this.logger.log(`Imported ${imported} transactions for org ${orgId} by ${actorId}`);
    }

    return { imported, skipped, errors, total: rows.length };
  }
}
