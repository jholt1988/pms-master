import { PaymentMethodsController } from './payment-methods.controller';

describe('PaymentMethodsController', () => {
  const paymentMethodsService = {
    listForUser: jest.fn(),
    createSetupIntent: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };
  const auditLogService = {
    record: jest.fn(),
  };

  const controller = new PaymentMethodsController(
    paymentMethodsService as any,
    auditLogService as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('lists methods for authenticated user', async () => {
    paymentMethodsService.listForUser.mockResolvedValueOnce([{ id: 1 }]);
    const req = { user: { userId: 'u1' } } as any;
    await expect(controller.list(req)).resolves.toEqual([{ id: 1 }]);
    expect(paymentMethodsService.listForUser).toHaveBeenCalledWith('u1');
  });

  it('creates setup intent for authenticated user', async () => {
    paymentMethodsService.createSetupIntent.mockResolvedValueOnce({ clientSecret: 'cs_1' });
    const req = { user: { userId: 'u1' } } as any;
    await expect(controller.createSetupIntent(req)).resolves.toEqual({ clientSecret: 'cs_1' });
  });

  it('creates payment method and writes audit record', async () => {
    paymentMethodsService.create.mockResolvedValueOnce({ id: 88 });
    auditLogService.record.mockResolvedValueOnce(undefined);
    const req = { user: { userId: 'u1' } } as any;
    const dto = { type: 'CARD' } as any;
    await expect(controller.create(dto, req)).resolves.toEqual({ id: 88 });
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u1',
        action: 'CREATE_PAYMENT_METHOD',
        entityId: 88,
      }),
    );
  });

  it('deletes payment method and writes audit record', async () => {
    paymentMethodsService.remove.mockResolvedValueOnce({ success: true });
    auditLogService.record.mockResolvedValueOnce(undefined);
    const req = { user: { userId: 'u1' } } as any;
    await expect(controller.delete('123', req)).resolves.toEqual({ success: true });
    expect(paymentMethodsService.remove).toHaveBeenCalledWith('u1', 123);
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u1',
        action: 'DELETE_PAYMENT_METHOD',
        entityId: 123,
      }),
    );
  });
});
