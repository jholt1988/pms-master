import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookkeepingService } from './bookkeeping.service';

const createPrisma = () => ({
  bookkeepingTransaction: {
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findUnique: jest.fn(),
    aggregate: jest.fn(),
    createMany: jest.fn(),
  },
  bookkeepingAllocation: {
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  reconciliationSessionItem: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  property: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  policyMonthlyClose: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  journalEntry: {
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  journalLineItem: {
    count: jest.fn(),
  },
  ownerStatement: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  chartOfAccount: {
    findMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
  ledgerTransaction: {
    findUnique: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('BookkeepingService accounting MVP guardrails', () => {
  let prisma: ReturnType<typeof createPrisma>;
  let service: BookkeepingService;

  beforeEach(() => {
    prisma = createPrisma();
    const db = { forOrg: () => prisma, raw: prisma };
    service = new BookkeepingService(db as any);
  });

  it('seeds required chart of accounts as system accounts', async () => {
    prisma.chartOfAccount.upsert.mockImplementation(({ create }) => Promise.resolve({ id: create.code, ...create }));

    const result = await service.seedDefaultChartOfAccounts('org-1');

    expect(result.seeded).toBeGreaterThan(10);
    expect(prisma.chartOfAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_code: { organizationId: 'org-1', code: '1000' } },
      }),
    );
  });

  it('reports missing required accounting mappings', async () => {
    prisma.chartOfAccount.findMany.mockResolvedValue([{ code: '1000' }, { code: '1010' }]);

    const status = await service.validateRequiredAccountingMappings('org-1');

    expect(status.ready).toBe(false);
    expect(status.missing.map((item) => item.code)).toContain('4000');
  });

  it('rejects unbalanced journal drafts', async () => {
    await expect(
      service.createJournalDraft(
        'org-1',
        {
          lines: [
            { accountId: 'cash', debitCents: 1000 },
            { accountId: 'income', creditCents: 900 },
          ],
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates balanced journal drafts', async () => {
    prisma.chartOfAccount.count.mockResolvedValue(2);
    prisma.journalEntry.findFirst.mockResolvedValue(null);
    prisma.journalEntry.create.mockResolvedValue({ id: 'journal-1', status: 'DRAFT' });

    const result = await service.createJournalDraft(
      'org-1',
      {
        memo: 'Rent payment',
        lines: [
          { accountId: 'cash', debitCents: 1000 },
          { accountId: 'income', creditCents: 1000 },
        ],
      },
      'user-1',
    );

    expect(result).toEqual({ id: 'journal-1', status: 'DRAFT' });
    expect(prisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DRAFT',
          lineItems: expect.objectContaining({ create: expect.any(Array) }),
        }),
      }),
    );
  });

  it('posts only balanced draft journals', async () => {
    prisma.journalEntry.findUnique.mockResolvedValue({
      id: 'journal-1',
      status: 'DRAFT',
      lineItems: [
        { debitCents: 500, creditCents: 0 },
        { debitCents: 0, creditCents: 500 },
      ],
    });
    prisma.journalEntry.update.mockResolvedValue({ id: 'journal-1', status: 'POSTED' });

    await expect(service.postJournalEntry('journal-1', 'user-1')).resolves.toEqual({ id: 'journal-1', status: 'POSTED' });
  });

  it('creates reversal journals by swapping debits and credits', async () => {
    prisma.journalEntry.findUnique.mockResolvedValue({
      id: 'journal-1',
      organizationId: 'org-1',
      status: 'POSTED',
      entryNumber: 1,
      memo: 'Original',
      lineItems: [
        { accountId: 'cash', debitCents: 1000, creditCents: 0 },
        { accountId: 'income', debitCents: 0, creditCents: 1000 },
      ],
    });
    prisma.journalEntry.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ entryNumber: 1 });
    prisma.chartOfAccount.count.mockResolvedValue(2);
    prisma.journalEntry.create.mockResolvedValue({ id: 'reversal-1', lineItems: [] });
    prisma.journalEntry.update.mockResolvedValue({ id: 'reversal-1' });
    prisma.journalEntry.findUnique.mockResolvedValueOnce({
      id: 'journal-1',
      organizationId: 'org-1',
      status: 'POSTED',
      entryNumber: 1,
      memo: 'Original',
      lineItems: [
        { accountId: 'cash', debitCents: 1000, creditCents: 0 },
        { accountId: 'income', debitCents: 0, creditCents: 1000 },
      ],
    }).mockResolvedValueOnce({
      id: 'reversal-1',
      status: 'DRAFT',
      lineItems: [
        { debitCents: 0, creditCents: 1000 },
        { debitCents: 1000, creditCents: 0 },
      ],
    });

    await service.reverseJournalEntry('journal-1', 'correction', 'user-1');

    expect(prisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lineItems: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ accountId: 'cash', creditCents: 1000 }),
              expect.objectContaining({ accountId: 'income', debitCents: 1000 }),
            ]),
          }),
        }),
      }),
    );
  });

  it('rejects reconciliation confirmation without a ledger match', async () => {
    prisma.reconciliationSessionItem.findUnique.mockResolvedValue({
      id: 'item-1',
      status: 'UNMATCHED',
      suggestedMatchId: null,
      ledgerEntryId: null,
      bankAmountCents: 1000,
      ledgerAmountCents: null,
    });

    await expect(service.confirmReconciliationMatch('item-1', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('blocks expanded payment writes until all accounting gates pass', async () => {
    prisma.chartOfAccount.findMany.mockResolvedValue([]);
    prisma.journalEntry.count.mockResolvedValue(0);
    prisma.bookkeepingTransaction.count.mockResolvedValue(0);
    prisma.ownerStatement.count.mockResolvedValue(0);

    await expect(service.assertPaymentExpansionAllowed('org-1', 'refunds')).rejects.toThrow(ForbiddenException);
  });

  it('describes QuickBooks export batches as posted-entry exports only', async () => {
    prisma.chartOfAccount.findMany.mockResolvedValue([
      { code: '1000' },
      { code: '1010' },
      { code: '1020' },
      { code: '2100' },
      { code: '4000' },
      { code: '4010' },
      { code: '5000' },
      { code: '5050' },
      { code: '9000' },
    ]);
    prisma.journalEntry.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);

    const spec = await service.getQuickBooksExportBatchSpec('org-1');

    expect(spec.sourceOfTruth).toBe('PropertyOS');
    expect(spec.exportableSource).toContain('POSTED JournalEntry');
    expect(spec.exportableCount).toBe(3);
    expect(spec.blockedCount).toBe(1);
  });
});
