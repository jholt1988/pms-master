import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'crypto';
import { MilEnvelope } from './mil-envelope.types';

@Injectable()
export class CryptoService {
  encrypt(data: string, key: Buffer, keyId: string): MilEnvelope {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encVersion: 'v1',
      algorithm: 'aes-256-gcm',
      keyId,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encryptedData: encrypted.toString('base64'),
      payloadDigest: createHash('sha256').update(data, 'utf8').digest('hex'),
    };
  }

  decrypt(envelope: MilEnvelope, key: Buffer): string {
    const iv = Buffer.from(envelope.iv, 'base64');
    const authTag = Buffer.from(envelope.authTag, 'base64');
    const encrypted = Buffer.from(envelope.encryptedData, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');

    const digest = createHash('sha256').update(decrypted, 'utf8').digest('hex');
    const expected = Buffer.from(envelope.payloadDigest, 'hex');
    const actual = Buffer.from(digest, 'hex');

    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new Error('MIL payload digest mismatch');
    }

    return decrypted;
  }
}
