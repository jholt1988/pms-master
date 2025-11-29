# Frontend Environment Setup Guide

This guide provides instructions for configuring the frontend to use real backend API instead of MSW mocks.

---

## Quick Setup

### Step 1: Create `.env.local` File

```bash
cd tenant_portal_app
touch .env.local
```

### Step 2: Add Configuration

Add the following to `.env.local`:

```bash
# API Configuration
VITE_API_URL=http://localhost:3001/api

# Disable MSW (Mock Service Worker)
VITE_USE_MSW=false

# Disable mock data fallbacks
VITE_USE_MOCK_DATA=false
VITE_USE_STRIPE_MOCK=false
```

### Step 3: Restart Dev Server

```bash
npm run dev
```

---

## Environment Variables

### Required for Real API

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_USE_MSW` | `false` | Disables Mock Service Worker |
| `VITE_API_URL` | `http://localhost:3001/api` | Backend API base URL |

### Optional

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_USE_MOCK_DATA` | `false` | Disables mock data fallbacks |
| `VITE_USE_STRIPE_MOCK` | `false` | Disables Stripe mocking |

---

## Verification

After setting up environment variables:

1. **Start frontend:**
   ```bash
   npm run dev
   ```

2. **Check browser console:**
   - Should see: `[MSW] Skipping MSW - VITE_USE_MSW is false`
   - Should see: `[MAIN] Environment: { VITE_USE_MSW: 'false', VITE_API_URL: 'http://localhost:3001/api' }`

3. **Test API connection:**
   - Open DevTools → Network tab
   - Try to login
   - Verify requests go to `http://localhost:3001/api` (not mocked)

---

## Troubleshooting

### MSW Still Running

- Verify `.env.local` file exists and has `VITE_USE_MSW=false`
- Clear browser cache
- Restart dev server
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### API Requests Failing

- Verify backend is running on port 3001
- Check `VITE_API_URL` is correct
- Verify CORS is configured on backend
- Check browser console for errors

---

**See Also:** [Backend Environment Setup](../setup/environment-setup-backend.md) for backend setup

