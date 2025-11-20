# ML Model Training Scripts

This directory contains scripts for training the rent prediction ML model.

## Workflow

### 1. Extract Training Data

Extract unit and rent data from PostgreSQL database:

```cmd
cd rent_optimization_ml
venv\Scripts\activate
python scripts\extract_training_data.py
```

This creates:
- `data/raw_data_latest.csv` - Raw unit and rent data
- Analysis of data quality and distributions

### 2. Prepare Features

Engineer features and prepare data for training:

```cmd
python scripts\prepare_features.py
```

This creates:
- `data/engineered_data_latest.csv` - Data with engineered features
- `data/X_features.csv` - Feature matrix
- `data/y_target.csv` - Target variable (rent)
- `data/feature_names.txt` - List of feature names

Features include:
- Property characteristics (bedrooms, bathrooms, sqft)
- Amenity scores
- Building age and condition
- Location encoding
- Derived features (rent per sqft, sqft per bedroom)

### 3. Train Model

Train XGBoost regression model:

```cmd
python scripts\train_model.py
```

This creates:
- `models/rent_predictor.joblib` - Trained XGBoost model
- `models/model_metadata.json` - Model version, metrics, features
- `models/feature_importance.csv` - Feature importance scores
- `plots/predictions_vs_actuals.png` - Visualization
- `plots/residuals.png` - Residual analysis

### 4. Restart ML Service

After training, restart the ML service to load the new model:

```cmd
# Stop current service (Ctrl+C)
python main.py
```

The service will automatically load `models/rent_predictor.joblib` if it exists.

## Model Evaluation

The training script reports:

- **MAE** (Mean Absolute Error) - Average prediction error in dollars
- **RMSE** (Root Mean Squared Error) - Penalizes large errors
- **R²** (R-squared) - Proportion of variance explained (0-1)
- **MAPE** (Mean Absolute Percentage Error) - Error as percentage
- **Cross-validation scores** - Generalization performance

Target metrics:
- MAE < $100 (excellent)
- MAE < $150 (good)
- R² > 0.80 (strong predictive power)

## Hyperparameter Tuning

To enable hyperparameter tuning, uncomment the section in `train_model.py`:

```python
# Uncomment these lines
logger.info("\nStarting hyperparameter tuning...")
model, best_params = hyperparameter_tuning(X_train, y_train, quick=True)
```

Set `quick=False` for comprehensive search (slower but better results).

## Retraining

Retrain the model periodically (monthly recommended) to incorporate new data:

```cmd
# Full pipeline
python scripts\extract_training_data.py
python scripts\prepare_features.py
python scripts\train_model.py
```

## Troubleshooting

**No data extracted**:
- Check PostgreSQL connection in `.env`
- Verify units and leases exist in database
- Run seed script if needed

**Poor model performance**:
- Check data quality (missing values, outliers)
- Ensure sufficient training samples (>100 recommended)
- Try hyperparameter tuning
- Add more features or improve feature engineering

**Model won't load**:
- Verify `models/rent_predictor.joblib` exists
- Check file permissions
- Ensure XGBoost version matches (currently 2.0.3)

## File Structure

```
rent_optimization_ml/
├── scripts/
│   ├── extract_training_data.py    # Step 1: Get data from DB
│   ├── prepare_features.py         # Step 2: Feature engineering
│   ├── train_model.py              # Step 3: Train XGBoost
│   └── README.md                   # This file
├── data/                           # Training data (created)
│   ├── raw_data_latest.csv
│   ├── engineered_data_latest.csv
│   ├── X_features.csv
│   ├── y_target.csv
│   └── feature_names.txt
├── models/                         # Trained models (created)
│   ├── rent_predictor.joblib
│   ├── model_metadata.json
│   └── feature_importance.csv
└── plots/                          # Visualizations (created)
    ├── predictions_vs_actuals.png
    └── residuals.png
```

## Next Steps

After successfully training and deploying the model:

1. Monitor prediction quality in production
2. Collect user feedback on recommendations
3. A/B test against baseline predictions
4. Retrain monthly with new data
5. Experiment with additional features
6. Consider ensemble methods (XGBoost + Prophet)
