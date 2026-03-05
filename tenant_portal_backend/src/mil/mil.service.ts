import { Injectable } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { KeyringService } from './keyring.service';
import { MilEnvelope } from './mil-envelope.types';

@Injectable()
export class MilService {
  constructor(
    private readonly cryptoService: CryptoService,
    private readonly keyringService: KeyringService,
  ) {}

  encryptPayload(tenantId: string, payload: object): MilEnvelope {
    const tenantKey = this.keyringService.getActiveKey(tenantId);
    return this.cryptoService.encrypt(JSON.stringify(payload), tenantKey.key, tenantKey.keyId);
  }

  decryptPayload<T>(tenantId: string, encryptedPayload: MilEnvelope | string): T {
    const envelope = typeof encryptedPayload === 'string'
      ? JSON.parse(encryptedPayload) as MilEnvelope
      : encryptedPayload;

    const tenantKey = this.keyringService.getActiveKey(tenantId);

    if (envelope.keyId !== tenantKey.keyId) {
      throw new Error(`MIL key mismatch. Expected ${tenantKey.keyId}, got ${envelope.keyId}`);
    }

    const decrypted = this.cryptoService.decrypt(envelope, tenantKey.key);
    return JSON.parse(decrypted) as T;
  }
}
