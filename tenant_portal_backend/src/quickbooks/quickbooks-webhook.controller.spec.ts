import { BadRequestException } from '@nestjs/common';
import { QuickBooksWebhookController } from './quickbooks-webhook.controller';

describe('QuickBooksWebhookController', () => {
  const quickBooksService = {
    handleWebhook: jest.fn(),
  };
  const controller = new QuickBooksWebhookController(quickBooksService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes raw body, signature, and parsed body to the service', async () => {
    const rawBody = Buffer.from('{"eventNotifications":[]}');
    quickBooksService.handleWebhook.mockResolvedValueOnce({ eventKey: 'realm:Invoice:1:Update', deduped: false });

    const result = await controller.handleWebhook(
      { rawBody, body: { eventNotifications: [] } } as any,
      'signature',
    );

    expect(result).toEqual({ received: true, deduped: false });
    expect(quickBooksService.handleWebhook).toHaveBeenCalledWith(rawBody, 'signature', { eventNotifications: [] });
  });

  it('acknowledges duplicate webhook replays as received', async () => {
    quickBooksService.handleWebhook.mockResolvedValueOnce({ eventKey: 'realm:Invoice:1:Update', deduped: true });

    const result = await controller.handleWebhook(
      { rawBody: Buffer.from('{}'), body: {} } as any,
      'signature',
    );

    expect(result).toEqual({ received: true, deduped: true });
  });

  it('maps signature errors to BadRequestException', async () => {
    quickBooksService.handleWebhook.mockRejectedValueOnce(new Error('Invalid QuickBooks webhook signature.'));

    await expect(
      controller.handleWebhook({ rawBody: Buffer.from('{}'), body: {} } as any, 'bad'),
    ).rejects.toThrow(BadRequestException);
  });
});
