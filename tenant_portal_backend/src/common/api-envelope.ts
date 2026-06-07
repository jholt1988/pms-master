export type ApiErrorEnvelopeItem = {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
  retryable?: boolean;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: Record<string, unknown>;
  errors: ApiErrorEnvelopeItem[];
};

export function apiOk<T>(data: T, meta: Record<string, unknown> = {}): ApiEnvelope<T> {
  return { data, meta, errors: [] };
}

export function apiFail(errors: ApiErrorEnvelopeItem[], meta: Record<string, unknown> = {}): ApiEnvelope<null> {
  return { data: null, meta, errors };
}

export function pagination(total: number, skip: number, take: number) {
  return { pagination: { total, skip, take } };
}
