import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { EsignEnvelopeStatus, EsignProvider } from '@prisma/client';
import { EsignatureService } from './esignature.service';

describe('EsignatureService webhook signature validation', () => {
  const makeService = (get: (key: string) => string | undefined) => new EsignatureService(
    {} as any,
    { get: jest.fn(get) } as unknown as ConfigService,
    {} as any,
    {} as any,
    {} as any,
  );

  it('accepts a valid DocuSign HMAC signature and rejects an invalid one', () => {
    const service = makeService((key) => {
      if (key === 'ESIGN_WEBHOOK_SECRET') return 'connect-secret';
      if (key === 'ESIGN_PROVIDER_BASE_URL') return 'https://demo.docusign.net/restapi/v2.1';
      if (key === 'ESIGN_PROVIDER_API_KEY') return 'test-token';
      if (key === 'ESIGN_PROVIDER_ACCOUNT_ID') return 'acct-1';
      return undefined;
    });
    const body = Buffer.from(JSON.stringify({ envelopeId: 'env-123', status: 'COMPLETED' }));
    const signature = createHmac('sha256', 'connect-secret').update(body).digest('base64');

    expect(() => service.assertValidWebhookSignature(body, signature)).not.toThrow();
    expect(() => service.assertValidWebhookSignature(body, 'invalid')).toThrow('Invalid DocuSign webhook signature');
  });

  it('requires a webhook secret in production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const service = makeService(() => undefined);

    expect(() => service.assertValidWebhookSignature(Buffer.from('{}'), undefined)).toThrow(
      'ESIGN_WEBHOOK_SECRET or DOCUSIGN_CONNECT_SECRET must be set',
    );

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('dedupes repeated provider webhook events from envelope metadata', async () => {
    const prisma = {
      esignEnvelope: {
        findFirst: jest.fn().mockResolvedValue({
          id: 5,
          leaseId: '12',
          createdById: '7',
          provider: EsignProvider.DOCUSIGN,
          providerEnvelopeId: 'env-123',
          status: EsignEnvelopeStatus.COMPLETED,
          providerMetadata: {
            processedWebhookKeys: ['env-123:envelope-completed:COMPLETED'],
          },
          participants: [{ id: 1, name: 'Tenant', email: 'tenant@test.com', userId: '42' }],
        }),
        update: jest.fn(),
      },
      esignParticipant: { updateMany: jest.fn() },
    };
    const notifications = { sendSignatureAlert: jest.fn() };
    const service = new EsignatureService(
      prisma as any,
      { get: jest.fn(() => undefined) } as unknown as ConfigService,
      {} as any,
      notifications as any,
      {} as any,
    );

    const result = await service.handleProviderWebhook({
      event: 'envelope-completed',
      envelopeId: 'env-123',
      status: 'COMPLETED',
    });

    expect(result).toEqual({ success: true, envelopeId: 5, status: EsignEnvelopeStatus.COMPLETED, deduped: true });
    expect(prisma.esignEnvelope.update).not.toHaveBeenCalled();
    expect(notifications.sendSignatureAlert).not.toHaveBeenCalled();
  });
});
