import { PoolClient } from "pg";
import { randomBytes } from "crypto";
import { encryptKekForStorage, decryptKekFromStorage } from "../core/keyring";

export async function ensureActiveTenantKek(client: PoolClient, tenant_id: string): Promise<{ kms_key_id: string; kek: Buffer }> {
  // Prefer tenant_crypto_state.kms_key_id as active pointer.
  const c = await client.query(
    `SELECT kms_key_id, state
     FROM tenant_crypto_state
     WHERE tenant_id=$1
     LIMIT 1`,
    [tenant_id]
  );

  const kms_key_id = c.rowCount === 1 ? (c.rows[0].kms_key_id as string) : (process.env.MIL_DEFAULT_KMS_KEY_ID || "kek://default/v1");

  // Ensure crypto state row exists
  if (c.rowCount === 0) {
    await client.query(
      `INSERT INTO tenant_crypto_state (tenant_id, state, kms_key_id)
       VALUES ($1,'ACTIVE',$2)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenant_id, kms_key_id]
    );
  }

  // Try to load active KEK version
  const q = await client.query(
    `SELECT kek_ciphertext, kek_nonce, status
     FROM tenant_kek_versions
     WHERE tenant_id=$1 AND kms_key_id=$2
     LIMIT 1`,
    [tenant_id, kms_key_id]
  );

  if (q.rowCount === 1) {
    const status = q.rows[0].status as string;
    if (status === "DELETED") throw new Error("TENANT_KEK_DELETED");
    const kek_ct = q.rows[0].kek_ciphertext as Buffer;
    const kek_nonce = q.rows[0].kek_nonce as Buffer;
    const kek = decryptKekFromStorage(kek_ct, kek_nonce);
    return { kms_key_id, kek };
  }

  // Create new KEK for this tenant/version
  const kekPlain = randomBytes(32);
  const enc = encryptKekForStorage(kekPlain);

  await client.query(
    `INSERT INTO tenant_kek_versions (tenant_id, kms_key_id, status, kek_ciphertext, kek_nonce)
     VALUES ($1,$2,'ACTIVE',$3,$4)
     ON CONFLICT (tenant_id, kms_key_id) DO NOTHING`,
    [tenant_id, kms_key_id, enc.kek_ciphertext, enc.kek_nonce]
  );

  return { kms_key_id, kek: kekPlain };
}

export async function createNewTenantKekVersion(client: PoolClient, tenant_id: string, new_kms_key_id: string): Promise<{ kms_key_id: string; kek: Buffer }> {
  const kekPlain = randomBytes(32);
  const enc = encryptKekForStorage(kekPlain);

  await client.query(
    `INSERT INTO tenant_kek_versions (tenant_id, kms_key_id, status, kek_ciphertext, kek_nonce)
     VALUES ($1,$2,'ACTIVE',$3,$4)
     ON CONFLICT (tenant_id, kms_key_id) DO NOTHING`,
    [tenant_id, new_kms_key_id, enc.kek_ciphertext, enc.kek_nonce]
  );

  // Point tenant crypto state to new version (keep state updates to caller)
  await client.query(
    `UPDATE tenant_crypto_state SET kms_key_id=$2, updated_at=now() WHERE tenant_id=$1`,
    [tenant_id, new_kms_key_id]
  );

  return { kms_key_id: new_kms_key_id, kek: kekPlain };
}

export async function cryptoDeleteTenantKek(client: PoolClient, tenant_id: string, kms_key_id: string) {
  // Mark KEK DELETED and wipe ciphertext + nonce
  await client.query(
    `UPDATE tenant_kek_versions
     SET status='DELETED',
         kek_ciphertext=NULL,
         kek_nonce=NULL,
         deleted_at=now()
     WHERE tenant_id=$1 AND kms_key_id=$2`,
    [tenant_id, kms_key_id]
  );

  // Flip tenant state (blocks payload writes, but hash continuity remains)
  await client.query(
    `UPDATE tenant_crypto_state
     SET state='CRYPTO_DELETED', updated_at=now()
     WHERE tenant_id=$1`,
    [tenant_id]
  );
}

export async function loadTenantKek(client: PoolClient, tenant_id: string, kms_key_id: string): Promise<Buffer> {
  const q = await client.query(
    `SELECT status, kek_ciphertext, kek_nonce
     FROM tenant_kek_versions
     WHERE tenant_id=$1 AND kms_key_id=$2
     LIMIT 1`,
    [tenant_id, kms_key_id]
  );
  if (q.rowCount !== 1) throw new Error("TENANT_KEK_NOT_FOUND");
  const status = q.rows[0].status as string;
  if (status === "DELETED") throw new Error("TENANT_KEK_DELETED");
  return decryptKekFromStorage(q.rows[0].kek_ciphertext as Buffer, q.rows[0].kek_nonce as Buffer);
}
