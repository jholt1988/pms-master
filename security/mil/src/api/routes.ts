import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { withTx } from "../persistence/db";
import { stepHash } from "../core/lineage";
import { finalizeEvaluation } from "../core/finalize";
import { envelopeEncryptWithTenantKek } from "../core/crypto";
import { getTenantCrypto, assertTenantCryptoAllowsPayload } from "../persistence/crypto_state";
import { ensureActiveTenantKek, loadTenantKek, createNewTenantKekVersion, cryptoDeleteTenantKek } from "../persistence/tenant_keyring";
import { unwrapDek, wrapDek } from "../core/wrap";

export async function registerRoutes(app: FastifyInstance) {
  // Evaluate (sync stub) + async enqueue
  app.post("/mil/evaluate", async (req, reply) => {
    const body = req.body as any;
    const { tenant_id, target_id, mode, request_id, payload } = body;

    const evaluation_id = randomUUID();

    // Crypto gating for sync path will happen inside tx when encrypting steps.
    const lineage = await withTx(async (client) => {
      // Ensure tenant keyring exists and crypto state allows payload
      const crypto = await getTenantCrypto(client, tenant_id);
      assertTenantCryptoAllowsPayload(crypto.state);
      const { kms_key_id, kek } = await ensureActiveTenantKek(client, tenant_id);

      await client.query("INSERT INTO tenant_chain_head (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING", [tenant_id]);

      // Minimal single-step trace
      const step_type = "EVAL_REQUEST_ACCEPTED_V2";
      const prev_step_hash = "GENESIS_STEP";
      const enc = envelopeEncryptWithTenantKek({
        tenant_kek: kek,
        tenant_kms_key_id: kms_key_id,
        payload: { tenant_id, target_id, payload, request_id, evaluation_id },
      });

      const s_hash = stepHash({
        tenant_id,
        evaluation_id,
        step_type,
        step_seq: 0,
        prev_step_hash,
        payload_digest: enc.payload_digest,
      });

      await client.query(
        `INSERT INTO model_lineage_steps
         (tenant_id,evaluation_id,step_seq,step_type,payload_digest,payload_ciphertext,tenant_kms_key_id,dek_wrapped,nonce,cipher,enc_version,prev_step_hash,step_hash)
         VALUES ($1,$2,0,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT DO NOTHING`,
        [tenant_id, evaluation_id, step_type, enc.payload_digest, enc.payload_ciphertext, enc.tenant_kms_key_id, enc.dek_wrapped, enc.nonce, enc.cipher, enc.enc_version, prev_step_hash, s_hash]
      );

      if (mode === "async_job") {
        await client.query(
          `INSERT INTO mil_jobs (job_id,tenant_id,evaluation_id,target_id,status,mode,request_id,job_type)
           VALUES ($1,$2,$3,$4,'QUEUED',$5,$6,'EVALUATE_TARGET')
           ON CONFLICT (tenant_id, request_id) DO UPDATE SET updated_at=now()`,
          [randomUUID(), tenant_id, evaluation_id, target_id, mode, request_id]
        );
        return null;
      }

      // Sync stub result; finalize chain record
      const out = { stub: true };
      const audit = { parameter_override_attempts: [] };
      const lineage = await finalizeEvaluation({
        client,
        tenant_id,
        evaluation_id,
        trace_root_hash: s_hash,
        trace_steps: 1,
        inputs_obj: { tenant_id, target_id, payload, request_id },
        outputs_obj: out,
        audit_obj: audit,
      });

      return lineage;
    });

    if (mode === "async_job") return reply.send({ status: "QUEUED", evaluation_id });
    return reply.send({ status: "COMPLETED", evaluation_id, result: { stub: true }, lineage });
  });

  // Crypto status
  app.get("/mil/tenant/:tenant_id/crypto-status", async (req) => {
    const { tenant_id } = req.params as any;
    return withTx(async (client) => {
      const crypto = await getTenantCrypto(client, tenant_id);
      return { tenant_id, state: crypto.state, kms_key_id: crypto.kms_key_id, rekey_deadline: null };
    });
  });

  // Crypto-delete: destroys tenant KEK for active kms_key_id; leaves hashes intact.
  app.post("/mil/tenant/:tenant_id/crypto-delete", async (req) => {
    const { tenant_id } = req.params as any;
    return withTx(async (client) => {
      const crypto = await getTenantCrypto(client, tenant_id);
      await cryptoDeleteTenantKek(client, tenant_id, crypto.kms_key_id);
      return { ok: true };
    });
  });

  // Rekey schedule: inserts a tenant_rekey_job + an executor job (TENANT_REKEY) to run.
  app.post("/mil/tenant/:tenant_id/rekey/schedule", async (req) => {
    const { tenant_id } = req.params as any;
    const body = req.body as any;
    const job_id = randomUUID();

    return withTx(async (client) => {
      const crypto = await getTenantCrypto(client, tenant_id);

      await client.query(
        `INSERT INTO tenant_rekey_jobs (job_id, tenant_id, trigger_type, trigger_reason, scheduled_start, scheduled_end, status, old_kms_key_id)
         VALUES ($1,$2,$3,$4,$5,$6,'SCHEDULED',$7)`,
        [job_id, tenant_id, body.trigger_type, body.reason || null, body.scheduled_start, body.scheduled_end || null, crypto.kms_key_id]
      );

      // Enqueue executor job
      await client.query(
        `INSERT INTO mil_jobs (job_id,tenant_id,evaluation_id,target_id,status,mode,request_id,job_type)
         VALUES ($1,$2,$3,$4,'QUEUED','async_job',$5,'TENANT_REKEY')`,
        [randomUUID(), tenant_id, randomUUID(), "TENANT_REKEY", "rekey:"+job_id]
      );

      return { tenant_id, job_id, status: "SCHEDULED", old_kms_key_id: crypto.kms_key_id, new_kms_key_id: null, result_summary: null };
    });
  });

  // Rekey run: does not run the full rewrap here (worker does). This endpoint marks READY + sets desired new key id.
  app.post("/mil/tenant/:tenant_id/rekey/run", async (req) => {
    const { tenant_id } = req.params as any;
    const body = req.body as any; // { job_id, new_kms_key_id }
    return withTx(async (client) => {
      await client.query(
        `UPDATE tenant_rekey_jobs
         SET status='READY', new_kms_key_id=$3
         WHERE tenant_id=$1 AND job_id=$2`,
        [tenant_id, body.job_id, body.new_kms_key_id]
      );

      // Also set tenant into maintenance window (strictly enforced)
      await client.query(
        `UPDATE tenant_crypto_state SET state='REKEYING_MAINTENANCE', updated_at=now() WHERE tenant_id=$1`,
        [tenant_id]
      );

      return { tenant_id, job_id: body.job_id, status: "READY", old_kms_key_id: null, new_kms_key_id: body.new_kms_key_id, result_summary: null };
    });
  });

  // (Optional) limited lineage verify endpoint can remain stubbed elsewhere

  // Rekey status endpoint (progress + heartbeat health)
  app.get("/mil/tenant/:tenant_id/rekey/status", async (req) => {
    const { tenant_id } = req.params as any;

    return withTx(async (client) => {
      const q = await client.query(
        `SELECT job_id, status, old_kms_key_id, new_kms_key_id,
                cursor_evaluation_id, cursor_step_seq,
                rewrapped_steps, total_steps_estimate,
                last_heartbeat, created_at, scheduled_start, finished_at
         FROM tenant_rekey_jobs
         WHERE tenant_id=$1
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenant_id]
      );

      if (q.rowCount === 0) {
        return {
          tenant_id,
          status: "NO_REKEY_JOB",
          progress: null,
          heartbeat: null
        };
      }

      const row = q.rows[0];

      const now = new Date();
      const heartbeatAgeSec = row.last_heartbeat
        ? Math.floor((now.getTime() - new Date(row.last_heartbeat).getTime()) / 1000)
        : null;

      const stalled =
        row.status === "RUNNING" &&
        heartbeatAgeSec !== null &&
        heartbeatAgeSec > 300;

      let percent_complete = null;
      if (row.total_steps_estimate && row.total_steps_estimate > 0) {
        percent_complete = Math.min(
          100,
          Math.floor((row.rewrapped_steps / row.total_steps_estimate) * 100)
        );
      }

      return {
        tenant_id,
        job_id: row.job_id,
        status: row.status,
        old_kms_key_id: row.old_kms_key_id,
        new_kms_key_id: row.new_kms_key_id,
        progress: {
          rewrapped_steps: Number(row.rewrapped_steps),
          total_steps_estimate: row.total_steps_estimate,
          percent_complete
        },
        cursor: {
          evaluation_id: row.cursor_evaluation_id,
          step_seq: row.cursor_step_seq
        },
        heartbeat: {
          last_heartbeat: row.last_heartbeat,
          age_seconds: heartbeatAgeSec,
          stalled
        },
        timing: {
          created_at: row.created_at,
          scheduled_start: row.scheduled_start,
          finished_at: row.finished_at
        }
      };
    });
  });

}
