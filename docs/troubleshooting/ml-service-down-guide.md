# ML Service Down - Configuration Guide

**Issue:** The ML service (rent optimization) is currently down or unavailable.

**Solution:** Disable ML service gracefully so the backend continues to work without it.

---

## Quick Fix: Disable ML Service

### Option 1: Environment Variable (Recommended)

Add this to your `tenant_portal_backend/.env` file:

```bash
# Disable ML service
USE_ML_SERVICE=false
ML_SERVICE_URL=http://localhost:8000
```

This will:
- ✅ Disable all ML service calls
- ✅ Use fallback logic for rent optimization
- ✅ Prevent errors when ML service is unavailable
- ✅ Allow backend to start and function normally

### Option 2: Start ML Service

If you want to use the ML service, start it:

```bash
cd rent_optimization_ml

# Install dependencies if needed
pip install -r requirements.txt

# Start the service
uvicorn main:app --reload --port 8000
```

Then set in `.env`:
```bash
USE_ML_SERVICE=true
ML_SERVICE_URL=http://localhost:8000
```

---

## How It Works

### Backend Behavior

When `USE_ML_SERVICE=false`:

1. **Rent Optimization Service**
   - Uses simple market-based adjustment (3% annual increase)
   - Logs warning that ML service is disabled
   - Still returns valid recommendations

2. **AI Lease Renewal Service**
   - Uses fallback logic for rent adjustments
   - Works without ML service predictions

3. **Error Handling**
   - All ML service calls have try-catch blocks
   - Failures fall back to rule-based logic
   - Backend continues to function normally

---

## Verification

After setting `USE_ML_SERVICE=false`:

1. **Restart backend:**
   ```bash
   npm run start:dev
   ```

2. **Check logs for:**
   ```
   RentOptimizationService initialized. ML Service URL: http://localhost:8000, USE_ML_SERVICE: false
   ```

3. **Test rent optimization endpoint:**
   ```bash
   # Should work and return fallback recommendation
   curl http://localhost:3001/api/rent-optimization/estimate \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Services That Use ML

1. **Rent Optimization** (`RentOptimizationService`)
   - Falls back to 3% annual increase
   - No errors, just warnings in logs

2. **AI Lease Renewal** (`AILeaseRenewalService`)
   - Uses fallback rent adjustments
   - Works without ML service

---

## Starting ML Service Later

When you want to enable ML service:

1. Start ML service:
   ```bash
   cd rent_optimization_ml
   uvicorn main:app --reload --port 8000
   ```

2. Update `.env`:
   ```bash
   USE_ML_SERVICE=true
   ```

3. Restart backend:
   ```bash
   npm run start:dev
   ```

---

**Status:** ✅ Backend works without ML service  
**Action Required:** Set `USE_ML_SERVICE=false` in `.env` file

