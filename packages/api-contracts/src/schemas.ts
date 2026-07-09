/**
 * The OpenAPI-generated seam — the single generated home for the repo.
 *
 * `paths` / `components` / `operations` are produced from
 * `docs/api/openapi.json` by openapi-typescript v7
 * (run `pnpm --filter @propertyos/api-contracts gen`).
 *
 * Import endpoint/operation and request-body typing from this subpath, e.g.:
 *   import type { paths, components } from '@propertyos/api-contracts/schemas';
 *
 * This module is intentionally NOT re-exported from the package barrel so that
 * consumers who only need envelope/domain types don't have to compile the
 * large generated file.
 *
 * IMPORTANT: most `components.schemas` entries are currently EMPTY objects
 * because the backend DTOs are not yet decorated with `@ApiProperty` (and most
 * responses lack `@ApiResponse`). Annotating them is the next track (see the
 * README "Roadmap"); once done, the aliases below become rich automatically and
 * clients can delete their hand-written request/response interfaces.
 */
export type { paths, components, operations, webhooks } from './generated/schema';
import type { components } from './generated/schema';

/** Full generated component-schema map. */
export type Schemas = components['schemas'];

/** Request-body aliases, drawn from the generated spec (the single source). */
export type CreateLeaseInput = Schemas['CreateLeaseDto'];
export type UpdateLeaseInput = Schemas['UpdateLeaseDto'];
export type UpdateLeaseStatusInput = Schemas['UpdateLeaseStatusDto'];
export type SavePropertyFilterInput = Schemas['SavePropertyFilterDto'];
