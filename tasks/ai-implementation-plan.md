# AI Service Implementation Plan

## Overview
Add a model gateway and two LLM-backed features (maintenance triage, risk narrative) to pms-master's Nest backend. The gateway wraps all LLM calls with tenant scoping, cost caps, and fallback. MIL and PMRE remain deterministic engines; the gateway is a new consumer-facing layer.

## Architecture Decisions
- Model gateway lives in `tenant_portal_backend/src/ai/`. It uses the OpenAI-compatible chat completions API. Base URL and API key are env-driven (supports OpenAI, Azure, Ollama, etc.).
- Tenant scoping: every LLM call includes a tenant ID in the system prompt and logs token usage per tenant.
- Cost caps: per-tenant daily token limit enforced in-memory (Redis-ready later).
- Fallback: if the LLM is unavailable, return a deterministic stub response so the app never breaks.
- No new database tables. AI results are returned inline, not persisted (persistence is a future slice).
- Tests use mocked fetch, no live LLM calls.

## Vertical Slices

### Slice 1: Model Gateway + Maintenance Triage (Tasks 1-4)
### Slice 2: Risk Narrative (Tasks 5-6)
### Slice 3: Tests (Tasks 7-8)

## Task List

### Task 1: Model gateway service
- Create `src/ai/model-gateway.service.ts` with `chat(tenantId, messages, options)` method
- Env: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_DAILY_TOKEN_LIMIT`
- Fail closed if API key missing in production
- Per-tenant token tracking, daily reset
- Fallback response when LLM unavailable
- Files: model-gateway.service.ts, model-gateway.module.ts

### Task 2: Maintenance triage service
- Create `src/ai/maintenance-triage.service.ts`
- Input: maintenance request description + property context
- Output: { urgency: low|medium|high|emergency, category, suggestedVendorType, summary }
- Uses model gateway with a structured system prompt
- Files: maintenance-triage.service.ts, maintenance-triage.controller.ts

### Task 3: Risk narrative service
- Create `src/ai/risk-narrative.service.ts`
- Input: MIL risk score + property context
- Output: { narrative: string, recommendations: string[] }
- Uses model gateway
- Files: risk-narrative.service.ts, risk-narrative.controller.ts

### Task 4: Register AI module in app.module
- Add AiModule to app.module imports
- Files: app.module.ts

### Task 5: Tests for model gateway
- Mock fetch, test: missing API key throws, successful call returns content, fallback on error, token tracking
- Files: model-gateway.service.spec.ts

### Task 6: Tests for maintenance triage
- Mock gateway, test: urgency classification, fallback
- Files: maintenance-triage.service.spec.ts

### Checkpoint: AI Gateway + Triage + Narrative
- All tests pass
- `pnpm --filter tenant_portal_backend test` green
- No live LLM calls in tests

## Risk
- LLM API availability: mitigated by fallback responses
- Cost overruns: mitigated by daily token caps
- Tenant data leakage: mitigated by tenant-scoped system prompts (no cross-tenant context in prompts)
