# Environment Setup Guide for Real-World Data

This guide provides step-by-step instructions for configuring environment variables to use real-world data instead of mocks.

---

## Phase 2: Environment Configuration

### Backend Environment Setup

#### Step 1: Create Backend `.env` File

Create a `.env` file in the `tenant_portal_backend` directory:

```bash
cd tenant_portal_backend
touch .env
```

#### Step 2: Configure Backend Environment Variables

Add the following to `tenant_portal_backend/.env`:

```bash
# ============================================
# Database Configuration
# ============================================
DATABASE_URL="postgresql://user:password@localhost:5432/tenant_portal?schema=public"

# ============================================
# Seeding Configuration
# ============================================
# Disable auto-seed to seed manually with real-world data
DISABLE_AUTO_SEED=true
SKIP_SEED=true

# ============================================
# Application Configuration
# ============================================
PORT=3001
NODE_ENV=development
APP_URL=http://localhost:3001

# ============================================
# JWT Configuration
# ============================================
JWT_SECRET=your-secret-key-change-in-production-min-32-chars
JWT_EXPIRATION=24h

# ============================================
# CORS Configuration
# ============================================
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# ============================================
# Rate Limiting
# ============================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

**Important:** Replace `DATABASE_URL` with your actual PostgreSQL connection string.

#### Step 3: Verify Database Connection

```bash
cd tenant_portal_backend
npx prisma db push
npx prisma generate
```

---

### Frontend Environment Setup

#### Step 1: Create Frontend `.env.local` File

Create a `.env.local` file in the `tenant_portal_app` directory:

```bash
cd tenant_portal_app
touch .env.local
```

#### Step 2: Configure Frontend Environment Variables

Add the following to `tenant_portal_app/.env.local`:

```bash
# ============================================
# API Configuration
# ============================================
# Backend API URL - used when MSW is disabled
VITE_API_URL=http://localhost:3001/api

# ============================================
# Mock Service Worker (MSW) Configuration
# ============================================
# Set to 'false' to disable MSW and use real backend API
VITE_USE_MSW=false

# ============================================
# Mock Data Configuration
# ============================================
# Disable mock data fallbacks in components
VITE_USE_MOCK_DATA=false
VITE_USE_STRIPE_MOCK=false
```

**Note:** `.env.local` takes precedence over `.env` and is not committed to git.

---

## Environment Variable Reference

### Backend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `DISABLE_AUTO_SEED` | ⚪ Optional | Disable automatic seeding on startup | `true` |
| `SKIP_SEED` | ⚪ Optional | Skip seed process | `true` |
| `PORT` | ⚪ Optional | Server port (default: 3001) | `3001` |
| `NODE_ENV` | ⚪ Optional | Environment mode | `development` |
| `JWT_SECRET` | ✅ Yes | Secret for JWT token signing | `your-secret-key` |
| `JWT_EXPIRATION` | ⚪ Optional | JWT token expiration | `24h` |
| `ALLOWED_ORIGINS` | ⚪ Optional | CORS allowed origins | `http://localhost:3000` |
| `RATE_LIMIT_ENABLED` | ⚪ Optional | Enable rate limiting | `true` |

### Frontend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | ⚪ Optional | Backend API base URL (default: `/api`) | `http://localhost:3001/api` |
| `VITE_USE_MSW` | ⚪ Optional | Enable MSW mocking (set to `false` to disable) | `false` |
| `VITE_USE_MOCK_DATA` | ⚪ Optional | Enable mock data fallbacks | `false` |
| `VITE_USE_STRIPE_MOCK` | ⚪ Optional | Enable Stripe mocking | `false` |

---

## Quick Setup Commands

### Backend Setup

```bash
cd tenant_portal_backend

# 1. Create .env file (if not exists)
cat > .env << 'EOF'
DATABASE_URL="postgresql://user:password@localhost:5432/tenant_portal?schema=public"
DISABLE_AUTO_SEED=true
SKIP_SEED=true
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production-min-32-chars
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
RATE_LIMIT_ENABLED=true
EOF

# 2. Update DATABASE_URL with your actual database credentials
# Edit .env file and replace the DATABASE_URL

# 3. Verify database connection
npx prisma db push
npx prisma generate
```

### Frontend Setup

```bash
cd tenant_portal_app

# 1. Create .env.local file (if not exists)
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3001/api
VITE_USE_MSW=false
VITE_USE_MOCK_DATA=false
VITE_USE_STRIPE_MOCK=false
EOF

# 2. Restart dev server if running
# The environment variables will be picked up on next start
```

---

## Verification Steps

### 1. Verify Backend Environment

```bash
cd tenant_portal_backend

# Check if .env file exists
ls -la .env

# Verify database connection
npx prisma db push

# Check environment variables are loaded
node -e "require('dotenv').config(); console.log('DB:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');"
```

### 2. Verify Frontend Environment

```bash
cd tenant_portal_app

# Check if .env.local file exists
ls -la .env.local

# Start dev server and check console logs
npm run dev

# Look for these console messages:
# [MAIN] Environment: { MODE: 'development', VITE_USE_MSW: 'false', VITE_API_URL: 'http://localhost:3001/api' }
```

---

## Testing the Configuration

### 1. Test Backend Connection

```bash
cd tenant_portal_backend

# Start backend server
npm run start:dev

# Should see:
# ✅ Database connection successful
# ✅ Server running on port 3001
```

### 2. Test Frontend Connection

```bash
cd tenant_portal_app

# Start frontend server
npm run dev

# In browser console, verify:
# ✅ [MSW] Skipping MSW - VITE_USE_MSW is false
# ✅ [MAIN] Environment shows VITE_USE_MSW: 'false'
```

### 3. Test API Connection

1. Open browser to `http://localhost:5173`
2. Open DevTools → Network tab
3. Try to login with seeded credentials
4. Verify requests go to `http://localhost:3001/api` (not mocked)

---

## Troubleshooting

### Backend Issues

**Database Connection Failed:**
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Verify database exists: `psql -l`
- Check connection string format

**Port Already in Use:**
- Change `PORT` in `.env` to different port
- Or stop existing process on port 3001

**JWT_SECRET Missing:**
- Add `JWT_SECRET` to `.env` file
- Use a strong random string (32+ characters)

### Frontend Issues

**MSW Still Running:**
- Verify `VITE_USE_MSW=false` in `.env.local`
- Clear browser cache
- Restart dev server
- Check browser console for MSW status

**API Requests Failing:**
- Verify `VITE_API_URL` is correct
- Check backend is running on correct port
- Verify CORS configuration allows frontend origin
- Check browser console for CORS errors

**Environment Variables Not Loading:**
- Ensure file is named `.env.local` (not `.env.local.txt`)
- Restart dev server after changes
- Check file is in `tenant_portal_app/` directory (root of frontend project)

---

## Next Steps

After completing environment setup:

1. ✅ Verify backend connects to database
2. ✅ Verify frontend can communicate with backend
3. ✅ Test login with seeded credentials
4. ⏳ Proceed to Phase 3: Database Migration & Seeding

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` or `.env.local` files** - They contain sensitive information
2. **Use strong JWT secrets** - Generate random strings for production
3. **Limit CORS origins** - Only allow trusted origins in production
4. **Use environment-specific values** - Different secrets for dev/staging/production

---

**Status:** ✅ Ready for Phase 2 Implementation  
**Next:** Phase 3 - Database Migration & Seeding

