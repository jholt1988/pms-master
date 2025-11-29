# XGBoost Model Training Guide

## 🎯 Overview

Complete guide for training the XGBoost rent prediction model. After training, the ML service will automatically use the trained model instead of the baseline algorithm.

## 📋 Prerequisites

- PostgreSQL database with unit and lease data
- Python virtual environment set up
- Database connection configured in `.env`

## 🚀 Training Workflow

### Step 1: Extract Training Data

Extract historical rent data from PostgreSQL:

```cmd
cd rent_optimization_ml
venv\Scripts\activate
python scripts\extract_training_data.py
```

**What it does:**
- Connects to PostgreSQL database
- Extracts units, properties, and lease data
- Joins tables to get complete unit profiles
- Saves to `data/raw_data_latest.csv`
- Analyzes data quality (missing values, distributions)

**Output files:**
- `data/raw_data_{timestamp}.csv` - Timestamped backup
- `data/raw_data_latest.csv` - Latest data for training

### Step 2: Engineer Features

Create machine learning features from raw data:

```cmd
python scripts\prepare_features.py
```

**What it does:**
- Loads raw data from Step 1
- Engineers 27+ features:
  - **Derived numeric:** rent_per_sqft, sqft_per_bedroom, building_age
  - **Boolean flags:** is_new_construction, is_spacious, is_premium
  - **Amenity scores:** unit_amenity_score, property_amenity_score
  - **Categorical encoding:** city_encoded, state_encoded, property_type_encoded
- Splits into feature matrix (X) and target variable (y)
- Saves prepared datasets

**Output files:**
- `data/engineered_data_{timestamp}.csv` - Full engineered dataset
- `data/X_features.csv` - Feature matrix for training
- `data/y_target.csv` - Target variable (current_rent)
- `data/feature_names.txt` - List of feature names

### Step 3: Train XGBoost Model

Train the machine learning model:

```cmd
python scripts\train_model.py
```

**What it does:**
- Loads prepared features from Step 2
- Splits into train/test sets (80/20)
- Trains baseline model (mean prediction) for comparison
- Trains XGBoost regression model
- Performs 5-fold cross-validation
- Calculates performance metrics
- Analyzes feature importance
- Saves model and metadata
- Generates visualizations

**Output files:**
- `models/rent_predictor.joblib` - Trained XGBoost model ✨
- `models/model_metadata.json` - Version, metrics, features
- `models/feature_importance.csv` - Top predictive features
- `plots/predictions_vs_actuals.png` - Scatter plot
- `plots/residuals.png` - Error analysis

**Performance metrics logged:**
```
Training Set:
  MAE:  $XX.XX
  RMSE: $XX.XX
  R²:   0.XXXX

Test Set:
  MAE:  $XX.XX  ← Key metric (lower is better)
  RMSE: $XX.XX
  R²:   0.XXXX  ← Key metric (higher is better)
  MAPE: X.XX%

Top 10 Most Important Features:
  total_amenity_score           0.XXXX
  square_feet                   0.XXXX
  building_age                  0.XXXX
  ...
```

### Step 4: Deploy Model

Restart the ML service to load the trained model:

```cmd
# Stop current service (Ctrl+C in terminal)
python main.py
```

**Verify model loaded:**
```
🚀 Starting ML service...
✅ Loaded trained XGBoost model from models/rent_predictor.joblib
   Model version: 1.0.0
   Performance: MAE=$XX.XX, R²=0.XX
📊 Model info: 27 features, trained on 2025-11-06
🌐 ML service running at http://localhost:8000
```

## 📊 Performance Targets

### Production Quality Metrics

| Metric | Target | Excellent | Description |
|--------|--------|-----------|-------------|
| **MAE** | < $150 | < $100 | Average prediction error in dollars |
| **R²** | > 0.70 | > 0.80 | % of variance explained by model |
| **MAPE** | < 10% | < 8% | Average % error in predictions |

### What the Metrics Mean

- **MAE (Mean Absolute Error)**: Average difference between predicted and actual rent
  - If MAE = $85, predictions are off by $85 on average
  - Lower is better

- **R² (R-squared)**: How well the model explains rent variation
  - R² = 0.85 means model explains 85% of why rents differ
  - Range: 0.0 to 1.0, higher is better

- **MAPE (Mean Absolute Percentage Error)**: Average % difference
  - If MAPE = 6%, predictions are off by 6% on average
  - For $1500 rent, 6% = $90 error

## 🔧 Hyperparameter Tuning (Optional)

For better performance, enable hyperparameter tuning:

**Edit `scripts/train_model.py`:**

Find this section (around line 320):
```python
# Optional: Hyperparameter tuning
# Uncomment to perform tuning (takes longer)
# logger.info("\nStarting hyperparameter tuning...")
# model, best_params = hyperparameter_tuning(X_train, y_train, quick=True)
```

**Uncomment these lines:**
```python
# Optional: Hyperparameter tuning
# Uncomment to perform tuning (takes longer)
logger.info("\nStarting hyperparameter tuning...")
model, best_params = hyperparameter_tuning(X_train, y_train, quick=True)
# Re-evaluate tuned model
y_pred_test = model.predict(X_test)
metrics['test_mae'] = mean_absolute_error(y_test, y_pred_test)
metrics['test_rmse'] = np.sqrt(mean_squared_error(y_test, y_pred_test))
metrics['test_r2'] = r2_score(y_test, y_pred_test)
```

**Set `quick=False` for comprehensive search:**
```python
model, best_params = hyperparameter_tuning(X_train, y_train, quick=False)
```

**Warning:** Comprehensive tuning can take 30+ minutes but typically improves MAE by $10-30.

## 🔄 Retraining Schedule

Retrain the model periodically to incorporate new data:

### Monthly Retraining (Recommended)

```cmd
# Run full pipeline
python scripts\extract_training_data.py
python scripts\prepare_features.py
python scripts\train_model.py

# Restart service
python main.py
```

### Why Retrain?

- New leases provide more training examples
- Market conditions change over time
- Seasonal patterns emerge with more data
- Model accuracy improves with data volume

## 🧪 Testing the Model

### 1. Test ML Service Endpoint

```bash
# Test health check
curl http://localhost:8000/health

# Test model info
curl http://localhost:8000/model/info

# Test prediction
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
```

### 2. Enable in Backend

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

### 3. Generate Recommendations in Frontend

1. Navigate to http://localhost:3000
2. Login as property manager
3. Go to "AI Rent Optimization"
4. Click "Generate New Recommendations"
5. Check recommendations use trained model:
   - Look for `modelVersion: "1.0.0"` in responses
   - Check database `RentRecommendation` table

## 🐛 Troubleshooting

### No data extracted

**Problem:** `extract_training_data.py` finds 0 records

**Solutions:**
- Check DATABASE_URL in `.env` points to correct database
- Verify units and leases exist: `SELECT COUNT(*) FROM "Unit"; SELECT COUNT(*) FROM "Lease";`
- Run backend seed script: `cd tenant_portal_backend && npm run seed`

### Poor model performance (MAE > $200)

**Problem:** Model predictions are inaccurate

**Solutions:**
- Check data quality - look for missing values, outliers
- Ensure sufficient training samples (>100 recommended, >500 ideal)
- Try hyperparameter tuning (see above)
- Add more features in `prepare_features.py`
- Check for data leakage (future data in training)

### Model won't load

**Problem:** Service logs "No trained model found, using baseline"

**Solutions:**
- Verify `models/rent_predictor.joblib` exists
- Check file permissions (should be readable)
- Ensure XGBoost version matches training (2.0.3)
- Try retraining: `python scripts/train_model.py`

### Import errors during training

**Problem:** `ModuleNotFoundError: No module named 'xgboost'`

**Solutions:**
- Activate virtual environment: `venv\Scripts\activate`
- Install dependencies: `pip install -r requirements.txt`
- Verify installation: `pip list | findstr xgboost`

### Database connection failed

**Problem:** `could not connect to server`

**Solutions:**
- Ensure PostgreSQL is running
- Check DATABASE_URL format: `postgresql://user:password@localhost:5432/database_name`
- Test connection: `psql -h localhost -U postgres -d tenant_portal_back_DB`

## 📁 File Structure

```
rent_optimization_ml/
├── scripts/
│   ├── extract_training_data.py    # Step 1: Get data from DB
│   ├── prepare_features.py         # Step 2: Feature engineering
│   ├── train_model.py              # Step 3: Train XGBoost
│   └── README.md                   # Training workflow docs
├── data/                           # Created by scripts
│   ├── raw_data_latest.csv         # Extracted data
│   ├── engineered_data_latest.csv  # With features
│   ├── X_features.csv              # Feature matrix
│   ├── y_target.csv                # Target variable
│   └── feature_names.txt           # Feature list
├── models/                         # Created by training
│   ├── rent_predictor.joblib       # Trained XGBoost model ⭐
│   ├── model_metadata.json         # Performance metrics
│   └── feature_importance.csv      # Top features
├── plots/                          # Created by training
│   ├── predictions_vs_actuals.png  # Scatter plot
│   └── residuals.png               # Error analysis
├── app/
│   └── services/
│       └── prediction_service.py   # Uses trained model ✅
├── main.py                         # FastAPI app
├── requirements.txt                # Python packages
└── .env                            # Configuration
```

## 🎓 Understanding Feature Importance

After training, check `models/feature_importance.csv` to see which features matter most:

**Example top features:**
1. **total_amenity_score** - Number of amenities has big impact
2. **square_feet** - Unit size is critical
3. **building_age** - Newer buildings command premium
4. **bedrooms** - More bedrooms = higher rent
5. **is_new_construction** - <5 years old adds value

**Use this to:**
- Focus property improvements on high-impact features
- Understand what drives rent in your market
- Explain recommendations to property managers

## 📈 Next Steps

After successfully training and deploying:

1. **Monitor Performance**
   - Track prediction accuracy over time
   - Collect user feedback on recommendations
   - A/B test vs baseline algorithm

2. **Iterate and Improve**
   - Add new features (neighborhood data, school ratings)
   - Experiment with ensemble methods
   - Integrate real market data (Zillow, Rentometer)

3. **Scale Up**
   - Train on larger datasets (>1000 units)
   - Add time-series forecasting with Prophet
   - Implement automatic retraining pipeline

## 📞 Need Help?

Check these resources:
- FastAPI docs: https://fastapi.tiangolo.com/
- XGBoost docs: https://xgboost.readthedocs.io/
- Scikit-learn: https://scikit-learn.org/stable/
