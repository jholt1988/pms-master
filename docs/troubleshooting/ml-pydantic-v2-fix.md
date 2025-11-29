# Pydantic v2 Compatibility Fix

**Issue:** ML service was failing to start with Pydantic v2 compatibility errors.

**Status:** ✅ FIXED

---

## Problems Fixed

### 1. Root Model Syntax (Pydantic v1 → v2)

**Error:**
```
TypeError: To define root models, use `pydantic.RootModel` rather than a field called '__root__'
```

**Fix Applied:**
- Changed `BatchPredictionRequest` from using `__root__` to Pydantic v2's `RootModel`
- Updated all references from `payload.__root__` to `payload.root`

**Files Changed:**
- `app/models/schemas.py` - Updated class definition
- `rent_optimization_ml/app/models/schemas.py` - Updated duplicate file
- `main.py` - Updated references
- `rent_optimization_ml/main.py` - Updated duplicate file

**Before (Pydantic v1):**
```python
class BatchPredictionRequest(BaseModel):
    __root__: List[PredictionRequest]
    
    def __iter__(self):
        return iter(self.__root__)
```

**After (Pydantic v2):**
```python
class BatchPredictionRequest(RootModel[List[PredictionRequest]]):
    root: List[PredictionRequest]
    
    def __iter__(self):
        return iter(self.root)
```

---

### 2. Protected Namespace Warnings

**Warning:**
```
UserWarning: Field "model_version" has conflict with protected namespace "model_".
UserWarning: Field "model_path" has conflict with protected namespace "model_".
```

**Fix Applied:**
- Added `protected_namespaces=('settings_',)` to SettingsConfigDict

**Files Changed:**
- `app/config.py`
- `rent_optimization_ml/app/config.py`

**Before:**
```python
model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")
```

**After:**
```python
model_config = SettingsConfigDict(
    env_file=".env",
    case_sensitive=False,
    extra="ignore",
    protected_namespaces=('settings_',)  # Fix warning about model_ namespace conflicts
)
```

---

## Testing

After these fixes, the ML service should start without errors:

```bash
cd rent_optimization_ml
uvicorn main:app --reload --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**No more errors about:**
- ❌ `__root__` field
- ❌ Protected namespace conflicts

---

## Files Modified

1. ✅ `rent_optimization_ml/app/models/schemas.py`
2. ✅ `rent_optimization_ml/rent_optimization_ml/app/models/schemas.py`
3. ✅ `rent_optimization_ml/main.py`
4. ✅ `rent_optimization_ml/rent_optimization_ml/main.py`
5. ✅ `rent_optimization_ml/app/config.py`
6. ✅ `rent_optimization_ml/rent_optimization_ml/app/config.py`

---

**Status:** ✅ All Pydantic v2 compatibility issues resolved  
**Next:** Start the ML service and verify it runs without errors

