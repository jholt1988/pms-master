import { BillingService } from './billing.service';

describe('BillingService recurring invoice and late fee cycles', () => {
  const prisma: any = {
    recurringInvoiceSchedule: { findMany: jest.fn(), update: jest.fn() },
    invoice: { findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    lateFee: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const paymentsService: any = {};
  const securityEvents: any = { logEvent: jest.fn() };
  const stripeService: any = {};

  let service: BillingService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new BillingService(prisma, paymentsService, securityEvents, stripeService);
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        invoice: prisma.invoice,
        recurringInvoiceSchedule: prisma.recurringInvoiceSchedule,
        lateFee: prisma.lateFee,
      }),
    );
  });

  it('generates invoice and updates next run for active schedules', async () => {
    prisma.recurringInvoiceSchedule.findMany.mockResolvedValueOnce([
      {
        id: 1,
        leaseId: 'lease-1',
        description: 'Rent',
        amount: 1200,
        nextRun: new Date('2026-05-01T09:00:00.000Z'),
        frequency: 'MONTHLY',
      },
    ]);
    prisma.invoice.create.mockResolvedValueOnce({ id: 101 });

    await service.generateRecurringInvoices();

    expect(prisma.invoice.create).toHaveBeenCalled();
    expect(prisma.recurringInvoiceSchedule.update).toHaveBeenCalled();
  });

  it('applies late fee when overdue invoice is eligible and not already charged', async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - 10);
    prisma.invoice.findMany.mockResolvedValueOnce([
      {
        id: 10,
        amount: 1000,
        dueDate,
        status: 'UNPAID',
        lateFees: [],
        schedule: { lateFeeAmount: 50, lateFeeAfterDays: 5 },
      },
    ]);

    await service.applyLateFees();

    expect(prisma.lateFee.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 50 }) }),
    );
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 }, data: { amount: 1050 } }),
    );
  });

  it('skips late fee when already assessed', async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - 10);
    prisma.invoice.findMany.mockResolvedValueOnce([
      {
        id: 11,
        amount: 1000,
        dueDate,
        status: 'UNPAID',
        lateFees: [{ id: 1, waived: false }],
        schedule: { lateFeeAmount: 50, lateFeeAfterDays: 5 },
      },
    ]);

    await service.applyLateFees();

    expect(prisma.lateFee.create).not.toHaveBeenCalled();
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });
});

