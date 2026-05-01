import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
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
});
