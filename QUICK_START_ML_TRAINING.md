# Quick Start: Train XGBoost Rent Prediction Model

## 🎯 Goal
Replace the baseline algorithm with a real trained XGBoost machine learning model.

## ⚡ Quick Commands

```cmd
cd rent_optimization_ml
venv\Scripts\activate

# Full training pipeline (run all 3 steps)
python scripts\extract_training_data.py
python scripts\prepare_features.py
python scripts\train_model.py

# Restart ML service to load new model
python main.py
```

## 📊 What You'll See

### Step 1: Extract Data
```
Extracting training data from PostgreSQL...
Found 50 units with rent data
Saved to: data/raw_data_latest.csv
Data quality: 5% missing values
```

### Step 2: Engineer Features
```
Loading raw data...
Loaded 50 samples with 15 columns
Engineering 27 features...
Saved feature matrix: data/X_features.csv (50 rows x 27 features)
Saved target variable: data/y_target.csv
```

### Step 3: Train Model
```
BASELINE MODEL
  MAE:  $150.00
  RMSE: $200.00

XGBOOST MODEL TRAINING
  Training Set:
    MAE:  $45.23
    R²:   0.92

  Test Set:
    MAE:  $87.45  ← Your prediction accuracy!
    RMSE: $112.67
    R²:   0.85    ← How well model explains rent variation
    MAPE: 6.2%

Top 10 Features:
  total_amenity_score    0.2150
  square_feet            0.1820
  building_age           0.1450
  bedrooms               0.1200
  ...

COMPARISON
  Baseline MAE:  $150.00
  XGBoost MAE:   $87.45
  Improvement:   41.7%

✅ Model saved: models/rent_predictor.joblib
```

### Step 4: Verify Model Loaded
```
🚀 Starting ML service...
✅ Loaded trained XGBoost model from models/rent_predictor.joblib
   Model version: 1.0.0
   Performance: MAE=$87.45, R²=0.85
📊 Model info: 27 features, trained on 2025-11-06
🌐 ML service running at http://localhost:8000
```

## ✅ Success Criteria

Your model is production-ready if:
- ✅ **MAE < $150** (good), **< $100** (excellent)
- ✅ **R² > 0.70** (good), **> 0.80** (excellent)
- ✅ ML service logs "Loaded trained XGBoost model"

## 🧪 Test the Model

```bash
# Test prediction endpoint
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "unit_id": "test-123",
    "bedrooms": 2,
    "bathrooms": 2,
    "square_feet": 1000,
    "property_type": "apartment",
    "current_rent": 1500,
    "city": "Austin",
    "state": "TX",
    "zip_code": "78701",
    "has_parking": true,
    "has_laundry": true,
    "year_built": 2015
  }'

# Check model info
curl http://localhost:8000/model/info
```

## 🔄 Enable in Production

Edit `tenant_portal_backend/.env`:
```env
USE_ML_SERVICE=true
ML_SERVICE_URL=http://localhost:8000
```

Restart backend:
```cmd
cd tenant_portal_backend
npm run start:dev
```

Now frontend recommendations will use your trained XGBoost model! 🎉

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| No data extracted | Run seed script: `cd tenant_portal_backend && npm run seed` |
| Import errors | Activate venv: `venv\Scripts\activate` then `pip install -r requirements.txt` |
| Model won't load | Check `models/rent_predictor.joblib` exists |
| Poor performance (MAE > $200) | Need more training data (>100 units) or enable hyperparameter tuning |

## 📚 Detailed Docs

- **Full Training Guide**: `rent_optimization_ml/TRAINING_GUIDE.md`
- **Training Scripts README**: `rent_optimization_ml/scripts/README.md`
- **ML Service Setup**: `PHASE_3_ML_SERVICE_SETUP.md`
- **Status Document**: `tenant_portal_app/AI_RENT_OPTIMIZATION_STATUS.md`

## 📈 Next Steps

1. Generate recommendations in frontend to test real predictions
2. Compare XGBoost predictions vs baseline
3. Retrain monthly to improve with new data
4. Enable hyperparameter tuning for better accuracy
5. Add real market data (Zillow, Rentometer APIs)
