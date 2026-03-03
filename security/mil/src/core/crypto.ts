import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { canonicalBytes } from "./canonical";
import { wrapDek, unwrapDek } from "./wrap";

export type EnvelopeCipher = "AES-256-GCM";

export type EnvelopeEncrypted = {
  payload_digest: string;
  payload_ciphertext: Buffer; // ct||tag
  nonce: Buffer; // payload nonce
  dek_wrapped: Buffer; // wrap_nonce||wrapped_dek_ct||wrap_tag
  tenant_kms_key_id: string;
  cipher: EnvelopeCipher;
  enc_version: number;
};

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function aesGcmEncrypt(key: Buffer, nonce: Buffer, plaintext: Buffer): { ct: Buffer; tag: Buffer } {
  const c = createCipheriv("aes-256-gcm", key, nonce);
  const ct = Buffer.concat([c.update(plaintext), c.final()]);
  const tag = c.getAuthTag();
  return { ct, tag };
}

function aesGcmDecrypt(key: Buffer, nonce: Buffer, ciphertext: Buffer, tag: Buffer): Buffer {
  const d = createDecipheriv("aes-256-gcm", key, nonce);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ciphertext), d.final()]);
}

/**
 * Encrypt payload with per-payload DEK; wrap DEK with tenant KEK.
 * This is the core primitive that supports re-key (rewrap only) and crypto-delete (destroy tenant KEK).
 */
export function envelopeEncryptWithTenantKek(params: {
  tenant_kek: Buffer; // 32 bytes
  tenant_kms_key_id: string;
  payload: unknown;
}): EnvelopeEncrypted {
  const plaintext = canonicalBytes(params.payload);
  const payload_digest = sha256Hex(plaintext);

  const dek = randomBytes(32);
  const payload_nonce = randomBytes(12);

  const { ct, tag } = aesGcmEncrypt(dek, payload_nonce, plaintext);
  const payload_ciphertext = Buffer.concat([ct, tag]);

  const dek_wrapped = wrapDek(params.tenant_kek, dek);

  return {
    payload_digest,
    payload_ciphertext,
    nonce: payload_nonce,
    dek_wrapped,
    tenant_kms_key_id: params.tenant_kms_key_id,
    cipher: "AES-256-GCM",
    enc_version: 3,
  };
}

export function envelopeDecryptWithTenantKek(params: {
  tenant_kek: Buffer; // 32 bytes
  tenant_kms_key_id: string;
  payload_ciphertext: Buffer;
  nonce: Buffer;
  dek_wrapped: Buffer;
}): unknown {
  const dek = unwrapDek(params.tenant_kek, params.dek_wrapped);

  const ct = params.payload_ciphertext.subarray(0, params.payload_ciphertext.length - 16);
  const tag = params.payload_ciphertext.subarray(params.payload_ciphertext.length - 16);

  const plaintext = aesGcmDecrypt(dek, params.nonce, ct, tag);
  return JSON.parse(plaintext.toString("utf8"));
}
