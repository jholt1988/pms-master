import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Wrap/unwrap a 32-byte DEK with a tenant KEK using AES-256-GCM.
 *
 * Stored format in DB `dek_wrapped`:
 *   wrap_nonce (12) || wrapped_ct (32) || wrap_tag (16)
 */
export function wrapDek(kek: Buffer, dek: Buffer): Buffer {
  if (kek.length !== 32) throw new Error("KEK must be 32 bytes");
  if (dek.length !== 32) throw new Error("DEK must be 32 bytes");
  const nonce = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", kek, nonce);
  const ct = Buffer.concat([c.update(dek), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([nonce, ct, tag]);
}

export function unwrapDek(kek: Buffer, dek_wrapped: Buffer): Buffer {
  if (kek.length !== 32) throw new Error("KEK must be 32 bytes");
  const nonce = dek_wrapped.subarray(0, 12);
  const ct_plus_tag = dek_wrapped.subarray(12);
  const ct = ct_plus_tag.subarray(0, ct_plus_tag.length - 16);
  const tag = ct_plus_tag.subarray(ct_plus_tag.length - 16);
  const d = createDecipheriv("aes-256-gcm", kek, nonce);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}
