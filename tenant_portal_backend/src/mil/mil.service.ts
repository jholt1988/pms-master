import { Injectable } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { KeyringService } from './keyring.service';

@Injectable()
export class MilService {
  constructor(
    private readonly cryptoService: CryptoService,
    private readonly keyringService: KeyringService,
  ) {}

  // This service will orchestrate the key management and cryptographic operations
  // by using the CryptoService and KeyringService.

  async encryptPayload(tenantId: string, payload: object): Promise<string> {
    const tenantKey = await this.keyringService.getActiveKey(tenantId);
    return this.cryptoService.encrypt(JSON.stringify(payload), tenantKey);
  }

  async decryptPayload<T>(tenantId: string, encryptedPayload: string): Promise<T> {
    const tenantKey = await this.keyringService.getActiveKey(tenantId);
    const decrypted = await this.cryptoService.decrypt(encryptedPayload, tenantKey);
    return JSON.parse(decrypted) as T;
  }
}
