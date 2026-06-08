import type { paths } from './generated/schema';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

type JsonBody = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type ApiClientOptions = {
  token?: string;
  baseUrl?: string;
};

export class OperatorApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'OperatorApiError';
  }
}

const defaultBaseUrl = '/api/backend';

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>, baseUrl = defaultBaseUrl) {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`, 'http://operator.local');

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}${url.search}`;
}

export async function apiRequest<T>(
  method: HttpMethod,
  path: keyof paths & string,
  options: ApiClientOptions & {
    query?: Record<string, string | number | boolean | undefined>;
    body?: JsonBody;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const response = await fetch(buildUrl(path, options.query, options.baseUrl), {
    method: method.toUpperCase(),
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new OperatorApiError(`API request failed: ${response.status}`, response.status, body);
  }

  return body as T;
}
