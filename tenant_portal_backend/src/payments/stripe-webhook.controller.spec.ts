import { StripeWebhookController } from './stripe-webhook.controller';

describe('StripeWebhookController', () => {
  const stripeService = {
    handleWebhook: jest.fn(),
  } as any;
  const controller = new StripeWebhookController(stripeService);

  const mkRes = () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    return res;
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns 400 if stripe signature header is missing', async () => {
    const res = mkRes();
    await controller.handleWebhook({ body: {} } as any, res, undefined as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 when webhook is processed', async () => {
    const res = mkRes();
    stripeService.handleWebhook.mockResolvedValueOnce({ eventId: 'evt_1' });
    await controller.handleWebhook({ body: { ok: true } } as any, res, 'sig');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, eventId: 'evt_1' });
  });

  it('returns 400 on invalid payload errors and 500 otherwise', async () => {
    const badRes = mkRes();
    stripeService.handleWebhook.mockRejectedValueOnce(new Error('invalid signature'));
    await controller.handleWebhook({ body: { ok: true } } as any, badRes, 'sig');
    expect(badRes.status).toHaveBeenCalledWith(400);

    const serverErrRes = mkRes();
    stripeService.handleWebhook.mockRejectedValueOnce(new Error('db unavailable'));
    await controller.handleWebhook({ body: { ok: true } } as any, serverErrRes, 'sig');
    expect(serverErrRes.status).toHaveBeenCalledWith(500);
  });
});
