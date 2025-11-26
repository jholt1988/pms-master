/**
 * Test Utilities
 * Reusable helpers for testing React components
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../AuthContext';
import { NextUIProvider } from '@nextui-org/system';

/**
 * Custom render function that includes all providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    initialAuthState?: {
      token?: string | null;
      user?: any;
    };
    route?: string;
  }
) => {
  const { initialAuthState, route, ...renderOptions } = options || {};

  // Mock AuthContext if initialAuthState is provided
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    // If we need custom auth state, we'd need to modify AuthProvider
    // For now, use default AuthProvider
    return (
      <BrowserRouter>
        <NextUIProvider>
          <AuthProvider>{children}</AuthProvider>
        </NextUIProvider>
      </BrowserRouter>
    );
  };

  // Set initial route if provided
  if (route && typeof window !== 'undefined') {
    window.history.pushState({}, 'Test page', route);
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Create a mock user object
 */
export const createMockUser = (overrides?: Partial<any>) => ({
  id: 1,
  username: 'testuser',
  role: 'PROPERTY_MANAGER',
  ...overrides,
});

/**
 * Create a mock token
 */
export const createMockToken = () => 'mock-jwt-token';

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
/**
 * Mock API response helper
 */
export function mockApiResponse<T>(data: T, status: number = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  };
}


/**
 * Mock fetch helper
 */
export const mockFetch = (responses: Record<string, any>) => {
  return async (url: string, options?: RequestInit) => {
    const response = responses[url] || responses['*'];
    if (!response) {
      throw new Error(`No mock response for ${url}`);
    }
    return mockApiResponse(response);
  };
};

// Note: render is already exported from @testing-library/react above

