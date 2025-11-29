/**
 * MSW Browser Setup
 * Initialize MSW in the browser for development
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

console.log('[MSW] Browser setup - handlers imported');
console.log('[MSW] Handlers type:', typeof handlers);
console.log('[MSW] Handlers is array:', Array.isArray(handlers));
console.log('[MSW] Handlers length:', handlers?.length ?? 'undefined');
console.log('[MSW] First few handlers:', handlers?.slice(0, 3));

if (!handlers || handlers.length === 0) {
  console.error('[MSW] ❌ ERROR: handlers array is empty or undefined!');
  console.error('[MSW] This means handlers.ts is not exporting correctly');
}

// This configures a Service Worker with the given request handlers
export const worker = setupWorker(...(handlers || []));

console.log('[MSW] Worker created:', worker);

