# @propertyos/api-contracts

The single source of truth for PropertyOS API types, shared by the backend and
every web/mobile client. It replaces the pattern of each client hand-maintaining
its own copies of API request/response shapes.

## Layout

```
src/
  envelope.ts        Canonical {data, meta, errors} envelope + unwrapEnvelope()
  contracts.ts       Event envelope + autonomy/decision records
  domains/lease.ts   Canonical lease enums + Lease read-model
  schemas.ts         OpenAPI-generated seam (paths/components/operations)
  generated/
    schema.ts        openapi-typescript output of docs/api/openapi.json (committed)
  index.ts           Barrel: envelope + contracts + domain types
```

Import the hand-authored layer from the package root; import the generated seam
from the `/schemas` subpath so you only compile the (large) generated file when
you actually need it:

```ts
import type { Lease, LeaseStatus } from '@propertyos/api-contracts';
import { unwrapEnvelope, type ApiEnvelope } from '@propertyos/api-contracts';
import type { paths, components } from '@propertyos/api-contracts/schemas';
```

## The hybrid model (generated + hand-authored)

- **Generated half** — `schemas.ts` re-exports the openapi-typescript output of
  the backend's committed OpenAPI spec (`docs/api/openapi.json`). This is the
  authoritative source for endpoint paths, operations, and request-body types.
- **Hand-authored half** — `envelope.ts`, `contracts.ts`, and `domains/*` cover
  the ergonomics the spec can't express yet (the envelope generic, unwrap
  helpers) and domain read-models that the spec does not currently publish.

## Regeneration & drift

The committed `docs/api/openapi.json` is produced from the NestJS decorators by
`pnpm --filter tenant_portal_backend openapi:generate`. Regenerate this package's
types from it with:

```
pnpm --filter @propertyos/api-contracts gen
```

CI enforces that the committed `src/generated/schema.ts` matches a fresh
generation from the committed spec (see `.github/workflows/api-contracts-ci.yml`),
so the generated types can never silently drift.

## Known limitation (why domain types aren't fully deduped yet)

As of this package's introduction, **every `components.schemas` entry in the
committed spec is an empty object**: the backend DTO classes are not decorated
with `@ApiProperty`, and most responses lack `@ApiResponse` types. The spec
therefore carries endpoint/parameter typing but no field-level body/response
types — which is the root reason clients hand-maintain interfaces.

## Roadmap

1. **Backend annotation (next PR).** Add `@ApiProperty`/`@ApiResponse` to the
   NestJS DTOs and controllers (starting with the Lease domain: annotate
   `CreateLeaseDto`/`UpdateLeaseDto`/`UpdateLeaseStatusDto` + add a
   `LeaseResponseDto`). Regenerating then makes `components.schemas` rich.
2. **Flip domain aliases to generated.** Once rich, replace the hand-authored
   `Lease` read-model with `components['schemas']['LeaseResponseDto']` — a
   one-line change with zero client churn.
3. **Full interface consolidation.** Replace the clients' local `interface Lease`
   (and fix the `id: number` → `string` drift, which ripples through
   `LeaseEsignPanel`/`LeaseCard`) under `tsc` verification, then delete the
   duplicated interfaces across `operator_app` and `tenant_portal_mobile`.
4. **Backend adopts the shared envelope.** Have
   `tenant_portal_backend/src/common/api-envelope.ts` re-export from this package.
