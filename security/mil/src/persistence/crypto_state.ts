import { PoolClient } from "pg";

export type TenantCryptoState =
  | "ACTIVE"
  | "REKEY_REQUIRED"
  | "REKEY_OVERDUE"
  | "REKEYING_MAINTENANCE"
  | "CRYPTO_DELETED";

export async function getTenantCrypto(client: PoolClient, tenant_id: string): Promise<{
  state: TenantCryptoState;
  kms_key_id: string;
}> {
  const q = await client.query(
    `SELECT state, kms_key_id
     FROM tenant_crypto_state
     WHERE tenant_id=$1
     LIMIT 1`,
    [tenant_id]
  );

  if (q.rowCount === 0) {
    const kms_key_id = process.env.MIL_DEFAULT_KMS_KEY_ID || "kek://default/v1";
    await client.query(
      `INSERT INTO tenant_crypto_state (tenant_id, state, kms_key_id)
       VALUES ($1,'ACTIVE',$2)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenant_id, kms_key_id]
    );
    return { state: "ACTIVE", kms_key_id };
  }

  return { state: q.rows[0].state, kms_key_id: q.rows[0].kms_key_id };
}

export function assertTenantCryptoAllowsPayload(state: TenantCryptoState) {
  if (state === "CRYPTO_DELETED") throw new Error("TENANT_CRYPTO_DELETED");
  if (state === "REKEYING_MAINTENANCE") throw new Error("TENANT_REKEYING_MAINTENANCE");
  if (state === "REKEY_OVERDUE") throw new Error("TENANT_REKEY_OVERDUE");
  // REKEY_REQUIRED is allowed (soft-ignore + audit warning in higher layers)
}
