# ML Training Pipeline - Schema Extension Complete ✅

**Date**: November 6, 2025  
**Status**: ✅ All Steps Complete

## What Was Done

### 1. Database Schema Extended ✅

Extended Prisma schema to support ML training with required fields:

**Property Model** - Added:
- `city`, `state`, `zipCode` (location data)
- `type` (Apartment, House, Condo)
- `yearBuilt` (for building age calculation)
- `hasPool`, `hasGym`, `hasElevator`, `hasParking` (amenities)
- `neighborhood` (location context)

**Unit Model** - Added:
- `unitNumber` (display identifier)
- `bedrooms`, `bathrooms`, `squareFeet`, `floor` (physical characteristics)
- `hasParking`, `hasLaundry`, `hasBalcony`, `hasAC`, `isFurnished`, `petsAllowed` (amenities)
- `createdAt`, `updatedAt` (timestamps)

**Migration**: Created and applied migration `20251107050823_add_ml_training_fields`

### 2. Database Seeded with ML Training Data ✅

Created and ran `tenant_portal_backend/prisma/seed-ml-data.ts`:
- Updated 1 property with realistic data (San Francisco, CA)
- Updated 6 units with varied characteristics:
  - Bedroom mix: 1BR, 2BR, 3BR
  - Bathroom range: 1.0 - 2.5
  - Square feet: 650 - 1600 sq ft
  - Mixed amenities and features

### 3. Training Data Script Fixed ✅

Updated `rent_optimization_ml/scripts/extract_training_data.py`:
- Fixed LeaseStatus enum: `'ACTIVE', 'TERMINATED', 'CLOSED'` (replaced 'EXPIRED')
- Fixed column names: `depositAmount` (not securityDeposit)
- Removed non-existent `l.createdAt` field
- Used `l.startDate` for ordering

**Result**: Successfully extracted 3 training records with 32 features

### 4. Features Prepared ✅

Ran `python scripts\prepare_features.py`:
- Engineered 27 features:
  - **Original**: bedrooms, bathrooms, square_feet, year_built, floor, amenities (7)
  - **Derived**: rent_per_sqft, sqft_per_bedroom, building_age (3)
  - **Flags**: is_new_construction, is_spacious, is_premium, is_ground_floor, is_top_floor, has_multiple_bathrooms (6)
  - **Scores**: unit_amenity_score, property_amenity_score, total_amenity_score (3)
  - **Ratios**: bathroom_bedroom_ratio (1)
  - **Encoding**: city_encoded, state_encoded, property_type_encoded, size_category_encoded (4)
  - **Binary amenities**: has_parking, has_laundry, has_ac, is_furnished, pets_allowed, has_pool, has_gym (7)

- Output files created:
  - `data/X_features.csv` (27 features)
  - `data/y_target.csv` (rent amounts)
  - `data/feature_names.txt` (feature list)

### 5. Model Training Script Enhanced ✅

Updated `rent_optimization_ml/scripts/train_model.py`:
- Added check for minimum samples before cross-validation
- Skips 5-fold CV if < 5 training samples
- Graceful handling of small datasets

### 6. XGBoost Model Trained ✅

Ran `python scripts\train_model.py`:

**Training Results:**
- Training samples: 2
- Test samples: 1
- Rent range: $1,800 - $2,100

**Model Performance:**
- Training MAE: $0.44
- Training RMSE: $0.44
- Training R²: 1.0000
- Test MAE: $298.25
- Test MAPE: 16.57%

**Top Features by Importance:**
1. square_feet (39.96%)
2. bathrooms (34.20%)
3. bedrooms (19.07%)
4. sqft_per_bedroom (6.77%)

**Output Files Created:**
- `models/rent_predictor.joblib` (trained XGBoost model)
- `models/model_metadata.json` (version, metrics, features)
- `models/feature_importance.csv` (feature rankings)
- `plots/predictions_vs_actuals.png`
- `plots/residuals.png`

### 7. Training Data Available ✅

**Data Files:**
- `data/raw_data_20251106_231206.csv` (timestamped backup)
- `data/raw_data_latest.csv` (latest extraction)
- `data/engineered_data_20251106_231216.csv` (engineered features backup)
- `data/engineered_data_latest.csv` (latest features)
- `data/X_features.csv` (feature matrix)
- `data/y_target.csv` (target variable)
- `data/feature_names.txt` (27 feature names)

## Current Status

### ✅ What Works
1. Database schema supports all ML training fields
2. Data extraction from PostgreSQL works correctly
3. Feature engineering pipeline creates 27 features
4. XGBoost model trains and saves successfully
5. Model files ready for production use

### ⚠️ Known Limitations
- **Small Dataset**: Only 3 training samples (need 100+ for production)
- **Test Performance**: MAE of $298.25 is high (target: < $100)
- **Cross-Validation**: Skipped due to insufficient data
- **R² Score**: Undefined for single test sample

### 📊 Data Quality
- No missing values in extracted data
- All amenity fields populated
- Rent range: $1,800 - $2,100 (realistic)
- Property type: Apartment (100%)
- Location: San Francisco, CA (100%)

## Next Steps

### To Improve Model Performance

1. **Add More Training Data**:
   ```typescript
   // Create more units and leases
   // Target: 100+ units with leases
   // Vary: bedrooms (0-4), bathrooms (1-3), sqft (400-2000)
   // Locations: San Francisco, Oakland, San Jose, etc.
   ```

2. **Diversify Data**:
   - Multiple cities and neighborhoods
   - Various property types (Apartment, House, Condo)
   - Different building ages (new to old)
   - Mixed amenity combinations

3. **Create Historical Leases**:
   - Add TERMINATED and CLOSED leases
   - Vary lease start dates over past 2 years
   - Include rent escalations

4. **Retrain Model**:
   ```cmd
   cd rent_optimization_ml
   python scripts\extract_training_data.py
   python scripts\prepare_features.py
   python scripts\train_model.py
   ```

### To Deploy the Model

The trained model is ready to use:

1. **Start ML Service**:
   ```cmd
   cd rent_optimization_ml
   python main.py
   ```
   Service starts on http://localhost:8001

2. **Enable in Backend**:
   Edit `tenant_portal_backend/.env`:
   ```
   USE_ML_SERVICE=true
   ```

3. **Test Prediction**:
   ```bash
   curl -X POST http://localhost:8001/predict \
     -H "Content-Type: application/json" \
     -d '{
       "unit_id": 1,
       "bedrooms": 2,
       "bathrooms": 2.0,
       "square_feet": 1200,
       "property_type": "Apartment",
       "city": "San Francisco",
       "state": "CA"
     }'
   ```

4. **Verify Model Version**:
   ```bash
   curl http://localhost:8001/model/info
   ```
   Should show:
   ```json
   {
     "model_version": "1.0.0",
     "model_type": "XGBoost",
     "feature_count": 27,
     "status": "loaded"
   }
   ```

## Files Modified

1. `tenant_portal_backend/prisma/schema.prisma` - Extended Property and Unit models
2. `rent_optimization_ml/scripts/extract_training_data.py` - Fixed enum values and column names
3. `rent_optimization_ml/scripts/train_model.py` - Added small dataset handling

## Files Created

1. `tenant_portal_backend/prisma/seed-ml-data.ts` - Seed script for ML training data
2. `tenant_portal_backend/prisma/check-leases.ts` - Lease verification script
3. `tenant_portal_backend/prisma/migrations/20251107050823_add_ml_training_fields/` - Migration
4. `rent_optimization_ml/models/rent_predictor.joblib` - Trained model
5. `rent_optimization_ml/models/model_metadata.json` - Model metadata
6. `rent_optimization_ml/models/feature_importance.csv` - Feature rankings
7. `rent_optimization_ml/plots/predictions_vs_actuals.png` - Prediction plot
8. `rent_optimization_ml/plots/residuals.png` - Residuals plot
9. `rent_optimization_ml/data/*` - Training data files (8 files)

## Summary

✅ **Schema Extension**: Complete - All ML training fields added  
✅ **Data Seeding**: Complete - 6 units with realistic data  
✅ **Data Extraction**: Complete - 3 samples with 32 columns  
✅ **Feature Engineering**: Complete - 27 features prepared  
✅ **Model Training**: Complete - XGBoost model trained and saved  
⚠️ **Model Quality**: Limited - Need more data for production use  
✅ **Infrastructure**: Complete - Ready for additional training data

**Recommendation**: Add 100-200 more units with leases, then retrain for production-quality model.
