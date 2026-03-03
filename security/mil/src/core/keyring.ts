import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Platform-at-rest encryption for tenant KEKs using MIL_MASTER_KEK_BASE64.
 * This is NOT KMS; it's a starter so crypto-delete is per-tenant and real.
 *
 * - encryptKekForStorage: returns ciphertext||tag and nonce
 * - decryptKekFromStorage: returns plaintext KEK bytes
 */

function getMasterKey32(): Buffer {
  const b64 = process.env.MIL_MASTER_KEK_BASE64;
  if (!b64) throw new Error("Missing MIL_MASTER_KEK_BASE64");
  const k = Buffer.from(b64, "base64");
  if (k.length < 32) throw new Error("MIL_MASTER_KEK_BASE64 must decode to >=32 bytes");
  return k.subarray(0, 32);
}

export function encryptKekForStorage(kekPlain: Buffer): { kek_ciphertext: Buffer; kek_nonce: Buffer } {
  const key = getMasterKey32();
  const nonce = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, nonce);
  const ct = Buffer.concat([c.update(kekPlain), c.final()]);
  const tag = c.getAuthTag();
  return { kek_ciphertext: Buffer.concat([ct, tag]), kek_nonce: nonce };
}

export function decryptKekFromStorage(kek_ciphertext: Buffer, kek_nonce: Buffer): Buffer {
  const key = getMasterKey32();
  const ct = kek_ciphertext.subarray(0, kek_ciphertext.length - 16);
  const tag = kek_ciphertext.subarray(kek_ciphertext.length - 16);
  const d = createDecipheriv("aes-256-gcm", key, kek_nonce);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}
