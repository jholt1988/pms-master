export interface MilEnvelope {
  encVersion: 'v1';
  algorithm: 'aes-256-gcm';
  keyId: string;
  iv: string;
  authTag: string;
  encryptedData: string;
  payloadDigest: string;
}

export interface MilKeyMaterial {
  keyId: string;
  key: Buffer;
}

export interface MilTraceContext {
  traceId: string;
  requestId?: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  orgId?: string;
  tenantId?: string;
  module: string;
  action: string;
  entityType: string;
  entityId?: string | number;
  modelProvider?: string;
  modelName?: string;
  modelVersion?: string;
}
