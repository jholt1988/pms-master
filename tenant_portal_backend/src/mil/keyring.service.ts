import { Injectable } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { MilKeyMaterial } from './mil-envelope.types';

@Injectable()
export class KeyringService {
  // Phase 0: deterministic tenant key derivation from master secret.
  // Future phase: replace with DB-backed tenant key versions + rotation lifecycle.
  getActiveKey(tenantId: string): MilKeyMaterial {
    const master = process.env.MIL_MASTER_KEY || process.env.JWT_SECRET || 'dev-only-change-me';
    const version = process.env.MIL_KEY_VERSION || 'v1';
    const keyId = `${tenantId}:${version}`;

    const derived = createHmac('sha256', master)
      .update(`mil:${tenantId}:${version}`)
      .digest();

    // AES-256 key must be 32 bytes.
    const key = createHash('sha256').update(derived).digest();

    return { keyId, key };
  }
}
