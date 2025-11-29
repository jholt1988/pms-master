# MSW (Mock Service Worker) Setup Guide

This guide explains how to use MSW for mocking API calls in development and testing.

## Overview

MSW (Mock Service Worker) intercepts network requests at the service worker level, allowing you to:
- Develop frontend without a running backend
- Test components with realistic API responses
- Simulate different API states (loading, errors, etc.)

## Initial Setup

### 1. Initialize Service Worker

Run this command to generate the service worker file:

```bash
npm run msw:init
```

This creates `public/mockServiceWorker.js` which intercepts network requests in the browser.

### 2. Environment Variables

Create a `.env` file (or use `.env.local`) with:

```env
VITE_API_URL=http://localhost:3001/api
VITE_USE_MSW=true
```

To disable MSW, set `VITE_USE_MSW=false`.

## Usage

### Development Mode

MSW automatically starts in development mode when you run:

```bash
npm start
```

You'll see a message in the console:
```
[MSW] Mocking enabled.
```

### Testing Mode

MSW is automatically configured for Vitest tests. The test setup file (`src/test/setup.ts`) initializes MSW before tests run.

```bash
npm test
```

## File Structure

```
src/
├── mocks/
│   ├── handlers.ts          # All API mock handlers
│   ├── browser.ts           # Browser setup (development)
│   ├── server.ts            # Node setup (testing)
│   └── apiFixtures.ts       # Mock data fixtures
└── test/
    └── setup.ts             # Test setup with MSW
```

## Adding New Handlers

Edit `src/mocks/handlers.ts` to add new API mocks:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/your-endpoint', () => {
    return HttpResponse.json({
      data: 'your mock response'
    });
  }),
];
```

## Handler Patterns

### Basic GET Request

```typescript
http.get(`${API_BASE}/endpoint`, async () => {
  await networkDelay(); // Simulate network delay
  return HttpResponse.json({ data: 'response' });
}),
```

### POST Request with Body

```typescript
http.post(`${API_BASE}/endpoint`, async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json({ id: 1, ...body }, { status: 201 });
}),
```

### Authenticated Request

```typescript
http.get(`${API_BASE}/protected`, ({ request }) => {
  const token = request.headers.get('Authorization');
  if (!token) {
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  return HttpResponse.json({ data: 'protected data' });
}),
```

### Dynamic Route Parameters

```typescript
http.get(`${API_BASE}/items/:id`, ({ params }) => {
  return HttpResponse.json({ id: params.id, name: 'Item' });
}),
```

### Error Responses

```typescript
http.get(`${API_BASE}/error`, () => {
  return HttpResponse.json(
    { message: 'Server error' },
    { status: 500 }
  );
}),
```

## Mock Data

Mock data is stored in `src/mocks/apiFixtures.ts`. Use these fixtures in your handlers:

```typescript
import { mockMaintenanceRequests } from './apiFixtures';

http.get(`${API_BASE}/maintenance`, () => {
  return HttpResponse.json(mockMaintenanceRequests);
}),
```

## Testing with MSW

MSW is automatically set up in tests. You can override handlers in specific tests:

```typescript
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

test('handles error', async () => {
  server.use(
    http.get('/api/endpoint', () => {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    })
  );
  
  // Your test code
});
```

## Debugging

### View Mocked Requests

Open browser DevTools → Network tab. Requests intercepted by MSW will show:
- Status: 200 (mocked)
- Response: Your mock data

### Console Logging

MSW logs unhandled requests to the console:
```
[MSW] Unhandled GET request to /api/unknown-endpoint
```

### Disable MSW Temporarily

Set `VITE_USE_MSW=false` in your `.env` file to bypass MSW and use real API.

## Common Issues

### Service Worker Not Found

**Error**: `Failed to register a ServiceWorker`

**Solution**: Run `npm run msw:init` to generate the service worker file.

### Requests Not Being Mocked

1. Check that MSW is enabled: `VITE_USE_MSW=true`
2. Verify the service worker is registered (check DevTools → Application → Service Workers)
3. Check that your API base URL matches the handler paths

### CORS Errors

MSW handles CORS automatically. If you see CORS errors:
1. Make sure MSW is running
2. Check that requests are going to the mocked endpoints
3. Verify `VITE_API_URL` matches your handler base path

## Best Practices

1. **Keep Handlers Realistic**: Use realistic data structures matching your API
2. **Simulate Network Delay**: Use `networkDelay()` for realistic UX
3. **Handle Errors**: Create handlers for error cases (400, 500, etc.)
4. **Use Fixtures**: Store mock data in `apiFixtures.ts` for reusability
5. **Test Edge Cases**: Create handlers for edge cases (empty arrays, null values, etc.)

## Current Mock Coverage

✅ Authentication (login, register, profile)
✅ Properties (public and authenticated)
✅ Rental Applications (CRUD, lifecycle, screening)
✅ Maintenance Requests (CRUD, status updates)
✅ Payments (invoices, payment methods, transactions)
✅ Leases (tenant and PM views)
✅ Messaging (conversations, messages)
✅ Dashboard (tenant and PM data)
✅ Notifications
✅ Chatbot

## Next Steps

- [ ] Add more error case handlers
- [ ] Add handlers for file uploads
- [ ] Add handlers for real-time features (WebSocket mocks)
- [ ] Add handlers for pagination
- [ ] Add handlers for search/filter endpoints

