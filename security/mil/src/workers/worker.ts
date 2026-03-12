import { randomUUID } from "crypto";
import { withTx } from "../persistence/db";
import { envelopeEncryptWithTenantKek } from "../core/crypto";
import { stepHash } from "../core/lineage";
import { finalizeEvaluation } from "../core/finalize";
import { getTenantCrypto, assertTenantCryptoAllowsPayload } from "../persistence/crypto_state";
import { ensureActiveTenantKek, loadTenantKek, createNewTenantKekVersion } from "../persistence/tenant_keyring";
import { unwrapDek, wrapDek } from "../core/wrap";

const POLL_MS = Number(process.env.MIL_WORKER_POLL_MS || 1000);
const LEASE_SECONDS = Number(process.env.MIL_JOB_LEASE_SECONDS || 60);
const REKEY_BATCH = Number(process.env.MIL_REKEY_BATCH || 500);
const REKEY_STALL_SECONDS = Number(process.env.MIL_REKEY_STALL_SECONDS || 300); // 5m
const REKEY_RECOVERY_MS = Number(process.env.MIL_REKEY_RECOVERY_MS || 15000); // 15s
const REKEY_MAX_RECOVERIES = Number(process.env.MIL_REKEY_MAX_RECOVERIES || 5);

type JobType = "EVALUATE_TARGET" | "TENANT_REKEY" | "VERIFY_RANGE" | "TENANT_CRYPTO_DELETE";

type ClaimedJob = {
  job_id: string;
  tenant_id: string;
  evaluation_id: string | null;
  target_id: string | null;
  request_id: string;
  claim_token: string;
  job_type: JobType;
};

async function claimOneJob(): Promise<ClaimedJob | null> {
  return withTx(async (client) => {
    const q = await client.query(
      `SELECT job_id, tenant_id, evaluation_id, target_id, request_id, job_type
       FROM mil_jobs
       WHERE status='QUEUED'
         AND (next_attempt_at IS NULL OR next_attempt_at <= now())
         AND (locked_until IS NULL OR locked_until < now())
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1`
    );
    if (q.rowCount === 0) return null;

    const row = q.rows[0];
    const claim_token = randomUUID();

    await client.query(
      `UPDATE mil_jobs
       SET status='RUNNING',
           claimed_at=now(),
           claim_token=$2,
           locked_until=now() + ($3 || ' seconds')::interval,
           updated_at=now()
       WHERE job_id=$1`,
      [row.job_id, claim_token, LEASE_SECONDS]
    );

    return {
      job_id: row.job_id,
      tenant_id: row.tenant_id,
      evaluation_id: row.evaluation_id,
      target_id: row.target_id,
      request_id: row.request_id,
      claim_token,
      job_type: row.job_type,
    };
  });
}

async function handleEvaluateTarget(job: ClaimedJob) {
  if (!job.evaluation_id) throw new Error("Missing evaluation_id");
  const evaluationId = job.evaluation_id;
  // Placeholder model output
  const modelResult = { ok: true, version: "stub" };

  await withTx(async (client) => {
    const crypto = await getTenantCrypto(client, job.tenant_id);
    assertTenantCryptoAllowsPayload(crypto.state);

    const { kms_key_id, kek } = await ensureActiveTenantKek(client, job.tenant_id);

    await client.query(
      "INSERT INTO tenant_chain_head (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING",
      [job.tenant_id]
    );

    const payload = { evaluation_id: evaluationId, tenant_id: job.tenant_id, target_id: job.target_id, data: modelResult };
    const enc = envelopeEncryptWithTenantKek({ tenant_kek: kek, tenant_kms_key_id: kms_key_id, payload });

    const s_hash = stepHash({
      tenant_id: job.tenant_id,
      evaluation_id: evaluationId,
      step_type: "EVALUATE_TARGET_V1",
      step_seq: 0,
      prev_step_hash: "GENESIS_STEP",
      payload_digest: enc.payload_digest,
    });

    await client.query(
      `INSERT INTO model_lineage_steps
       (tenant_id,evaluation_id,step_seq,step_type,payload_digest,payload_ciphertext,tenant_kms_key_id,dek_wrapped,nonce,cipher,enc_version,prev_step_hash,step_hash)
       VALUES ($1,$2,0,'EVALUATE_TARGET_V1',$3,$4,$5,$6,$7,$8,$9,'GENESIS_STEP',$10)
       ON CONFLICT DO NOTHING`,
      [job.tenant_id, evaluationId, enc.payload_digest, enc.payload_ciphertext, enc.tenant_kms_key_id, enc.dek_wrapped, enc.nonce, enc.cipher, enc.enc_version, s_hash]
    );

    await finalizeEvaluation({
      client,
      tenant_id: job.tenant_id,
      evaluation_id: evaluationId,
      trace_root_hash: s_hash,
      trace_steps: 1,
      inputs_obj: { target_id: job.target_id },
      outputs_obj: modelResult,
      audit_obj: {},
    });
  });
}

async function handleTenantRekey(job: ClaimedJob) {
  // Resumable maintenance-window rekey:
  // - Uses cursor (evaluation_id, step_seq) to continue scanning
  // - Rewraps DEKs in batches, heartbeats progress
  // - Retires old key and unfreezes tenant when complete

  await withTx(async (client) => {
    const crypto = await getTenantCrypto(client, job.tenant_id);

    // Ensure maintenance mode (strict pause)
    if (crypto.state !== "REKEYING_MAINTENANCE") {
      await client.query(
        `UPDATE tenant_crypto_state SET state='REKEYING_MAINTENANCE', updated_at=now() WHERE tenant_id=$1`,
        [job.tenant_id]
      );
    }

    // Pick the most recent READY/SCHEDULED/RUNNING job
    const rj = await client.query(
      `SELECT job_id, old_kms_key_id, new_kms_key_id, status,
              source_kms_key_ids,
              cursor_evaluation_id, cursor_step_seq, rewrapped_steps
       FROM tenant_rekey_jobs
       WHERE tenant_id=$1 AND status IN ('READY','SCHEDULED','RUNNING')
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [job.tenant_id]
    );
    if (rj.rowCount !== 1) throw new Error("NO_REKEY_JOB_FOUND");

    const rekey_job_id = rj.rows[0].job_id as string;
    const old_kms_key_id = (rj.rows[0].old_kms_key_id as string) || crypto.kms_key_id;
    const desired_new_kms_key_id = rj.rows[0].new_kms_key_id as string | null;
    const sourceKeys = (rj.rows[0].source_kms_key_ids as string[] | null) || [old_kms_key_id];

    await client.query(
      `UPDATE tenant_rekey_jobs
       SET status='RUNNING', last_heartbeat=now()
       WHERE tenant_id=$1 AND job_id=$2`,
      [job.tenant_id, rekey_job_id]
    );

    // Old key must exist; crypto-delete makes rekey impossible.
    const old_kek = await loadTenantKek(client, job.tenant_id, old_kms_key_id);

    // Create or reuse new key version
    const new_kms_key_id =
      desired_new_kms_key_id ||
      ((process.env.MIL_REKEY_NEW_KMS_KEY_ID_PREFIX || "kek://tenant") + `/${job.tenant_id}/v${Date.now()}`);

    const { kms_key_id: created_kms, kek: new_kek } = await createNewTenantKekVersion(client, job.tenant_id, new_kms_key_id);

    // Cursor
    let cursorEval = rj.rows[0].cursor_evaluation_id as string | null;
    let cursorStep = (rj.rows[0].cursor_step_seq as number | null);
    if (cursorStep === null || cursorStep === undefined) cursorStep = -1;
    let rewrapped = Number(rj.rows[0].rewrapped_steps || 0);

    const rows = await client.query(
      `SELECT tenant_id, evaluation_id, step_seq, dek_wrapped
       FROM model_lineage_steps
       WHERE tenant_id=$1 AND tenant_kms_key_id = ANY($2)
         AND (
           ($3::uuid IS NULL) OR
           (evaluation_id > $3::uuid) OR
           (evaluation_id = $3::uuid AND step_seq > $4)
         )
       ORDER BY evaluation_id ASC, step_seq ASC
       LIMIT $5`,
      [job.tenant_id, sourceKeys, cursorEval, cursorStep, REKEY_BATCH]
    );

    if (rows.rowCount === 0) {
      await client.query(
        `UPDATE tenant_kek_versions
         SET status='RETIRED', retired_at=now()
         WHERE tenant_id=$1 AND kms_key_id=$2 AND status='ACTIVE'`,
        [job.tenant_id, old_kms_key_id]
      );

      await client.query(
        `UPDATE tenant_crypto_state SET state='ACTIVE', updated_at=now() WHERE tenant_id=$1`,
        [job.tenant_id]
      );

      await client.query(
        `UPDATE tenant_rekey_jobs
         SET status='DONE', finished_at=now(), result_summary=$3, last_heartbeat=now()
         WHERE tenant_id=$1 AND job_id=$2`,
        [job.tenant_id, rekey_job_id, JSON.stringify({ old_kms_key_id, new_kms_key_id: created_kms, rewrapped_steps: rewrapped })]
      );

      return;
    }

    for (const r of rows.rows) {
      const dek = unwrapDek(old_kek, r.dek_wrapped as Buffer);
      const dek_wrapped_new = wrapDek(new_kek, dek);

      await client.query(
        `UPDATE model_lineage_steps
         SET dek_wrapped=$5, tenant_kms_key_id=$6, enc_version=3
         WHERE tenant_id=$1 AND evaluation_id=$2 AND step_seq=$3`,
        [r.tenant_id, r.evaluation_id, r.step_seq, old_kms_key_id, dek_wrapped_new, created_kms]
      );

      cursorEval = r.evaluation_id;
      cursorStep = Number(r.step_seq);
      rewrapped += 1;
    }

    await client.query(
      `UPDATE tenant_rekey_jobs
       SET cursor_evaluation_id=$3,
           cursor_step_seq=$4,
           rewrapped_steps=$5,
           last_heartbeat=now(),
           new_kms_key_id=COALESCE(new_kms_key_id,$6)
       WHERE tenant_id=$1 AND job_id=$2`,
      [job.tenant_id, rekey_job_id, cursorEval, cursorStep, rewrapped, created_kms]
    );
  });
}

async function handleVerifyRange(job: ClaimedJob) {
  console.log("[worker] VERIFY_RANGE placeholder", job.job_id);
}


async function autoRecoverStalledRekeys() {
  await withTx(async (client) => {
    const q = await client.query(
      `SELECT tenant_id, job_id, recovery_attempts
       FROM tenant_rekey_jobs
       WHERE status='RUNNING'
         AND last_heartbeat IS NOT NULL
         AND last_heartbeat < now() - ($1 || ' seconds')::interval
       ORDER BY last_heartbeat ASC
       LIMIT 25`,
      [REKEY_STALL_SECONDS]
    );

    for (const r of q.rows) {
      const tenant_id = r.tenant_id as string;
      const rekey_job_id = r.job_id as string;
      const attempts = Number(r.recovery_attempts || 0);

      if (attempts + 1 >= REKEY_MAX_RECOVERIES) {
  // Hard fail the rekey job, then auto-schedule a brand-new rekey job with a fresh key id.
  const qjob = await client.query(
    `SELECT old_kms_key_id, new_kms_key_id, cursor_evaluation_id, cursor_step_seq, rewrapped_steps
     FROM tenant_rekey_jobs
     WHERE tenant_id=$1 AND job_id=$2
     LIMIT 1`,
    [tenant_id, rekey_job_id]
  );

  const old_kms_key_id = qjob.rowCount === 1 ? (qjob.rows[0].old_kms_key_id as string) : null;
  const prev_new_kms_key_id = qjob.rowCount === 1 ? (qjob.rows[0].new_kms_key_id as string | null) : null;

  await client.query(
    `UPDATE tenant_rekey_jobs
     SET status='FAILED',
         failed_at=now(),
         last_error=COALESCE(last_error,'') || '
[auto-recover] exceeded max recovery attempts; auto-scheduling new rekey',
         recovery_attempts=$3
     WHERE tenant_id=$1 AND job_id=$2`,
    [tenant_id, rekey_job_id, attempts + 1]
  );

  // Create a new READY job that consolidates any partially-rekeyed steps into a fresh key id.
  const new_rekey_job_id = randomUUID();

  const sourceKeys = [];
  if (old_kms_key_id) sourceKeys.push(old_kms_key_id);
  if (prev_new_kms_key_id) sourceKeys.push(prev_new_kms_key_id);
  if (sourceKeys.length === 0) sourceKeys.push((await client.query(`SELECT kms_key_id FROM tenant_crypto_state WHERE tenant_id=$1`, [tenant_id])).rows[0]?.kms_key_id);

  await client.query(
    `INSERT INTO tenant_rekey_jobs
     (job_id, tenant_id, trigger_type, trigger_reason, scheduled_start, status,
      old_kms_key_id, new_kms_key_id, cursor_evaluation_id, cursor_step_seq, rewrapped_steps, recovery_attempts, source_kms_key_ids)
     VALUES ($1,$2,'AUTO','failed_rekey_autoreschedule_stable', now(), 'READY',
             $3, prev_new_kms_key_id, NULL, NULL, 0, 0, $4)`,
    [new_rekey_job_id, tenant_id, old_kms_key_id || null, sourceKeys]
  );

  // Pause tenant and enqueue executor
  await client.query(
    `UPDATE tenant_crypto_state SET state='REKEYING_MAINTENANCE', updated_at=now() WHERE tenant_id=$1`,
    [tenant_id]
  );

  await client.query(
    `INSERT INTO mil_jobs (job_id,tenant_id,evaluation_id,target_id,status,mode,request_id,job_type)
     VALUES ($1,$2,$3,$4,'QUEUED','async_job',$5,'TENANT_REKEY')`,
    [randomUUID(), tenant_id, randomUUID(), "TENANT_REKEY", "rekey-autoresched:" + new_rekey_job_id]
  );

  continue;
}

      // Increment recovery attempts
      await client.query(
        `UPDATE tenant_rekey_jobs
         SET recovery_attempts=$3,
             last_error=COALESCE(last_error,'') || '
[auto-recover] heartbeat stale; retrying',
             last_heartbeat=now()
         WHERE tenant_id=$1 AND job_id=$2`,
        [tenant_id, rekey_job_id, attempts + 1]
      );

      // Enqueue TENANT_REKEY executor if not already present
      const exists = await client.query(
        `SELECT 1 FROM mil_jobs
         WHERE tenant_id=$1 AND job_type='TENANT_REKEY' AND status IN ('QUEUED','RUNNING')
         LIMIT 1`,
        [tenant_id]
      );

      if (exists.rowCount === 0) {
        await client.query(
          `INSERT INTO mil_jobs (job_id,tenant_id,evaluation_id,target_id,status,mode,request_id,job_type)
           VALUES ($1,$2,$3,$4,'QUEUED','async_job',$5,'TENANT_REKEY')`,
          [randomUUID(), tenant_id, randomUUID(), "TENANT_REKEY", "rekey-recover:" + rekey_job_id]
        );
      }
    }
  });
}

async function processJob(job: ClaimedJob) {
  switch (job.job_type) {
    case "EVALUATE_TARGET":
      return handleEvaluateTarget(job);
    case "TENANT_REKEY":
      return handleTenantRekey(job);
    case "VERIFY_RANGE":
      return handleVerifyRange(job);
    default:
      throw new Error("Unknown job type: " + job.job_type);
  }
}

async function loop() {
  console.log("[mil-worker] rekey-capable worker started");
  setInterval(() => {
    autoRecoverStalledRekeys().catch((e) => console.error("[mil-worker][rekey-recover]", e));
  }, REKEY_RECOVERY_MS);
  for (;;) {
    const job = await claimOneJob();
    if (!job) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }

    try {
      await processJob(job);
      await withTx(async (client) => {
        await client.query(
          `UPDATE mil_jobs SET status='COMPLETED', updated_at=now(), locked_until=NULL WHERE job_id=$1`,
          [job.job_id]
        );
      });
      console.log("[mil-worker] completed", job.job_id, job.job_type);
    } catch (e) {
      console.error("[mil-worker] failed", job.job_id, e);
    }
  }
}

loop().catch((e) => {
  console.error(e);
  process.exit(1);
});
