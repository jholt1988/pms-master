import { createHash, randomBytes } from 'crypto';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  const service = new CryptoService();
  const key = randomBytes(32);

  it('encrypts and decrypts payloads', () => {
    const payload = JSON.stringify({ hello: 'world', at: Date.now() });

    const envelope = service.encrypt(payload, key, 'k1');
    const decrypted = service.decrypt(envelope, key);

    expect(decrypted).toBe(payload);
    expect(envelope.keyId).toBe('k1');
    expect(envelope.algorithm).toBe('aes-256-gcm');
  });

  it('fails when encrypted data is tampered', () => {
    const payload = JSON.stringify({ tenant: 't1', amount: 123 });
    const envelope = service.encrypt(payload, key, 'k1');

    const tampered = {
      ...envelope,
      encryptedData: Buffer.from('tampered-payload', 'utf8').toString('base64'),
    };

    expect(() => service.decrypt(tampered, key)).toThrow();
  });

  it('fails when payload digest is tampered', () => {
    const payload = JSON.stringify({ tenant: 't1', status: 'ok' });
    const envelope = service.encrypt(payload, key, 'k1');

    const tampered = {
      ...envelope,
      payloadDigest: createHash('sha256').update('different', 'utf8').digest('hex'),
    };

    expect(() => service.decrypt(tampered, key)).toThrow('MIL payload digest mismatch');
  });

  it('fails with wrong key', () => {
    const payload = JSON.stringify({ secure: true });
    const envelope = service.encrypt(payload, key, 'k1');

    expect(() => service.decrypt(envelope, randomBytes(32))).toThrow();
  });
});
