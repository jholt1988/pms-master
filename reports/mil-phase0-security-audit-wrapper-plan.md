# MIL Security/Audit Wrapper — Phase 0 Implementation Plan (pms-master)

## Current state (grounded in repo)
- **MIL wrapper exists but is placeholder**:
  - `tenant_portal_backend/src/mil/crypto.service.ts`
  - `tenant_portal_backend/src/mil/keyring.service.ts`
  - `tenant_portal_backend/src/mil/mil.service.ts`
- **MIL not yet integrated into app modules** (`MilModule` is not imported in `src/app.module.ts`).
- **Audit exists but is log-only**:
  - `tenant_portal_backend/src/shared/audit-log.service.ts` writes structured logs only.
- **Security events persisted**:
  - `tenant_portal_backend/src/security-events/security-events.service.ts` persists `SecurityEvent` records.
  - Prisma has `model SecurityEvent` + `enum SecurityEventType` in `tenant_portal_backend/prisma/schema.prisma`.
- **External MIL service implementation already available** under `security/mil/`:
  - envelope encryption core: `security/mil/src/core/crypto.ts`
  - tenant key hierarchy: `security/mil/src/persistence/tenant_keyring.ts`
  - crypto-state gates: `security/mil/src/persistence/crypto_state.ts`
  - rekey + progress + recovery worker: `security/mil/src/workers/worker.ts`
  - migrations for keyring/rekey/delete path: `security/mil/migrations/*.sql`

---

## Phase 0 target
Deliver a **backend-integrated MIL security/audit wrapper** that:
1. Enforces envelope encryption at rest for ML-sensitive payloads
2. Implements tenant key hierarchy + rotation hooks
3. Applies explicit access control and org/tenant scoping
4. Persists cryptographic + model-access audit trails
5. Adds model-access traceability (who/what/which model/which key)
6. Adds retention + deletion controls (including crypto-delete orchestration)

---

## Text architecture diagram

```text
[Client/API Caller]
    |
    v
[Nest Controllers: maintenance/payments/lease/rent-optimization/chatbot/...]
    |  (AuthGuard + RolesGuard + OrgContextGuard)
    v
[MilSecurityAuditWrapperService]  <-- NEW central wrapper (Phase 0)
    |-- access policy check (actor/org/tenant/resource/action)
    |-- trace context creation (traceId, requestId, model metadata)
    |-- audit emit (AuditLog + SecurityEvents)
    |
    |------ encrypt/decrypt path ------>
    |        [MilService]
    |           |-- [KeyringService] -> tenant active key version + key material
    |           '-- [CryptoService]  -> envelope encrypt/decrypt (AES-GCM + wrapped DEK)
    |
    |------ persistence path --------->
    |        [Prisma models for protected payload + model access logs]  <-- NEW tables
    |
    '------ lifecycle ops ------------>
             [Rekey/Crypto-delete orchestration]
                 |-- local Phase 0 job/API facade
                 '-- later: direct use of security/mil service endpoints + worker

Cross-cutting:
- Existing SecurityEventsService for security-grade events
- Existing AuditLogService for business/audit stream
```

---

## Key hierarchy + envelope encryption design (Phase 0)

### Hierarchy
- **Platform master key (root KEK)**: environment-secret-managed (`MIL_MASTER_KEK_BASE64` style, then replace with KMS/HSM)
- **Tenant KEK version**: per-tenant key version (`tenant_kms_key_id`)
- **Per-payload DEK**: random 256-bit key per encrypted payload

### Envelope format (align to existing `security/mil/src/core/crypto.ts`)
- `cipher`: `AES-256-GCM`
- `nonce`
- `payload_ciphertext` (`ct||tag`)
- `dek_wrapped`
- `tenant_kms_key_id`
- `enc_version`
- `payload_digest` (SHA-256 of canonical plaintext)

### Phase 0 implementation stance
- Replace placeholder logic in `tenant_portal_backend/src/mil/crypto.service.ts` with real envelope implementation equivalent to `security/mil/src/core/crypto.ts`.
- Replace placeholder key resolution in `tenant_portal_backend/src/mil/keyring.service.ts` with DB-backed active-key lookup/versioning compatible with `tenant_kek_versions` semantics.

---

## Access control model (Phase 0)

### Enforcement points
1. **Controller boundary**: keep current `AuthGuard`, `RolesGuard`, `OrgContextGuard`
2. **Wrapper boundary (new)**: mandatory policy check before encryption/decryption/model execution

### Policy rules
- `decrypt` requires:
  - actor authenticated
  - org-scoped access to the resource
  - action entitlement (e.g., `ML_READ_SENSITIVE`, `MODEL_TRACE_READ`)
- `encrypt`/`store` requires:
  - org-scoped write access
  - allowed model usage entitlement per module
- `crypto-delete` requires:
  - admin + break-glass reason + second-factor flag (phase-0 practical guard)

### Reuse existing constructs
- Roles from `src/auth/roles.guard.ts`, `src/auth/roles.decorator.ts`
- Org scoping from `src/common/org-context/org-context.guard.ts`

---

## Audit logging + model-access traceability

### Event classes (Phase 0)
1. **Crypto events**
   - `mil.encrypt.success|failure`
   - `mil.decrypt.success|failure`
   - `mil.key.rotate.requested|completed|failed`
   - `mil.key.crypto_delete.requested|completed|failed`
2. **Model access events**
   - `model.invoke.requested|completed|failed`
   - include model id/version/provider, operation, token usage (if available), latency
3. **Data lifecycle events**
   - `ml.record.retention_marked`
   - `ml.record.purged`
   - `ml.record.crypto_deleted`

### Required trace fields
- `traceId`, `requestId`
- `actorUserId`, `actorRole`
- `orgId`, `tenantId`
- `module`, `action`, `entityType`, `entityId`
- `modelProvider`, `modelName`, `modelVersion`
- `tenantKmsKeyId`, `encVersion`, `payloadDigest`
- `result`, `errorCode`, `latencyMs`

### Sinks (Phase 0)
- Continue emitting to `AuditLogService`
- Persist security-sensitive subset via `SecurityEventsService`
- Add dedicated DB tables for model-access lineage/audit (below)

---

## Retention/deletion controls

### Data classes
1. **Encrypted ML payload blobs** (short/medium retention)
2. **Model-access logs + cryptographic audit logs** (longer compliance retention)
3. **Key metadata** (retain version metadata; key material subject to delete/retire)

### Controls
- Table-level `expiresAt`/`purgeAfter` fields
- Scheduled purge job (Nest Schedule) for hard-delete of expired records
- Crypto-delete path:
  - mark tenant crypto state deleted
  - wipe tenant KEK material
  - keep hash/lineage metadata non-decryptable

### Guardrails
- Default deny for decrypt after `CRYPTO_DELETED`
- For legal hold, skip purge for hold-flagged org/tenant records

---

## Concrete module/file touchpoints

## A) Existing files to modify
- `tenant_portal_backend/src/mil/crypto.service.ts`
  - replace mock hex encoding with AES-256-GCM envelope encryption/decryption
- `tenant_portal_backend/src/mil/keyring.service.ts`
  - replace mock key generation with active key lookup/version logic
- `tenant_portal_backend/src/mil/mil.service.ts`
  - return typed envelope object (not plain string); include trace metadata hooks
- `tenant_portal_backend/src/mil/mil.module.ts`
  - provide/export new wrapper + policy + audit helpers
- `tenant_portal_backend/src/app.module.ts`
  - import `MilModule`
- `tenant_portal_backend/src/shared/audit-log.service.ts`
  - add optional DB persistence path + standardized event schema
- `tenant_portal_backend/src/security-events/security-events.service.ts`
  - support MIL/model event mapping and org/tenant filters

## B) New backend files (recommended)
- `tenant_portal_backend/src/mil/mil-security-audit-wrapper.service.ts`
- `tenant_portal_backend/src/mil/mil-access-policy.service.ts`
- `tenant_portal_backend/src/mil/mil-trace-context.ts`
- `tenant_portal_backend/src/mil/mil-envelope.types.ts`
- `tenant_portal_backend/src/mil/mil-retention.service.ts`
- `tenant_portal_backend/src/mil/mil-lifecycle.controller.ts` (rotate/delete/status endpoints)

## C) AI call-site integration touchpoints (high value first)
- `tenant_portal_backend/src/rent-optimization/rent-optimization.service.ts`
- `tenant_portal_backend/src/maintenance/ai-maintenance.service.ts`
- `tenant_portal_backend/src/payments/ai-payment.service.ts`
- `tenant_portal_backend/src/lease/ai-lease-renewal.service.ts`
- `tenant_portal_backend/src/chatbot/chatbot.service.ts`

Pattern: route model calls through wrapper so each call receives security policy enforcement + trace + audit.

## D) Prisma schema + migrations (new)
In `tenant_portal_backend/prisma/schema.prisma` + migration(s):
- `MilTenantKekVersion` (if not reusing external MIL schema directly)
- `MlProtectedPayload` (encrypted payload storage)
- `ModelAccessTrace` (one row per model invocation)
- `MilAuditEvent` (immutable event log with normalized fields)
- optional: `MilRetentionPolicy` (org/tenant/module retention overrides)

Also extend `SecurityEventType` enum with MIL/model events if using `SecurityEvent` as canonical security ledger.

---

## Phased rollout steps

### Phase 0.1 — Foundation (no behavior break)
1. Import `MilModule` into `AppModule`.
2. Add wrapper service + trace context types.
3. Define audit event schema and adapter to existing `AuditLogService` + `SecurityEventsService`.
4. Add feature flags:
   - `MIL_WRAPPER_ENABLED`
   - `MIL_ENCRYPT_AT_REST_ENABLED`
   - `MIL_AUDIT_PERSIST_ENABLED`

### Phase 0.2 — Real cryptography + key hierarchy
1. Implement AES-GCM envelope operations in backend MIL `CryptoService`.
2. Implement DB-backed keyring lookup/active-version semantics.
3. Add integration tests for encrypt/decrypt + key mismatch + tamper detection.

### Phase 0.3 — Access control + traceability
1. Enforce wrapper policy checks on encrypt/decrypt/model invoke.
2. Integrate wrapper into 2 highest-risk services first:
   - `rent-optimization.service.ts`
   - `chatbot.service.ts`
3. Persist `ModelAccessTrace` entries for every model invocation.

### Phase 0.4 — Retention + deletion controls
1. Add retention metadata and scheduled purge worker.
2. Implement guarded crypto-delete endpoint in lifecycle controller.
3. Ensure decrypt is denied post crypto-delete and events are auditable.

### Phase 0.5 — Expand coverage + hardening
1. Roll wrapper into maintenance/payments/lease AI services.
2. Add rekey orchestration endpoint + status tracking (or bridge to `security/mil` service APIs).
3. Add dashboards/alerts for failures and delete/rekey events.

---

## Acceptance criteria (Phase 0 done)

### Envelope encryption
- [ ] Sensitive ML payloads are persisted only as envelope ciphertext + wrapped DEK metadata
- [ ] Decryption fails on key mismatch/tampered ciphertext/tag
- [ ] No plaintext payload in DB for protected classes

### Key hierarchy
- [ ] Tenant-scoped active key version is resolved from DB
- [ ] Key rotation path exists (initiate + status + completion/failure events)
- [ ] Crypto-delete wipes tenant key material and makes existing payloads undecryptable

### Access control
- [ ] Wrapper enforces actor/org/tenant/action policy before decrypt/model invoke
- [ ] Unauthorized decrypt/model access attempts are denied and logged

### Audit logging
- [ ] Every encrypt/decrypt/model call emits structured audit event with traceId
- [ ] Security-sensitive events are persisted and queryable by org/time/type
- [ ] Audit records include actor + model + key-version metadata

### Model traceability
- [ ] Each model invocation has an immutable `ModelAccessTrace`
- [ ] Trace links request context -> model metadata -> data key/version -> outcome

### Retention/deletion
- [ ] Expired protected payloads are purged by scheduled job
- [ ] Legal-hold (if set) prevents purge
- [ ] Post-delete verification proves data unreadable/deleted per policy

---

## Risks / implementation notes
- The in-app `src/mil/*` and external `security/mil/*` are currently divergent. Phase 0 should either:
  1) **Adopt external MIL as source of truth** and use client integration, or
  2) Temporarily align in-app implementation to same envelope/key semantics.
- Recommend option (1) as target architecture, with option (2) as bootstrap if schedule requires.
