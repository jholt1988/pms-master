// tenant_portal_app/src/services/apiClient.ts
export const getApiBase = () => (import.meta.env.VITE_API_URL ?? '/api');

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again to continue.';

type AuthErrorContext = {
  status: number;
  path: string;
  url: string;
};

let authErrorHandler: ((context: AuthErrorContext) => void) | null = null;

export const setApiAuthErrorHandler = (handler: ((context: AuthErrorContext) => void) | null) => {
  authErrorHandler = handler;
};

export class ApiHttpError extends Error {
  status: number;
  body: string;
  path: string;
  isAuthError: boolean;

  constructor(status: number, body: string, path: string) {
    const normalizedBody = typeof body === 'string' ? body.trim() : '';
    const message = status === 401
      ? SESSION_EXPIRED_MESSAGE
      : `${status}${normalizedBody ? ` - ${normalizedBody}` : ''}`;

    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.body = normalizedBody;
    this.path = path;
    this.isAuthError = status === 401;
  }
}

export type ApiOptions = {
  token?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  noJson?: boolean; // for file upload endpoints
  signal?: AbortSignal; // for request cancellation
};

export const isAuthExpiredError = (error: unknown): error is ApiHttpError => {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as Partial<ApiHttpError> & { message?: string };
  return maybeError.status === 401
    || maybeError.isAuthError === true
    || maybeError.message === SESSION_EXPIRED_MESSAGE;
};

export const toFriendlyApiMessage = (error: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (isAuthExpiredError(error)) {
    return SESSION_EXPIRED_MESSAGE;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const base = getApiBase().replace(/\/$/, '');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  // Normalize to avoid accidental duplication like `${base}/api` + `/api/...` → `/api/api/...`
  // Common in tests or env configs where VITE_API_URL already includes `/api`.
  let normalizedPath = path;
  if (!path.startsWith('http')) {
    normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
      normalizedPath = normalizedPath.slice('/api'.length);
    }
  }

  const rawUrl = path.startsWith('http') ? path : `${base}${normalizedPath}`;

  // In browser, `fetch('/api/...')` is fine. In Node (Vitest/undici), relative URLs throw.
  const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'http://localhost';
  const url = rawUrl.startsWith('http') ? rawUrl : new URL(rawUrl, origin).toString();

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body && !options.noJson ? JSON.stringify(options.body) : options.body,
      signal: options.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      const httpError = new ApiHttpError(response.status, text, path);

      if (response.status === 401 && authErrorHandler) {
        try {
          authErrorHandler({ status: response.status, path, url });
        } catch (handlerError) {
          console.error('apiClient auth error handler failed', handlerError);
        }
      }

      throw httpError;
    }

    if (response.status === 204) return null;
    const contentType = response.headers.get('content-type') || '';
    if (options.noJson || !contentType.includes('application/json')) return response;
    return response.json();
  } catch (error: any) {
    // Ignore AbortError (request cancelled) - this is normal during navigation
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      // Silently handle cancelled requests - they're expected during navigation
      throw new Error('Request cancelled');
    }
    throw error;
  }
}
