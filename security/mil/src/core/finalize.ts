import { PoolClient } from "pg";
import { canonicalBytes } from "./canonical";
import { sha256Hex } from "./hash";
import { recordHash, CHAIN_ID } from "./lineage";

/**
 * Finalizes an evaluation into the tenant-partitioned chain.
 * Must be called inside a DB transaction with tenant head row locked FOR UPDATE.
 *
 * Idempotency: if the evaluation record already exists, returns existing record hashes.
 */
export async function finalizeEvaluation(params: {
  client: PoolClient;
  tenant_id: string;
  evaluation_id: string;
  trace_root_hash: string;
  trace_steps: number;
  inputs_obj: unknown;
  outputs_obj: unknown;
  audit_obj: unknown;
}) {
  const { client, tenant_id, evaluation_id, trace_root_hash, trace_steps } = params;

  const inputs_digest = sha256Hex(canonicalBytes(params.inputs_obj));
  const outputs_digest = sha256Hex(canonicalBytes(params.outputs_obj));
  const audit_digest = sha256Hex(canonicalBytes(params.audit_obj));

  const existing = await client.query(
    `SELECT record_hash, prev_hash, trace_root_hash, trace_steps
     FROM model_lineage_events
     WHERE tenant_id=$1 AND evaluation_id=$2
     LIMIT 1`,
    [tenant_id, evaluation_id]
  );
  if (existing.rowCount === 1) {
    return {
      chain_id: CHAIN_ID,
      tenant_id,
      record_hash: existing.rows[0].record_hash as string,
      prev_hash: existing.rows[0].prev_hash as string,
      trace_root_hash: existing.rows[0].trace_root_hash as string,
      trace_steps: Number(existing.rows[0].trace_steps),
      inputs_digest,
      outputs_digest,
      audit_digest,
      idempotent: true,
    };
  }

  const head = await client.query(
    "SELECT head_hash, sequence_no FROM tenant_chain_head WHERE tenant_id=$1 FOR UPDATE",
    [tenant_id]
  );
  if (head.rowCount !== 1) throw new Error("Missing tenant_chain_head row");
  const prev_hash = head.rows[0].head_hash as string;
  const sequence_no = Number(head.rows[0].sequence_no) + 1;

  const rec_hash = recordHash({
    tenant_id,
    sequence_no,
    prev_hash,
    trace_root_hash,
    inputs_digest,
    outputs_digest,
    audit_digest,
  });

  await client.query(
    `INSERT INTO model_lineage_events
     (tenant_id,evaluation_id,sequence_no,chain_id,prev_hash,record_hash,trace_root_hash,trace_steps,inputs_digest,outputs_digest,audit_digest)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      tenant_id,
      evaluation_id,
      sequence_no,
      CHAIN_ID,
      prev_hash,
      rec_hash,
      trace_root_hash,
      trace_steps,
      inputs_digest,
      outputs_digest,
      audit_digest,
    ]
  );

  await client.query(
    "UPDATE tenant_chain_head SET head_hash=$2, sequence_no=$3 WHERE tenant_id=$1",
    [tenant_id, rec_hash, sequence_no]
  );

  return {
    chain_id: CHAIN_ID,
    tenant_id,
    record_hash: rec_hash,
    prev_hash,
    trace_root_hash,
    trace_steps,
    inputs_digest,
    outputs_digest,
    audit_digest,
    idempotent: false,
  };
}
