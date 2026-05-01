import { EsignatureWebhookController } from './esignature-webhook.controller';

describe('EsignatureWebhookController', () => {
  it('validates webhook signature before processing payload', async () => {
    const service = {
      assertValidWebhookSignature: jest.fn(),
      handleProviderWebhook: jest.fn().mockResolvedValue({}),
    } as any;
    const controller = new EsignatureWebhookController(service);
    const rawBody = Buffer.from('{"envelopeId":"env-123"}');

    await expect(
      controller.handleWebhook(
        { envelopeId: 'env-123', status: 'COMPLETED' } as any,
        'signature',
        { rawBody, body: { envelopeId: 'env-123' } } as any,
      ),
    ).resolves.toEqual({ received: true });

    expect(service.assertValidWebhookSignature).toHaveBeenCalledWith(rawBody, 'signature');
    expect(service.handleProviderWebhook).toHaveBeenCalledWith({ envelopeId: 'env-123', status: 'COMPLETED' });
  });

  it('does not process payload when signature validation fails', async () => {
    const service = {
      assertValidWebhookSignature: jest.fn(() => {
        throw new Error('invalid signature');
      }),
      handleProviderWebhook: jest.fn(),
    } as any;
    const controller = new EsignatureWebhookController(service);

    await expect(
      controller.handleWebhook({ envelopeId: 'env-123' } as any, 'bad', { rawBody: Buffer.from('{}'), body: {} } as any),
    ).rejects.toThrow('invalid signature');

    expect(service.handleProviderWebhook).not.toHaveBeenCalled();
  });
});
