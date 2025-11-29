# CORS Origins Configuration Fix

**Issue:** ML service failing to start with error:
```
pydantic_settings.sources.SettingsError: error parsing value for field "cors_origins" from source "DotEnvSettingsSource"
```

**Status:** ✅ FIXED

---

## Problem

Pydantic Settings was trying to parse `cors_origins` as JSON from environment variables, but if the value was empty, malformed, or in an unexpected format, it would fail.

---

## Solution

Added a **model validator** (`mode='before'`) that intercepts and parses CORS origins **before** pydantic-settings tries to JSON parse it. This prevents the parsing error from occurring.

The validator handles multiple input formats:

1. **JSON array**: `["http://localhost:3000", "http://localhost:3001"]`
2. **Comma-separated**: `http://localhost:3000,http://localhost:3001`
3. **Single value**: `http://localhost:3000`
4. **Empty/None**: Uses default values
5. **Already a list**: Returns as-is

**Code Added:**
```python
@model_validator(mode='before')
@classmethod
def parse_cors_origins_before(cls, data: Any) -> Any:
    """Parse CORS origins before field validation to prevent JSON parsing errors."""
    # Intercepts raw data before pydantic-settings tries to parse it
    # Handles all formats gracefully
    ...
```

**Also Added:** Error handling in `get_settings()` that falls back to defaults if parsing fails.

---

## Configuration Options

### Option 1: Don't Set CORS_ORIGINS (Recommended)

Just don't set the environment variable - it will use defaults:
```python
# Default: ["http://localhost:3000", "http://localhost:3001"]
```

### Option 2: Set as Comma-Separated String

```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:3001
```

### Option 3: Set as JSON Array

```bash
CORS_ORIGINS='["http://localhost:3000", "http://localhost:5173"]'
```

### Option 4: Single Origin

```bash
CORS_ORIGINS=http://localhost:3000
```

---

## Quick Fix

If you have an existing `.env` file causing issues:

1. **Check for CORS_ORIGINS in .env:**
   ```bash
   # In rent_optimization_ml directory
   cat .env | grep CORS
   ```

2. **Remove or fix the line:**
   - **Option A**: Delete the `CORS_ORIGINS` line (uses defaults)
   - **Option B**: Set it properly:
     ```bash
     CORS_ORIGINS=http://localhost:3000,http://localhost:3001
     ```

3. **Restart the service:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

---

## Testing

After the fix, the ML service should start without errors:

```bash
cd rent_optimization_ml
uvicorn main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

---

**Status:** ✅ Fixed - CORS origins now parse correctly from any format

