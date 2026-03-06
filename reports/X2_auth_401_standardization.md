# X-2 Auth 401 Standardization Report

## Scope
Standardized 401/session-expired UX handling in `tenant_portal_app` across:
- Central API client (`src/services/apiClient.ts`)
- High-impact pages:
  - Maintenance (`src/domains/tenant/features/maintenance/MaintenancePage.tsx`)
  - Payments (`src/domains/tenant/features/payments/PaymentsPage.tsx`)
  - Messaging (`src/domains/shared/features/messaging/MessagingPage.tsx`)

Also wired a central re-auth hook in app shell:
- `src/App.tsx`

## What was implemented

### 1) Centralized 401 handling in `apiClient`
In `src/services/apiClient.ts`:
- Added `SESSION_EXPIRED_MESSAGE`:
  - `Your session has expired. Please sign in again to continue.`
- Added `ApiHttpError` class with:
  - `status`, `body`, `path`, `isAuthError`
- Added helper utilities:
  - `isAuthExpiredError(error)`
  - `toFriendlyApiMessage(error, fallback)`
- Added optional central callback registration:
  - `setApiAuthErrorHandler(handler | null)`
- On HTTP 401 response:
  - Throws structured `ApiHttpError` with friendly message
  - Invokes registered auth error handler (if provided)

This keeps existing flow (errors still throw) while enabling consistent session-expired UX and centralized logout/redirect behavior.

### 2) Registered central re-auth handler
In `src/App.tsx`:
- Registered `setApiAuthErrorHandler(() => logout())` via `useEffect`
- Cleans up handler on unmount

Because route guards already redirect unauthenticated users to login, this enables a central re-auth path without changing existing routing behavior.

### 3) Maintenance page UX updates
In `src/domains/tenant/features/maintenance/MaintenancePage.tsx`:
- Updated API error handling to use:
  - `isAuthExpiredError`
  - `toFriendlyApiMessage`
- 401 now surfaces user-friendly session-expired messaging in both:
  - request list load errors
  - submit request errors

### 4) Payments page UX updates
In `src/domains/tenant/features/payments/PaymentsPage.tsx`:
- Updated API error handling to use `toFriendlyApiMessage` consistently for:
  - adding payment method
  - deleting payment method
  - checkout start (`Pay Now`)
  - autopay update
  - initial data fetch error state
- Important behavior fix:
  - Replaced blanket `.catch(() => [])` on primary fetch calls with a `fetchOrEmpty` wrapper that **rethrows 401** and only degrades to empty arrays for non-auth failures.
  - Prevents silent swallowing of session-expired errors.

### 5) Messaging page UX updates
In `src/domains/shared/features/messaging/MessagingPage.tsx`:
- Replaced raw `error.message` presentation with `toFriendlyApiMessage` for:
  - conversation fetch
  - message fetch
  - send message
  - thread creation
  - bulk messaging resource fetch

## Validation

### Build validation
Executed:
- `npm run build` in `tenant_portal_app`

Result:
- ✅ Build succeeded (`vite build` complete)
- Non-blocking warning remains about circular chunking (pre-existing bundling concern; build still successful)

## Notes
- Existing non-X2 modified files in repo were left untouched.
- This implementation avoids breaking existing flows by preserving thrown errors while improving consistency and centralizing 401 session-expired behavior.
