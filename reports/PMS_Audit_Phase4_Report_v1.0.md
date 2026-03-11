# Executive Summary

This audit pass established strong code-surface coverage but limited runtime certainty across business-critical workflows. The system has substantial functionality for Inspections, Applications, Leasing, Payments, and MIL infrastructure, but there is a recurring pattern of **runtime fragility due schema/config drift, partial test reliability, and authorization inconsistencies**.

Most critical conclusions:
- **Inspections**: Broad capability exists, but end-to-end runtime reliability was previously disrupted by payload/schema mismatches and start/seed edge cases.
- **Applications/Leasing**: Rich endpoints exist; however, runtime role/guard confidence is partial, with some routes appearing under-protected.
- **Payments**: Sandbox-capable architecture exists and key checkout tests pass, but broader payments suite stability is blocked and webhook correctness needs hardening.
- **MIL**: Present as framework, but **not broadly enforced** in priority workflows. Current impact on Inspections/Applications/Leasing/Payments is limited.

Overall: **Operationally promising, audit-wise incomplete** until runtime E2E and authorization hardening are completed.

---

# Repo Reality Map

- Audited repo target: `/workspace/clawdbot_remote/pms-master`
- Core app modules:
  - Backend: `tenant_portal_backend` (NestJS + Prisma)
  - Frontend: `tenant_portal_app` (React/Vite)
- Priority domain backend modules verified:
  - Inspections: `src/inspection/*` (+ legacy `src/inspections/*`)
  - Applications: `src/rental-application/*`, `src/lead-applications/*`
  - Leasing: `src/leasing/*`, `src/lease/*`, `src/tours/*`
  - Payments: `src/payments/*`, `src/payment-methods/*`, `src/stripe/*`
  - MIL: `src/mil/*`

Runtime verification was partial and mixed with code inference due environment and suite blockers.

---

# Coverage Plan

| Area | Type | Priority | Can Test Now? | Safe To Test? | Evidence Source | Blockers | Next Step |
|---|---|---:|---|---|---|---|---|
| Inspections | Workflow + Endpoint + UI | 1 | Yes (partial) | Yes | route/code + selected tests + observed runtime errors/fixes | full E2E script missing | execute strict PM→Tenant completion E2E in shared dev |
| Applications | Workflow + Endpoint + UI | 2 | Partial | Yes | controller/service/code + UI analysis | DB/test bootstrap blockers for full e2e | run seeded lifecycle E2E with shared-dev credentials |
| Leasing | Workflow + Endpoint + UI | 3 | Partial | Yes | controller/service/spec + UI analysis | controller test DI blockers; auth confidence partial | runtime endpoint auth sweep + role matrix validation |
| Payments | Endpoint + Sandbox workflow | 4 | Partial | Conditionally (sandbox only) | stripe service/tests + controller analysis | suite/provider blockers; sandbox verification incomplete in shared env | verify sandbox flags/keys, run controlled no-live-path tests |
| MIL | Service/integrity + workflow impact | 5 | Partial | Yes | mil module + callsite mapping + tests | limited integration with priority domains | implement/control-map MIL hooks in priority workflows |

---

# Immediate Verified Findings

## 1) Schema/contract drift causes runtime failures
- Severity: High
- Confidence: High
- Status: Verified
- Evidence: multiple 500s from missing columns (`ai_recommendation`, `aiAnalysis`) and invalid update fields (`severity` etc.)
- Expected vs actual: expected stable persistence contracts; actual runtime breakage until manual patches/migrations.
- Recommended action: enforce migration parity gate and contract tests in CI.

## 2) Inspection payload contract mismatch caused save failure
- Severity: High
- Confidence: High
- Status: Verified
- Evidence: `/api/inspections/rooms/:id/items` expected array; frontend sent object envelope at one point.
- Recommended action: lock API contract with DTO tests and client adapter tests.

## 3) Authorization posture inconsistent in leasing/applications/tours surfaces
- Severity: High
- Confidence: Medium-High
- Status: Partial/Verified by code analysis
- Evidence: several controllers/routes with weak or absent explicit role gating.
- Recommended action: mandatory authz matrix and route-level guard hardening.

## 4) MIL is not materially governing most priority workflows
- Severity: High
- Confidence: High
- Status: Verified
- Evidence: MIL wrapper usage concentrated outside target workflows; flags often default off/fail-open.
- Recommended action: explicit MIL integration plan for inspections/applications/leasing/payments.

---

# UI Audit Report

## Summary
- UI depth is strong, but operational reliability suffers from:
  - contrast/readability inconsistencies,
  - native browser prompt/alert usage in critical actions,
  - incomplete affordance-to-backend parity in some controls,
  - workflow-state opacity.

## Key findings
1. Native `alert/confirm/prompt` in financial/critical actions (High)
2. Inspection evidence flow initially URL-driven and high-friction (High)
3. Contrast/readability regressions in forms/selects (High)
4. Applications flow high cognitive load, weak progressive completion guidance (Medium-High)
5. Route semantics can be role-ambiguous (`/inspections` behavior) (Medium)

## UI status
- Several fixes were patched and pushed (readability/select handling, route alignment, inspection controls), but full route-by-route visual verification remains partial.

---

# Feature + Endpoint Report

## Inventory confidence
- Endpoint inventory for target domains is substantial and mapped.
- Runtime behavioral confidence is uneven due blocked/partial suites.

## Defects / risks
1. Inspection update path attempted unsupported fields (fixed patch)
2. Payments test surface split: checkout spec pass, broader suite blocked by provider/DTO issues
3. Leasing controller tests blocked by DI setup (OrgContextGuard dependencies)
4. Applications E2E blocked by DB auth in test setup path

## Auth/Authz note
- Some routes rely on class guards with inconsistent explicit role annotations; requires systematic audit and lock-down.

---

# Workflow Report

## Inspections
- Status: Partial
- Evidence: request workflow tests pass; runtime issues observed and patched; full scripted E2E not yet completed.

## Applications
- Status: Blocked/Partial
- Evidence: route and service surfaces mapped; E2E path blocked by env/test DB mismatch in specialist pass.

## Leasing
- Status: Partial
- Evidence: service-level tests mostly pass with type-mismatch failures; controller test setup blocked.

## Payments
- Status: Deferred/Partial
- Evidence: sandbox patterns present, limited verified checkout behavior; full no-risk sandbox flow needs explicit shared-dev verification.

---

# MIL Report

## MIL Reality Map
- MIL components exist (flags, wrappers, trace/audit services, policy checks).
- Practical enforcement in target business workflows is minimal at present.

## Implemented vs implied controls (summary)
- Implemented: wrapper services, trace/audit services, flag system.
- Partially implemented: policy checks where wrapper is called.
- Not broadly implemented: workflow-integrated MIL gates for inspections/leasing/applications/payments.

## Integrity risk highlights
1. Fail-open MIL trace/audit persistence paths
2. Weak operator-visible MIL governance in critical workflows
3. Silent failure potential in model-adjacent flows

---

# Payment Sandbox Verification

Current status: **Partial, not fully runtime-verified in shared-dev for all flows**.

Verified indicators:
- Stripe service includes test/disabled pathways.
- Checkout-focused tests pass in constrained conditions.

Not yet proven end-to-end in shared-dev:
- Full success/failure flow with authoritative state transitions,
- webhook error/retry semantics under realistic sandbox sequence,
- duplicate-submission guarantees across UI/API/webhook path.

Production-divergence risk: High if sandbox and production webhook/state sequencing differ.

---

# Role Model Gaps and Authorization Risks

Current practical role use is compressed (admin/tenant), creating:
- over-broad admin operational surface,
- missing vendor/manager/leasing-agent segmentation,
- reduced realism in workflow ownership and permission boundaries.

Risk: authorization confidence appears higher than it is under realistic multi-role operations.

---

# False-Confidence Risks

1. “Feature exists” interpreted as “workflow verified.”
2. Unit/spec pass pockets masking integration/runtime drift.
3. MIL presence interpreted as active governance.
4. Payments architecture interpreted as sandbox-ready E2E without full runtime proof.

---

# Gaps / Blockers / Unknowns

- Shared-dev E2E consistency blocked intermittently by DB/auth/setup mismatch.
- Some suites blocked by test harness/provider wiring, not just business logic.
- Route-level authz matrix not yet fully runtime-proven.
- MIL workflow-level influence largely inferred absent rather than runtime-proven across all paths.

---

# Recommended Remediation Order

1. **Stabilize schema/runtime parity**
   - enforce migrations before app boot
   - add startup parity check and CI migration gate
2. **Lock API contracts and client adapters**
   - DTO + contract tests for inspection and application payloads
3. **Authorization hardening pass**
   - explicit role requirements on sensitive routes
   - add route authz matrix tests
4. **Inspection E2E canonical script**
   - PM approve → tenant evidence upload → completion → PM visibility
5. **Payments sandbox hardening**
   - shared-dev sandbox verification checklist + webhook retry/dead-letter behavior
6. **MIL integration plan**
   - explicit control points in inspections/applications/leasing/payments
7. **UI reliability pass**
   - remove native browser dialogs for critical actions
   - complete readability/accessibility sweep

---

# Recommended Next Run Plan

1. Seed approved shared-dev accounts and org memberships (admin/pm/tenant + realistic role placeholders).
2. Execute Runtime Verification Matrix cases in strict order:
   - Inspections (full E2E)
   - Applications lifecycle
   - Leasing lifecycle
   - Payments sandbox-safe checks
3. Collect evidence bundle per case:
   - request/response logs
   - screenshots
   - DB state checks
4. Re-run blocked suites after env/test harness fixes.
5. Produce Phase 5 closure report with only **runtime-verified** health claims.
