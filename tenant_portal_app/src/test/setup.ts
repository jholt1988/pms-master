/**
 * Vitest Test Setup
 * Global configuration for all tests
 */

import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom/vitest';
import { server } from '../mocks/server';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Reset any request handlers that are declared as a part of our tests
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  server.resetHandlers();
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Suppress noisy, expected errors in tests (e.g. fire-and-forget persistence in LeasingAgentService)
const originalConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
  const first = args[0];
  if (typeof first === 'string' && first.startsWith('Error saving message:')) return;
  return originalConsoleError(...args);
};

