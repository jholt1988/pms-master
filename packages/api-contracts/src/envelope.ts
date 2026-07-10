/**
 * Canonical API response envelope for PropertyOS.
 *
 * This mirrors the backend definition in
 * `tenant_portal_backend/src/common/api-envelope.ts` so the server and every
 * client share ONE definition of the success/error envelope. A follow-up
 * (see README "Roadmap") makes the backend import these types instead of
 * re-declaring them, closing the loop.
 */

export type ApiError = {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
  retryable?: boolean;
};

/** Back-compat alias for the backend's historical name (`ApiErrorEnvelopeItem`). */
export type ApiErrorEnvelopeItem = ApiError;

export type Pagination = {
  total: number;
  skip: number;
  take: number;
};

/**
 * Response metadata. Open-ended to match the backend's `Record<string, unknown>`,
 * with the well-known optional keys surfaced for ergonomics.
 */
export type ApiMeta = {
  requestId?: string;
  pagination?: Pagination;
  [key: string]: unknown;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: ApiMeta;
  errors: ApiError[];
};

export function apiOk<T>(data: T, meta: ApiMeta = {}): ApiEnvelope<T> {
  return { data, meta, errors: [] };
}

export function apiFail(errors: ApiError[], meta: ApiMeta = {}): ApiEnvelope<null> {
  return { data: null, meta, errors };
}

/** Historical package names, kept so existing references keep working. */
export const ok = apiOk;
export const fail = apiFail;

export function pagination(total: number, skip: number, take: number): { pagination: Pagination } {
  return { pagination: { total, skip, take } };
}

export function isApiEnvelope<T = unknown>(value: unknown): value is ApiEnvelope<T> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    'data' in record && 'meta' in record && 'errors' in record && Array.isArray(record.errors)
  );
}

export class ApiEnvelopeError extends Error {
  readonly errors: ApiError[];
  readonly meta: ApiMeta;
  constructor(errors: ApiError[], meta: ApiMeta = {}) {
    const first = errors[0];
    super(first ? `${first.code}: ${first.message}` : 'API request failed');
    this.name = 'ApiEnvelopeError';
    this.errors = errors;
    this.meta = meta;
  }
}

/**
 * Unwrap a success envelope to its `data`. Values that are not enveloped
 * (some legacy routes return bare bodies) are returned as-is. Throws
 * `ApiEnvelopeError` when the envelope carries errors.
 */
export function unwrapEnvelope<T>(value: ApiEnvelope<T> | T): T {
  if (isApiEnvelope<T>(value)) {
    if (value.errors.length > 0) {
      throw new ApiEnvelopeError(value.errors, value.meta);
    }
    return value.data;
  }
  return value as T;
}
