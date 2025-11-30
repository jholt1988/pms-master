// tenant_portal_app/src/services/apiClient.ts
   export const getApiBase = () => (import.meta.env.VITE_API_URL ?? '/api');

   export type ApiOptions = {
     token?: string;
     method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
     body?: any;
     headers?: Record<string, string>;
     noJson?: boolean; // for file upload endpoints
     signal?: AbortSignal; // for request cancellation
   };

   export async function apiFetch(path: string, options: ApiOptions = {}) {
     const base = getApiBase();
     const url = path.startsWith('http') ? path : `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
     const headers: Record<string, string> = {
       'Content-Type': 'application/json',
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
         // Optionally handle 401/403 for re-auth flow
         throw new Error(`${response.status} - ${text}`);
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