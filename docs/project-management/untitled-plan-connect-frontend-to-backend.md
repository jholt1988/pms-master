# Plan: Connect Frontend to Backend

## Overview
This plan documents the recommended steps to connect the `tenant_portal_app` frontend to the `tenant_portal_backend` backend in both development and production environments. It standardizes environment variables, creates a dev-time proxy, centralizes API usage, and ensures a consistent token-based Authorization flow.

---

## Goals
- Centralize the API base URL using `VITE_API_URL`.
- Add a Vite dev server proxy to forward `/api` requests to the backend for localhost development.
- Replace hard-coded backend URLs in the frontend code with dynamic `import.meta.env.VITE_API_URL` or a single `getApiBase()` helper.
- Centralize token handling in an `apiClient.ts` wrapper and ensure Authorization headers are added consistently.
- Validate backend CORS settings are configured for local and production origins.

---

## Steps (Implementation)
1. Add `VITE_API_URL` to `tenant_portal_app/.env.example` (and copy to `.env.local`):
   - `VITE_API_URL=http://localhost:3001/api` (dev)
   - For production: `VITE_API_URL=https://api.example.com/api` (or your deployed backend URL)

2. Configure the Vite dev proxy to forward `/api` to the backend (edit `tenant_portal_app/vite.config.js`):
   ```js
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import tailwindcss from '@tailwindcss/vite';

   export default defineConfig({
     plugins: [react(), tailwindcss()],
     server: {
       port: 3000,
       cors: {
         origin: 'http://localhost:3001',
       },
       proxy: {
         '/api': {
           target: 'http://localhost:3001',
           changeOrigin: true,
           secure: false,
           rewrite: (path) => path.replace(/^\/api/, '/api')
         }
       }
     },
   });
   ```

3. Create `tenant_portal_app/src/services/apiClient.ts` with a small helper API module that
   - exposes `getApiBase()`
   - provides `apiFetch()` that handles `Content-Type`, `Authorization` header, and JSON parsing

   Example `apiClient.ts` (new file):
   ```ts
   // tenant_portal_app/src/services/apiClient.ts
   export const getApiBase = () => (import.meta.env.VITE_API_URL ?? '/api');

   export type ApiOptions = {
     token?: string;
     method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
     body?: any;
     headers?: Record<string, string>;
     noJson?: boolean; // for file upload endpoints
   };

   export async function apiFetch(path: string, options: ApiOptions = {}) {
     const base = getApiBase();
     const url = path.startsWith('http') ? path : `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
     const headers: Record<string, string> = {
       'Content-Type': 'application/json',
       ...(options.headers || {}),
     };
     if (options.token) headers.Authorization = `Bearer ${options.token}`;

     const response = await fetch(url, {
       method: options.method ?? 'GET',
       headers,
       body: options.body && !options.noJson ? JSON.stringify(options.body) : options.body,
     });

     if (!response.ok) {
       const text = await response.text();
       // Optionally handle 401/403 for re-auth flow
       throw new Error(`${response.status} - ${text}`);
     }

     if (response.status === 204) return null;
     const contentType = response.headers.get('content-type') || '';
     if (options.noJson || !contentType.includes('application/json')) return response;
     return response.json();
   }
   ```

4. Replace hardcoded API URLs in the app with the helper `apiFetch` and `getApiBase()`:
   - `tenant_portal_app/src/services/propertySearch.ts` change `const API_BASE = 'http://localhost:3000/api/properties'` ->
     ```ts
     const API_BASE = getApiBase().replace(/\/$/, '') + '/properties';
     ```
   - `tenant_portal_app/src/services/LeasingAgentService.ts` change `private readonly API_BASE_URL = 'http://localhost:3001/api';` ->
     ```ts
     private readonly API_BASE_URL = getApiBase();
     ```
   - Update other files similarly; prefer relative `/api` usage when appropriate if Vite proxy is enabled.

5. Ensure every call that requires Authorization uses `useAuth()` token or the api client token param:
   - Example update for `PropertySearchPage.tsx`:
     ```tsx
     const { token } = useAuth();
     const response = await apiFetch('/properties/search?${query}', { token });
     ```
   - For existing calls that pass `token` via headers, keep the existing approach but prefer the `apiFetch()` wrapper.

6. Backend CORS / ALLOWED_ORIGINS
   - Verify `tenant_portal_backend/.env` or its server CORS config includes `http://localhost:3000` and production origin(s).
   - Example env: `ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com`.

7. Tests & Verification
   - Start backend on port 3001; start frontend on port 3000.
   - Visit a protected page that makes a backend call, e.g., `Dashboard` or `Property Search`.
   - Confirm in browser DevTools that requests go to `http://localhost:3000/api/…` (and proxied to backend) or `http://localhost:3001/api/…` based on your `VITE_API_URL`.
   - Validate Authorization header exists for protected routes.

---

## Quick Commands (Local dev & testing)
1. Backend:
```bash
cd tenant_portal_backend
npm install
npm run start
```

2. Frontend:
```bash
cd tenant_portal_app
cp .env.example .env.local
# edit .env.local as needed (VITE_API_URL)
npm install
npm run start
```

---

## Notes & Best Practices
- Remove `proxy` field in `tenant_portal_app/package.json` (it’s CRA-specific; Vite uses `vite.config.js` proxy). If both are present it might cause confusion for devs.
- Encourage using `getApiBase()` + `apiFetch()` across the app for all fetch calls.
- For file uploads or endpoints that return non-JSON, use `noJson` in `apiFetch` to return the raw response.
- Consider token refresh/refresh-token flows, or switching to `HttpOnly` cookies for production to better protect in-browser storage.

---

## Follow-up / Post Implementation
- Replace remaining hard-coded host strings (`localhost:3000` or `localhost:3001`) across the frontend.
- Add unit tests or E2E tests for `apiFetch()` and request flows.
- Document environment variables in `tenant_portal_app/.env.example` and update README.

---

## Example file locations to update (non-exhaustive)
- `tenant_portal_app/vite.config.js` (proxy)
- `tenant_portal_app/.env.example` (VITE_API_URL)
- `tenant_portal_app/src/services/apiClient.ts` (new file)
- `tenant_portal_app/src/services/propertySearch.ts` (update API_BASE)
- `tenant_portal_app/src/services/LeasingAgentService.ts` (update API_BASE_URL)
- `tenant_portal_app/src/SchedulePage.tsx` (update API_BASE)
- `tenant_portal_app/src/PasswordResetPage.tsx`, `LoginPage.tsx`, `PaymentsPage.tsx` (use token + wrapper)
- Verify or update `tenant_portal_backend/.env` ALLOWED_ORIGINS

---

If you'd like, I can create a PR-style patch that adds `apiClient.ts` and applies the recommended code changes. Would you like me to implement the `apiClient.ts` file and edit the key service files next?