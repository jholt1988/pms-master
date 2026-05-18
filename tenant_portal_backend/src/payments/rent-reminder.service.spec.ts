import { RentReminderService } from './rent-reminder.service';

describe('RentReminderService', () => {
  const prisma = {
    payment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  } as any;
  const svc = new RentReminderService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('processes reminders and returns summarized payload', async () => {
    prisma.payment.findMany.mockResolvedValueOnce([
      { id: 1, amount: 123, paymentDate: new Date('2026-01-08T12:00:00Z'), lease: { tenant: { email: 't@test.com' } } },
    ]);
    const result = await svc.processRentReminders(7);
    expect(result.processed).toBe(1);
    expect(result.payments[0]).toMatchObject({ paymentId: 1, tenantEmail: 't@test.com', amount: 123 });
  });

  it('throws for missing payment on sendReminder', async () => {
    prisma.payment.findUnique.mockResolvedValueOnce(null);
    await expect(svc.sendReminder(42)).rejects.toThrow('Payment 42 not found');
  });

  it('returns reminder details and suppression payloads', async () => {
    prisma.payment.findUnique.mockResolvedValueOnce({
      id: 7,
      amount: 200,
      paymentDate: new Date('2026-01-05T00:00:00Z'),
      lease: { tenant: { email: 'tenant@example.com' } },
    });
    const reminder = await svc.sendReminder(7);
    expect(reminder.success).toBe(true);
    expect(reminder.tenantEmail).toBe('tenant@example.com');

    const suppressed = await svc.suppressReminder(7, 3);
    expect(suppressed.suppressed).toBe(true);
  });
});
