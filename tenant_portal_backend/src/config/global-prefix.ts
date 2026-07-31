import type { RouteInfo } from '@nestjs/common/interfaces';

/**
 * The single global API prefix applied to every controller at bootstrap.
 *
 * Controllers must NOT self-declare this prefix in their `@Controller()`
 * decorator — doing so double-prefixes the route to `/api/api/...`. See
 * ADR (docs/architecture/adr.md, "API Prefix Standardization") and the
 * regression guard in `test/api-prefix-hygiene.spec.ts`.
 */
export const GLOBAL_API_PREFIX = 'api';

/**
 * Routes excluded from the global prefix.
 *
 * IMPORTANT: this list is shared by the runtime bootstrap (`src/index.ts`) and
 * the OpenAPI generator (`scripts/generate-openapi.ts`). Keeping a single
 * source of truth prevents the generated schema from drifting away from the
 * routes the server actually serves.
 *
 * - `leasing` / `esignature`: served unprefixed for external integrations that
 *   expect stable, unversioned URLs (these controllers dual-mount).
 * - `webhooks/*`: external services (Stripe, QuickBooks, eSignature) post to
 *   fixed, documented, unprefixed URLs.
 * - `metrics`: Prometheus scrape endpoint conventionally lives at `/metrics`.
 */
export const GLOBAL_PREFIX_EXCLUDE: Array<string | RouteInfo> = [
  'leasing',
  'leasing/(.*)',
  'api/leasing',
  'api/leasing/(.*)',
  'esignature',
  'esignature/(.*)',
  'api/esignature',
  'api/esignature/(.*)',
  // Webhooks are excluded to match external service expectations
  'webhooks/esignature',
  'webhooks/stripe',
  'webhooks/quickbooks',
  // Prometheus scrape endpoint (commonly expected at /metrics)
  // 'metrics',
  // 'metrics/(.*)',
];
