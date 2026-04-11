import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContext {
  requestId: string;
  userId?: string;
  orgId?: string;
  method?: string;
  path?: string;
  startTime: number;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function getRequestId(): string {
  return requestContextStorage.getStore()?.requestId ?? 'no-context';
}

export function createRequestContext(overrides?: Partial<RequestContext>): RequestContext {
  return {
    requestId: randomUUID(),
    startTime: Date.now(),
    ...overrides,
  };
}
