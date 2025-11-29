# Testing Guide

## Overview

This guide covers the testing setup and best practices for the Property Management Suite frontend application.

---

## 🧪 Testing Stack

- **Vitest** - Fast unit test framework (Vite-native)
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom matchers for DOM assertions
- **MSW (Mock Service Worker)** - API mocking for integration tests
- **jsdom** - DOM environment for tests

---

## 📁 Test Structure

```
src/
├── test/
│   ├── setup.ts              # Global test configuration
│   ├── test-utils.tsx        # Reusable test utilities
│   └── mocks/
│       └── handlers.ts       # MSW request handlers
├── **/*.test.tsx             # Component tests
└── **/*.spec.ts              # Unit tests
```

---

## 🚀 Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests once (CI mode)
```bash
npm run test:run
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

---

## 📝 Writing Tests

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Using Test Utilities

```typescript
import { renderWithProviders, createMockUser } from '@/test/test-utils';

// Render with all providers
renderWithProviders(<Component />);

// Render with custom route
renderWithProviders(<Component />, { route: '/dashboard' });
```

### Mocking API Calls

```typescript
import { vi } from 'vitest';
import * as apiClient from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiFetch: vi.fn(),
}));

// In your test
vi.mocked(apiClient.apiFetch).mockResolvedValue(mockData);
```

---

## 🎯 Test Coverage Goals

- **Components**: 70%+ coverage
- **Services**: 80%+ coverage
- **Utilities**: 90%+ coverage
- **Critical paths**: 100% coverage

Current coverage can be viewed by running:
```bash
npm run test:coverage
```

Then open `coverage/index.html` in your browser.

---

## ✅ Best Practices

### 1. Test User Behavior, Not Implementation

❌ **Bad:**
```typescript
expect(component.state.isOpen).toBe(true);
```

✅ **Good:**
```typescript
expect(screen.getByRole('dialog')).toBeInTheDocument();
```

### 2. Use Accessible Queries

Prefer queries that reflect how users interact:
- `getByRole` - Most accessible
- `getByLabelText` - For form inputs
- `getByText` - Last resort

### 3. Test Error States

```typescript
it('displays error message on API failure', async () => {
  vi.mocked(apiFetch).mockRejectedValue(new Error('API Error'));
  renderWithProviders(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### 4. Clean Up After Tests

The test setup automatically cleans up, but if you need manual cleanup:

```typescript
afterEach(() => {
  vi.clearAllMocks();
});
```

### 5. Use Descriptive Test Names

```typescript
// Good
it('displays loading spinner while fetching data', () => {});

// Bad
it('works', () => {});
```

---

## 🔧 Configuration

### Vitest Config (`vitest.config.ts`)

- Environment: `jsdom` (browser-like environment)
- Setup file: `src/test/setup.ts`
- Coverage provider: `v8`
- Coverage thresholds: 60% for all metrics

### Test Setup (`src/test/setup.ts`)

- Configures jest-dom matchers
- Mocks browser APIs (matchMedia, IntersectionObserver)
- Auto-cleanup after each test

---

## 📊 Current Test Status

### Test Files (7)
- ✅ `MainDashboard.test.tsx` - Dashboard layout tests
- ✅ `MaintenanceCard.test.tsx` - Maintenance card component
- ✅ `GlassCard.test.tsx` - Glass card component
- ✅ `DockNavigation.test.tsx` - Navigation component
- ✅ `apiClient.test.ts` - API client utilities
- ✅ `PropertySearchPage.test.tsx` - Property search
- ✅ `BulkMessageComposer.test.tsx` - Bulk messaging
- ✅ `BulkMessageStatusPanel.test.tsx` - Message status
- ✅ `LeaseEsignPanel.test.tsx` - E-signature panel

### Coverage Areas

**✅ Well Tested:**
- Core UI components
- Dashboard layout
- API client utilities

**⚠️ Needs More Tests:**
- Form components
- Complex workflows
- Error boundaries
- Authentication flows

---

## 🚧 Future Improvements

1. **E2E Testing** - Add Playwright or Cypress
2. **Visual Regression** - Add Chromatic or Percy
3. **Performance Testing** - Add Lighthouse CI
4. **Accessibility Testing** - Add axe-core
5. **MSW Integration** - Full API mocking setup

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [MSW Documentation](https://mswjs.io/)

---

**Last Updated:** January 2025

